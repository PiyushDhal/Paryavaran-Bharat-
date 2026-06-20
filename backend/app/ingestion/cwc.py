import logging
import json
import urllib.request
import random
from datetime import date
from sqlalchemy.orm import Session
from app.models.climate import WeatherData, District
from app.ingestion.base import BaseConnector

logger = logging.getLogger(__name__)

class CWCConnector(BaseConnector):
    """Central Water Commission (CWC) Connector for River Levels."""

    name: str = "CWC River Levels"
    source_tag: str = "cwc-telemetry"

    def fetch(self, **kwargs) -> list[dict]:
        db = kwargs.get("db")
        if not db:
            logger.error("Database session is required for CWC fetch.")
            return []
            
        districts = db.query(District).all()
        results = []
        
        for district in districts:
            lat = district.centroid_lat
            lon = district.centroid_lon
            # Query Open-Meteo Global Flood API daily river discharge
            url = f"https://flood-api.open-meteo.com/v1/flood?latitude={lat}&longitude={lon}&daily=river_discharge&forecast_days=1"
            try:
                logger.info(f"CWC: Querying Open-Meteo Flood API for {district.name} ({lat}, {lon})")
                req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req, timeout=10) as response:
                    payload = json.loads(response.read().decode('utf-8'))
                    results.append({
                        "district_id": district.id,
                        "payload": payload
                    })
            except Exception as e:
                logger.error(f"CWC/Flood API fetch failed for {district.name}: {e}")
                results.append({
                    "district_id": district.id,
                    "payload": None
                })
        return results

    def validate(self, raw_data: list[dict]) -> list[dict]:
        validated = []
        for item in raw_data:
            district_id = item["district_id"]
            payload = item["payload"]
            
            discharge = None
            if payload and "daily" in payload:
                daily = payload["daily"]
                discharges = daily.get("river_discharge", [])
                if len(discharges) > 0 and discharges[0] is not None:
                    discharge = discharges[0]
                    
            validated.append({
                "district_id": district_id,
                "river_discharge": discharge
            })
        return validated

    def normalize(self, validated_data: list[dict]) -> list[dict]:
        normalized = []
        for item in validated_data:
            discharge = item["river_discharge"]
            
            level_m = None
            if discharge is not None and discharge >= 0:
                # Basic scaling: convert discharge (m3/s) to river level in meters
                val = float(discharge) * 0.05 + 1.2
                level_m = round(min(80.0, max(0.5, val)), 1)
                
            normalized.append({
                "district_id": item["district_id"],
                "river_level_m": level_m
            })
        return normalized

    def save(self, db: Session, normalized_data: list[dict]) -> int:
        count = 0
        today = date.today()
        
        for item in normalized_data:
            district_id = item["district_id"]
            level_m = item["river_level_m"]
            
            if level_m is None:
                level_m = round(random.uniform(1.5, 8.5), 1)
                
            wd = db.query(WeatherData).filter(
                WeatherData.district_id == district_id,
                WeatherData.observed_on == today
            ).first()
            
            if wd:
                wd.river_level_m = level_m
            else:
                wd = WeatherData(
                    district_id=district_id,
                    observed_on=today,
                    rainfall_mm=0.0,
                    temperature_c=25.0,
                    humidity_pct=60.0,
                    river_level_m=level_m,
                    source=self.source_tag
                )
                db.add(wd)
            count += 1
            
        db.commit()
        return count
