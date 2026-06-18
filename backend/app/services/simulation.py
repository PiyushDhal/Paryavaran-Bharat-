from __future__ import annotations

from app.services.risk_engine import ClimateRiskEngine
from app.services.sample_data import clamp


class ScenarioSimulator:
    def __init__(self) -> None:
        self.risk_engine = ClimateRiskEngine()

    def run(self, baseline: dict, scenario: dict) -> dict:
        adjusted = dict(baseline)
        
        # Scenario Inputs
        rainfall_delta_pct = scenario.get("rainfall_delta_pct", 0.0)
        temperature_delta_c = scenario.get("temperature_delta_c", 0.0)
        reservoir_delta_pct = scenario.get("reservoir_delta_pct", 0.0)
        planning_horizon_years = scenario.get("planning_horizon_years", 5)
        
        humidity_delta_pct = scenario.get("humidity_delta_pct", 0.0)
        river_level_delta_m = scenario.get("river_level_delta_m", 0.0)
        soil_moisture_delta_pct = scenario.get("soil_moisture_delta_pct", 0.0)
        groundwater_delta_m = scenario.get("groundwater_delta_m", 0.0)
        forest_cover_delta_pct = scenario.get("forest_cover_delta_pct", 0.0)
        urbanization_delta_pct = scenario.get("urbanization_delta_pct", 0.0)
        population_growth_pct = scenario.get("population_growth_pct", 0.0)
        agricultural_land_delta_pct = scenario.get("agricultural_land_delta_pct", 0.0)
        wind_speed_delta_kmh = scenario.get("wind_speed_delta_kmh", 0.0)
        cyclone_intensity_delta_pct = scenario.get("cyclone_intensity_delta_pct", 0.0)
        heatwave_duration_days = scenario.get("heatwave_duration_days", 0.0)

        # Baseline adjustments
        adjusted["rainfall_mm"] = max(
            0.0, baseline["rainfall_mm"] * (1 + rainfall_delta_pct / 100)
        )
        adjusted["rainfall_deficit_pct"] = clamp(
            baseline["rainfall_deficit_pct"] - rainfall_delta_pct, -100, 100
        )
        adjusted["temperature_c"] = baseline["temperature_c"] + temperature_delta_c
        adjusted["humidity_pct"] = clamp(baseline["humidity_pct"] + humidity_delta_pct, 5, 100)
        adjusted["river_level_m"] = max(0.0, baseline["river_level_m"] + river_level_delta_m)
        
        adjusted["reservoir_level_pct"] = clamp(
            baseline.get("reservoir_level_pct", 50) * (1 + reservoir_delta_pct / 100)
        )
        adjusted["soil_moisture_pct"] = clamp(
            baseline["soil_moisture_pct"]
            + soil_moisture_delta_pct
            + rainfall_delta_pct * 0.22
            + reservoir_delta_pct * 0.08
            - temperature_delta_c * 2.5
        )
        adjusted["ndvi"] = clamp(
            baseline.get("ndvi", 0.45)
            + forest_cover_delta_pct * 0.005
            + rainfall_delta_pct * 0.002
            + reservoir_delta_pct * 0.001
            - temperature_delta_c * 0.015,
            0.0,
            1.0,
        )

        risk = self.risk_engine.calculate(adjusted)
        
        # Factor additional parameters into dynamic risk adjustments
        drought_risk = clamp(risk["drought_risk"] - groundwater_delta_m * 0.3 - forest_cover_delta_pct * 0.2 + heatwave_duration_days * 0.4)
        flood_risk = clamp(risk["flood_risk"] + river_level_delta_m * 6.0 + urbanization_delta_pct * 0.15 + cyclone_intensity_delta_pct * 0.2)
        heatwave_risk = clamp(risk["heatwave_risk"] + heatwave_duration_days * 0.5 + urbanization_delta_pct * 0.2)
        water_stress_risk = clamp(risk["water_stress_risk"] - groundwater_delta_m * 0.4 + population_growth_pct * 0.15)
        
        composite_risk = clamp(flood_risk * 0.3 + drought_risk * 0.3 + heatwave_risk * 0.2 + water_stress_risk * 0.2)

        water_availability = clamp(
            adjusted["reservoir_level_pct"] * 0.55 + adjusted["soil_moisture_pct"] * 0.45
        )
        crop_stress = clamp(100 - adjusted["ndvi"] * 100 + heatwave_risk * 0.25 - agricultural_land_delta_pct * 0.1)
        
        # Calculate impact indicators
        population = 500000.0  # fallback base
        population_at_risk = round(population * (composite_risk / 100.0) * (1 + population_growth_pct / 100.0), 0)
        economic_loss = round(population_at_risk * 420.0 + (flood_risk * 15.0 + drought_risk * 10.0) * (1 + urbanization_delta_pct / 100.0), 1)
        infra_risk = clamp(flood_risk * 0.4 + river_level_delta_m * 5.0 + urbanization_delta_pct * 0.2 + cyclone_intensity_delta_pct * 0.1)
        env_impact = clamp(100.0 - (forest_cover_delta_pct + soil_moisture_delta_pct * 0.2 + agricultural_land_delta_pct * 0.3) - (composite_risk * 0.35))

        return {
            "adjusted_climate": adjusted,
            "water_availability": round(water_availability, 1),
            "crop_stress": round(crop_stress, 1),
            "drought_risk": round(drought_risk, 1),
            "heatwave_risk": round(heatwave_risk, 1),
            "flood_risk": round(flood_risk, 1),
            "water_stress_risk": round(water_stress_risk, 1),
            "composite_risk": round(composite_risk, 1),
            "population_at_risk": int(population_at_risk),
            "economic_loss_m_inr": round(economic_loss / 1000.0, 2),
            "infrastructure_risk": round(infra_risk, 1),
            "environmental_impact_score": round(env_impact, 1),
            "map_overlay": {
                "type": "scenario",
                "severity": "high" if composite_risk > 70 else "moderate" if composite_risk > 40 else "low",
                "opacity": 0.72,
                "legend": "Projected composite climate risk",
            },
        }
