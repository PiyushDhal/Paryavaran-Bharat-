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

        result_payload = {
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
        result_payload["ai_analysis"] = self.generate_ai_analysis(scenario, result_payload)
        return result_payload

    def generate_ai_analysis(self, payload: dict, result: dict) -> dict:
        cr = result.get("composite_risk", 50.0)
        alert_level = "critical" if cr >= 75 else "high" if cr >= 55 else "moderate" if cr >= 35 else "low"
        
        drivers = []
        if abs(payload.get("rainfall_delta_pct") or 0.0) > 20:
            drivers.append("Extreme rainfall anomaly")
        if (payload.get("temperature_delta_c") or 0.0) > 2:
            drivers.append("Critical temperature rise")
        if (payload.get("heatwave_duration_days") or 0.0) > 20:
            drivers.append("Prolonged heatwave duration")
        if (payload.get("river_level_delta_m") or 0.0) > 2:
            drivers.append("Dangerous river level surge")
        if (payload.get("cyclone_intensity_delta_pct") or 0.0) > 30:
            drivers.append("High-intensity cyclonic activity")
        if (payload.get("urbanization_delta_pct") or 0.0) > 15:
            drivers.append("Rapid urban heat island effect")
        if (payload.get("groundwater_delta_m") or 0.0) < -10:
            drivers.append("Critical groundwater depletion")
        if (payload.get("forest_cover_delta_pct") or 0.0) < -10:
            drivers.append("Severe deforestation pressure")
            
        if not drivers:
            drivers = ["Multiple moderate stressors", "Climate variability baseline"]
            
        vulnerable_zones = []
        if result.get("flood_risk", 50.0) > 60:
            vulnerable_zones.append("Low-lying river floodplains")
        if result.get("drought_risk", 50.0) > 60:
            vulnerable_zones.append("Rainfed agricultural belts")
        if result.get("heatwave_risk", 50.0) > 65:
            vulnerable_zones.append("Dense urban residential zones")
        if result.get("water_stress_risk", 50.0) > 60:
            vulnerable_zones.append("Water-scarce semi-arid regions")
            
        if not vulnerable_zones:
            vulnerable_zones = ["Coastal estuaries", "Hill-slope micro-watersheds"]
            
        recommendations = []
        if result.get("flood_risk", 50.0) > 55:
            recommendations.extend([
                "Activate SDMA flood early-warning cascade protocols",
                "Pre-position emergency response teams at flood-prone corridors"
            ])
        if result.get("drought_risk", 50.0) > 55:
            recommendations.extend([
                "Issue contingency drought advisory for rainfed agricultural blocks",
                "Enforce Minimum Support Price for drought-affected kharif crops"
            ])
        if result.get("heatwave_risk", 50.0) > 60:
            recommendations.extend([
                "Establish district-level cooling center network in high-density wards",
                "Restrict outdoor labor during 11 AM–4 PM window in affected zones"
            ])
        if result.get("water_stress_risk", 50.0) > 55:
            recommendations.extend([
                "Prioritize micro-irrigation scheme rollout in water-stress blocks",
                "Initiate aquifer recharge through rainwater harvesting mandates"
            ])
            
        if len(recommendations) < 3:
            recommendations.extend([
                "Monitor composite risk trajectory on 7-day rolling basis",
                "Update public utility contingency plans with latest projections"
            ])
            
        headline = (
            f"CRITICAL: {drivers[0]} is driving composite climate risk to dangerous levels. Immediate multi-agency response required."
            if cr >= 75
            else f"HIGH RISK: Elevated {drivers[0].lower()} detected. Proactive intervention required within 7 days."
            if cr >= 55
            else "MODERATE: Climate indicators show elevated stress under current scenario. Monitor and prepare contingency responses."
            if cr >= 35
            else "LOW RISK: Scenario parameters remain within manageable bounds. Standard monitoring protocols sufficient."
        )
        
        return {
            "headline": headline,
            "confidence": min(96, 72 + len(drivers) * 4),
            "drivers": drivers,
            "vulnerableZones": vulnerable_zones,
            "recommendations": recommendations,
            "alertLevel": alert_level
        }

