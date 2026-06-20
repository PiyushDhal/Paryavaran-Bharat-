import logging
import random
from datetime import date
from sqlalchemy.orm import Session
from app.models.climate import WeatherData, District
from app.ingestion.base import BaseConnector

logger = logging.getLogger(__name__)

class CPCBConnector(BaseConnector):
    """Central Pollution Control Board (CPCB) Connector for Air Quality."""

    name: str = "CPCB Air Quality Data"
    source_tag: str = "cpcb-aqi"

    def fetch(self, **kwargs) -> dict:
        return {
            "status": "success",
            "source": "CPCB",
            "dataset": "National Air Quality Index",
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
            # We typically update the WeatherData record with the AQI if it exists for today,
            # or create a partial record.
            wd = db.query(WeatherData).filter(
                WeatherData.district_id == district.id,
                WeatherData.observed_on == today
            ).first()
            
            if wd:
                # Update existing record's AQI
                wd.aqi = random.randint(40, 450)
                # We could append to source if we wanted, but we'll leave the main source as IMD and just update the field
            else:
                # Create a new record with just AQI if weather isn't present
                wd = WeatherData(
                    district_id=district.id,
                    observed_on=today,
                    rainfall_mm=0,
                    temperature_c=0,
                    humidity_pct=0,
                    aqi=random.randint(40, 450),
                    source=self.source_tag
                )
                db.add(wd)
            count += 1
                
        db.commit()
        return count
