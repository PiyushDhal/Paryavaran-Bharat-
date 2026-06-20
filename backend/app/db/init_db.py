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

def load_national_datasets() -> tuple[dict, dict]:
    """Fetch and load States/Districts JSON mapping and latitude/longitude CSV datasets."""
    url_json = 'https://raw.githubusercontent.com/sab99r/Indian-States-And-Districts/master/states-and-districts.json'
    url_csv = 'https://raw.githubusercontent.com/SaravananSuriya/Phonepe-Pulse-Data-Visualization-and-Exploration/master/lat-%26-lon-india-district.csv'

    logger.info("Downloading Indian states and districts JSON mapping...")
    req_json = urllib.request.Request(url_json, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req_json, timeout=15) as res:
        states_data = json.loads(res.read().decode('utf-8'))

    logger.info("Downloading Indian district latitude and longitude coordinate CSV...")
    req_csv = urllib.request.Request(url_csv, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req_csv, timeout=15) as res:
        csv_lines = res.read().decode('utf-8').splitlines()
        reader = csv.DictReader(csv_lines)
        coords = {}
        for row in reader:
            dist_name = row.get('District')
            lat_val = row.get('Latitude')
            lon_val = row.get('Longitude')
            if dist_name and lat_val and lon_val:
                coords[dist_name.strip().lower()] = (float(lat_val), float(lon_val))
                
    return states_data, coords

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

    # Load states and districts from open data sources
    try:
        states_data, coords = load_national_datasets()
    except Exception as e:
        logger.error(f"Failed to fetch national datasets: {e}. Seeding aborted.")
        return

    logger.info("Beginning dynamic national database seeding...")
    risk_engine = ClimateRiskEngine()
    profiles = list(PROFILE_BASELINES.keys())
    
    used_state_codes = set()
    used_district_codes = set()
    
    district_index = 0
    states_count = 0
    districts_count = 0

    for state_item in states_data.get("states", []):
        state_name = state_item["state"]
        state_code = STATE_CODES.get(state_name, state_name[:2].upper())
        
        # Ensure state code is unique
        base_code = state_code
        suffix_idx = 1
        while state_code in used_state_codes:
            state_code = f"{base_code[:1]}{suffix_idx}"
            suffix_idx += 1
        used_state_codes.add(state_code)
        
        # Calculate state centroid based on fallback mapping
        state_lat, state_lon = STATE_CENTROIDS.get(state_code, (20.59, 78.96))
        
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
        
        for district_name in state_item.get("districts", []):
            d_key = district_name.strip().lower()
            
            # Retrieve or generate coordinates
            if d_key in coords:
                lat, lon = coords[d_key]
            else:
                # Add deterministic offset based on district name so they spread out visually
                offset_lat = (hash(district_name) % 10 - 5) * 0.08
                offset_lon = (hash(district_name + "_lon") % 10 - 5) * 0.08
                lat = state_lat + offset_lat
                lon = state_lon + offset_lon
                
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
        
    logger.info(f"Seeding completed successfully. Created {states_count} states/UTs and {districts_count} districts.")
