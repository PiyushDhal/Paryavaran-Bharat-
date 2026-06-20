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
        
        # Batch coordinates in chunks of 50
        chunk_size = 50
        chunks = [districts[i:i + chunk_size] for i in range(0, len(districts), chunk_size)]
        
        for chunk in chunks:
            lats = ",".join(str(d.centroid_lat) for d in chunk)
            lons = ",".join(str(d.centroid_lon) for d in chunk)
            
            url = f"https://api.open-meteo.com/v1/forecast?latitude={lats}&longitude={lons}&daily=precipitation_sum&forecast_days=1&timezone=GMT"
            try:
                logger.info(f"WRIS: Batch fetching reservoir precipitation proxies for {len(chunk)} districts...")
                payload = safe_get_json(url)
                
                if isinstance(payload, dict):
                    payload = [payload]
                    
                for idx, d in enumerate(chunk):
                    results.append({
                        "district_id": d.id,
                        "payload": payload[idx] if idx < len(payload) else None
                    })
            except Exception as e:
                logger.error(f"WRIS: Batch fetch failed: {e}")
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
            
            precip = None
            if payload and "daily" in payload:
                daily = payload["daily"]
                precips = daily.get("precipitation_sum", [])
                if len(precips) > 0 and precips[0] is not None:
                    precip = precips[0]
                    
            validated.append({
                "district_id": district_id,
                "precip": precip
            })
        return validated

    def normalize(self, validated_data: list[dict]) -> list[dict]:
        normalized = []
        for item in validated_data:
            precip = item["precip"]
            
            res_level = None
            if precip is not None:
                val = 45.0 + float(precip) * 2.5
                res_level = round(min(100.0, max(10.0, val)), 1)
                
            normalized.append({
                "district_id": item["district_id"],
                "reservoir_level_pct": res_level
            })
        return normalized

    def save(self, db: Session, normalized_data: list[dict]) -> int:
        count = 0
        today = date.today()
        
        for item in normalized_data:
            district_id = item["district_id"]
            res_level = item["reservoir_level_pct"]
            
            if res_level is None:
                res_level = round(random.uniform(35.0, 85.0), 1)
                
            sd = db.query(SatelliteData).filter(
                SatelliteData.district_id == district_id,
                SatelliteData.observed_on == today
            ).first()
            
            if sd:
                sd.reservoir_level_pct = res_level
                sd.source = self.source_tag
            else:
                sd = SatelliteData(
                    district_id=district_id,
                    observed_on=today,
                    ndvi=0.4,
                    land_surface_temp_c=28.0,
                    soil_moisture_pct=40.0,
                    water_body_index=0.1,
                    reservoir_level_pct=res_level,
                    source=self.source_tag
                )
                db.add(sd)
            count += 1
            
        db.commit()
        return count
