import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), "../.."))

from app.db.session import SessionLocal
from app.db.init_db import init_db
import logging

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    db = SessionLocal()
    try:
        print("Starting manual national database seeding...")
        init_db(db)
        print("Finished national seeding successfully!")
    finally:
        db.close()
