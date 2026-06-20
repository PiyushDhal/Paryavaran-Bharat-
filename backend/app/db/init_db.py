from __future__ import annotations

from datetime import date

from geoalchemy2.shape import from_shape
from shapely.geometry import MultiPolygon, shape
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import get_password_hash
from app.models.climate import ClimateAlert, District, RiskScore, SatelliteData, State, WeatherData, SimulationResult
from app.models.user import User
from app.services.risk_engine import ClimateRiskEngine
from app.services.sample_data import DISTRICTS, generate_observations, sample_alerts, synthetic_boundary

settings = get_settings()


def init_db(db: Session) -> None:
    # Clear tables to rebuild database with new timeline years on startup
    db.query(ClimateAlert).delete()
    db.query(SimulationResult).delete()
    db.query(RiskScore).delete()
    db.query(SatelliteData).delete()
    db.query(WeatherData).delete()
    db.query(District).delete()
    db.query(State).delete()
    db.query(User).delete()
    db.commit()

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

    states: dict[str, State] = {}
    districts: dict[str, District] = {}
    for row in DISTRICTS:
        state = states.get(row["state_code"])
        if not state:
            state = State(
                name=row["state"],
                code=row["state_code"],
                centroid_lat=row["lat"],
                centroid_lon=row["lon"],
                boundary_geojson=None,
            )
            db.add(state)
            db.flush()
            states[row["state_code"]] = state

        boundary = synthetic_boundary(row["lat"], row["lon"])
        polygon = shape(boundary["geometry"])
        
        if "sqlite" in settings.database_url:
            geom_val = MultiPolygon([polygon]).wkt
        else:
            geom_val = from_shape(MultiPolygon([polygon]), srid=4326)

        district = District(
            state_id=state.id,
            name=row["district"],
            code=row["district_code"],
            population=row["population"],
            area_sq_km=row["area"],
            centroid_lat=row["lat"],
            centroid_lon=row["lon"],
            boundary_geojson=boundary,
            geom=geom_val,
        )
        db.add(district)
        db.flush()
        districts[row["district_code"]] = district

        risk_engine = ClimateRiskEngine()
        for obs in generate_observations(row["district_code"], row["profile"], [2010, 2015, 2020, 2025, 2030, 2040, 2050]):
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
            )
            satellite = SatelliteData(
                district_id=district.id,
                observed_on=obs["observed_on"],
                ndvi=obs["ndvi"],
                land_surface_temp_c=obs["land_surface_temp_c"],
                soil_moisture_pct=obs["soil_moisture_pct"],
                water_body_index=obs["water_body_index"],
                reservoir_level_pct=obs["reservoir_level_pct"],
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
                drivers=risk["drivers"],
            )
            db.add_all([weather, satellite, risk_score])

    for alert in sample_alerts():
        district = districts[alert["district_code"]]
        db.add(
            ClimateAlert(
                district_id=district.id,
                severity=alert["severity"],
                alert_type=alert["alert_type"],
                title=alert["title"],
                message=alert["message"],
                issued_at=alert["issued_at"],
            )
        )

    db.commit()
