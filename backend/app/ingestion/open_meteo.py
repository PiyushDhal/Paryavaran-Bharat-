import urllib.request
import json
import logging
from datetime import date, timedelta
from typing import Optional

from sqlalchemy.orm import Session
from sqlalchemy import create_engine

# Using absolute imports from app
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), "../.."))

from app.db.session import SessionLocal
from app.models.climate import District, WeatherData, SatelliteData, RiskScore
from app.models.user import User
from app.services.risk_engine import ClimateRiskEngine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def fetch_weather_data(lat: float, lon: float, days_back: int = 1) -> Optional[dict]:
    """Fetch daily max temperature and precipitation from Open-Meteo."""
    url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&daily=temperature_2m_max,precipitation_sum&past_days={days_back}&forecast_days=1"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode('utf-8'))
            return data
    except Exception as e:
        logger.error(f"Failed to fetch data for lat={lat}, lon={lon}: {e}")
        return None

def sync_live_data():
    """Sync live Open-Meteo data into the database."""
    db: Session = SessionLocal()
    engine = ClimateRiskEngine()
    try:
        districts = db.query(District).all()
        logger.info(f"Syncing live data for {len(districts)} districts...")

        for district in districts:
            weather_resp = fetch_weather_data(district.centroid_lat, district.centroid_lon, days_back=0)
            if not weather_resp or "daily" not in weather_resp:
                continue
            
            daily = weather_resp["daily"]
            dates = daily.get("time", [])
            temps = daily.get("temperature_2m_max", [])
            precips = daily.get("precipitation_sum", [])
            
            for i, dt_str in enumerate(dates):
                obs_date = date.fromisoformat(dt_str)
                temp = temps[i] if temps[i] is not None else 30.0
                precip = precips[i] if precips[i] is not None else 0.0
                
                # Check if WeatherData exists for this date and district
                weather = db.query(WeatherData).filter(
                    WeatherData.district_id == district.id,
                    WeatherData.observed_on == obs_date
                ).first()
                
                if not weather:
                    # Get baseline defaults from latest available data or set reasonable defaults
                    last_weather = db.query(WeatherData).filter(
                        WeatherData.district_id == district.id
                    ).order_by(WeatherData.observed_on.desc()).first()
                    
                    humidity = last_weather.humidity_pct if last_weather else 60.0
                    river = last_weather.river_level_m if last_weather else 2.0
                    soil = last_weather.soil_moisture_pct if last_weather else 40.0
                    aqi = last_weather.aqi if last_weather else 80
                    
                    weather = WeatherData(
                        district_id=district.id,
                        observed_on=obs_date,
                        rainfall_mm=precip,
                        rainfall_deficit_pct=0.0,  # Could be calculated against historical average
                        temperature_c=temp,
                        humidity_pct=humidity,
                        river_level_m=river,
                        soil_moisture_pct=soil,
                        aqi=aqi,
                        source="open-meteo"
                    )
                    db.add(weather)
                else:
                    weather.temperature_c = temp
                    weather.rainfall_mm = precip
                    weather.source = "open-meteo"
                
                # Also handle SatelliteData
                satellite = db.query(SatelliteData).filter(
                    SatelliteData.district_id == district.id,
                    SatelliteData.observed_on == obs_date
                ).first()
                
                if not satellite:
                    last_sat = db.query(SatelliteData).filter(
                        SatelliteData.district_id == district.id
                    ).order_by(SatelliteData.observed_on.desc()).first()
                    
                    satellite = SatelliteData(
                        district_id=district.id,
                        observed_on=obs_date,
                        ndvi=last_sat.ndvi if last_sat else 0.4,
                        land_surface_temp_c=temp + 2.0,
                        soil_moisture_pct=weather.soil_moisture_pct,
                        water_body_index=last_sat.water_body_index if last_sat else 0.3,
                        reservoir_level_pct=last_sat.reservoir_level_pct if last_sat else 50.0,
                        source="open-meteo-satellite-proxy"
                    )
                    db.add(satellite)
                else:
                    satellite.land_surface_temp_c = temp + 2.0
                
                # Re-calculate RiskScore based on updated weather
                obs_dict = {
                    "rainfall_mm": weather.rainfall_mm,
                    "rainfall_deficit_pct": weather.rainfall_deficit_pct,
                    "temperature_c": weather.temperature_c,
                    "humidity_pct": weather.humidity_pct,
                    "river_level_m": weather.river_level_m,
                    "soil_moisture_pct": weather.soil_moisture_pct,
                    "ndvi": satellite.ndvi,
                    "reservoir_level_pct": satellite.reservoir_level_pct,
                    "aqi": weather.aqi,
                    "water_body_index": satellite.water_body_index
                }
                
                risk_vals = engine.calculate(obs_dict)
                
                risk_score = db.query(RiskScore).filter(
                    RiskScore.district_id == district.id,
                    RiskScore.valid_on == obs_date
                ).first()
                
                if not risk_score:
                    risk_score = RiskScore(
                        district_id=district.id,
                        valid_on=obs_date,
                        flood_risk=risk_vals["flood_risk"],
                        drought_risk=risk_vals["drought_risk"],
                        heatwave_risk=risk_vals["heatwave_risk"],
                        water_stress_risk=risk_vals["water_stress_risk"],
                        composite_risk=risk_vals["composite_risk"],
                        trend=risk_vals["trend"],
                        drivers=risk_vals["drivers"],
                    )
                    db.add(risk_score)
                else:
                    risk_score.flood_risk = risk_vals["flood_risk"]
                    risk_score.drought_risk = risk_vals["drought_risk"]
                    risk_score.heatwave_risk = risk_vals["heatwave_risk"]
                    risk_score.water_stress_risk = risk_vals["water_stress_risk"]
                    risk_score.composite_risk = risk_vals["composite_risk"]
                    risk_score.trend = risk_vals["trend"]
                    risk_score.drivers = risk_vals["drivers"]
                
                db.commit()
                
        logger.info("Successfully synced Open-Meteo live data!")
    finally:
        db.close()

if __name__ == "__main__":
    sync_live_data()
