import urllib.request
import urllib.error
import json
import time
import logging
from typing import Any
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

def safe_get_json(url: str, retries: int = 5, backoff: float = 2.0) -> Any:
    """Fetch JSON from URL with exponential backoff on HTTP 429 rate limiting."""
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=15) as response:
                return json.loads(response.read().decode('utf-8'))
        except urllib.error.HTTPError as e:
            if e.code == 429:
                sleep_time = backoff * (2 ** attempt)
                logger.warning(f"HTTP 429: Rate limited. Retrying in {sleep_time:.1f}s (Attempt {attempt+1}/{retries})...")
                time.sleep(sleep_time)
            else:
                logger.error(f"HTTP Error {e.code} for URL: {url} - {e.reason}")
                raise e
        except Exception as e:
            logger.error(f"Request failed for URL: {url} - {e}")
            if attempt < retries - 1:
                sleep_time = backoff * (2 ** attempt)
                time.sleep(sleep_time)
            else:
                raise e
    raise Exception(f"Failed to fetch data from URL after {retries} retries.")

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
        raw_data = self.fetch(db=db, **kwargs)
        validated = self.validate(raw_data)
        normalized = self.normalize(validated)
        records_saved = self.save(db, normalized)
        logger.info(f"Completed ingestion for {self.name}. Saved {records_saved} records.")
        return records_saved

