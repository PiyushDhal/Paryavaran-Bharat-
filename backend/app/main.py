import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.api import admin, auth, climate, copilot, predictions, risk, simulations, timeline, sustainability
from app.core.config import get_settings
from app.db.base import Base
from app.db.init_db import init_db
from app.db.session import SessionLocal, engine

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

settings = get_settings()


def upgrade_db() -> None:
    from alembic.config import Config
    from alembic import command

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


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ──────────────────────────────────────────────────────────
    logger.info("=== Paryavaran Bharat API — Starting Up ===")

    # Initialize and validate Gemini API Key
    from app.services.gemini import gemini_service
    try:
        gemini_service.initialize()
        if not gemini_service.validate_key():
            logger.error("[STARTUP ERROR] GEMINI_API_KEY validation failed during startup! Live API requests may fail.")
        else:
            logger.info("[STARTUP] GEMINI_API_KEY validated successfully.")
    except Exception as e:
        logger.error(f"[STARTUP ERROR] Gemini service initialization failed: {e}")

    try:
        if settings.seed_database:
            if "sqlite" not in settings.database_url:
                try:
                    with engine.begin() as connection:
                        connection.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
                except Exception as postgis_err:
                    logger.error(f"PostGIS extension creation failed: {postgis_err}")

            try:
                upgrade_db()
            except Exception as upgrade_err:
                logger.error(f"Database upgrade failed during startup: {upgrade_err}")

            db = SessionLocal()
            try:
                init_db(db)
                logger.info("Database seeding completed successfully.")
            except Exception as seed_err:
                logger.error(f"Database seeding failed: {seed_err}. Continuing startup.")
            finally:
                db.close()
    except Exception as startup_err:
        logger.critical(f"Uncaught exception during startup: {startup_err}. Continuing.")

    logger.info("=== Paryavaran Bharat API — Ready ===")
    yield
    # ── Shutdown ─────────────────────────────────────────────────────────
    logger.info("=== Paryavaran Bharat API — Shutting Down ===")


app = FastAPI(
    title=settings.app_name,
    version="2.0.0",
    description="AI-powered Paryavaran Bharat — India's Climate Intelligence Platform.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[str(origin) for origin in settings.backend_cors_origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    db_status = "healthy"
    db_err_detail = None
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as db_err:
        db_status = "unhealthy"
        db_err_detail = str(db_err)
        logger.error(f"Health check database connection failed: {db_err}")

    gemini_key = os.environ.get("GEMINI_API_KEY") or settings.gemini_api_key
    ai_status = "configured" if gemini_key else "unconfigured"
    overall_status = "healthy" if db_status == "healthy" else "degraded"

    return {
        "status": overall_status,
        "database": {
            "status": db_status,
            "error": db_err_detail,
        },
        "ai": {
            "status": ai_status,
            "provider": "Gemini",
        },
        "api": {
            "status": "online",
            "service": "paryavaran-bharat-api",
            "version": "2.0.0",
        },
        "deployment": {
            "environment": settings.environment,
        },
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


app.include_router(auth.router, prefix=settings.api_v1_prefix)
app.include_router(climate.router, prefix=settings.api_v1_prefix)
app.include_router(timeline.router, prefix=settings.api_v1_prefix)
app.include_router(sustainability.router, prefix=settings.api_v1_prefix)
app.include_router(risk.router, prefix=settings.api_v1_prefix)
app.include_router(predictions.router, prefix=settings.api_v1_prefix)
app.include_router(simulations.router, prefix=settings.api_v1_prefix)
app.include_router(copilot.router, prefix=settings.api_v1_prefix)
app.include_router(admin.router, prefix=settings.api_v1_prefix)
