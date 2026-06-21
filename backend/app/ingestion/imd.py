import logging
import json
import urllib.request
import time
from datetime import date, datetime, timezone
from sqlalchemy.orm import Session
from app.models.climate import WeatherData, District
from app.ingestion.base import BaseConnector, safe_get_json

logger = logging.getLogger(__name__)

class IMDConnector(BaseConnector):
    """India Meteorological Department (IMD) Connector."""

    name: str = "IMD Weather Data"
    source_tag: str = "imd-open-meteo"

    def fetch(self, **kwargs) -> list[dict]:
        db = kwargs.get("db")
        if not db:
            logger.error("Database session is required for IMD fetch.")
            return []
            
        districts = db.query(District).all()
        results = []
        
        # Batch coordinates in chunks of 50
        chunk_size = 50
        chunks = [districts[i:i + chunk_size] for i in range(0, len(districts), chunk_size)]
        
        for chunk in chunks:
            lats = ",".join(str(d.centroid_lat) for d in chunk)
            lons = ",".join(str(d.centroid_lon) for d in chunk)
            
            url = f"https://api.open-meteo.com/v1/forecast?latitude={lats}&longitude={lons}&current=temperature_2m,relative_humidity_2m,rain&timezone=GMT"
            try:
                logger.info(f"IMD: Batch fetching weather data from Open-Meteo for {len(chunk)} districts...")
                payload = safe_get_json(url)
                
                if isinstance(payload, (dict, list)):
                    # Handle response structure based on single vs batch API return
                    payload_list = payload if isinstance(payload, list) else [payload]
                    
                    for idx, d in enumerate(chunk):
                        results.append({
                            "district_id": d.id,
                            "payload": payload_list[idx] if idx < len(payload_list) else None,
                            "dataset_version": "open-meteo-v1",
                            "quality_status": "verified"
                        })
            except Exception as e:
                logger.error(f"IMD: Batch fetch failed: {e}")
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
            
            if not payload or "current" not in payload:
                continue
                
            try:
                current = payload["current"]
                temp = current.get("temperature_2m")
                rain = current.get("rain")
                humidity = current.get("relative_humidity_2m")
                
                if temp is not None and rain is not None and humidity is not None:
                    validated.append({
                        "district_id": district_id,
                        "temperature_c": float(temp),
                        "rainfall_mm": float(rain),
                        "humidity_pct": float(humidity),
                        "dataset_version": item.get("dataset_version"),
                        "quality_status": item.get("quality_status")
                    })
                else:
                    logger.warning(f"IMD: Missing required fields for district {district_id}")
            except (ValueError, TypeError) as e:
                logger.warning(f"IMD: Invalid data format for district {district_id}: {e}")
                
        return validated

    def normalize(self, validated_data: list[dict]) -> list[dict]:
        return validated_data

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
                wd.temperature_c = item["temperature_c"]
                wd.rainfall_mm = item["rainfall_mm"]
                wd.humidity_pct = item["humidity_pct"]
                wd.source = self.source_tag
                wd.dataset_version = item["dataset_version"]
                wd.last_updated = now
                wd.ingestion_time = now
                wd.quality_status = item["quality_status"]
            else:
                wd = WeatherData(
                    district_id=district_id,
                    observed_on=today,
                    rainfall_mm=item["rainfall_mm"],
                    temperature_c=item["temperature_c"],
                    humidity_pct=item["humidity_pct"],
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
