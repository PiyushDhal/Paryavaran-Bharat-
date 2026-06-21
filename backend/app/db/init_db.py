from __future__ import annotations

import json
import urllib.request
import csv
import logging
import random
from datetime import date

from geoalchemy2.shape import from_shape
from shapely.geometry import MultiPolygon, shape
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import get_password_hash
from app.models.climate import ClimateAlert, District, RiskScore, SatelliteData, State, WeatherData, SimulationResult
from app.models.user import User
from app.services.risk_engine import ClimateRiskEngine
from app.services.sample_data import generate_observations, PROFILE_BASELINES, sample_alerts, synthetic_boundary

settings = get_settings()
logger = logging.getLogger(__name__)

# State codes dictionary matching the exact JSON keys
STATE_CODES = {
    "Andhra Pradesh": "AP", "Arunachal Pradesh": "AR", "Assam": "AS", "Bihar": "BR",
    "Chhattisgarh": "CG", "Goa": "GA", "Gujarat": "GJ", "Haryana": "HR",
    "Himachal Pradesh": "HP", "Jharkhand": "JH", "Karnataka": "KA", "Kerala": "KL",
    "Madhya Pradesh": "MP", "Maharashtra": "MH", "Manipur": "MN", "Meghalaya": "ML",
    "Mizoram": "MZ", "Nagaland": "NL", "Odisha": "OD", "Punjab": "PB",
    "Rajasthan": "RJ", "Sikkim": "SK", "Tamil Nadu": "TN", "Telangana": "TG",
    "Tripura": "TR", "Uttar Pradesh": "UP", "Uttarakhand": "UK", "West Bengal": "WB",
    "Andaman and Nicobar Islands": "AN", "Chandigarh (UT)": "CH",
    "Dadra and Nagar Haveli (UT)": "DN", "Daman and Diu (UT)": "DD", "Delhi (NCT)": "DL",
    "Jammu and Kashmir": "JK", "Ladakh": "LA", "Lakshadweep (UT)": "LD", "Puducherry (UT)": "PY"
}

# Accurate coordinate centroids for all States and UTs
STATE_CENTROIDS = {
    "AN": (11.74, 92.71), "AP": (15.91, 79.74), "AR": (28.21, 94.72), "AS": (26.20, 92.93),
    "BR": (25.09, 85.31), "CH": (30.73, 76.77), "CG": (21.27, 81.86), "DN": (20.18, 73.01),
    "DL": (28.61, 77.20), "GA": (15.29, 74.12), "GJ": (22.25, 71.19), "HR": (29.05, 76.08),
    "HP": (31.10, 77.17), "JK": (33.77, 76.57), "JH": (23.61, 85.27), "KA": (15.31, 75.71),
    "KL": (10.85, 76.27), "LA": (34.15, 77.57), "LD": (10.56, 72.64), "MP": (22.97, 78.65),
    "MH": (19.75, 75.71), "MN": (24.66, 93.90), "ML": (25.46, 91.36), "MZ": (23.16, 92.93),
    "NL": (26.15, 94.56), "OD": (20.95, 83.30), "PY": (11.94, 79.80), "PB": (31.14, 75.34),
    "RJ": (27.39, 73.43), "SK": (27.53, 88.51), "TN": (11.12, 78.65), "TG": (18.11, 79.01),
    "TR": (23.94, 91.98), "UP": (26.84, 80.88), "UK": (30.06, 79.01), "WB": (22.98, 87.85)
}

# List of 28 states and 8 UTs with their capitals and coordinates
STATE_CAPITALS = {
    "Andhra Pradesh": {"capital": "Amaravati", "lat": 16.5062, "lon": 80.6480},
    "Arunachal Pradesh": {"capital": "Itanagar", "lat": 27.0844, "lon": 93.6053},
    "Assam": {"capital": "Dispur", "lat": 26.1433, "lon": 91.7898},
    "Bihar": {"capital": "Patna", "lat": 25.5941, "lon": 85.1376},
    "Chhattisgarh": {"capital": "Raipur", "lat": 21.2514, "lon": 81.6296},
    "Goa": {"capital": "Panaji", "lat": 15.4909, "lon": 73.8278},
    "Gujarat": {"capital": "Gandhinagar", "lat": 23.2156, "lon": 72.6369},
    "Haryana": {"capital": "Chandigarh", "lat": 30.7333, "lon": 76.7794},
    "Himachal Pradesh": {"capital": "Shimla", "lat": 31.1048, "lon": 77.1734},
    "Jharkhand": {"capital": "Ranchi", "lat": 23.3441, "lon": 85.3096},
    "Karnataka": {"capital": "Bengaluru", "lat": 12.9716, "lon": 77.5946},
    "Kerala": {"capital": "Thiruvananthapuram", "lat": 8.5241, "lon": 76.9366},
    "Madhya Pradesh": {"capital": "Bhopal", "lat": 23.2599, "lon": 77.4126},
    "Maharashtra": {"capital": "Mumbai", "lat": 19.0760, "lon": 72.8777},
    "Manipur": {"capital": "Imphal", "lat": 24.8170, "lon": 93.9368},
    "Meghalaya": {"capital": "Shillong", "lat": 25.5788, "lon": 91.8933},
    "Mizoram": {"capital": "Aizawl", "lat": 23.7271, "lon": 92.7176},
    "Nagaland": {"capital": "Kohima", "lat": 25.6751, "lon": 94.1086},
    "Odisha": {"capital": "Bhubaneswar", "lat": 20.2961, "lon": 85.8245},
    "Punjab": {"capital": "Chandigarh", "lat": 30.7333, "lon": 76.7794},
    "Rajasthan": {"capital": "Jaipur", "lat": 26.9124, "lon": 75.7873},
    "Sikkim": {"capital": "Gangtok", "lat": 27.3314, "lon": 88.6138},
    "Tamil Nadu": {"capital": "Chennai", "lat": 13.0827, "lon": 80.2707},
    "Telangana": {"capital": "Hyderabad", "lat": 17.3850, "lon": 78.4867},
    "Tripura": {"capital": "Agartala", "lat": 23.8315, "lon": 91.2868},
    "Uttar Pradesh": {"capital": "Lucknow", "lat": 26.8467, "lon": 80.9462},
    "Uttarakhand": {"capital": "Dehradun", "lat": 30.3165, "lon": 78.0322},
    "West Bengal": {"capital": "Kolkata", "lat": 22.5726, "lon": 88.3639},
    "Andaman and Nicobar Islands": {"capital": "Port Blair", "lat": 11.6234, "lon": 92.7265},
    "Chandigarh (UT)": {"capital": "Chandigarh", "lat": 30.7333, "lon": 76.7794},
    "Dadra and Nagar Haveli (UT)": {"capital": "Daman", "lat": 20.3974, "lon": 72.8328},
    "Daman and Diu (UT)": {"capital": "Daman", "lat": 20.3974, "lon": 72.8328},
    "Delhi (NCT)": {"capital": "New Delhi", "lat": 28.6139, "lon": 77.2090},
    "Jammu and Kashmir": {"capital": "Srinagar", "lat": 34.0837, "lon": 74.7973},
    "Ladakh": {"capital": "Leh", "lat": 34.1526, "lon": 77.5771},
    "Lakshadweep (UT)": {"capital": "Kavaratti", "lat": 10.5667, "lon": 72.6417},
    "Puducherry (UT)": {"capital": "Puducherry", "lat": 11.9416, "lon": 79.8083}
}

def init_db(db: Session) -> None:
    # Clear tables to rebuild database with new timeline years on startup
    logger.info("Clearing existing tables before seeding...")
    db.query(ClimateAlert).delete()
    db.query(SimulationResult).delete()
    db.query(RiskScore).delete()
    db.query(SatelliteData).delete()
    db.query(WeatherData).delete()
    db.query(District).delete()
    db.query(State).delete()
    db.query(User).delete()
    db.commit()

    logger.info("Seeding system users...")
    admin = User(
        email="admin@bharatclimatetwin.in",
        full_name="Mission Administrator",
        role="admin",
        hashed_password=get_password_hash("ChangeMe123!"),
    )
    analyst = User(
        email="analyst@bharatclimatetwin.in",
        full_name="Climate Analyst",
        role="analyst",
        hashed_password=get_password_hash("ChangeMe123!"),
    )
    db.add_all([admin, analyst])
    db.commit()

    logger.info("Beginning dynamic national database seeding with Capitals...")
    risk_engine = ClimateRiskEngine()
    profiles = list(PROFILE_BASELINES.keys())
    
    used_state_codes = set()
    used_district_codes = set()
    
    district_index = 0
    states_count = 0
    districts_count = 0

    for state_name, capital_info in STATE_CAPITALS.items():
        state_code = STATE_CODES.get(state_name, state_name[:2].upper())
        
        # Ensure state code is unique
        base_code = state_code
        suffix_idx = 1
        while state_code in used_state_codes:
            state_code = f"{base_code[:1]}{suffix_idx}"
            suffix_idx += 1
        used_state_codes.add(state_code)
        
        state_lat, state_lon = STATE_CENTROIDS.get(state_code, (capital_info["lat"], capital_info["lon"]))
        
        state = State(
            name=state_name,
            code=state_code,
            centroid_lat=state_lat,
            centroid_lon=state_lon,
            boundary_geojson=None
        )
        db.add(state)
        db.flush()
        states_count += 1
        
        district_name = capital_info["capital"]
        lat = capital_info["lat"]
        lon = capital_info["lon"]
            
        boundary = synthetic_boundary(lat, lon, size=0.25)
        polygon = shape(boundary["geometry"])
        
        if "sqlite" in settings.database_url:
            geom_val = MultiPolygon([polygon]).wkt
        else:
            geom_val = from_shape(MultiPolygon([polygon]), srid=4326)
            
        # Create a unique district code
        dist_code = f"{state_code}-{district_name[:2].upper()}-{district_index % 100}"
        base_d_code = dist_code
        d_suffix_idx = 1
        while dist_code in used_district_codes:
            dist_code = f"{base_d_code}-{d_suffix_idx}"
            d_suffix_idx += 1
        used_district_codes.add(dist_code)
        
        district = District(
            state_id=state.id,
            name=district_name,
            code=dist_code,
            population=random.randint(500000, 4500000),
            area_sq_km=random.randint(1200, 15000),
            centroid_lat=lat,
            centroid_lon=lon,
            boundary_geojson=boundary,
            geom=geom_val
        )
        db.add(district)
        db.flush()
        districts_count += 1
        
        # Select baseline profile
        profile = profiles[district_index % len(profiles)]
        district_index += 1
        
        # Seed observations specifically for 2026 (the current active digital twin simulator year)
        for obs in generate_observations(dist_code, profile, [2026]):
            weather = WeatherData(
                district_id=district.id,
                observed_on=obs["observed_on"],
                rainfall_mm=obs["rainfall_mm"],
                rainfall_deficit_pct=obs["rainfall_deficit_pct"],
                temperature_c=obs["temperature_c"],
                humidity_pct=obs["humidity_pct"],
                river_level_m=obs["river_level_m"],
                soil_moisture_pct=obs["soil_moisture_pct"],
                aqi=obs["aqi"],
                source="baseline-simulation"
            )
            satellite = SatelliteData(
                district_id=district.id,
                observed_on=obs["observed_on"],
                ndvi=obs["ndvi"],
                land_surface_temp_c=obs["land_surface_temp_c"],
                soil_moisture_pct=obs["soil_moisture_pct"],
                water_body_index=obs["water_body_index"],
                reservoir_level_pct=obs["reservoir_level_pct"],
                source="baseline-simulation"
            )
            risk = risk_engine.calculate(obs)
            risk_score = RiskScore(
                district_id=district.id,
                valid_on=obs["observed_on"],
                flood_risk=risk["flood_risk"],
                drought_risk=risk["drought_risk"],
                heatwave_risk=risk["heatwave_risk"],
                water_stress_risk=risk["water_stress_risk"],
                composite_risk=risk["composite_risk"],
                trend=risk["trend"],
                drivers=risk["drivers"]
            )
            db.add_all([weather, satellite, risk_score])
            
        # Commit periodically to keep flush buffer light
        db.commit()
        
    logger.info(f"Seeding completed successfully. Created {states_count} states/UTs and {districts_count} capital districts.")
