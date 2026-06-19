from __future__ import annotations

from app.core.utils import clamp


def risk_band(score: float) -> str:
    if score >= 80:
        return "critical"
    if score >= 60:
        return "high"
    if score >= 35:
        return "moderate"
    return "low"


class ClimateRiskEngine:
    """Transparent baseline risk engine; replace weights as calibrated models mature."""

    def calculate(self, observation: dict) -> dict:
        rainfall = observation["rainfall_mm"]
        deficit = observation["rainfall_deficit_pct"]
        temperature = observation["temperature_c"]
        humidity = observation["humidity_pct"]
        river = observation["river_level_m"]
        soil = observation["soil_moisture_pct"]
        ndvi = observation.get("ndvi", 0.45)
        reservoir = observation.get("reservoir_level_pct", 50)

        flood = clamp(rainfall * 0.22 + river * 8 + soil * 0.35 + reservoir * 0.08)
        drought = clamp(max(deficit, 0) * 0.65 + (100 - soil) * 0.22 + (0.55 - ndvi) * 55)
        heatwave = clamp((temperature - 30) * 7.5 + max(0, humidity - 55) * 0.35)
        water_stress = clamp((100 - reservoir) * 0.45 + (100 - soil) * 0.32 + max(deficit, 0) * 0.35)
        composite = clamp(flood * 0.28 + drought * 0.28 + heatwave * 0.22 + water_stress * 0.22)

        drivers = {
            "rainfall_mm": rainfall,
            "rainfall_deficit_pct": deficit,
            "temperature_c": temperature,
            "river_level_m": river,
            "soil_moisture_pct": soil,
            "ndvi": ndvi,
            "reservoir_level_pct": reservoir,
            "aqi": observation.get("aqi", 100),
            "water_body_index": observation.get("water_body_index", 0.4),
            "dominant_risk": max(
                [
                    ("flood", flood),
                    ("drought", drought),
                    ("heatwave", heatwave),
                    ("water_stress", water_stress),
                ],
                key=lambda item: item[1],
            )[0],
        }
        trend = "rising" if composite > 65 else "stable" if composite > 35 else "easing"
        return {
            "flood_risk": round(flood, 1),
            "drought_risk": round(drought, 1),
            "heatwave_risk": round(heatwave, 1),
            "water_stress_risk": round(water_stress, 1),
            "composite_risk": round(composite, 1),
            "trend": trend,
            "band": risk_band(composite),
            "drivers": drivers,
        }
