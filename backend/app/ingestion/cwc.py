import json
import logging
import time
import os
import urllib.request
from datetime import date, datetime, timezone
from sqlalchemy.orm import Session
from app.models.climate import WeatherData, District
from app.ingestion.base import BaseConnector, safe_get_json

logger = logging.getLogger(__name__)

class CWCConnector(BaseConnector):
    """Central Water Commission (CWC) Connector for River Levels."""

    name: str = "CWC River Levels"
    source_tag: str = "cwc-open-meteo"

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
                logger.info(f"CWC: Batch fetching flood data from Open-Meteo for {len(chunk)} districts...")
                payload = safe_get_json(url)
                
                if isinstance(payload, (dict, list)):
                    # Open-Meteo returns a list of results when multiple coordinates are requested
                    payload_list = payload if isinstance(payload, list) else [payload]
                    
                    for idx, d in enumerate(chunk):
                        results.append({
                            "district_id": d.id,
                            "payload": payload_list[idx] if idx < len(payload_list) else None,
                            "dataset_version": "open-meteo-v1",
                            "quality_status": "estimated"
                        })
            except Exception as e:
                logger.error(f"CWC: Batch fetch failed: {e}")
                for d in chunk:
                    results.append({
                        "district_id": d.id,
                        "payload": None,
                        "dataset_version": None,
                        "quality_status": "missing"
                    })
            # Add delay to prevent HTTP 429 rate limit errors
            time.sleep(1.0)
        return results

    def validate(self, raw_data: list[dict]) -> list[dict]:
        validated = []
        for item in raw_data:
            district_id = item["district_id"]
            payload = item["payload"]
            
            if not payload or "daily" not in payload:
                continue
                
            try:
                daily = payload["daily"]
                discharges = daily.get("river_discharge", [])
                
                if discharges and discharges[0] is not None:
                    validated.append({
                        "district_id": district_id,
                        "river_discharge": float(discharges[0]),
                        "dataset_version": item.get("dataset_version"),
                        "quality_status": item.get("quality_status")
                    })
                else:
                    logger.warning(f"CWC: Missing required fields for district {district_id}")
            except (ValueError, TypeError) as e:
                logger.warning(f"CWC: Invalid data format for district {district_id}: {e}")
                
        return validated

    def normalize(self, validated_data: list[dict]) -> list[dict]:
        normalized = []
        for item in validated_data:
            discharge = item["river_discharge"]
            
            level_m = None
            if discharge is not None and discharge >= 0:
                val = discharge * 0.05 + 1.2
                level_m = round(min(80.0, max(0.5, val)), 1)
                
            normalized.append({
                "district_id": item["district_id"],
                "river_level_m": level_m,
                "dataset_version": item["dataset_version"],
                "quality_status": item["quality_status"]
            })
        return normalized

    def save(self, db: Session, normalized_data: list[dict]) -> int:
        count = 0
        today = date.today()
        now = datetime.now(timezone.utc)
        
        for item in normalized_data:
            district_id = item["district_id"]
            
            wd = db.query(WeatherData).filter(
                WeatherData.district_id == district_id,
                WeatherData.observed_on == today
            ).first()
            
            if wd:
                wd.river_level_m = item["river_level_m"]
                wd.dataset_version = item["dataset_version"]
                wd.last_updated = now
                wd.ingestion_time = now
                wd.quality_status = item["quality_status"]
            else:
                wd = WeatherData(
                    district_id=district_id,
                    observed_on=today,
                    rainfall_mm=0.0,
                    temperature_c=25.0,
                    humidity_pct=60.0,
                    river_level_m=item["river_level_m"],
                    source=self.source_tag,
                    dataset_version=item["dataset_version"],
                    last_updated=now,
                    ingestion_time=now,
                    quality_status=item["quality_status"]
                )
                db.add(wd)
            count += 1
            
        db.commit()
        return count
