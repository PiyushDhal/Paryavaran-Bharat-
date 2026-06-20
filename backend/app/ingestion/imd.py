import logging
import random
from datetime import date
from sqlalchemy.orm import Session
from app.models.climate import WeatherData, District
from app.ingestion.base import BaseConnector

logger = logging.getLogger(__name__)

class IMDConnector(BaseConnector):
    """India Meteorological Department (IMD) Connector for Weather Data."""

    name: str = "IMD Weather Data"
    source_tag: str = "imd-observation"

    def fetch(self, **kwargs) -> dict:
        # In a production scenario, this would make an HTTP request to IMD APIs.
        # Fallback: Generate structured realistic mock data mimicking IMD grid.
        return {
            "status": "success",
            "source": "India Meteorological Department",
            "dataset": "Gridded Daily Weather",
            "data": "mocked_payload_ready_for_validation"
        }

    def validate(self, raw_data: dict) -> list[dict]:
        if raw_data.get("status") != "success":
            logger.warning("IMD API returned non-success status.")
            return []
        # Return dummy validation items for demonstration
        return [{"valid": True, "date": date.today().isoformat()}]

    def normalize(self, validated_data: list[dict]) -> list[dict]:
        # Perform unit conversions here if necessary
        return validated_data

    def save(self, db: Session, normalized_data: list[dict]) -> int:
        # Mocking the actual DB insertion logic for the hackathon pipeline
        # Fetching all districts to attach some synthetic IMD observations
        districts = db.query(District).all()
        count = 0
        today = date.today()
        
        for district in districts:
            # Check for duplicate
            existing = db.query(WeatherData).filter(
                WeatherData.district_id == district.id,
                WeatherData.observed_on == today,
                WeatherData.source == self.source_tag
            ).first()
            
            if not existing:
                # Add new record
                wd = WeatherData(
                    district_id=district.id,
                    observed_on=today,
                    rainfall_mm=round(random.uniform(0, 150), 1),
                    temperature_c=round(random.uniform(20, 45), 1),
                    humidity_pct=round(random.uniform(30, 95), 1),
                    source=self.source_tag
                )
                db.add(wd)
                count += 1
                
        db.commit()
        return count
