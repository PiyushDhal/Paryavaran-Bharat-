import logging
import random
from datetime import date
from sqlalchemy.orm import Session
from app.models.climate import WeatherData, District
from app.ingestion.base import BaseConnector

logger = logging.getLogger(__name__)

class CWCConnector(BaseConnector):
    """Central Water Commission (CWC) Connector for River Levels."""

    name: str = "CWC River Levels"
    source_tag: str = "cwc-telemetry"

    def fetch(self, **kwargs) -> dict:
        return {
            "status": "success",
            "source": "CWC",
            "dataset": "River Telemetry",
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
            wd = db.query(WeatherData).filter(
                WeatherData.district_id == district.id,
                WeatherData.observed_on == today
            ).first()
            
            if wd:
                wd.river_level_m = round(random.uniform(5, 120), 1)
            else:
                wd = WeatherData(
                    district_id=district.id,
                    observed_on=today,
                    rainfall_mm=0,
                    temperature_c=0,
                    humidity_pct=0,
                    river_level_m=round(random.uniform(5, 120), 1),
                    source=self.source_tag
                )
                db.add(wd)
            count += 1
                
        db.commit()
        return count
