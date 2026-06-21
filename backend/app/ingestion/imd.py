import logging
import json
import urllib.request
import random
import time
import os
from datetime import date, datetime, timezone
from sqlalchemy.orm import Session
from app.models.climate import WeatherData, District
from app.ingestion.base import BaseConnector, safe_get_json, load_local_dataset

logger = logging.getLogger(__name__)

class IMDConnector(BaseConnector):
    """India Meteorological Department (IMD) Connector for Weather Data."""

    name: str = "IMD Weather Data"
    source_tag: str = "imd-observation"

    def fetch(self, **kwargs) -> list[dict]:
        db = kwargs.get("db")
        if not db:
            logger.error("Database session is required for IMD fetch.")
            return []
            
        districts = db.query(District).all()
        results = []
        
        api_url = os.environ.get("IMD_API_URL")
        api_key = os.environ.get("IMD_API_KEY")
        
        # Try fetching from API if configured
        if api_url and api_key:
            logger.info("IMD: Fetching from official API...")
            try:
                # Mock implementation of an official API fetch
                headers = {"Authorization": f"Bearer {api_key}"}
                req = urllib.request.Request(api_url, headers=headers)
                with urllib.request.urlopen(req, timeout=15) as response:
                    payload = json.loads(response.read().decode('utf-8'))
                
                # Assume payload maps district codes to data
                for d in districts:
                    district_data = payload.get(d.code)
                    if district_data:
                        results.append({"district_id": d.id, "payload": district_data, "dataset_version": "api-v1", "quality_status": "verified"})
                    else:
                        results.append({"district_id": d.id, "payload": None, "dataset_version": None, "quality_status": "missing"})
                return results
            except Exception as e:
                logger.error(f"IMD: API fetch failed: {e}")
        
        # Fallback to local dataset
        logger.info("IMD: Falling back to local dataset imd_data.json...")
        dataset = load_local_dataset("imd_data.json")
        if dataset:
            # Assume dataset is a dict mapping district_code to data
            for d in districts:
                district_data = dataset.get(d.code)
                if district_data:
                    results.append({"district_id": d.id, "payload": district_data, "dataset_version": "local-dataset-v1", "quality_status": "verified"})
                else:
                    results.append({"district_id": d.id, "payload": None, "dataset_version": None, "quality_status": "missing"})
            return results
            
        logger.error("IMD: Both API and local dataset fetch failed. No data to ingest.")
        return []

    def validate(self, raw_data: list[dict]) -> list[dict]:
        validated = []
        for item in raw_data:
            district_id = item["district_id"]
            payload = item["payload"]
            
            if not payload:
                continue
                
            try:
                # IMD payload structure (expected)
                temp = payload.get("temperature_c")
                precip = payload.get("rainfall_mm")
                humidity = payload.get("humidity_pct")
                
                if temp is not None and precip is not None and humidity is not None:
                    validated.append({
                        "district_id": district_id,
                        "temperature_c": float(temp),
                        "rainfall_mm": float(precip),
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
