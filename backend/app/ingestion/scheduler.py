import logging
import sys
import os

# Ensure project root is in python search path
sys.path.append(os.path.join(os.path.dirname(__file__), "../.."))

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.user import User # Resolve User mapper dependency

from app.ingestion.imd import IMDConnector
from app.ingestion.nrsc import NRSCConnector
from app.ingestion.cpcb import CPCBConnector
from app.ingestion.cwc import CWCConnector
from app.ingestion.wris import WRISConnector

logger = logging.getLogger(__name__)

def run_all_ingestions():
    """Run all configured ingestion pipelines."""
    connectors = [
        IMDConnector(),
        NRSCConnector(),
        CPCBConnector(),
        CWCConnector(),
        WRISConnector()
    ]
    
    db: Session = SessionLocal()
    try:
        logger.info("Starting global data ingestion pipeline.")
        total_records = 0
        for connector in connectors:
            records = connector.run(db)
            total_records += records
            
        logger.info(f"Global ingestion complete. Saved {total_records} records.")
    except Exception as e:
        logger.error(f"Global ingestion failed: {str(e)}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run_all_ingestions()
