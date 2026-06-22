from __future__ import annotations
import os
import json
import urllib.request
import logging
from datetime import date, datetime
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, extract
from app.models.climate import District, State, RiskScore, ClimateAlert, WeatherData, SatelliteData, Prediction, SimulationResult
from app.schemas.climate import CopilotRequest
from app.services.prediction import DisasterPredictionService
from app.services.simulation import ScenarioSimulator

logger = logging.getLogger(__name__)

class ClimateCopilot:
    def __init__(self):
        self.prediction_service = DisasterPredictionService()
        self.simulator = ScenarioSimulator()

    def answer(self, payload: CopilotRequest, rankings: list[dict], db: Session) -> dict:
        prompt = payload.prompt
        text = prompt.lower()
        
        # Load active district if present
        active_district = None
        active_state = None
        if payload.selected_district_id:
            active_district = db.query(District).filter(District.id == payload.selected_district_id).first()
            if active_district:
                active_state = active_district.state

        # Look for state and district database lists
        db_states = db.query(State).all()
        db_districts = db.query(District).all()

        # If not resolved by district, load active state if state name is selected
        if not active_state and payload.selected_state_name:
            active_state = next((s for s in db_states if s.name.lower() == payload.selected_state_name.lower()), None)

        # Resolve mentioned district or state in current query
        mentioned_district = None
        mentioned_state = None
        
        # Look for state mentions in query
        for s in db_states:
            if s.name.lower() in text or (s.code and s.code.lower() in text.split()):
                mentioned_state = s
                break
                
        # Look for district mentions in query
        for d in db_districts:
            if d.name.lower() in text:
                mentioned_district = d
                break

        # If no active/mentioned district or state, look back in chat history to resolve targets
        if not active_district and not active_state and not mentioned_district and not mentioned_state and payload.chat_history:
            for msg in reversed(payload.chat_history):
                msg_text = msg.get("text", "").lower()
                # Check for state mention in history
                for s in db_states:
                    if s.name.lower() in msg_text or (s.code and s.code.lower() in msg_text.split()):
                        active_state = s
                        break
                if active_state:
                    break
                # Check for district mention in history
                for d in db_districts:
                    if d.name.lower() in msg_text:
                        active_district = d
                        active_state = d.state
                        break
                if active_district:
                    break

        # Check for Gemini API key
        api_key = os.environ.get("GEMINI_API_KEY")
        if api_key:
            # Let's try calling Gemini first
            response_data = self._call_gemini_api(payload, active_district, active_state, mentioned_district, mentioned_state, rankings, db, api_key)
            if response_data:
                return response_data

        # Fallback to local expert engine if Gemini is not configured or fails
        return self._generate_offline_answer(payload, active_district, active_state, mentioned_district, mentioned_state, rankings, db)

    def _call_gemini_api(self, payload: CopilotRequest, active_district, active_state, mentioned_district, mentioned_state, rankings, db: Session, api_key: str) -> dict | None:
        try:
            # Retrieve some telemetry data from DB to include in LLM context
            district_context = ""
            target_district = mentioned_district or active_district
            if target_district:
                weather = db.query(WeatherData).filter(WeatherData.district_id == target_district.id).order_by(desc(WeatherData.observed_on)).first()
                sat = db.query(SatelliteData).filter(SatelliteData.district_id == target_district.id).order_by(desc(SatelliteData.observed_on)).first()
                risk = db.query(RiskScore).filter(RiskScore.district_id == target_district.id).order_by(desc(RiskScore.valid_on)).first()
                
                if weather and sat and risk:
                    district_context = (
                        f"Target District Telemetry ({target_district.name}, {target_district.state.name}):\n"
                        f"- Temp: {weather.temperature_c}°C, Rainfall: {weather.rainfall_mm}mm, Deficit: {weather.rainfall_deficit_pct}%\n"
                        f"- Soil Moisture: {weather.soil_moisture_pct}%, AQI: {weather.aqi}, NDVI: {sat.ndvi}\n"
                        f"- Reservoir Level: {sat.reservoir_level_pct}%, Water Body Index: {sat.water_body_index}\n"
                        f"- Composite Risk: {risk.composite_risk}/100, Flood Risk: {risk.flood_risk}/100, Drought Risk: {risk.drought_risk}/100\n"
                        f"- Heatwave Risk: {risk.heatwave_risk}/100, Water Stress Risk: {risk.water_stress_risk}/100\n"
                        f"- Risk Trend: {risk.trend}\n"
                    )

            # Build rankings summary
            rankings_summary = "Current High-Risk Districts Rankings:\n"
            for r in rankings[:5]:
                rankings_summary += f"- {r.get('district_name') or r.get('district')} ({r.get('state_name') or r.get('state')}): Composite Risk {r.get('composite_risk')}/100 (Flood: {r.get('flood_risk')}, Drought: {r.get('drought_risk')})\n"

            # Build analytics filters description
            filters_context = "None"
            if payload.analytics_filters:
                filters_list = []
                for k, v in payload.analytics_filters.items():
                    if v:
                        filters_list.append(f"{k}: {v}")
                if filters_list:
                    filters_context = ", ".join(filters_list)

            # Build chat history context
            history_context = ""
            if payload.chat_history:
                history_context = "Recent Conversation History:\n"
                for msg in payload.chat_history:
                    role_name = "User" if msg.get("role") == "user" else "Officer"
                    text_content = msg.get("text", "")
                    history_context += f"- {role_name}: {text_content}\n"
                history_context += "\n"

            system_instruction = (
                "You are the **Bharat Climate Intelligence Officer**—a senior enterprise-grade climate analyst and decision-support officer working inside ISRO, NDMA, IMD, and NRSC.\n"
                "Your tone is highly analytical, evidence-based, context-aware, actionable, and professional. Do not use generic chat language.\n"
                "You must strictly output a valid JSON block containing the fields listed below. Do not wrap the JSON in ```json or any other text.\n"
                "\n"
                "Your instructions are:\n"
                "1. **Climate Intelligence Engine**: Do not just echo numbers (e.g. 'Temperature is 32C'). Instead, explain what they mean physically and socio-economically (e.g., thermal stress levels, risk of crop canopy drying, public health implications, or water reservoir depletion).\n"
                "2. **Decision Support System**: Provide concrete, actionable, and structured safety guidance, emergency priorities, resource allocations, farmer sowing recommendations, and long-term mitigation plans. If the user asks 'What should authorities do next?', structure a priority action plan spanning immediate, short-term, and long-term policies.\n"
                "3. **Scenario Simulator Integration**: If the context contains active simulation inputs and outputs under 'Active Simulation Inputs/Outputs', explain how the delta inputs (e.g. temperature delta, rainfall delta, reservoir delta) propagate to the socio-economic impacts (crop stress, water availability, infrastructure risk, population exposed, and estimated economic losses in INR). Formulate AI recommendations to mitigate this specific simulated climate scenario.\n"
                "\n"
                "JSON Schema required:\n"
                "{\n"
                '  "explanation": "Markdown description of the analysis, answers, and interpretations. Address the prompt directly. Incorporate telemetry data. Acknowledge and refer to context state, selected district/state, current layer, active year, simulation parameters, and conversation history context if the prompt is a follow-up or asks about them. Provide deep explanations of numbers instead of just listing them.",\n'
                '  "risk_analysis": "Explanation of what the risk values mean, explaining the physical drivers (soil moisture, temperature anomalies, reservoir levels, wind, humidity, river levels).",\n'
                '  "recommended_actions": ["List of 2 to 4 immediate, short-term, or long-term policy or operational interventions."],\n'
                '  "chart": { "type": "bar", "data": [{"district": "Region A", "risk": 45}] },\n'
                '  "districts": [],\n'
                '  "action": null,\n'
                '  "suggestions": ["Follow-up suggestion 1", "Follow-up suggestion 2"],\n'
                '  "explainable_risk": { "confidence": 92, "drivers": ["Driver 1"], "actions": ["Action 1"], "sources": ["IMD", "NRSC"] },\n'
                '  "insights": ["Takeaway 1", "Takeaway 2"]\n'
                "}\n\n"
                f"Active Context:\n"
                f"- Selected District: {active_district.name if active_district else 'None'}\n"
                f"- Selected State: {active_state.name if active_state else 'None'}\n"
                f"- Active Layer: {payload.active_layer}\n"
                f"- Active Year: {payload.active_year}\n"
                f"- Timeline Step: {payload.timeline_step}\n"
                f"- Map Mode: {payload.map_mode}\n"
                f"- Active Simulation Inputs/Outputs: {payload.active_simulation}\n"
                f"- Active Analytics Filters: {filters_context}\n\n"
                f"{history_context}"
                f"{district_context}\n"
                f"{rankings_summary}\n\n"
                "Generate the response for user prompt: " + payload.prompt
            )

            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
            body = {
                "contents": [{"parts": [{"text": system_instruction}]}],
                "generationConfig": {
                    "responseMimeType": "application/json"
                }
            }
            req = urllib.request.Request(
                url,
                data=json.dumps(body).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=10) as response:
                res_body = json.loads(response.read().decode("utf-8"))
                text_out = res_body["candidates"][0]["content"]["parts"][0]["text"].strip()
                # Remove any markdown formatting
                if text_out.startswith("```"):
                    text_out = text_out.split("\n", 1)[1].rsplit("\n", 1)[0]
                ans_dict = json.loads(text_out)
                
                # Make sure districts list is populated if missing
                if not ans_dict.get("districts") and rankings:
                    ans_dict["districts"] = rankings[:6]
                return ans_dict
        except Exception as e:
            logger.error(f"Error calling Gemini API: {e}")
            return None

    def _generate_offline_answer(self, payload: CopilotRequest, active_district, active_state, mentioned_district, mentioned_state, rankings, db: Session) -> dict:
        prompt = payload.prompt
        text = prompt.lower()

        # Initialize defaults
        explanation = ""
        risk_analysis = ""
        recommended_actions = []
        chart_type = "bar"
        chart_data = []
        focus_districts = rankings[:6] if rankings else []
        action = None
        suggestions = []
        explainable_risk = None
        insights = []

        # Target location context resolver
        target_district = mentioned_district or active_district
        target_state = mentioned_state or (active_state if not mentioned_district else None)

        # Prefetch telemetry variables for offline analyst explanation
        temp = 31.5
        rain = 115.0
        deficit = -2.5
        humidity = 65.0
        aqi = 75
        river = 2.1
        soil = 42.0
        ndvi = 0.42
        reservoir = 48.0
        comp_score = 45.0
        f_score = 40.0
        d_score = 50.0
        h_score = 35.0
        ws_score = 45.0
        trend = "stable"
        
        if target_district:
            weather = db.query(WeatherData).filter(WeatherData.district_id == target_district.id).order_by(desc(WeatherData.observed_on)).first()
            sat = db.query(SatelliteData).filter(SatelliteData.district_id == target_district.id).order_by(desc(SatelliteData.observed_on)).first()
            risk = db.query(RiskScore).filter(RiskScore.district_id == target_district.id).order_by(desc(RiskScore.valid_on)).first()
            if weather:
                temp = weather.temperature_c
                rain = weather.rainfall_mm
                deficit = weather.rainfall_deficit_pct
                humidity = weather.humidity_pct
                aqi = weather.aqi
                river = weather.river_level_m
                soil = weather.soil_moisture_pct
            if sat:
                ndvi = sat.ndvi
                reservoir = sat.reservoir_level_pct
            if risk:
                comp_score = risk.composite_risk
                f_score = risk.flood_risk
                d_score = risk.drought_risk
                h_score = risk.heatwave_risk
                ws_score = risk.water_stress_risk
                trend = risk.trend
        elif target_state:
            districts_in_state = db.query(District).filter(District.state_id == target_state.id).all()
            dist_ids = [d.id for d in districts_in_state]
            if dist_ids:
                comp_score = db.query(func.avg(RiskScore.composite_risk)).filter(RiskScore.district_id.in_(dist_ids)).scalar() or 50.0
                f_score = db.query(func.avg(RiskScore.flood_risk)).filter(RiskScore.district_id.in_(dist_ids)).scalar() or 40.0
                d_score = db.query(func.avg(RiskScore.drought_risk)).filter(RiskScore.district_id.in_(dist_ids)).scalar() or 40.0
                h_score = db.query(func.avg(RiskScore.heatwave_risk)).filter(RiskScore.district_id.in_(dist_ids)).scalar() or 35.0
                ws_score = db.query(func.avg(RiskScore.water_stress_risk)).filter(RiskScore.district_id.in_(dist_ids)).scalar() or 45.0

        # -------------------------------------------------------------
        # INTENT 1: Comparisons (PHASE 6)
        # -------------------------------------------------------------
        if "compare" in text or "versus" in text or " vs " in text:
            regions = []
            
            # Check for two states
            matched_states = []
            db_states = db.query(State).all()
            for s in db_states:
                if s.name.lower() in text:
                    matched_states.append(s)
            
            # Check for two districts
            matched_districts = []
            db_districts = db.query(District).all()
            for d in db_districts:
                if d.name.lower() in text:
                    matched_districts.append(d)

            # If comparing states
            if len(matched_states) >= 2:
                s1, s2 = matched_states[0], matched_states[1]
                avg1 = db.query(func.avg(RiskScore.composite_risk)).join(District).filter(District.state_id == s1.id).scalar() or 50.0
                avg2 = db.query(func.avg(RiskScore.composite_risk)).join(District).filter(District.state_id == s2.id).scalar() or 50.0
                
                # Fetch details for their capital districts
                d1 = db.query(District).filter(District.state_id == s1.id).first()
                d2 = db.query(District).filter(District.state_id == s2.id).first()
                
                f1 = db.query(func.avg(RiskScore.flood_risk)).join(District).filter(District.state_id == s1.id).scalar() or 40.0
                f2 = db.query(func.avg(RiskScore.flood_risk)).join(District).filter(District.state_id == s2.id).scalar() or 40.0
                
                dr1 = db.query(func.avg(RiskScore.drought_risk)).join(District).filter(District.state_id == s1.id).scalar() or 40.0
                dr2 = db.query(func.avg(RiskScore.drought_risk)).join(District).filter(District.state_id == s2.id).scalar() or 40.0
                
                better = s1.name if avg1 < avg2 else s2.name
                worse = s2.name if avg1 < avg2 else s1.name
                
                explanation = (
                    f"### Comparative Risk Assessment: {s1.name} vs {s2.name}\n\n"
                    f"A multi-district composite risk evaluation reveals key differences in environmental telemetry between the two regions.\n\n"
                    f"| Parameter (State Average) | {s1.name} | {s2.name} | Variance |\n"
                    f"| :--- | :---: | :---: | :---: |\n"
                    f"| **Composite Risk** | {round(avg1, 1)}/100 | {round(avg2, 1)}/100 | {round(abs(avg1-avg2), 1)} |\n"
                    f"| **Flood Risk Index** | {round(f1, 1)}/100 | {round(f2, 1)}/100 | {round(abs(f1-f2), 1)} |\n"
                    f"| **Drought Risk Index** | {round(dr1, 1)}/100 | {round(dr2, 1)}/100 | {round(abs(dr1-dr2), 1)} |\n\n"
                    f"**Analytical Summary:** {better} exhibits a more resilient profile than {worse}, primarily driven by lower composite scores across flood corridors and vegetative moisture stability."
                )
                
                risk_analysis = f"{worse} exhibits high risk markers due to climate anomalies. Run a future conditions simulation to test mitigation strategies."
                chart_data = [
                    {"district": f"{s1.name} Avg", "risk": round(avg1, 1)},
                    {"district": f"{s2.name} Avg", "risk": round(avg2, 1)}
                ]
                action = {"type": "open_compare", "state1": s1.name, "state2": s2.name}
                recommended_actions = [
                    f"Initiate cross-district water transfers and catchment monitoring in {worse}.",
                    f"Standardize early warning frameworks using IMD weather feeds across {s1.name} and {s2.name}."
                ]
                suggestions = ["Which states are safest?", "Analyse Rajasthan", "What is the biggest threat?"]
                insights = [f"{better} is the best performing region.", f"{worse} is the highest risk region."]
                explainable_risk = {
                    "confidence": 88,
                    "drivers": ["Atmospheric Temperature Anomaly", "Monsoon Precipitation Deficit"],
                    "actions": ["Establish joint command channels", "Integrate state-wide telemetry grids"],
                    "sources": ["IMD Observations", "NRSC Soil Moisture Index"]
                }
                
            elif len(matched_districts) >= 2 or (target_district and len(matched_districts) == 1):
                d1 = matched_districts[0]
                d2 = matched_districts[1] if len(matched_districts) >= 2 else active_district
                
                r1 = db.query(RiskScore).filter(RiskScore.district_id == d1.id).order_by(desc(RiskScore.valid_on)).first()
                r2 = db.query(RiskScore).filter(RiskScore.district_id == d2.id).order_by(desc(RiskScore.valid_on)).first()
                
                rc1 = r1.composite_risk if r1 else 50.0
                rc2 = r2.composite_risk if r2 else 50.0
                
                f1 = r1.flood_risk if r1 else 40.0
                f2 = r2.flood_risk if r2 else 40.0
                
                dr1 = r1.drought_risk if r1 else 40.0
                dr2 = r2.drought_risk if r2 else 40.0
                
                h1 = r1.heatwave_risk if r1 else 40.0
                h2 = r2.heatwave_risk if r2 else 40.0
                
                ws1 = r1.water_stress_risk if r1 else 40.0
                ws2 = r2.water_stress_risk if r2 else 40.0
                
                better = d1.name if rc1 < rc2 else d2.name
                worse = d2.name if rc1 < rc2 else d1.name
                
                explanation = (
                    f"### District Risk Comparison: {d1.name} vs {d2.name}\n\n"
                    f"Side-by-side geospatial risk evaluation using integrated telemetry sensors:\n\n"
                    f"| Risk Parameter | {d1.name} ({d1.state.name}) | {d2.name} ({d2.state.name}) | Variance |\n"
                    f"| :--- | :---: | :---: | :---: |\n"
                    f"| **Composite Risk** | {rc1}/100 | {rc2}/100 | {round(abs(rc1-rc2), 1)} |\n"
                    f"| **Flood Risk** | {f1}/100 | {f2}/100 | {round(abs(f1-f2), 1)} |\n"
                    f"| **Drought Risk** | {dr1}/100 | {dr2}/100 | {round(abs(dr1-dr2), 1)} |\n"
                    f"| **Heatwave Risk** | {h1}/100 | {h2}/100 | {round(abs(h1-h2), 1)} |\n"
                    f"| **Water Stress** | {ws1}/100 | {ws2}/100 | {round(abs(ws1-ws2), 1)} |\n\n"
                    f"**Analysis:** {worse} displays higher vulnerabilities compared to {better}, indicating localized environmental strain."
                )
                risk_analysis = f"Primary stress driver for {worse} is {'Flood' if (f1 if worse == d1.name else f2) > (dr1 if worse == d1.name else dr2) else 'Drought'} risk. Sourced from CWC and NRSC telemetry."
                chart_data = [
                    {"district": d1.name, "risk": rc1},
                    {"district": d2.name, "risk": rc2}
                ]
                action = {"type": "open_compare", "districtA": d1.id, "districtB": d2.id}
                recommended_actions = [
                    f"Deploy local emergency advisories in {worse}.",
                    "Analyze reservoir levels under current rainfall deficit."
                ]
                suggestions = ["Safest states in India", "Compare before and after simulation"]
                insights = [f"{better} is the best performing region.", f"{worse} is the highest risk region."]
                explainable_risk = {
                    "confidence": 90,
                    "drivers": ["Soil Moisture Deficit", "Reservoir Drawdown"],
                    "actions": ["Verify water storage matrices"],
                    "sources": ["India-WRIS", "CPCB AQI Feeds"]
                }
            else:
                explanation = "Please specify two regions (states or districts) to perform a comparative risk audit. E.g., 'Compare Rajasthan and Gujarat'."
                suggestions = ["Compare Rajasthan and Gujarat", "Compare Jaipur and Gandhinagar"]

        # -------------------------------------------------------------
        # INTENT 2: Scenario Simulator Interpretations (PHASE 5)
        # -------------------------------------------------------------
        elif "simulate" in text or "simulation" in text or payload.active_simulation:
            # Determine delta inputs
            temp_delta = 2.0
            rain_delta = 10.0
            res_delta = -15.0
            
            sim_source = "active simulation parameters" if payload.active_simulation else "detected query parameters"
            
            if payload.active_simulation:
                sim = payload.active_simulation
                temp_delta = sim.get("temperature_delta_c") or sim.get("adjusted_climate", {}).get("temperature_delta_c", 2.0)
                rain_delta = sim.get("rainfall_delta_pct") or sim.get("adjusted_climate", {}).get("rainfall_delta_pct", 10.0)
                res_delta = sim.get("reservoir_delta_pct") or sim.get("adjusted_climate", {}).get("reservoir_delta_pct", -15.0)
                
                # Retrieve outputs
                water = sim.get("water_availability", 50)
                crop = sim.get("crop_stress", 45)
                f_risk = sim.get("flood_risk", 40)
                d_risk = sim.get("drought_risk", 55)
                comp = sim.get("composite_risk", 50)
                pop_risk = sim.get("population_at_risk", 250000)
                econ_loss = sim.get("economic_loss_m_inr", 85.5)
                infra = sim.get("infrastructure_risk", 45)
            else:
                # Mock a simulator run on the active district
                dist_id = target_district.id if target_district else 302
                dist_name = target_district.name if target_district else "Jodhpur"
                # Parse manual overrides from query
                if "+3" in text or "3 degrees" in text or "3 degree" in text: temp_delta = 3.0
                elif "+4" in text or "4 degrees" in text or "4 degree" in text: temp_delta = 4.0
                if "-20" in text: rain_delta = -20.0
                elif "+30" in text: rain_delta = 30.0
                
                # Fetch baseline
                weather = db.query(WeatherData).filter(WeatherData.district_id == dist_id).order_by(desc(WeatherData.observed_on)).first()
                sat = db.query(SatelliteData).filter(SatelliteData.district_id == dist_id).order_by(desc(SatelliteData.observed_on)).first()
                
                base_dict = {
                    "rainfall_mm": weather.rainfall_mm if weather else 100.0,
                    "rainfall_deficit_pct": weather.rainfall_deficit_pct if weather else 0.0,
                    "temperature_c": weather.temperature_c if weather else 30.0,
                    "humidity_pct": weather.humidity_pct if weather else 55.0,
                    "river_level_m": weather.river_level_m if weather else 2.0,
                    "soil_moisture_pct": weather.soil_moisture_pct if weather else 45.0,
                    "ndvi": sat.ndvi if sat else 0.45,
                    "reservoir_level_pct": sat.reservoir_level_pct if sat else 50.0
                }
                
                sim_result = self.simulator.run(base_dict, {
                    "rainfall_delta_pct": rain_delta,
                    "temperature_delta_c": temp_delta,
                    "reservoir_delta_pct": res_delta,
                    "planning_horizon_years": 5
                })
                
                water = sim_result["water_availability"]
                crop = sim_result["crop_stress"]
                f_risk = sim_result["flood_risk"]
                d_risk = sim_result["drought_risk"]
                comp = sim_result["composite_risk"]
                pop_risk = sim_result["population_at_risk"]
                econ_loss = sim_result["economic_loss_m_inr"]
                infra = sim_result["infrastructure_risk"]
                action = {
                    "type": "open_simulator",
                    "params": {
                        "district_id": dist_id,
                        "rainfall_delta_pct": rain_delta,
                        "temperature_delta_c": temp_delta,
                        "reservoir_delta_pct": res_delta,
                        "planning_horizon_years": 5
                    }
                }

            loc_name = target_state.name if target_state else (target_district.name if target_district else "Rajasthan")

            explanation = (
                f"### Scenario Simulator Intelligence: {loc_name} ({temp_delta:+.1f}°C Temp | {rain_delta:+.1f}% Rainfall)\n\n"
                f"Evaluation of simulated climate anomalies reveals critical compound risks and socio-economic exposures:\n\n"
                f"1. **Water Availability ({water}/100):** This score combines reservoir capacity and soil moisture. "
                f"{'Critical deficit. Low water levels threaten municipal drinking supply and kharif crop irrigation.' if water < 45 else 'Moderate/stable availability. Sub-surface moisture levels are currently buffering evaporation loss.'}\n"
                f"2. **Agricultural Impact (Crop Stress: {crop}/100):** Driven by temperature anomalies and soil moisture decay. "
                f"{'Severe vegetation stress. Accelerated evapotranspiration will likely degrade crop canopy greenness (NDVI) and lower yield efficiency.' if crop > 60 else 'Managed stress levels. Current canopy health matches nominal crop resilience thresholds.'}\n"
                f"3. **Population Affected ({pop_risk:,} exposed):** Estimated civil exposure under simulated composite risk margins. "
                f"This requires establishing direct evacuation command loops and health buffer supplies.\n"
                f"4. **Infrastructure Risk ({infra}/100):** Evaluated hazard to physical assets. "
                f"{'High risk. Elevated river levels and flash discharge threaten local road networks and utilities.' if infra > 60 else 'Low risk. Civil infrastructure remains within baseline safety capacities.'}\n"
                f"5. **Economic Implications (₹{econ_loss}M INR projected loss):** Estimated financial damages due to agricultural harvest loss, municipal repairs, and energy strain."
            )
            
            risk_analysis = (
                f"Under the {sim_source}, the simulated composite risk settles at **{comp}/100**. "
                f"Thermal stress anomalies drive rapid moisture decay, leading to {'an active drought and heat alert' if d_risk > 60 else 'stable baseline'} status."
            )
            
            chart_data = [
                {"district": "Flood Risk", "risk": f_risk},
                {"district": "Drought Risk", "risk": d_risk},
                {"district": "Crop Stress", "risk": crop},
                {"district": "Water Stress", "risk": water},
                {"district": "Composite Risk", "risk": comp}
            ]
            
            recommended_actions = [
                "Implement drought-contingency micro-irrigation layout plans.",
                "Reinforce local urban storm drainage structures for flash floods.",
                "Activate block-level cooling center guidelines."
            ]
            suggestions = ["Explain current climate trends", "Compare Rajasthan and Gujarat"]
            insights = [f"Composite simulated risk stands at {comp}/100.", f"Estimated crop stress is {crop}/100."]
            explainable_risk = {
                "confidence": 85,
                "drivers": [f"Simulated temperature anomaly: {temp_delta:+.1f}°C", f"Rainfall change: {rain_delta:+.1f}%"],
                "actions": ["Activate state drought advisory grid", "Perform grid-load stress reviews"],
                "sources": ["BCT Simulation Model v1.1", "IMD Gridded Pre-runs"]
            }

        # -------------------------------------------------------------
        # INTENT 3: Disaster Predictions (PHASE 7)
        # -------------------------------------------------------------
        elif "predict" in text or "forecast" in text or "drought first" in text or "monitoring" in text or "probability" in text:
            # Let's run a prediction summary across the districts in database
            districts = db.query(District).all()
            drought_list = []
            flood_list = []
            
            for d in districts:
                # Get latest telemetry
                weather = db.query(WeatherData).filter(WeatherData.district_id == d.id).order_by(desc(WeatherData.observed_on)).first()
                sat = db.query(SatelliteData).filter(SatelliteData.district_id == d.id).order_by(desc(SatelliteData.observed_on)).first()
                
                inputs = {
                    "rainfall_mm": weather.rainfall_mm if weather else 50.0,
                    "river_level_m": weather.river_level_m if weather else 1.5,
                    "soil_moisture_pct": weather.soil_moisture_pct if weather else 45.0,
                    "reservoir_capacity_pct": sat.reservoir_level_pct if sat else 50.0,
                    "rainfall_deficit_pct": weather.rainfall_deficit_pct if weather else 10.0,
                    "temperature_c": weather.temperature_c if weather else 30.0,
                    "ndvi": sat.ndvi if sat else 0.45,
                    "humidity_pct": weather.humidity_pct if weather else 55.0
                }
                
                pred_flood = self.prediction_service.flood(inputs)
                pred_drought = self.prediction_service.drought(inputs)
                
                drought_list.append((d, pred_drought["probability"]))
                flood_list.append((d, pred_flood["probability"]))
                
            drought_list.sort(key=lambda x: x[1], reverse=True)
            flood_list.sort(key=lambda x: x[1], reverse=True)
            
            first_drought_state = drought_list[0][0].state.name if drought_list else "Rajasthan"
            first_flood_state = flood_list[0][0].state.name if flood_list else "Assam"
            
            explanation = (
                f"### Disaster Vulnerability and Predictive Modeling (7-Day Outlook)\n\n"
                f"Analytical forecasting based on IMD grid anomalies, NRSC NDVI indices, and CWC hydrology markers:\n\n"
                f"**1. Drought Hotspots (Highest Probability):**\n"
                f"- **{drought_list[0][0].name} ({drought_list[0][0].state.name}):** **{drought_list[0][1]}%** probability. Sown oilseeds and cotton crops are highly vulnerable due to soil moisture deficit ({drought_list[0][0].name} baseline profile).\n"
                f"- **{drought_list[1][0].name} ({drought_list[1][0].state.name}):** **{drought_list[1][1]}%** probability.\n\n"
                f"**2. Flood Alert zones:**\n"
                f"- **{flood_list[0][0].name} ({flood_list[0][0].state.name}):** **{flood_list[0][1]}%** probability. River runoff near critical limits.\n"
                f"- **{flood_list[1][0].name} ({flood_list[1][0].state.name}):** **{flood_list[1][1]}%** probability."
            )
            
            risk_analysis = (
                f"Drought predictions indicate that **{first_drought_state}** is likely to experience moisture stress first, "
                f"while **{first_flood_state}** registers elevated flood probabilities. Monitor these districts immediately."
            )
            
            chart_data = [{"district": item[0].name, "risk": item[1]} for item in drought_list[:4]]
            recommended_actions = [
                "Deploy satellite-derived crop advice alerts to district agriculture blocks.",
                "Verify water storage headroom rules in high-probability flood basins.",
                "Pre-position drinking water tankers in drought-prone blocks."
            ]
            suggestions = ["Show Drought Layer", "Prepare Rajasthan for Heatwave", "Explain current climate trends"]
            insights = [f"{drought_list[0][0].name} has the highest drought probability.", f"{flood_list[0][0].name} has the highest flood probability."]
            explainable_risk = {
                "confidence": 89,
                "drivers": ["Atmospheric Temperature Deficit", "Depleted Soil Saturation Index"],
                "actions": ["Verify district telemetry sensors"],
                "sources": ["IMD Forecast Feed", "NRSC INSAT NDVI"]
            }

        # -------------------------------------------------------------
        # NEW INTENTS: Climate Analyst & Decision Support (Phases 2 & 3)
        # -------------------------------------------------------------
        elif "rainfall" in text or "precipitation" in text:
            explanation = (
                f"### Climate Analyst: Rainfall & Hydrological Assessment for {target_state.name if target_state else (target_district.name if target_district else 'India')}\n\n"
                f"- **Observed Rainfall:** {rain} mm.\n"
                f"- **Departure Anomaly:** Deficit/Surplus is at **{deficit}%** compared to normal averages.\n"
                f"- **Soil Saturation:** Soil moisture index stands at **{soil}%**.\n\n"
                f"**Implications & Interpretation:**\n"
                f"A rainfall deficit of **{deficit}%** {'represents severe hydrological stress' if deficit < -10 else 'falls within normal seasonal variance'}. "
                f"With soil moisture at **{soil}%**, the root zone {'exhibits high dehydration trends that threaten kharif sowing cycles and require supplemental irrigation' if soil < 35 else 'remains sufficiently saturated to support baseline agricultural activities'}. "
                f"Reservoir levels at **{reservoir}%** limit water storage headroom, demanding strict seasonal allocations."
            )
            risk_analysis = f"Rainfall deficits drive drought risk up to {d_score}/100 and composite risk to {comp_score}/100."
            chart_data = [
                {"district": "Rainfall (mm)", "risk": rain},
                {"district": "Deficit (%)", "risk": abs(deficit)},
                {"district": "Soil Moisture (%)", "risk": soil},
                {"district": "Reservoir Level (%)", "risk": reservoir}
            ]
            recommended_actions = [
                "Deploy local micro-irrigation guidelines to conserve root zone moisture.",
                "Enforce strict water storage drawdown rules matching current reservoir levels.",
                "Activate canal lining projects to minimize conveyance losses."
            ]
            suggestions = ["Show Drought Layer", "What should authorities do next?", "Compare Rajasthan and Gujarat"]
            insights = [f"Rainfall deficit is {deficit}%.", f"Reservoir capacity stands at {reservoir}%."]
            explainable_risk = {
                "confidence": 92,
                "drivers": ["Precipitation anomaly deficit", "Low Soil Saturation"],
                "actions": ["Verify district telemetry sensors"],
                "sources": ["IMD grid data", "NRSC Landsat products"]
            }

        elif "temperature" in text or "temp" in text or "heat" in text:
            explanation = (
                f"### Climate Analyst: Thermal Anomaly & Heatwave Assessment for {target_state.name if target_state else (target_district.name if target_district else 'India')}\n\n"
                f"- **Ambient Temperature:** {temp}°C.\n"
                f"- **Heatwave Risk Index:** **{h_score}/100**.\n"
                f"- **Relative Humidity:** {humidity}%.\n\n"
                f"**Implications & Interpretation:**\n"
                f"Ambient temperatures of **{temp}°C** combined with **{humidity}%** relative humidity raise the localized felt heat index. "
                f"A heatwave risk index of **{h_score}/100** represents a **{'critical heat hazard' if h_score > 60 else 'moderate seasonal' if h_score > 35 else 'normal/safe'}** level. "
                f"Extreme heat accelerates soil moisture evaporation, compounding vegetation stress and raising urban peak load limits on power grids."
            )
            risk_analysis = f"High temperature anomalies directly drive heatwave risk to {h_score}/100 and water stress to {ws_score}/100."
            chart_data = [
                {"district": "Ambient Temp (C)", "risk": temp},
                {"district": "Humidity (%)", "risk": humidity},
                {"district": "Heatwave Risk", "risk": h_score},
                {"district": "Water Stress Risk", "risk": ws_score}
            ]
            recommended_actions = [
                "Establish district-level cooling centers in high-density areas.",
                "Enforce outdoor labor restrictions between 11 AM and 4 PM during peak warnings.",
                "Review power grid distribution load reserves for compliance."
            ]
            suggestions = ["What should authorities do next?", "Show Heatwave Layer", "Compare Rajasthan and Gujarat"]
            insights = [f"Ambient temp is {temp}°C.", f"Heatwave risk score is {h_score}/100."]
            explainable_risk = {
                "confidence": 94,
                "drivers": ["Thermal anomalies", "Felt Heat Index rise"],
                "actions": ["Deploy mobile cooling vans"],
                "sources": ["IMD observation grid"]
            }

        elif "aqi" in text or "air" in text:
            explanation = (
                f"### Climate Analyst: AQI & Air Quality Assessment for {target_state.name if target_state else (target_district.name if target_district else 'India')}\n\n"
                f"- **Observed AQI:** **{aqi}**.\n"
                f"- **Classification:** {'Hazardous/Poor' if aqi > 150 else 'Moderate' if aqi > 50 else 'Good/Healthy'}.\n\n"
                f"**Implications & Interpretation:**\n"
                f"An Air Quality Index of **{aqi}** implies **{'elevated particulate matter concentration (PM2.5/PM10)' if aqi > 100 else 'clean atmospheric conditions'}**. "
                f"{'Sensitive groups may experience respiratory irritation, requiring municipal warnings' if aqi > 100 else 'Ambient air quality poses no significant health hazard to the population'}. "
                f"AQI levels are monitored on a rolling basis from CPCB sensors to detect thermal inversion hazards."
            )
            risk_analysis = f"Particulate concentration contributes to composite environmental strain."
            chart_data = [
                {"district": "AQI Score", "risk": aqi}
            ]
            recommended_actions = [
                "Deploy street-level water mist sprinklers in hazardous zones.",
                "Issue public health notices advising masks for sensitive populations.",
                "Limit high-emission industrial units during peak stagnation hours."
            ]
            suggestions = ["Show AQI Layer", "Explain Jodhpur risk drivers", "Compare Rajasthan and Gujarat"]
            insights = [f"AQI is {aqi} ({'Healthy' if aqi <= 100 else 'Moderate' if aqi <= 200 else 'Poor'})."]
            explainable_risk = {
                "confidence": 90,
                "drivers": ["Particulate Matter accumulation", "Atmospheric stagnation"],
                "actions": ["Enforce construction dust controls"],
                "sources": ["CPCB grid monitoring"]
            }

        elif "ndvi" in text or "canopy" in text or "forest" in text:
            explanation = (
                f"### Climate Analyst: NDVI & Vegetative Canopy Assessment for {target_state.name if target_state else (target_district.name if target_district else 'India')}\n\n"
                f"- **NDVI Index Value:** **{ndvi}**.\n"
                f"- **Canopy Density:** {'Lush/Healthy' if ndvi > 0.6 else 'Moderate' if ndvi > 0.35 else 'Barren/Degraded'}.\n\n"
                f"**Implications & Interpretation:**\n"
                f"The Normalized Difference Vegetation Index value of **{ndvi}** indicates **{'healthy chlorophyll activity and high canopy thickness' if ndvi > 0.45 else 'degraded vegetative cover or agricultural stress'}**. "
                f"Declines in NDVI suggest rapid soil moisture decay or forest degradation. Sourced from NRSC Sentinel and Landsat satellite observations, these values are used to predict kharif yield efficiencies."
            )
            risk_analysis = f"Lower vegetative thickness correlates directly with drought risk: {d_score}/100."
            chart_data = [
                {"district": "NDVI (x100)", "risk": int(ndvi * 100)},
                {"district": "Drought Risk", "risk": d_score}
            ]
            recommended_actions = [
                "Implement satellite-derived crop advice alerts to high-stress blocks.",
                "Promote agroforestry programs to increase structural tree cover.",
                "Assess biomass losses using multi-spectral imagery sets."
            ]
            suggestions = ["Show Drought Layer", "Assess crop health", "Compare Rajasthan and Gujarat"]
            insights = [f"NDVI canopy index is {ndvi}."]
            explainable_risk = {
                "confidence": 93,
                "drivers": ["Volumetric vegetative greenness decay", "Canopy moisture stress"],
                "actions": ["Verify Sentinel sensor drift values"],
                "sources": ["NRSC LISS-III product"]
            }

        elif "agriculture" in text or "crop" in text:
            crop_stress_val = crop_stress(ndvi, soil)
            explanation = (
                f"### Climate Analyst: Agricultural Stress & Crop Health Assessment for {target_state.name if target_state else (target_district.name if target_district else 'India')}\n\n"
                f"- **Vegetation canopy (NDVI):** {ndvi}.\n"
                f"- **Root Zone Moisture:** {soil}%.\n"
                f"- **Estimated Crop Stress:** **{round(crop_stress_val, 1)}/100**.\n\n"
                f"**Implications & Interpretation:**\n"
                f"An estimated crop stress value of **{round(crop_stress_val, 1)}/100** {'points to high vulnerability in crop sowing grids' if crop_stress_val > 50 else 'indicates healthy agricultural sowing capacity'}."
                f" Evaporative soil moisture decay directly impacts crop root zones, delaying germination and reducing target sowing windows for oilseed and cotton crops."
            )
            risk_analysis = f"Vegetation stress anomalies drive drought risk to {d_score}/100 and composite risk to {comp_score}/100."
            chart_data = [
                {"district": "Crop Stress", "risk": crop_stress_val},
                {"district": "Drought Risk", "risk": d_score},
                {"district": "NDVI (x100)", "risk": int(ndvi * 100)},
                {"district": "Soil Moisture (%)", "risk": soil}
            ]
            recommended_actions = [
                "Advise farmers to shift sowing from paddy to drought-tolerant pulses or short-duration oilseeds.",
                "Deploy block-level advisories for moisture conservation (mulching, drip-irrigation).",
                "Authorize crop loss subsidies for dry agricultural blocks."
            ]
            suggestions = ["Show Drought Layer", "What should authorities do next?", "Compare Rajasthan and Gujarat"]
            insights = [f"Crop stress index is {round(crop_stress_val, 1)}/100."]
            explainable_risk = {
                "confidence": 91,
                "drivers": ["Canopy moisture decay", "Root zone soil dehydration"],
                "actions": ["Distribute drought-resilient seed packets"],
                "sources": ["NRSC Satellite Data", "IMD Grids"]
            }

        elif "historical" in text or "history" in text or "trends" in text:
            explanation = (
                f"### Climate Analyst: Historical Baseline & Long-term Trends for {target_state.name if target_state else (target_district.name if target_district else 'India')}\n\n"
                f"- **Current Active Year:** {payload.active_year or 2026}.\n"
                f"- **Composite Risk Score:** {comp_score}/100.\n"
                f"- **Trend Trajectory:** **{trend.upper()}**.\n\n"
                f"**Implications & Interpretation:**\n"
                f"Historical climate telemetry reveals that the current risk rating of **{comp_score}/100** represents a **{trend}** trajectory. "
                f"Comparing observations to the 30-year seasonal baseline indicates rising temperature anomalies and volatile precipitation patterns, leading to structural shifts in regional water tables and sowing windows."
            )
            risk_analysis = f"Long-term trends show a composite risk of {comp_score}/100 with a {trend} trajectory."
            chart_data = [
                {"district": "Historical Risk", "risk": comp_score}
            ]
            recommended_actions = [
                "Calibrate historical baseline parameters with current daily drift metrics.",
                "Update long-term infrastructure zoning maps with current risk trends.",
                "Integrate multi-decadal model runs into public utility planning guidelines."
            ]
            suggestions = ["Show active alerts", "What should authorities do next?", "Compare Rajasthan and Gujarat"]
            insights = [f"Baseline risk trend is {trend}."]
            explainable_risk = {
                "confidence": 92,
                "drivers": ["Multi-decadal temperature trend shift", "Monsoon cycle drift"],
                "actions": ["Verify model calibration grids"],
                "sources": ["BCT Historical database"]
            }

        elif any(k in text for k in ["action", "what to do", "authorities", "next", "government", "mitigation", "strategy", "emergency", "priority"]):
            # Generate actionable recommendations based on active risk scores
            loc_name = target_state.name if target_state else (target_district.name if target_district else "India")
            
            # Determine priority hazard based on risk scores
            priority_hazard = "Composite Climate Anomaly"
            if f_score > d_score and f_score > h_score:
                priority_hazard = "High Flood Vulnerability"
            elif d_score > f_score and d_score > h_score:
                priority_hazard = "Agricultural Drought Exposure"
            elif h_score > f_score and h_score > d_score:
                priority_hazard = "Severe Thermal Heat Anomaly"
                
            explanation = (
                f"### Decision Support System: Policy & Operational Directives for {loc_name}\n\n"
                f"**Priority Hazard Watch:** **{priority_hazard}** (Composite Risk: {comp_score}/100)\n\n"
                f"Based on raw IMD grid data and NRSC satellite telemetry, the following structured response plan is recommended for authorities next:\n\n"
                f"1. **Emergency Priorities & Disaster Response:**\n"
                f"   - {'Pre-position state disaster response teams (SDRF) along river flood channels and initiate hourly CWC gauge logs.' if f_score > 50 else 'Establish district cooling centers in high-density blocks and enforce shift-work bans between 11 AM and 4 PM.' if h_score > 55 else 'Pre-position drinking water tankers and deploy block-level water rationing directives.'}\n"
                f"   - Activate the unified multi-agency hazard warning command loops (IMD, CWC, NRSC).\n\n"
                f"2. **Resource Allocation:**\n"
                f"   - Budget reservoir reserves matching the current **{reservoir}%** capacity level.\n"
                f"   - Authorize groundwater withdrawal restrictions to buffer subsurface tables.\n\n"
                f"3. **Farmer Guidance & Agricultural Support:**\n"
                f"   - Advise farmers to shift sowing from water-intensive paddy to drought-tolerant pulses or short-duration oilseeds.\n"
                f"   - Deploy satellite-derived crop advisories based on the active vegetation greenness index (**{ndvi}**).\n\n"
                f"4. **Long-Term Mitigation Plans:**\n"
                f"   - Fund canal lining projects to prevent seepage and accelerate groundwater recharge grids.\n"
                f"   - Construct decentralized check-dams and farm ponds to buffer localized runoffs."
            )
            risk_analysis = f"Policy directives are optimized for {priority_hazard} based on a risk assessment."
            chart_data = [
                {"district": "Flood Risk", "risk": f_score},
                {"district": "Drought Risk", "risk": d_score},
                {"district": "Heatwave Risk", "risk": h_score},
                {"district": "Water Stress Risk", "risk": ws_score}
            ]
            recommended_actions = [
                f"Authorize emergency funding for {priority_hazard.lower()} countermeasures.",
                "Convene the state disaster mitigation advisory committee.",
                "Review grid load buffer limits for thermal compliance."
            ]
            suggestions = ["Show active alerts", "Run future conditions simulation", "Explain risk drivers"]
            insights = [f"Mitigation plan structured for {loc_name}.", f"Dominant hazard: {priority_hazard}."]
            explainable_risk = {
                "confidence": 94,
                "drivers": ["Hazard Intensity projections", "Civic exposure metrics"],
                "actions": ["Verify pre-position logs", "Deploy field monitors"],
                "sources": ["IMD Warnings Index", "NRSC Vulnerability Atlas"]
            }

        # -------------------------------------------------------------
        # INTENT 4: Science Explanations (PHASE 8)
        # -------------------------------------------------------------
        elif any(concept in text for concept in ["ndvi", "aqi", "heat index", "return period", "el nino", "la nina", "spi", "soil moisture", "groundwater", "monsoon", "urban heat"]):
            concept_name = "Climate Index"
            concept_desc = ""
            citations = []
            
            if "ndvi" in text:
                concept_name = "NDVI (Normalized Difference Vegetation Index)"
                concept_desc = (
                    "NDVI measures the density and greenness of vegetation from satellite observations. "
                    "It scales from -1 to +1, where values below 0.15 indicate barren land or water, and values above 0.4 represent healthy vegetation. "
                    "In our twin, declines in NDVI indicate crop stress or forest degradation."
                )
                citations = ["National Remote Sensing Centre (NRSC) LISS-III / Cartosat products"]
            elif "aqi" in text:
                concept_name = "AQI (Air Quality Index)"
                concept_desc = (
                    "AQI is an index used to report daily air quality. It runs from 0 to 500, combining pollutants like PM2.5, PM10, ozone, and NOx. "
                    "Values over 150 require municipal warnings, while values over 300 indicate severe air hazards."
                )
                citations = ["Central Pollution Control Board (CPCB) grid monitoring"]
            elif "heat index" in text:
                concept_name = "Heat Index (Humidex)"
                concept_desc = (
                    "Heat Index represents the 'felt' air temperature by combining ambient temperature and relative humidity. "
                    "High humidity retards sweat evaporation, raising heat stroke risk during thermal anomalies."
                )
                citations = ["IMD Gridded Daily Thermal telemetries"]
            elif "monsoon" in text:
                concept_name = "Monsoon Circulation"
                concept_desc = (
                    "The Indian summer monsoon represents the seasonal reversal of winds, delivering 75-90% of India's annual rainfall. "
                    "Disruptions affect water availability and kharif crop sowing."
                )
                citations = ["IMD Monsoon Telemetry feeds"]
            elif "soil moisture" in text:
                concept_name = "Soil Moisture Saturation"
                concept_desc = (
                    "Soil moisture measures the volumetric water content in soil layers. "
                    "It regulates agricultural yield, runoff generation, and aquifer percolation."
                )
                citations = ["NRSC Scatterometer observations"]
            else:
                concept_name = "Climate Science Indexes"
                concept_desc = (
                    "Geospatial climate indices measure soil moisture, precipitation deficits, and thermal exposure. "
                    "The twin uses these to calculate composite district risk zones."
                )
                citations = ["IMD observations", "NRSC satellite products", "CWC river levels"]

            explanation = (
                f"### Climate Concept Briefing: {concept_name}\n\n"
                f"{concept_desc}\n\n"
                f"**Application in Bharat Climate Twin:**\n"
                f"This index is dynamically retrieved from raw PostgreSQL tables, and fed into the risk engine formulas to compute composite ratings on a rolling daily basis."
            )
            risk_analysis = f"Vulnerabilities rise when {concept_name} deviates by 15%+ from historical averages."
            recommended_actions = [
                f"Integrate {concept_name} into district emergency action guidelines.",
                "Review baseline historical limits for this parameter."
            ]
            suggestions = ["Show AQI Layer", "Explain Jodhpur risk drivers", "Compare Rajasthan and Gujarat"]
            insights = [f"{concept_name} is fully integrated in BCT risk models."]
            explainable_risk = {
                "confidence": 95,
                "drivers": ["Standard baseline calibration"],
                "actions": ["Monitor sensor daily drift values"],
                "sources": citations
            }

        # -------------------------------------------------------------
        # INTENT 5: Mission Planning (PHASE 11)
        # -------------------------------------------------------------
        elif "prepare" in text or "mission" in text or "action plan" in text:
            hazard = "Disaster Scenario"
            districts_list = "Jaipur, Jaisalmer"
            resources = "Water tankers, medical shelter units, power grid backups"
            agencies = "NDMA, State Disaster Management Authority (SDMA), State Public Health Dept"
            recovery = "Subsidy release for crop losses, infrastructure repair audits"
            
            if "heat" in text or "temp" in text:
                hazard = "Severe Heatwave Mitigation"
                resources = "Mobile cooling vans, cooling stations, water tankers, ORS packet grids"
                agencies = "NDMA, State Health Ministry, Municipal Corporations, District collectors"
                recovery = "Labor hours normalization, compensation for sunstroke casualties"
            elif "flood" in text or "rain" in text:
                hazard = "Flood Evacuation and Channeling"
                districts_list = "Mumbai, Thiruvananthapuram, Bhubaneswar"
                resources = "Inflatable boats, emergency shelter kits, water pumps, medical kits"
                agencies = "NDMA, SDRF, CWC hydro-officers, Coast Guard"
                recovery = "Drainage repairs, crop subsidy allocations, chlorination of wells"
            elif "cyclone" in text or "wind" in text or "odisha" in text:
                hazard = "Cyclone Early-Warning and Sheltering"
                districts_list = "Puri, Chennai, East Godavari"
                resources = "Cyclone shelters, satellite phones, wind-resistant tents, rations"
                agencies = "NDMA, Indian Navy, SDMA, Coast Guard, IMD warning division"
                recovery = "Power line reconstruction, tree clearing grids, saline soil treatments"

            loc_name = target_state.name if target_state else (target_district.name if target_district else "Rajasthan")
            
            explanation = (
                f"### Government Command Mission Plan: Prepare {loc_name} for {hazard}\n\n"
                f"**1. Mission Objective:** Establish localized grid resilience and minimize civil exposure.\n\n"
                f"**2. Risk Assessment:** High hazard anomalies with potential population exposure.\n\n"
                f"**3. Target Districts under Watch:**\n"
                f"- High vulnerability blocks: {districts_list}\n\n"
                f"**4. Operations Action Plan:**\n"
                f"| Phase | Timeline | Responsible Agencies | Key Interventions |\n"
                f"| :--- | :--- | :--- | :--- |\n"
                f"| **T-48h (Pre-impact)** | Immediate | IMD, NDMA, District collectors | Publish alerts, clear drainage/cooling grids |\n"
                f"| **T-24h (Evacuation)** | Short-term | SDRF, Police, SDMA | Evacuate low-lying blocks, stock cooling shelters |\n"
                f"| **Impact Phase** | Ongoing | SDMA, Health Departments | Dispatch mobile units, manage grid load margins |\n"
                f"| **Post-impact** | Long-term | Municipalities, State Agr Dept | {recovery} |\n\n"
                f"**5. Logistics and Resource Allocation:**\n"
                f"- Priority resources: {resources}.\n"
                f"- Recommended implementing agencies: {agencies}."
            )
            
            risk_analysis = f"High priority disaster mission plan active for {loc_name}. Ensure data telemetry updates are monitored hourly."
            recommended_actions = [
                f"Issue direct operational mandates to local block units in {loc_name}.",
                "Authorize emergency funding for cooling/evacuation infrastructure."
            ]
            suggestions = ["Show active alerts", "Run future conditions simulation", "Explain risk drivers"]
            insights = [f"Mitigation plan structured for {loc_name}.", f"Agencies involved: {agencies.split(',')[0]}."]
            explainable_risk = {
                "confidence": 91,
                "drivers": ["Hazard Intensity projections", "Civic exposure metrics"],
                "actions": ["Verify pre-position logs", "Deploy field monitors"],
                "sources": ["IMD Warnings Index", "NRSC Vulnerability Atlas"]
            }

        # -------------------------------------------------------------
        # INTENT 6: Explain Chart/Trends (PHASE 4)
        # -------------------------------------------------------------
        elif "explain" in text and ("chart" in text or "graph" in text or "trend" in text or "kpi" in text or "timeline" in text or "simulation" in text):
            explanation = (
                f"### AI Telemetry Interpretation: National & Regional Trends\n\n"
                f"The active chart/timeline displays seasonal fluctuations in weather anomalies and satellite indices:\n\n"
                f"1. **Precipitation Trends (IMD Observations):** Monsoon rain cycles peak between June and September, with localized anomalies becoming more severe in dry corridors.\n"
                f"2. **Soil Moisture & NDVI Decay (NRSC Satellite):** Vegetative health indices lag rainfall peaks by 30 days, illustrating recharge latency. Rapid drying trends correlate with urban heat islands.\n"
                f"3. **Reservoir Headrooms (India-WRIS):** Evaporative losses and runoff deficits cause a structural decline in storage capacity, requiring strict water budgeting."
            )
            risk_analysis = "High-risk zones indicate districts where high temperatures coincide with low soil moisture and depleted reservoirs."
            recommended_actions = [
                "Correlate local reservoir drawdown with agricultural yield metrics.",
                "Review water release mandates for high stress blocks."
            ]
            suggestions = ["Safest states in India", "Compare Rajasthan and Gujarat"]
            insights = ["Environmental trends show rising temperature anomalies.", "Soil moisture levels are declining in semi-arid zones."]
            explainable_risk = {
                "confidence": 93,
                "drivers": ["Evaporation anomalies", "Runoff deficit scales"],
                "actions": ["Verify telemetry calibration grids"],
                "sources": ["IMD Telemetries", "NRSC Landsat products"]
            }

        # -------------------------------------------------------------
        # DEFAULT INTENT: District/State Report Generation (PHASE 2 & 3)
        # -------------------------------------------------------------
        else:
            loc_title = "National Overview"
            
            if target_district:
                loc_title = f"{target_district.name} District ({target_district.state.name})"
                # Fetch telemetry for this specific district
                weather = db.query(WeatherData).filter(WeatherData.district_id == target_district.id).order_by(desc(WeatherData.observed_on)).first()
                sat = db.query(SatelliteData).filter(SatelliteData.district_id == target_district.id).order_by(desc(SatelliteData.observed_on)).first()
                risk = db.query(RiskScore).filter(RiskScore.district_id == target_district.id).order_by(desc(RiskScore.valid_on)).first()
                
                # Check for active alerts
                alert = db.query(ClimateAlert).filter(ClimateAlert.district_id == target_district.id).order_by(desc(ClimateAlert.issued_at)).first()
                alert_text = f"\n> [!CAUTION]\n> **ACTIVE ALERT: {alert.title}** - {alert.message}\n" if alert else ""

                temp = weather.temperature_c if weather else 31.5
                rain = weather.rainfall_mm if weather else 115.0
                deficit = weather.rainfall_deficit_pct if weather else -2.5
                humidity = weather.humidity_pct if weather else 65.0
                aqi = weather.aqi if weather else 75
                river = weather.river_level_m if weather else 2.1
                soil = weather.soil_moisture_pct if weather else 42.0
                
                ndvi = sat.ndvi if sat else 0.42
                reservoir = sat.reservoir_level_pct if sat else 48.0
                
                comp_score = risk.composite_risk if risk else 45.0
                f_score = risk.flood_risk if risk else 40.0
                d_score = risk.drought_risk if risk else 50.0
                h_score = risk.heatwave_risk if risk else 35.0
                ws_score = risk.water_stress_risk if risk else 45.0
                trend = risk.trend if risk else "stable"
                
                explanation = (
                    f"### Climate Intelligence Audit: {loc_title}\n"
                    f"{alert_text}\n"
                    f"Assessment of localized weather observations and satellite telemetry:\n\n"
                    f"**1. Meteorological Summary (IMD Observation Grid):**\n"
                    f"- **Ambient Temperature:** {temp}°C (with anomaly deviations).\n"
                    f"- **Rainfall:** {rain} mm (Deficit/Surplus: {deficit}%).\n"
                    f"- **Relative Humidity:** {humidity}%, River Level: {river} m.\n\n"
                    f"**2. Geospatial Assets & Air Quality:**\n"
                    f"- **Vegetation Index (NDVI):** {ndvi} (indicating {'healthy' if ndvi > 0.4 else 'degraded'} canopy cover, NRSC Sentinel).\n"
                    f"- **Soil Moisture:** {soil}% saturation, Reservoir Capacity: {reservoir}%.\n"
                    f"- **CPCB Air Quality:** AQI of **{aqi}** ({'Healthy' if aqi <= 100 else 'Moderate' if aqi <= 200 else 'Poor'}).\n\n"
                    f"**3. Downstream Policy Risk Matrix:**\n"
                    f"- **Agricultural Impact:** Sowing capacity is at **{round(100 - crop_stress(ndvi, soil), 1)}%** efficiency.\n"
                    f"- **Civil Infrastructure Risk:** Estimated exposure is **{'moderate' if f_score < 60 else 'high'}** under current drainage runoff rates."
                )
                
                risk_analysis = (
                    f"The composite vulnerability rating stands at **{comp_score}/100** ({trend}). "
                    f"The primary stress indicator is **{'Drought' if d_score > f_score else 'Flood'}** risk. "
                    f"This is driven by high atmospheric temperature and low soil moisture."
                )
                
                chart_data = [
                    {"district": "Flood Risk", "risk": f_score},
                    {"district": "Drought Risk", "risk": d_score},
                    {"district": "Heatwave Risk", "risk": h_score},
                    {"district": "Water Stress", "risk": ws_score},
                    {"district": "Composite Risk", "risk": comp_score}
                ]
                
                action = {"type": "zoom_to_district", "district_id": target_district.id, "district_name": target_district.name, "lat": target_district.centroid_lat, "lon": target_district.centroid_lon}
                recommended_actions = [
                    f"Verify district water allocation plans matching {reservoir}% reservoir capacity.",
                    f"Publish local crop irrigation advisories for drought-prone sub-blocks.",
                    "Verify CPCB air monitoring calibration offsets."
                ]
                suggestions = ["Generate Report", "Show active alerts for this district", "Compare with neighbouring districts"]
                insights = [f"Composite risk is {comp_score}/100.", f"Primary driver is {'Drought' if d_score > f_score else 'Flood'} risk."]
                explainable_risk = {
                    "confidence": 92,
                    "drivers": [f"Surface Temperature anomaly: {temp}°C", f"Precipitation deficit: {deficit}%"],
                    "actions": ["Authorize emergency micro-irrigation lines", "Deploy medical alert advisories"],
                    "sources": ["IMD Gridded Feed", "NRSC Landsat sensor", "CPCB AQI sensors"]
                }
            elif target_state:
                loc_title = f"{target_state.name} State"
                districts_in_state = db.query(District).filter(District.state_id == target_state.id).all()
                dist_ids = [d.id for d in districts_in_state]
                
                avg_risk = 50.0
                avg_flood = 40.0
                avg_drought = 40.0
                
                if dist_ids:
                    avg_risk = db.query(func.avg(RiskScore.composite_risk)).filter(RiskScore.district_id.in_(dist_ids)).scalar() or 50.0
                    avg_flood = db.query(func.avg(RiskScore.flood_risk)).filter(RiskScore.district_id.in_(dist_ids)).scalar() or 40.0
                    avg_drought = db.query(func.avg(RiskScore.drought_risk)).filter(RiskScore.district_id.in_(dist_ids)).scalar() or 40.0
                
                explanation = (
                    f"### State-Level Climate Assessment: {loc_title}\n\n"
                    f"Aggregate intelligence findings across the state's {len(districts_in_state)} monitored districts:\n\n"
                    f"- **Mean State Composite Risk:** {round(avg_risk, 1)}/100.\n"
                    f"- **Averaged Flood Vulnerability:** {round(avg_flood, 1)}/100 (CWC sensors).\n"
                    f"- **Averaged Drought Vulnerability:** {round(avg_drought, 1)}/100 (NRSC satellite scatterometer).\n\n"
                    f"**Mitigation Recommendation:** Sowing cycles show elevated stress signs in agricultural blocks. "
                    f"Water release limits should be coordinated across municipal divisions."
                )
                
                risk_analysis = f"The state composite risk of {round(avg_risk, 1)}/100 represents a {'moderate' if avg_risk < 60 else 'high'} regional threat landscape."
                chart_data = []
                for d in districts_in_state[:5]:
                    r_score = db.query(RiskScore.composite_risk).filter(RiskScore.district_id == d.id).order_by(desc(RiskScore.valid_on)).first()
                    chart_data.append({
                        "district": d.name,
                        "risk": r_score[0] if r_score else 50.0
                    })
                
                action = {"type": "download_report", "report_type": "state", "id": target_state.id, "name": target_state.name}
                recommended_actions = [
                    "Initiate inter-district catchment diversion channel cleanings.",
                    "Review centralized crop subsidies for high risk districts."
                ]
                suggestions = ["Show Drought Layer", "Which states are safest?", "Compare before and after simulation"]
                insights = [f"Average state risk is {round(avg_risk, 1)}/100.", f"Monitored districts: {len(districts_in_state)}."]
                explainable_risk = {
                    "confidence": 88,
                    "drivers": ["Monsoon anomaly variations", "Central reservoir depletion"],
                    "actions": ["Activate regional drought command panels"],
                    "sources": ["IMD Grid Feed", "NRSC Landsat Atlas", "India-WRIS"]
                }
            else:
                # National Overview
                avg_national_risk = db.query(func.avg(RiskScore.composite_risk)).scalar() or 48.2
                high_risk_districts = rankings[:4] if rankings else []
                
                explanation = (
                    f"### National Climate Intelligence Summary\n\n"
                    f"Aggregated observations from Indian weather grids, satellite platforms, and river telemetry networks:\n\n"
                    f"- **Monitored districts:** {db.query(District).count()} across all States/UTs.\n"
                    f"- **Mean National Composite Risk:** {round(avg_national_risk, 1)}/100.\n"
                    f"- **Dominant Risk Markers:** Seasonal temperature anomalies drive localized drought risks in Northwestern sectors, while high precipitation volumes trigger flood alerts along Eastern river channels.\n\n"
                    f"**Active Risk Hotspots:**\n"
                    + "\n".join([f"- **{r['district_name']} ({r['state_name']}):** Composite risk {r['composite_risk']}/100" for r in high_risk_districts])
                )
                
                risk_analysis = f"The average national composite risk index is stabilized at {round(avg_national_risk, 1)}/100. Watch alert districts require direct field validation."
                chart_data = [{"district": r["district_name"], "risk": r["composite_risk"]} for r in high_risk_districts]
                
                recommended_actions = [
                    "Verify reservoir headrooms across major river basins.",
                    "Review weekly IMD anomalies and soil moisture grids.",
                    "Deploy district agricultural advisories for Kharif sowing."
                ]
                suggestions = ["Which states are safest?", "Which districts have high flood risk?", "Compare Rajasthan and Gujarat"]
                insights = [f"National average risk is {round(avg_national_risk, 1)}/100.", f"Total states monitored: {db.query(State).count()}."]
                explainable_risk = {
                    "confidence": 94,
                    "drivers": ["Global ENSO trends", "Monsoon moisture drift anomalies"],
                    "actions": ["Verify telemetry data aggregation latency"],
                    "sources": ["IMD gridded data", "NRSC INSAT products", "CWC telemetry", "CPCB AQI grid"]
                }

        # Populate districts mapping list for frontend
        focus_districts = []
        if rankings:
            for r in rankings:
                if any(c["district"] == r["district_name"] for c in chart_data):
                    focus_districts.append(r)
        if not focus_districts and rankings:
            focus_districts = rankings[:6]

        return {
            "explanation": explanation,
            "risk_analysis": risk_analysis,
            "recommended_actions": recommended_actions,
            "chart": {
                "type": chart_type,
                "data": chart_data
            },
            "districts": focus_districts,
            "action": action,
            "suggestions": suggestions,
            "explainable_risk": explainable_risk,
            "insights": insights
        }

def crop_stress(ndvi: float, soil_moisture: float) -> float:
    # Estimate crop stress from 0 to 100 based on NDVI and soil moisture
    # Lower NDVI and soil moisture = higher stress
    ndvi_stress = max(0.0, 1.0 - ndvi) * 60.0
    soil_stress = max(0.0, 100.0 - soil_moisture) * 0.4
    return min(100.0, ndvi_stress + soil_stress)
