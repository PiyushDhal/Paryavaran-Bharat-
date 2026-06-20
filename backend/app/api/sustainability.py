from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from pydantic import BaseModel
from typing import Any
from app.db.session import get_db
from app.models.climate import District, State, WeatherData, SatelliteData, RiskScore

router = APIRouter(prefix="/climate", tags=["climate"])

DISTRICT_METADATA = {
    101: {"climate_zone": "Tropical", "risk_category": "Flood Prone"},
    102: {"climate_zone": "Semi-Arid", "risk_category": "Water Stressed"},
    103: {"climate_zone": "Semi-Arid", "risk_category": "Safe"},
    201: {"climate_zone": "Humid", "risk_category": "Flood Prone"},
    202: {"climate_zone": "Humid", "risk_category": "Flood Prone"},
    203: {"climate_zone": "Humid", "risk_category": "Flood Prone"},
    301: {"climate_zone": "Semi-Arid", "risk_category": "Heatwave Prone"},
    302: {"climate_zone": "Semi-Arid", "risk_category": "Heatwave Prone"},
    303: {"climate_zone": "Arid", "risk_category": "Drought Prone"},
    401: {"climate_zone": "Tropical", "risk_category": "Flood Prone"},
    402: {"climate_zone": "Tropical", "risk_category": "Water Stressed"},
    501: {"climate_zone": "Arid", "risk_category": "Drought Prone"},
    502: {"climate_zone": "Tropical", "risk_category": "Safe"},
    601: {"climate_zone": "Tropical", "risk_category": "Water Stressed"},
    701: {"climate_zone": "Humid", "risk_category": "Flood Prone"},
    702: {"climate_zone": "Humid", "risk_category": "Flood Prone"}
}

class SustainabilitySimRequest(BaseModel):
    forest_health: float
    air_quality_score: float
    water_sustainability: float
    avg_soil: float
    climate_resilience: float
    reforest_rate: float
    ev_share: float
    renewables_share: float
    recycle_rate: float

@router.get("/analytics/metrics")
def get_analytics_metrics(
    year: int,
    state_id: int | None = None,
    district_id: int | None = None,
    climate_zone: str | None = None,
    risk_category: str | None = None,
    db: Session = Depends(get_db)
):
    district_ids = [d.id for d in db.query(District).all()]
    if district_id:
        district_ids = [district_id]
    else:
        if state_id:
            district_ids = [d.id for d in db.query(District).filter(District.state_id == state_id).all()]
        if climate_zone:
            district_ids = [d_id for d_id in district_ids if DISTRICT_METADATA.get(d_id, {}).get("climate_zone") == climate_zone]
        if risk_category:
            district_ids = [d_id for d_id in district_ids if DISTRICT_METADATA.get(d_id, {}).get("risk_category") == risk_category]

    query = (
        db.query(
            WeatherData.observed_on,
            func.avg(WeatherData.temperature_c),
            func.avg(WeatherData.rainfall_mm),
            func.avg(WeatherData.aqi),
            func.avg(SatelliteData.reservoir_level_pct),
            func.avg(SatelliteData.ndvi),
            func.avg(WeatherData.soil_moisture_pct),
        )
        .join(
            SatelliteData,
            (SatelliteData.district_id == WeatherData.district_id)
            & (SatelliteData.observed_on == WeatherData.observed_on),
        )
        .filter(WeatherData.district_id.in_(district_ids))
    )
    if year:
        query = query.filter(extract("year", WeatherData.observed_on) == year)

    rows = query.group_by(WeatherData.observed_on).order_by(WeatherData.observed_on).all()

    month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    monthly_data = []
    for r in rows:
        obs_on = r[0]
        month_name = month_names[obs_on.month - 1]
        monthly_data.append({
            "date": month_name,
            "observed_on": obs_on.isoformat(),
            "temperature_c": round(float(r[1]), 1) if r[1] is not None else 0.0,
            "rainfall_mm": round(float(r[2]), 1) if r[2] is not None else 0.0,
            "aqi": round(float(r[3]), 1) if r[3] is not None else 0.0,
            "reservoir_level_pct": round(float(r[4]), 1) if r[4] is not None else 50.0,
            "ndvi": round(float(r[5]), 3) if r[5] is not None else 0.5,
            "soil_moisture_pct": round(float(r[6]), 1) if r[6] is not None else 30.0,
        })

    if not monthly_data:
        metrics = {
            "avgTemp": 27.8,
            "avgRain": 980,
            "avgAqi": 80,
            "avgReservoir": 50,
            "avgNdvi": 0.5,
            "avgSoil": 30,
            "compositeIndex": 50,
            "envHealthScore": 50,
            "waterSustainability": 50,
            "forestHealth": 50,
            "biodiversity": 50,
            "airQualityScore": 50,
            "carbonImpact": 50,
            "renewableEnergy": 50,
            "climateResilience": 50,
            "waterStress": 50,
            "greenInfrastructure": 50,
            "avgRisk": 50,
            "avgFlood": 50,
            "avgDrought": 50,
            "avgHeat": 50,
            "avgWater": 50,
        }
    else:
        avg_temp = sum(m["temperature_c"] for m in monthly_data) / len(monthly_data)
        avg_rain = sum(m["rainfall_mm"] for m in monthly_data) / len(monthly_data)
        avg_aqi = sum(m["aqi"] for m in monthly_data) / len(monthly_data)
        avg_reservoir = sum(m["reservoir_level_pct"] for m in monthly_data) / len(monthly_data)
        avg_ndvi = sum(m["ndvi"] for m in monthly_data) / len(monthly_data)
        avg_soil = sum(m["soil_moisture_pct"] for m in monthly_data) / len(monthly_data)

        risk_scores = (
            db.query(RiskScore)
            .filter(RiskScore.district_id.in_(district_ids))
            .filter(extract("year", RiskScore.valid_on) == year)
            .all()
        )

        avg_risk = 50.0
        avg_flood = 50.0
        avg_drought = 50.0
        avg_heat = 50.0
        avg_water = 50.0

        if risk_scores:
            avg_risk = sum(r.composite_risk for r in risk_scores) / len(risk_scores)
            avg_flood = sum(r.flood_risk for r in risk_scores) / len(risk_scores)
            avg_drought = sum(r.drought_risk for r in risk_scores) / len(risk_scores)
            avg_heat = sum(r.heatwave_risk for r in risk_scores) / len(risk_scores)
            avg_water = sum(r.water_stress_risk for r in risk_scores) / len(risk_scores)

        ndvi_score = round(avg_ndvi * 100)
        aqi_score = max(0, min(100, round(100 - (avg_aqi - 50) * 0.4)))
        reservoir_score = round(avg_reservoir)
        safety_score = round(100 - avg_risk)
        soil_score = max(10, min(100, round(100 - avg_drought * 0.8)))

        composite_index = round(ndvi_score * 0.25 + aqi_score * 0.2 + reservoir_score * 0.2 + safety_score * 0.2 + soil_score * 0.15)
        env_health_score = round(ndvi_score * 0.4 + aqi_score * 0.3 + soil_score * 0.3)
        water_sustainability = reservoir_score
        forest_health = ndvi_score
        biodiversity = min(100, max(15, round(ndvi_score * 1.1 - (100 - safety_score) * 0.1)))
        carbon_impact = max(10, min(95, round(100 - (ndvi_score * 0.6 + (100 - aqi_score) * 0.4))))
        renewable_energy = min(100, max(10, round(safety_score * 0.7 + reservoir_score * 0.3)))
        climate_resilience = safety_score
        green_infrastructure = round((ndvi_score + reservoir_score) / 2)

        metrics = {
            "avgTemp": round(avg_temp, 1),
            "avgRain": round(avg_rain),
            "avgAqi": round(avg_aqi),
            "avgReservoir": round(avg_reservoir),
            "avgNdvi": round(avg_ndvi, 2),
            "avgSoil": round(avg_soil),
            "compositeIndex": composite_index,
            "envHealthScore": env_health_score,
            "waterSustainability": water_sustainability,
            "forestHealth": forest_health,
            "biodiversity": biodiversity,
            "airQualityScore": aqi_score,
            "carbonImpact": carbon_impact,
            "renewableEnergy": renewable_energy,
            "climateResilience": climate_resilience,
            "waterStress": round(avg_water),
            "greenInfrastructure": green_infrastructure,
            "avgRisk": round(avg_risk),
            "avgFlood": round(avg_flood),
            "avgDrought": round(avg_drought),
            "avgHeat": round(avg_heat),
            "avgWater": round(avg_water)
        }

    name = "National aggregate"
    if district_id:
        d = db.query(District).filter(District.id == district_id).first()
        if d:
            name = d.name
    elif state_id:
        s = db.query(State).filter(State.id == state_id).first()
        if s:
            name = s.name

    summary = f"Sustainability indicators for {name} in {year} AD are evaluated at a composite index score of {metrics['compositeIndex']}/100. "
    drivers = ["Thermal variations pushing grid adaptations", "Hydrological storage conditions", "Vegetative carbon capture variance"]
    positives = ["Baseline air quality index within targets", "Safe boundaries for reservoir headroom"]
    negatives = ["Rising convective heat waves during pre-monsoon", "Depleting ground moisture indicators"]
    recommendations = [
        "Launch extensive Miyawaki mini-forest grids near high-density blocks to optimize carbon capture.",
        "Deploy localized block-level rainwater harvesting basins to arrest hydrological depletion.",
        "Incentivize grid-connected solar power transitions to reduce industrial carbon loads.",
        "Restrict groundwater drafts in semi-arid zones to safeguard aquifer pressures."
    ]

    if metrics["compositeIndex"] < 55:
        summary += "The ecosystem shows high vulnerability due to a combination of high climatic hazard risk and low ecological adaptation buffer. Urgent structural adjustments are advised."
        drivers = ["Prolonged dry soil index profiles", "High urban thermal heatwaves", "Low surface water reserve levels"]
        negatives = ["Critical groundwater drawdowns", "Severe vegetative thermal stress (depleted NDVI)"]
        recommendations.insert(0, "Establish absolute municipal water-rationing protocols and clean-air corridors.")
    elif metrics["compositeIndex"] >= 72:
        summary += "The ecosystem shows strong climate resilience and excellent environmental resource management, maintaining rich ecological buffers against seasonal climatic hazards."
        positives = ["High canopy carbon density (elevated NDVI)", "Stable river run-off profiles", "Optimum aquifer replenishment"]
        recommendations.append("Establish local green bonds to finance community-level biodiversity sanctuaries.")
    else:
        summary += "The ecosystem is currently stable, showing moderate resilience against seasonal climatic hazards. Focus should remain on maintaining vegetation shields."

    ai_insights = {
        "summary": summary,
        "drivers": drivers,
        "positives": positives,
        "negatives": negatives,
        "recommendations": recommendations
    }

    return {
        "monthlyData": monthly_data,
        "metrics": metrics,
        "aiInsights": ai_insights
    }

@router.post("/analytics/sustainability/simulate")
def simulate_sustainability(payload: SustainabilitySimRequest):
    years = [2026, 2030, 2040, 2050]
    simulated_data = []

    for y in years:
        time_factor = max(0.0, (y - 2026) / 25.0)

        base_forest = max(10.0, payload.forest_health - time_factor * 8.0)
        base_aqi_score = max(10.0, payload.air_quality_score - time_factor * 12.0)
        base_water = max(10.0, payload.water_sustainability - time_factor * 15.0)
        base_soil = max(10.0, payload.avg_soil - time_factor * 10.0)
        base_resilience = max(10.0, payload.climate_resilience - time_factor * 10.0)

        base_composite = round(
            base_forest * 0.25 + base_aqi_score * 0.2 + base_water * 0.2 + base_resilience * 0.2 + base_soil * 0.15
        )

        simulated_forest = min(100.0, round(
            payload.forest_health - time_factor * 8.0 + (payload.reforest_rate - 15.0) * 0.4 * time_factor
        ))
        simulated_aqi_score = min(100.0, round(
            payload.air_quality_score - time_factor * 12.0 + (payload.ev_share - 20.0) * 0.3 * time_factor + (payload.renewables_share - 30.0) * 0.2 * time_factor
        ))
        simulated_water = min(100.0, round(
            payload.water_sustainability - time_factor * 15.0 + (payload.recycle_rate - 25.0) * 0.5 * time_factor
        ))
        simulated_soil = min(100.0, round(
            payload.avg_soil - time_factor * 10.0 + (payload.reforest_rate - 15.0) * 0.15 * time_factor
        ))
        simulated_resilience = min(100.0, round(
            payload.climate_resilience - time_factor * 10.0 + (payload.renewables_share - 30.0) * 0.25 * time_factor
        ))

        simulated_composite = round(
            simulated_forest * 0.25 + simulated_aqi_score * 0.2 + simulated_water * 0.2 + simulated_resilience * 0.2 + simulated_soil * 0.15
        )

        simulated_data.append({
            "year": f"{y}",
            "Baseline": base_composite,
            "Simulated Path": simulated_composite,
            "Forest": simulated_forest,
            "Water": simulated_water,
            "AirQuality": simulated_aqi_score
        })

    return simulated_data
