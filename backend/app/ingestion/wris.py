import logging
import json
import urllib.request
import random
import time
import os
from datetime import date, datetime, timezone
from sqlalchemy.orm import Session
from app.models.climate import SatelliteData, District
from app.ingestion.base import BaseConnector, safe_get_json, load_local_dataset

logger = logging.getLogger(__name__)

class WRISConnector(BaseConnector):
    """India-WRIS Connector for Reservoir Levels."""

    name: str = "India-WRIS Reservoir Data"
    source_tag: str = "wris-reservoirs"

    def fetch(self, **kwargs) -> list[dict]:
        db = kwargs.get("db")
        if not db:
            logger.error("Database session is required for WRIS fetch.")
            return []
            
        districts = db.query(District).all()
        results = []
        
        api_url = os.environ.get("WRIS_API_URL")
        api_key = os.environ.get("WRIS_API_KEY")
        
        if api_url and api_key:
            logger.info("WRIS: Fetching from official API...")
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
                logger.error(f"WRIS: API fetch failed: {e}")
                
        logger.info("WRIS: Falling back to local dataset wris_data.json...")
        dataset = load_local_dataset("wris_data.json")
        if dataset:
            for d in districts:
                district_data = dataset.get(d.code)
                if district_data:
                    results.append({"district_id": d.id, "payload": district_data, "dataset_version": "local-dataset-v1", "quality_status": "verified"})
                else:
                    results.append({"district_id": d.id, "payload": None, "dataset_version": None, "quality_status": "missing"})
            return results
            
        logger.error("WRIS: Both API and local dataset fetch failed. No data to ingest.")
        return []

    def validate(self, raw_data: list[dict]) -> list[dict]:
        validated = []
        for item in raw_data:
            district_id = item["district_id"]
            payload = item["payload"]
            
            if not payload:
                continue
                
            try:
                reservoir_level_pct = payload.get("reservoir_level_pct")
                
                if reservoir_level_pct is not None:
                    validated.append({
                        "district_id": district_id,
                        "reservoir_level_pct": float(reservoir_level_pct),
                        "dataset_version": item.get("dataset_version"),
                        "quality_status": item.get("quality_status")
                    })
                else:
                    logger.warning(f"WRIS: Missing required fields for district {district_id}")
            except (ValueError, TypeError) as e:
                logger.warning(f"WRIS: Invalid data format for district {district_id}: {e}")
                
        return validated

    def normalize(self, validated_data: list[dict]) -> list[dict]:
        return validated_data

    def save(self, db: Session, normalized_data: list[dict]) -> int:
        count = 0
        today = date.today()
        now = datetime.now(timezone.utc)
        
        for item in normalized_data:
            district_id = item["district_id"]
            
            sd = db.query(SatelliteData).filter(
                SatelliteData.district_id == district_id,
                SatelliteData.observed_on == today
            ).first()
            
            if sd:
                sd.reservoir_level_pct = item["reservoir_level_pct"]
                sd.source = self.source_tag
                sd.dataset_version = item["dataset_version"]
                sd.last_updated = now
                sd.ingestion_time = now
                sd.quality_status = item["quality_status"]
            else:
                sd = SatelliteData(
                    district_id=district_id,
                    observed_on=today,
                    ndvi=0.0,
                    land_surface_temp_c=25.0,
                    soil_moisture_pct=0.0,
                    water_body_index=0.0,
                    reservoir_level_pct=item["reservoir_level_pct"],
                    source=self.source_tag,
                    dataset_version=item["dataset_version"],
                    last_updated=now,
                    ingestion_time=now,
                    quality_status=item["quality_status"]
                )
                db.add(sd)
            count += 1
            
        db.commit()
        return count
