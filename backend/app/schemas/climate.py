from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, Field


class StateRead(BaseModel):
    id: int
    name: str
    code: str
    centroid_lat: float
    centroid_lon: float

    model_config = {"from_attributes": True}


class DistrictRead(BaseModel):
    id: int
    state_id: int
    state_name: str | None = None
    name: str
    code: str
    population: int
    area_sq_km: float
    centroid_lat: float
    centroid_lon: float
    boundary_geojson: dict[str, Any] | None = None

    model_config = {"from_attributes": True}


class ClimateObservation(BaseModel):
    observed_on: date
    rainfall_mm: float
    rainfall_deficit_pct: float
    temperature_c: float
    humidity_pct: float
    river_level_m: float
    soil_moisture_pct: float
    aqi: int
    ndvi: float | None = None
    reservoir_level_pct: float | None = None
    data_source: str | None = None
    last_updated: datetime | None = None
    dataset_version: str | None = None
    confidence: str | None = None


class RiskScoreRead(BaseModel):
    district_id: int
    district_name: str
    state_name: str
    valid_on: date
    flood_risk: float
    drought_risk: float
    heatwave_risk: float
    water_stress_risk: float
    composite_risk: float
    trend: str
    drivers: dict[str, Any]


class PredictionRequest(BaseModel):
    district_id: int
    rainfall_mm: float | None = None
    river_level_m: float | None = None
    soil_moisture_pct: float | None = None
    reservoir_capacity_pct: float | None = None
    rainfall_deficit_pct: float | None = None
    temperature_c: float | None = None
    ndvi: float | None = None
    humidity_pct: float | None = None


class PredictionRead(BaseModel):
    prediction_type: str
    probability: float
    risk_zone: str
    model_name: str
    model_version: str
    valid_for: date
    explanation: str
    inputs: dict[str, Any]


class ScenarioRequest(BaseModel):
    district_id: int | None = None
    rainfall_delta_pct: float = Field(default=0, ge=-100, le=100)
    temperature_delta_c: float = Field(default=0, ge=-10, le=10)
    reservoir_delta_pct: float = Field(default=0, ge=-100, le=100)
    planning_horizon_years: int = Field(default=5, ge=1, le=30)
    humidity_delta_pct: float = Field(default=0, ge=-100, le=100)
    river_level_delta_m: float = Field(default=0, ge=-10, le=10)
    soil_moisture_delta_pct: float = Field(default=0, ge=-100, le=100)
    groundwater_delta_m: float = Field(default=0, ge=-100, le=100)
    forest_cover_delta_pct: float = Field(default=0, ge=-100, le=100)
    urbanization_delta_pct: float = Field(default=0, ge=-100, le=100)
    population_growth_pct: float = Field(default=0, ge=-100, le=100)
    agricultural_land_delta_pct: float = Field(default=0, ge=-100, le=100)
    wind_speed_delta_kmh: float = Field(default=0, ge=-100, le=100)
    cyclone_intensity_delta_pct: float = Field(default=0, ge=-100, le=100)
    heatwave_duration_days: float = Field(default=0, ge=0, le=90)


class ScenarioResult(BaseModel):
    scenario: dict[str, Any]
    results: dict[str, Any]


class CopilotRequest(BaseModel):
    prompt: str = Field(min_length=2, max_length=1000)
    selected_district_id: int | None = None
    selected_state_name: str | None = None
    active_layer: str | None = None
    active_year: int | None = None
    timeline_step: str | None = None
    map_mode: str | None = None
    active_simulation: dict[str, Any] | None = None
    analytics_filters: dict[str, Any] | None = None
    chat_history: list[dict[str, Any]] | None = None
    selected_state_id: int | str | None = None
    selected_dataset: str | None = None
    active_risk: str | None = None
    current_report: dict[str, Any] | None = None



class CopilotResponse(BaseModel):
    explanation: str
    risk_analysis: str
    recommended_actions: list[str]
    chart: dict[str, Any]
    districts: list[dict[str, Any]]
    action: dict[str, Any] | None = None
    suggestions: list[str] | None = None
    explainable_risk: dict[str, Any] | None = None
    insights: list[str] | None = None


class AlertRead(BaseModel):
    id: int
    district: str
    state: str
    severity: str
    alert_type: str
    title: str
    message: str
    issued_at: datetime
