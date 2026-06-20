from datetime import date, datetime
from typing import Any

from geoalchemy2 import Geometry
from sqlalchemy import Date, DateTime, Float, ForeignKey, Index, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.config import get_settings
from app.models.base import Base, TimestampMixin

settings = get_settings()


class State(Base, TimestampMixin):
    __tablename__ = "states"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    code: Mapped[str] = mapped_column(String(8), unique=True, nullable=False)
    centroid_lat: Mapped[float] = mapped_column(Float, nullable=False)
    centroid_lon: Mapped[float] = mapped_column(Float, nullable=False)
    boundary_geojson: Mapped[dict[str, Any] | None] = mapped_column(JSON)

    districts = relationship("District", back_populates="state")


class District(Base, TimestampMixin):
    __tablename__ = "districts"
    __table_args__ = (
        Index("ix_districts_state_name", "state_id", "name"),
        Index("ix_districts_geom", "geom", postgresql_using="gist"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    state_id: Mapped[int] = mapped_column(ForeignKey("states.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    code: Mapped[str] = mapped_column(String(16), unique=True, nullable=False)
    population: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    area_sq_km: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    centroid_lat: Mapped[float] = mapped_column(Float, nullable=False)
    centroid_lon: Mapped[float] = mapped_column(Float, nullable=False)
    if "sqlite" in settings.database_url:
        geom = mapped_column(Text, nullable=True)
    else:
        geom = mapped_column(Geometry(geometry_type="MULTIPOLYGON", srid=4326), nullable=True)
    boundary_geojson: Mapped[dict[str, Any] | None] = mapped_column(JSON)

    state = relationship("State", back_populates="districts")
    weather = relationship("WeatherData", back_populates="district")
    satellite = relationship("SatelliteData", back_populates="district")
    risk_scores = relationship("RiskScore", back_populates="district")
    predictions = relationship("Prediction", back_populates="district")
    alerts = relationship("ClimateAlert", back_populates="district")


class WeatherData(Base, TimestampMixin):
    __tablename__ = "weather_data"
    __table_args__ = (Index("ix_weather_district_observed", "district_id", "observed_on"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    district_id: Mapped[int] = mapped_column(ForeignKey("districts.id"), nullable=False)
    observed_on: Mapped[date] = mapped_column(Date, nullable=False)
    rainfall_mm: Mapped[float] = mapped_column(Float, nullable=False)
    rainfall_deficit_pct: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    temperature_c: Mapped[float] = mapped_column(Float, nullable=False)
    humidity_pct: Mapped[float] = mapped_column(Float, nullable=False)
    river_level_m: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    soil_moisture_pct: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    aqi: Mapped[int] = mapped_column(Integer, default=60, nullable=False)
    source: Mapped[str] = mapped_column(String(80), default="mock-imd", nullable=False)

    district = relationship("District", back_populates="weather")


class SatelliteData(Base, TimestampMixin):
    __tablename__ = "satellite_data"
    __table_args__ = (Index("ix_satellite_district_observed", "district_id", "observed_on"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    district_id: Mapped[int] = mapped_column(ForeignKey("districts.id"), nullable=False)
    observed_on: Mapped[date] = mapped_column(Date, nullable=False)
    ndvi: Mapped[float] = mapped_column(Float, nullable=False)
    land_surface_temp_c: Mapped[float] = mapped_column(Float, nullable=False)
    soil_moisture_pct: Mapped[float] = mapped_column(Float, nullable=False)
    water_body_index: Mapped[float] = mapped_column(Float, nullable=False)
    reservoir_level_pct: Mapped[float] = mapped_column(Float, nullable=False)
    source: Mapped[str] = mapped_column(String(80), default="mock-nrsc", nullable=False)

    district = relationship("District", back_populates="satellite")


class RiskScore(Base, TimestampMixin):
    __tablename__ = "risk_scores"
    __table_args__ = (Index("ix_risk_district_valid", "district_id", "valid_on"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    district_id: Mapped[int] = mapped_column(ForeignKey("districts.id"), nullable=False)
    valid_on: Mapped[date] = mapped_column(Date, nullable=False)
    flood_risk: Mapped[float] = mapped_column(Float, nullable=False)
    drought_risk: Mapped[float] = mapped_column(Float, nullable=False)
    heatwave_risk: Mapped[float] = mapped_column(Float, nullable=False)
    water_stress_risk: Mapped[float] = mapped_column(Float, nullable=False)
    composite_risk: Mapped[float] = mapped_column(Float, nullable=False)
    trend: Mapped[str] = mapped_column(String(24), default="stable", nullable=False)
    drivers: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)

    district = relationship("District", back_populates="risk_scores")


class Prediction(Base, TimestampMixin):
    __tablename__ = "predictions"
    __table_args__ = (Index("ix_prediction_district_type_valid", "district_id", "prediction_type", "valid_for"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    district_id: Mapped[int] = mapped_column(ForeignKey("districts.id"), nullable=False)
    prediction_type: Mapped[str] = mapped_column(String(40), nullable=False)
    probability: Mapped[float] = mapped_column(Float, nullable=False)
    risk_zone: Mapped[str] = mapped_column(String(40), nullable=False)
    model_name: Mapped[str] = mapped_column(String(80), nullable=False)
    model_version: Mapped[str] = mapped_column(String(30), default="mock-v1", nullable=False)
    valid_for: Mapped[date] = mapped_column(Date, nullable=False)
    inputs: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    explanation: Mapped[str] = mapped_column(Text, default="", nullable=False)

    district = relationship("District", back_populates="predictions")


class SimulationResult(Base, TimestampMixin):
    __tablename__ = "simulation_results"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    district_id: Mapped[int | None] = mapped_column(ForeignKey("districts.id"), nullable=True)
    scenario: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    results: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)

    user = relationship("User", back_populates="simulations")


class ChatHistory(Base, TimestampMixin):
    __tablename__ = "chat_history"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    response: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)

    user = relationship("User", back_populates="chats")


class ClimateAlert(Base, TimestampMixin):
    __tablename__ = "climate_alerts"

    id: Mapped[int] = mapped_column(primary_key=True)
    district_id: Mapped[int] = mapped_column(ForeignKey("districts.id"), nullable=False)
    severity: Mapped[str] = mapped_column(String(20), nullable=False)
    alert_type: Mapped[str] = mapped_column(String(60), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    issued_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    district = relationship("District", back_populates="alerts")
