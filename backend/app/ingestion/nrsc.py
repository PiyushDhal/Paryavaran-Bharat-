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

class NRSCConnector(BaseConnector):
    """NRSC/ISRO Connector for Satellite Imagery and Indexes."""

    name: str = "NRSC Satellite Data"
    source_tag: str = "nrsc-bhuvan"

    def fetch(self, **kwargs) -> list[dict]:
        db = kwargs.get("db")
        if not db:
            logger.error("Database session is required for NRSC fetch.")
            return []
            
        districts = db.query(District).all()
        results = []
        
        api_url = os.environ.get("NRSC_API_URL")
        api_key = os.environ.get("NRSC_API_KEY")
        
        if api_url and api_key:
            logger.info("NRSC: Fetching from official API...")
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
                logger.error(f"NRSC: API fetch failed: {e}")
                
        logger.info("NRSC: Falling back to local dataset nrsc_data.json...")
        dataset = load_local_dataset("nrsc_data.json")
        if dataset:
            for d in districts:
                district_data = dataset.get(d.code)
                if district_data:
                    results.append({"district_id": d.id, "payload": district_data, "dataset_version": "local-dataset-v1", "quality_status": "verified"})
                else:
                    results.append({"district_id": d.id, "payload": None, "dataset_version": None, "quality_status": "missing"})
            return results
            
        logger.error("NRSC: Both API and local dataset fetch failed. No data to ingest.")
        return []

    def validate(self, raw_data: list[dict]) -> list[dict]:
        validated = []
        for item in raw_data:
            district_id = item["district_id"]
            payload = item["payload"]
            
            if not payload:
                continue
                
            try:
                ndvi = payload.get("ndvi")
                lst = payload.get("land_surface_temp_c")
                soil = payload.get("soil_moisture_pct")
                wbi = payload.get("water_body_index")
                
                if ndvi is not None and lst is not None and soil is not None and wbi is not None:
                    validated.append({
                        "district_id": district_id,
                        "ndvi": float(ndvi),
                        "land_surface_temp_c": float(lst),
                        "soil_moisture_pct": float(soil),
                        "water_body_index": float(wbi),
                        "dataset_version": item.get("dataset_version"),
                        "quality_status": item.get("quality_status")
                    })
                else:
                    logger.warning(f"NRSC: Missing required fields for district {district_id}")
            except (ValueError, TypeError) as e:
                logger.warning(f"NRSC: Invalid data format for district {district_id}: {e}")
                
        return validated

    def normalize(self, validated_data: list[dict]) -> list[dict]:
        return validated_data

    def save(self, db: Session, normalized_data: list[dict]) -> int:
        count = 0
        today = date.today()
        now = datetime.now(timezone.utc)
        
        for item in normalized_data:
            district_id = item["district_id"]
            
            existing = db.query(SatelliteData).filter(
                SatelliteData.district_id == district_id,
                SatelliteData.observed_on == today
            ).first()
            
            if existing:
                existing.ndvi = item["ndvi"]
                existing.land_surface_temp_c = item["land_surface_temp_c"]
                existing.soil_moisture_pct = item["soil_moisture_pct"]
                existing.water_body_index = item["water_body_index"]
                existing.source = self.source_tag
                existing.dataset_version = item["dataset_version"]
                existing.last_updated = now
                existing.ingestion_time = now
                existing.quality_status = item["quality_status"]
            else:
                # WRIS might update reservoir_level_pct, set it to 0.0 initially here
                sd = SatelliteData(
                    district_id=district_id,
                    observed_on=today,
                    ndvi=item["ndvi"],
                    land_surface_temp_c=item["land_surface_temp_c"],
                    soil_moisture_pct=item["soil_moisture_pct"],
                    water_body_index=item["water_body_index"],
                    reservoir_level_pct=0.0,
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
