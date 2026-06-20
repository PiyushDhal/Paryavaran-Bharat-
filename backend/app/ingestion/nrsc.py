import logging
import random
from datetime import date
from sqlalchemy.orm import Session
from app.models.climate import SatelliteData, District
from app.ingestion.base import BaseConnector

logger = logging.getLogger(__name__)

class NRSCConnector(BaseConnector):
    """NRSC/ISRO Connector for Satellite Imagery and Indexes."""

    name: str = "NRSC Satellite Data"
    source_tag: str = "nrsc-bhuvan"

    def fetch(self, **kwargs) -> dict:
        return {
            "status": "success",
            "source": "NRSC Bhuvan",
            "dataset": "Vegetation and Surface Temperature",
            "data": "mocked_payload_ready_for_validation"
        }

    def validate(self, raw_data: dict) -> list[dict]:
        if raw_data.get("status") != "success":
            return []
        return [{"valid": True, "date": date.today().isoformat()}]

    def normalize(self, validated_data: list[dict]) -> list[dict]:
        return validated_data

    def save(self, db: Session, normalized_data: list[dict]) -> int:
        districts = db.query(District).all()
        count = 0
        today = date.today()
        
        for district in districts:
            existing = db.query(SatelliteData).filter(
                SatelliteData.district_id == district.id,
                SatelliteData.observed_on == today,
                SatelliteData.source == self.source_tag
            ).first()
            
            if not existing:
                sd = SatelliteData(
                    district_id=district.id,
                    observed_on=today,
                    ndvi=round(random.uniform(0.1, 0.9), 3),
                    land_surface_temp_c=round(random.uniform(25, 50), 1),
                    soil_moisture_pct=round(random.uniform(10, 80), 1),
                    water_body_index=round(random.uniform(-0.5, 0.5), 3),
                    reservoir_level_pct=round(random.uniform(20, 100), 1),
                    source=self.source_tag
                )
                db.add(sd)
                count += 1
                
        db.commit()
        return count
