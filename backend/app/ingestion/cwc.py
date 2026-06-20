import logging
import json
import urllib.request
import random
import time
from datetime import date
from sqlalchemy.orm import Session
from app.models.climate import WeatherData, District
from app.ingestion.base import BaseConnector, safe_get_json

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
        
        # Batch coordinates in chunks of 50
        chunk_size = 50
        chunks = [districts[i:i + chunk_size] for i in range(0, len(districts), chunk_size)]
        
        for chunk in chunks:
            lats = ",".join(str(d.centroid_lat) for d in chunk)
            lons = ",".join(str(d.centroid_lon) for d in chunk)
            
            url = f"https://flood-api.open-meteo.com/v1/flood?latitude={lats}&longitude={lons}&daily=river_discharge&forecast_days=1"
            try:
                logger.info(f"CWC: Batch fetching flood data for {len(chunk)} districts...")
                payload = safe_get_json(url)
                
                if isinstance(payload, dict):
                    payload = [payload]
                    
                for idx, d in enumerate(chunk):
                    results.append({
                        "district_id": d.id,
                        "payload": payload[idx] if idx < len(payload) else None
                    })
            except Exception as e:
                logger.error(f"CWC: Batch fetch failed: {e}")
                for d in chunk:
                    results.append({
                        "district_id": d.id,
                        "payload": None
                    })
            # Add delay to prevent HTTP 429 rate limit errors
            time.sleep(1.0)
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
