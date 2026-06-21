import json
import logging
import time
import os
import urllib.request
from datetime import date, datetime, timezone
from sqlalchemy.orm import Session
from app.models.climate import SatelliteData, District
from app.ingestion.base import BaseConnector, safe_get_json

logger = logging.getLogger(__name__)

class WRISConnector(BaseConnector):
    """India-WRIS Connector for Reservoir Levels."""

    name: str = "India-WRIS Reservoir Data"
    source_tag: str = "wris-open-meteo"

    def fetch(self, **kwargs) -> list[dict]:
        db = kwargs.get("db")
        if not db:
            logger.error("Database session is required for WRIS fetch.")
            return []
            
        districts = db.query(District).all()
        results = []
        
        # Batch coordinates in chunks of 50
        chunk_size = 50
        chunks = [districts[i:i + chunk_size] for i in range(0, len(districts), chunk_size)]
        
        for chunk in chunks:
            lats = ",".join(str(d.centroid_lat) for d in chunk)
            lons = ",".join(str(d.centroid_lon) for d in chunk)
            
            url = f"https://api.open-meteo.com/v1/forecast?latitude={lats}&longitude={lons}&daily=precipitation_sum&forecast_days=1&timezone=GMT"
            try:
                logger.info(f"WRIS: Batch fetching reservoir precipitation proxies from Open-Meteo for {len(chunk)} districts...")
                payload = safe_get_json(url)
                
                if isinstance(payload, (dict, list)):
                    payload_list = payload if isinstance(payload, list) else [payload]
                    
                    for idx, d in enumerate(chunk):
                        results.append({
                            "district_id": d.id,
                            "payload": payload_list[idx] if idx < len(payload_list) else None,
                            "dataset_version": "open-meteo-v1",
                            "quality_status": "estimated"
                        })
            except Exception as e:
                logger.error(f"WRIS: Batch fetch failed: {e}")
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
                precips = daily.get("precipitation_sum", [])
                
                if len(precips) > 0 and precips[0] is not None:
                    validated.append({
                        "district_id": district_id,
                        "precip": float(precips[0]),
                        "dataset_version": item.get("dataset_version"),
                        "quality_status": item.get("quality_status")
                    })
            except (ValueError, TypeError) as e:
                logger.warning(f"WRIS: Invalid data format for district {district_id}: {e}")
                
        return validated

    def normalize(self, validated_data: list[dict]) -> list[dict]:
        normalized = []
        for item in validated_data:
            precip = item["precip"]
            
            res_level = None
            if precip is not None:
                val = 45.0 + precip * 2.5
                res_level = round(min(100.0, max(10.0, val)), 1)
                
            normalized.append({
                "district_id": item["district_id"],
                "reservoir_level_pct": res_level,
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
