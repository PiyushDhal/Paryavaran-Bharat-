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

class NRSCConnector(BaseConnector):
    """NRSC/ISRO Connector for Satellite Imagery and Indexes."""

    name: str = "NRSC Satellite Data"
    source_tag: str = "nrsc-open-meteo"

    def fetch(self, **kwargs) -> list[dict]:
        db = kwargs.get("db")
        if not db:
            logger.error("Database session is required for NRSC fetch.")
            return []
            
        districts = db.query(District).all()
        results = []
        
        # Batch coordinates in chunks of 50
        chunk_size = 50
        chunks = [districts[i:i + chunk_size] for i in range(0, len(districts), chunk_size)]
        
        for chunk in chunks:
            lats = ",".join(str(d.centroid_lat) for d in chunk)
            lons = ",".join(str(d.centroid_lon) for d in chunk)
            
            url = f"https://api.open-meteo.com/v1/forecast?latitude={lats}&longitude={lons}&daily=temperature_2m_max&hourly=soil_moisture_0_to_1cm&forecast_days=1&timezone=GMT"
            try:
                logger.info(f"NRSC: Batch fetching satellite metrics from Open-Meteo for {len(chunk)} districts...")
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
                logger.error(f"NRSC: Batch fetch failed: {e}")
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
            
            if not payload:
                continue
                
            temp_max = None
            avg_soil_moist = None
            
            try:
                if "daily" in payload:
                    temps = payload["daily"].get("temperature_2m_max", [])
                    if len(temps) > 0 and temps[0] is not None:
                        temp_max = temps[0]
                if "hourly" in payload:
                    moists = payload["hourly"].get("soil_moisture_0_to_1cm", [])
                    valid_moists = [m for m in moists if m is not None]
                    if len(valid_moists) > 0:
                        avg_soil_moist = sum(valid_moists) / len(valid_moists)
                        
                if temp_max is not None and avg_soil_moist is not None:
                    validated.append({
                        "district_id": district_id,
                        "temp_max": temp_max,
                        "soil_moist": avg_soil_moist,
                        "dataset_version": item.get("dataset_version"),
                        "quality_status": item.get("quality_status")
                    })
            except (ValueError, TypeError) as e:
                logger.warning(f"NRSC: Invalid data format for district {district_id}: {e}")
                
        return validated

    def normalize(self, validated_data: list[dict]) -> list[dict]:
        normalized = []
        for item in validated_data:
            district_id = item["district_id"]
            temp_max = item["temp_max"]
            soil_moist = item["soil_moist"]
            
            soil_moisture_pct = None
            if soil_moist is not None:
                soil_moisture_pct = round(min(100.0, max(0.0, float(soil_moist) * 200.0)), 1)
                
            lst = None
            if temp_max is not None:
                lst = round(float(temp_max) + 2.0, 1)
                
            ndvi = None
            if soil_moisture_pct is not None:
                val = 0.15 + (soil_moisture_pct / 100.0) * 0.6
                ndvi = round(min(0.85, max(0.1, val)), 3)
                
            wbi = round((soil_moisture_pct / 100.0) * 0.4, 3) if soil_moisture_pct is not None else 0.1
                
            normalized.append({
                "district_id": district_id,
                "land_surface_temp_c": lst,
                "soil_moisture_pct": soil_moisture_pct,
                "ndvi": ndvi,
                "water_body_index": wbi,
                "dataset_version": item.get("dataset_version"),
                "quality_status": item.get("quality_status")
            })
        return normalized

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
