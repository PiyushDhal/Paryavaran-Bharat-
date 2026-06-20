import logging
import random
from datetime import date
from sqlalchemy.orm import Session
from app.models.climate import SatelliteData, District
from app.ingestion.base import BaseConnector

logger = logging.getLogger(__name__)

class WRISConnector(BaseConnector):
    """India-WRIS Connector for Reservoir Levels."""

    name: str = "India-WRIS Reservoir Data"
    source_tag: str = "wris-reservoirs"

    def fetch(self, **kwargs) -> dict:
        return {
            "status": "success",
            "source": "India-WRIS",
            "dataset": "Reservoir Storage",
            "data": "mocked_payload"
        }

    def validate(self, raw_data: dict) -> list[dict]:
        if raw_data.get("status") != "success":
            return []
        return [{"valid": True}]

    def normalize(self, validated_data: list[dict]) -> list[dict]:
        return validated_data

    def save(self, db: Session, normalized_data: list[dict]) -> int:
        districts = db.query(District).all()
        count = 0
        today = date.today()
        
        for district in districts:
            sd = db.query(SatelliteData).filter(
                SatelliteData.district_id == district.id,
                SatelliteData.observed_on == today
            ).first()
            
            if sd:
                sd.reservoir_level_pct = round(random.uniform(10, 100), 1)
            else:
                sd = SatelliteData(
                    district_id=district.id,
                    observed_on=today,
                    ndvi=0,
                    land_surface_temp_c=0,
                    soil_moisture_pct=0,
                    water_body_index=0,
                    reservoir_level_pct=round(random.uniform(10, 100), 1),
                    source=self.source_tag
                )
                db.add(sd)
            count += 1
                
        db.commit()
        return count
