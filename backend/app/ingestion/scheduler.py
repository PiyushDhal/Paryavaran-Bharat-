import logging
import sys
import os
import time
from datetime import datetime, timedelta

# Ensure project root is in python search path
sys.path.append(os.path.join(os.path.dirname(__file__), "../.."))

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.user import User

from app.ingestion.imd import IMDConnector
from app.ingestion.nrsc import NRSCConnector
from app.ingestion.cpcb import CPCBConnector
from app.ingestion.cwc import CWCConnector
from app.ingestion.wris import WRISConnector

# Setup ingestion logging
log_dir = os.path.join(os.path.dirname(__file__), "../../logs")
os.makedirs(log_dir, exist_ok=True)
ingestion_logger = logging.getLogger("ingestion")
ingestion_logger.setLevel(logging.INFO)
file_handler = logging.FileHandler(os.path.join(log_dir, "ingestion.log"))
formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
file_handler.setFormatter(formatter)
ingestion_logger.addHandler(file_handler)

def run_job(connector, db):
    start_time = time.time()
    ingestion_logger.info(f"Starting ingestion for {connector.name}")
    try:
        records_saved = connector.run(db)
        duration = time.time() - start_time
        ingestion_logger.info(f"SUCCESS: {connector.name} - Saved {records_saved} records in {duration:.2f}s")
    except Exception as e:
        ingestion_logger.error(f"FAILURE: {connector.name} - Exception: {e}")

def run_scheduler():
    """Run ingestion pipelines at configured frequencies."""
    jobs = [
        {"connector": IMDConnector(), "interval": timedelta(hours=6), "last_run": None},
        {"connector": CPCBConnector(), "interval": timedelta(hours=1), "last_run": None},
        {"connector": CWCConnector(), "interval": timedelta(hours=1), "last_run": None},
        {"connector": WRISConnector(), "interval": timedelta(days=1), "last_run": None},
        {"connector": NRSCConnector(), "interval": timedelta(days=1), "last_run": None},
    ]
    
    ingestion_logger.info("Starting ingestion scheduler...")
    while True:
        now = datetime.now()
        db: Session = SessionLocal()
        
        try:
            for job in jobs:
                if job["last_run"] is None or (now - job["last_run"]) >= job["interval"]:
                    run_job(job["connector"], db)
                    job["last_run"] = datetime.now()
        finally:
            db.close()
            
        # Sleep for a short while before checking again
        time.sleep(60)

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run_scheduler()
