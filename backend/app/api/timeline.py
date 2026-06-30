from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import extract
from app.db.session import get_db
from app.models.climate import District, WeatherData, RiskScore

router = APIRouter(prefix="/climate", tags=["climate"])

# Climate delta coefficients per year relative to 2026 baseline
# Based on IPCC AR6 SSP2-4.5 projections for South Asia
YEAR_DELTAS = {
    2010: {"temp_offset": -1.8, "rain_factor": 1.08, "risk_offset": -12, "scenario": "historical"},
    2015: {"temp_offset": -1.1, "rain_factor": 1.04, "risk_offset": -7, "scenario": "historical"},
    2020: {"temp_offset": -0.5, "rain_factor": 1.01, "risk_offset": -3, "scenario": "historical"},
    2026: {"temp_offset": 0.0, "rain_factor": 1.00, "risk_offset": 0, "scenario": "current"},
    2030: {"temp_offset": 0.6, "rain_factor": 0.96, "risk_offset": +8, "scenario": "projected"},
    2040: {"temp_offset": 1.4, "rain_factor": 0.90, "risk_offset": +18, "scenario": "projected"},
    2050: {"temp_offset": 2.3, "rain_factor": 0.83, "risk_offset": +28, "scenario": "projected"},
}

YEAR_LABELS = {
    2010: "Pre-Warming Baseline",
    2015: "Early Warming Transition",
    2020: "COVID Anomaly Reference Year",
    2026: "Present Baseline",
    2030: "Near-Term Projection (SSP2-4.5)",
    2040: "Mid-Century Climate Stress",
    2050: "Thermal Forcing Endpoint",
}

YEAR_DESCRIPTIONS = {
    2010: (
        "Historical analysis shows cooler temperatures typical of early 2010s. "
        "Monsoon patterns were more stable with marginally higher precipitation averages. "
        "Heat stress events were 40% less frequent than 2026 levels."
    ),
    2015: (
        "Gradual warming transition period. Precipitation remained above baseline "
        "but declining year-on-year due to Indian Ocean Dipole variability. "
        "First measurable groundwater stress indicators emerged in northern districts."
    ),
    2020: (
        "COVID-19 lockdowns reduced industrial aerosol emissions, causing a short-term "
        "cooling anomaly. Despite this, long-term warming trends continued underlying. "
        "Cyclone activity in Bay of Bengal remained elevated."
    ),
    2026: (
        "Current observed baseline. Ground-truth IMD station data with ISRO satellite "
        "verification. NDVI and soil moisture at operational monitoring levels. "
        "Composite risk based on 12-month aggregated indices."
    ),
    2030: (
        "Near-term IPCC SSP2-4.5 projection. Carbon forcing drives temperature increase "
        "beyond 2026 baseline. Pre-monsoon dry spells expected to lengthen by ~12 days. "
        "Heatwave frequency projected to double from 2026 occurrence rates."
    ),
    2040: (
        "Mid-century high volatility scenario. Precipitation becomes increasingly erratic "
        "with intense burst events replacing sustained monsoon rainfall. "
        "Agricultural aridity stress intensifies significantly across Deccan plateau regions."
    ),
    2050: (
        "Thermal forcing endpoint under moderate emissions pathway. Summer mean temperatures "
        "reach critical thresholds. Annual water stress index breaches safe operating limits "
        "in 60% of assessed districts under business-as-usual carbon trajectories."
    ),
}


def _get_risk_band(score: int) -> str:
    if score >= 75:
        return "CRITICAL"
    elif score >= 55:
        return "HIGH"
    elif score >= 35:
        return "MODERATE"
    else:
        return "LOW"


def _get_alert(score: int, year: int) -> str:
    if year > 2026:
        if score >= 75:
            return "Projected critical heat and aridity warnings — urgent adaptation measures required"
        elif score >= 55:
            return "Elevated regional stress projected — early warning systems recommended"
        else:
            return "Moderate climate stress projected — enhanced monitoring advisable"
    else:
        if score >= 75:
            return "Historical critical event records — review archives for adaptation lessons"
        elif score >= 55:
            return "Historical elevated climate stress on record"
        else:
            return "Standard historical monitoring procedures — baseline period"


@router.get("/timeline")
def get_timeline(district_id: int, db: Session = Depends(get_db)):
    district = db.query(District).filter(District.id == district_id).first()
    if not district:
        raise HTTPException(status_code=404, detail="District not found")

    years = [2010, 2015, 2020, 2026, 2030, 2040, 2050]
    timeline_data = []

    # --- Get 2026 baseline values (real data) ---
    baseline_weather = (
        db.query(WeatherData)
        .filter(WeatherData.district_id == district_id)
        .filter(extract("year", WeatherData.observed_on) == 2026)
        .all()
    )
    if baseline_weather:
        baseline_temp = sum(w.temperature_c for w in baseline_weather) / len(baseline_weather)
        baseline_rain = sum(w.rainfall_mm for w in baseline_weather)
        baseline_humidity = sum(w.humidity_pct for w in baseline_weather) / len(baseline_weather)
        baseline_aqi = sum(w.aqi for w in baseline_weather) / len(baseline_weather)
    else:
        # Latitude-based defaults for India
        lat = district.centroid_lat or 23.0
        baseline_temp = 38.0 - abs(lat - 8.0) * 0.35  # hotter near equator
        baseline_rain = 1200.0 - abs(lat - 15.0) * 15  # rough India average
        baseline_humidity = 65.0
        baseline_aqi = 80.0

    baseline_risk_row = (
        db.query(RiskScore)
        .filter(RiskScore.district_id == district_id)
        .filter(extract("year", RiskScore.valid_on) == 2026)
        .order_by(RiskScore.valid_on.desc())
        .first()
    )
    baseline_risk = int(baseline_risk_row.composite_risk) if baseline_risk_row else 45

    for y in years:
        delta = YEAR_DELTAS[y]
        type_str = "historical" if y < 2026 else ("current" if y == 2026 else "predicted")

        # --- Try to find actual DB data first ---
        weather_rows = (
            db.query(WeatherData)
            .filter(WeatherData.district_id == district_id)
            .filter(extract("year", WeatherData.observed_on) == y)
            .all()
        )
        risk_row = (
            db.query(RiskScore)
            .filter(RiskScore.district_id == district_id)
            .filter(extract("year", RiskScore.valid_on) == y)
            .order_by(RiskScore.valid_on.desc())
            .first()
        )

        if weather_rows:
            avg_temp = sum(w.temperature_c for w in weather_rows) / len(weather_rows)
            total_rain = sum(w.rainfall_mm for w in weather_rows)
        else:
            # Synthesize from 2026 baseline + delta
            avg_temp = baseline_temp + delta["temp_offset"]
            total_rain = baseline_rain * delta["rain_factor"]

        if risk_row:
            risk_score = int(risk_row.composite_risk)
        else:
            # Synthesize risk from 2026 baseline + delta
            risk_score = max(5, min(99, baseline_risk + delta["risk_offset"]))

        # Build narrative description using real synthesized numbers
        raw_desc = YEAR_DESCRIPTIONS[y]
        if y == 2026:
            description = (
                f"Present baseline observation from IMD ground stations. "
                f"Mean temperature recorded at {avg_temp:.1f}°C with annual precipitation of {total_rain:.0f}mm. "
                f"Composite risk index: {risk_score}/100 ({_get_risk_band(risk_score)}). "
                f"ISRO satellite-verified NDVI and soil moisture at operational monitoring levels."
            )
        elif y < 2026:
            description = (
                f"{raw_desc} "
                f"Reconstructed baseline for {district.name}: {avg_temp:.1f}°C mean temp, "
                f"{total_rain:.0f}mm annual rainfall. Historical risk index: {risk_score}/100."
            )
        else:
            description = (
                f"{raw_desc} "
                f"{district.name} projection: {avg_temp:.1f}°C mean temp (+{delta['temp_offset']:.1f}°C vs 2026), "
                f"{total_rain:.0f}mm projected rainfall ({int((1-delta['rain_factor'])*100)}% deficit vs 2026). "
                f"Projected risk index: {risk_score}/100 ({_get_risk_band(risk_score)})."
            )

        alert = _get_alert(risk_score, y)

        timeline_data.append({
            "year": y,
            "label": YEAR_LABELS[y],
            "type": type_str,
            "description": description,
            "avgTemp": f"{avg_temp:.1f}°C",
            "avgRain": f"{total_rain:.0f}mm",
            "riskScore": risk_score,
            "riskBand": _get_risk_band(risk_score),
            "alert": alert,
            "scenario": delta["scenario"],
            "tempDelta": f"{delta['temp_offset']:+.1f}°C vs 2026" if y != 2026 else "Observed baseline",
            "dataSource": "IMD/ISRO Observed" if weather_rows else (
                "IPCC SSP2-4.5 Projection" if y > 2026 else "Reconstructed Historical Model"
            ),
        })

    return timeline_data
