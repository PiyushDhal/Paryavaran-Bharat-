import logging
from typing import Any
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

class BaseConnector:
    """Base interface for all Government Data source connectors."""

    name: str = "Base Connector"
    source_tag: str = "base-source"

    def fetch(self, **kwargs) -> Any:
        """Fetch raw data from the official API or a local fallback dataset."""
        raise NotImplementedError

    def validate(self, raw_data: Any) -> list[dict]:
        """Validate raw data and return a list of valid records."""
        raise NotImplementedError

    def normalize(self, validated_data: list[dict]) -> list[dict]:
        """Normalize units (e.g., K to C) and field names."""
        raise NotImplementedError

    def save(self, db: Session, normalized_data: list[dict]) -> int:
        """Store or update records in the PostgreSQL database, avoiding duplicates."""
        raise NotImplementedError

    def run(self, db: Session, **kwargs) -> int:
        """Execute the full ingestion pipeline."""
        logger.info(f"Starting ingestion pipeline for {self.name}")
        raw_data = self.fetch(**kwargs)
        validated = self.validate(raw_data)
        normalized = self.normalize(validated)
        records_saved = self.save(db, normalized)
        logger.info(f"Completed ingestion for {self.name}. Saved {records_saved} records.")
        return records_saved
