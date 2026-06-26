from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.api.deps import get_optional_user
from app.db.session import get_db
from app.models.climate import District, SatelliteData, SimulationResult, WeatherData
from app.models.user import User
from app.schemas.climate import ScenarioRequest, ScenarioResult
from app.services.simulation import ScenarioSimulator

router = APIRouter(prefix="/simulations", tags=["simulations"])
simulator = ScenarioSimulator()


@router.post("/run", response_model=ScenarioResult)
def run_simulation(
    payload: ScenarioRequest,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_optional_user),
) -> ScenarioResult:
    district_id = payload.district_id
    if district_id is None:
        district = db.query(District).first()
        district_id = district.id
    district = db.get(District, district_id)
    if not district:
        raise HTTPException(status_code=404, detail="District not found")
    weather = (
        db.query(WeatherData)
        .filter(WeatherData.district_id == district_id)
        .order_by(desc(WeatherData.observed_on))
        .first()
    )
    satellite = (
        db.query(SatelliteData)
        .filter(SatelliteData.district_id == district_id)
        .order_by(desc(SatelliteData.observed_on))
        .first()
    )
    baseline = {
        "rainfall_mm": weather.rainfall_mm if weather else 115.0,
        "rainfall_deficit_pct": weather.rainfall_deficit_pct if weather else -2.5,
        "temperature_c": weather.temperature_c if weather else 31.5,
        "humidity_pct": weather.humidity_pct if weather else 65.0,
        "river_level_m": weather.river_level_m if weather else 2.1,
        "soil_moisture_pct": weather.soil_moisture_pct if weather else 42.0,
        "ndvi": satellite.ndvi if satellite else 0.42,
        "reservoir_level_pct": satellite.reservoir_level_pct if satellite else 48.0,
    }
    scenario = payload.model_dump()
    results = simulator.run(baseline, scenario)
    saved = SimulationResult(
        user_id=user.id if user else None,
        district_id=district_id,
        scenario=scenario,
        results=results,
    )
    db.add(saved)
    db.commit()
    return ScenarioResult(scenario=scenario, results=results)
