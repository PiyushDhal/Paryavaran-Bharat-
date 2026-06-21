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
        
        api_url = os.environ.get("CWC_API_URL")
        api_key = os.environ.get("CWC_API_KEY")
        
        if api_url and api_key:
            logger.info("CWC: Fetching from official API...")
            try:
                headers = {"Authorization": f"Bearer {api_key}"}
                req = urllib.request.Request(api_url, headers=headers)
                with urllib.request.urlopen(req, timeout=15) as response:
                    payload = json.loads(response.read().decode('utf-8'))
                
                for d in districts:
                    district_data = payload.get(d.code)
                    if district_data:
                        results.append({"district_id": d.id, "payload": district_data, "dataset_version": "api-v1", "quality_status": "verified"})
                    else:
                        results.append({"district_id": d.id, "payload": None, "dataset_version": None, "quality_status": "missing"})
                return results
            except Exception as e:
                logger.error(f"CWC: API fetch failed: {e}")
                
        logger.info("CWC: Falling back to local dataset cwc_data.json...")
        dataset = load_local_dataset("cwc_data.json")
        if dataset:
            for d in districts:
                district_data = dataset.get(d.code)
                if district_data:
                    results.append({"district_id": d.id, "payload": district_data, "dataset_version": "local-dataset-v1", "quality_status": "verified"})
                else:
                    results.append({"district_id": d.id, "payload": None, "dataset_version": None, "quality_status": "missing"})
            return results
            
        logger.error("CWC: Both API and local dataset fetch failed. No data to ingest.")
        return []

    def validate(self, raw_data: list[dict]) -> list[dict]:
        validated = []
        for item in raw_data:
            district_id = item["district_id"]
            payload = item["payload"]
            
            if not payload:
                continue
                
            try:
                river_level_m = payload.get("river_level_m")
                
                if river_level_m is not None:
                    validated.append({
                        "district_id": district_id,
                        "river_level_m": float(river_level_m),
                        "dataset_version": item.get("dataset_version"),
                        "quality_status": item.get("quality_status")
                    })
                else:
                    logger.warning(f"CWC: Missing required fields for district {district_id}")
            except (ValueError, TypeError) as e:
                logger.warning(f"CWC: Invalid data format for district {district_id}: {e}")
                
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
