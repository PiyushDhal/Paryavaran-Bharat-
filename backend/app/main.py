from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.api import admin, auth, climate, copilot, predictions, risk, simulations, timeline, sustainability
from app.core.config import get_settings
from app.db.base import Base
from app.db.init_db import init_db
from app.db.session import SessionLocal, engine

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="AI-powered digital twin API for India's climate risk system.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[str(origin) for origin in settings.backend_cors_origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


import logging
from alembic.config import Config
from alembic import command

logger = logging.getLogger(__name__)

def upgrade_db() -> None:
    logger.info("Applying database migrations via Alembic...")
    alembic_cfg = Config("alembic.ini")
    alembic_cfg.set_main_option("sqlalchemy.url", settings.database_url)
    
    try:
        command.upgrade(alembic_cfg, "head")
        logger.info("Database migrations applied successfully.")
    except Exception as err:
        logger.error(f"Alembic migration failed: {err}")
        if settings.seed_database:
            logger.warning("Attempting database schema recreation due to migration failure...")
            try:
                Base.metadata.drop_all(bind=engine)
                command.upgrade(alembic_cfg, "head")
                logger.info("Database schema recreated and migrated to head successfully.")
            except Exception as drop_err:
                logger.critical(f"Failed to recreate database schema: {drop_err}")
                Base.metadata.create_all(bind=engine)
        else:
            raise err

@app.on_event("startup")
def on_startup() -> None:
    if settings.seed_database:
        if "sqlite" not in settings.database_url:
            with engine.begin() as connection:
                connection.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
        
        upgrade_db()
        
        db = SessionLocal()
        try:
            init_db(db)
        finally:
            db.close()


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "bharat-climate-twin-api"}


app.include_router(auth.router, prefix=settings.api_v1_prefix)
app.include_router(climate.router, prefix=settings.api_v1_prefix)
app.include_router(timeline.router, prefix=settings.api_v1_prefix)
app.include_router(sustainability.router, prefix=settings.api_v1_prefix)
app.include_router(risk.router, prefix=settings.api_v1_prefix)
app.include_router(predictions.router, prefix=settings.api_v1_prefix)
app.include_router(simulations.router, prefix=settings.api_v1_prefix)
app.include_router(copilot.router, prefix=settings.api_v1_prefix)
app.include_router(admin.router, prefix=settings.api_v1_prefix)
