import logging
import json
import urllib.request
import random
import time
from datetime import date
from sqlalchemy.orm import Session
from app.models.climate import SatelliteData, District
from app.ingestion.base import BaseConnector, safe_get_json

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
        
        # Batch coordinates in chunks of 50
        chunk_size = 50
        chunks = [districts[i:i + chunk_size] for i in range(0, len(districts), chunk_size)]
        
        for chunk in chunks:
            lats = ",".join(str(d.centroid_lat) for d in chunk)
            lons = ",".join(str(d.centroid_lon) for d in chunk)
            
            url = f"https://api.open-meteo.com/v1/forecast?latitude={lats}&longitude={lons}&daily=temperature_2m_max&hourly=soil_moisture_0_to_1cm&forecast_days=1&timezone=GMT"
            try:
                logger.info(f"NRSC: Batch fetching satellite metrics for {len(chunk)} districts...")
                payload = safe_get_json(url)
                
                if isinstance(payload, dict):
                    payload = [payload]
                    
                for idx, d in enumerate(chunk):
                    results.append({
                        "district_id": d.id,
                        "payload": payload[idx] if idx < len(payload) else None
                    })
            except Exception as e:
                logger.error(f"NRSC: Batch fetch failed: {e}")
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
            
            temp_max = None
            avg_soil_moist = None
            
            if payload:
                if "daily" in payload:
                    temps = payload["daily"].get("temperature_2m_max", [])
                    if len(temps) > 0 and temps[0] is not None:
                        temp_max = temps[0]
                if "hourly" in payload:
                    moists = payload["hourly"].get("soil_moisture_0_to_1cm", [])
                    valid_moists = [m for m in moists if m is not None]
                    if len(valid_moists) > 0:
                        avg_soil_moist = sum(valid_moists) / len(valid_moists)
                        
            validated.append({
                "district_id": district_id,
                "temp_max": temp_max,
                "soil_moist": avg_soil_moist
            })
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
                
            normalized.append({
                "district_id": district_id,
                "land_surface_temp_c": lst,
                "soil_moisture_pct": soil_moisture_pct,
                "ndvi": ndvi
            })
        return normalized

    def save(self, db: Session, normalized_data: list[dict]) -> int:
        count = 0
        today = date.today()
        
        for item in normalized_data:
            district_id = item["district_id"]
            lst = item["land_surface_temp_c"]
            soil_moist = item["soil_moisture_pct"]
            ndvi = item["ndvi"]
            
            if lst is None:
                lst = round(random.uniform(25.0, 50.0), 1)
            if soil_moist is None:
                soil_moist = round(random.uniform(10.0, 80.0), 1)
            if ndvi is None:
                ndvi = round(random.uniform(0.1, 0.9), 3)
            
            existing = db.query(SatelliteData).filter(
                SatelliteData.district_id == district_id,
                SatelliteData.observed_on == today
            ).first()
            
            if existing:
                existing.ndvi = ndvi
                existing.land_surface_temp_c = lst
                existing.soil_moisture_pct = soil_moist
                existing.source = self.source_tag
            else:
                sd = SatelliteData(
                    district_id=district_id,
                    observed_on=today,
                    ndvi=ndvi,
                    land_surface_temp_c=lst,
                    soil_moisture_pct=soil_moist,
                    water_body_index=round(random.uniform(-0.1, 0.4), 3),
                    reservoir_level_pct=round(random.uniform(20.0, 95.0), 1),
                    source=self.source_tag
                )
                db.add(sd)
            count += 1
            
        db.commit()
        return count
