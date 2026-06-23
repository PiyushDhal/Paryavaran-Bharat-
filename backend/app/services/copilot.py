from __future__ import annotations
import os
import json
import urllib.request
import logging
import re
from datetime import date, datetime
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, extract
from app.models.climate import District, State, RiskScore, ClimateAlert, WeatherData, SatelliteData, Prediction, SimulationResult
from app.schemas.climate import CopilotRequest
from app.services.prediction import DisasterPredictionService
from app.services.simulation import ScenarioSimulator

logger = logging.getLogger(__name__)

def sanitize_ai_jargon(text: str) -> str:
    jargon_replacements = {
        "telemetry": "monitored observation data",
        "command execution": "policy execution",
        "communications timeout": "data retrieval timeout",
        "signal acquired": "data feeds loaded",
        "orbital synchronization": "satellite pass",
        "mission control": "operations center",
        "orbital telemetry": "satellite data"
    }
    lowered = text.lower()
    for jargon, replacement in jargon_replacements.items():
        if jargon in lowered:
            pattern = re.compile(re.escape(jargon), re.IGNORECASE)
            text = pattern.sub(replacement, text)
    return text

class ClimateCopilot:
    def __init__(self):
        self.prediction_service = DisasterPredictionService()
        self.simulator = ScenarioSimulator()

    def answer(self, payload: CopilotRequest, rankings: list[dict], db: Session) -> dict:
        prompt = payload.prompt
        text = prompt.lower()
        
        # Load database lists for resolution
        db_states = []
        db_districts = []
        db_errors = []
        
        try:
            db_states = db.query(State).all()
            db_districts = db.query(District).all()
        except Exception as e:
            logger.error(f"[DATABASE ERROR] Failed to load states/districts: {e}")
            db_errors.append("States/Districts registry load")

        # Resolve target locations using current query, UI state, and history
        # Direct query resolution
        mentioned_district = None
        mentioned_state = None
        for d in db_districts:
            if d.name.lower() in text:
                mentioned_district = d
                break
        for s in db_states:
            if s.name.lower() in text or (s.code and s.code.lower() in text.split()):
                mentioned_state = s
                break

        # UI selection resolution
        ui_district = None
        ui_state = None
        try:
            if payload.selected_district_id:
                ui_district = db.query(District).filter(District.id == payload.selected_district_id).first()
                if ui_district:
                    ui_state = ui_district.state
            if not ui_state and payload.selected_state_name:
                ui_state = next((s for s in db_states if s.name.lower() == payload.selected_state_name.lower()), None)
        except Exception as e:
            logger.error(f"[DATABASE ERROR] Failed to resolve UI selections: {e}")
            db_errors.append("UI Selected Location resolution")

        # Chat history resolution
        history_districts = []
        history_states = []
        if payload.chat_history:
            for msg in payload.chat_history:
                msg_text = (msg.get("text", "") + " " + msg.get("prompt", "") + " " + str(msg.get("response", ""))).lower()
                for d in db_districts:
                    if d.name.lower() in msg_text:
                        if d not in history_districts:
                            history_districts.append(d)
                for s in db_states:
                    if s.name.lower() in msg_text or (s.code and s.code.lower() in msg_text.split()):
                        if s not in history_states:
                            history_states.append(s)

        api_key = os.environ.get("GEMINI_API_KEY")
        intent = self._detect_intent(payload.prompt, api_key)

        # Memory contextualization & Resolution of Pronouns/Missing entities
        target_district_1 = mentioned_district
        target_district_2 = None
        target_state_1 = mentioned_state
        target_state_2 = None

        # For comparison, we need two locations
        if intent == "Comparison":
            # Extract secondary location
            # Check if two states are mentioned in prompt
            states_in_prompt = [s for s in db_states if s.name.lower() in text or (s.code and s.code.lower() in text.split())]
            districts_in_prompt = [d for d in db_districts if d.name.lower() in text]
            
            if len(states_in_prompt) >= 2:
                target_state_1 = states_in_prompt[0]
                target_state_2 = states_in_prompt[1]
            elif len(districts_in_prompt) >= 2:
                target_district_1 = districts_in_prompt[0]
                target_district_2 = districts_in_prompt[1]
            else:
                # Resolve using history or UI selection
                if target_state_1:
                    # Look for another state in history or UI
                    other_state = next((s for s in history_states if s.id != target_state_1.id), None)
                    if not other_state and ui_state and ui_state.id != target_state_1.id:
                        other_state = ui_state
                    target_state_2 = other_state
                elif target_district_1:
                    # Look for another district in history or UI
                    other_dist = next((d for d in history_districts if d.id != target_district_1.id), None)
                    if not other_dist and ui_district and ui_district.id != target_district_1.id:
                        other_dist = ui_district
                    target_district_2 = other_dist
                else:
                    # No location in prompt, see if we can resolve two locations from history
                    if len(history_districts) >= 2:
                        target_district_1 = history_districts[0]
                        target_district_2 = history_districts[1]
                    elif len(history_states) >= 2:
                        target_state_1 = history_states[0]
                        target_state_2 = history_states[1]
                    elif ui_district:
                        target_district_1 = ui_district
                        if history_districts:
                            target_district_2 = next((d for d in history_districts if d.id != ui_district.id), None)
        else:
            # Single location intent
            if not target_district_1 and not target_state_1:
                # Fallback to UI selection
                if ui_district:
                    target_district_1 = ui_district
                    target_state_1 = ui_state
                elif ui_state:
                    target_state_1 = ui_state
                else:
                    # Fallback to history
                    if history_districts:
                        target_district_1 = history_districts[0]
                        target_state_1 = target_district_1.state
                    elif history_states:
                        target_state_1 = history_states[0]

        # Smart Follow-up logic
        location_missing = False
        if intent in ["Climate Analysis", "Risk Assessment", "Comparison", "Scenario Analysis", "Decision Support", "Report Generation"]:
            if intent == "Comparison":
                if not (target_state_1 and target_state_2) and not (target_district_1 and target_district_2):
                    location_missing = True
            else:
                if not target_district_1 and not target_state_1:
                    location_missing = True

        if location_missing:
            follow_up_msg = "Which district or state would you like to analyze?"
            if intent == "Comparison":
                follow_up_msg = "Which regions (states or districts) would you like to compare? E.g. Compare Rajasthan and Gujarat."
            elif intent == "Scenario Analysis":
                follow_up_msg = "Which district would you like to run the climate simulation scenario on?"
            elif intent == "Decision Support":
                follow_up_msg = "Which region (district or state) would you like operational guidelines or recommendations for?"

            return {
                "explanation": f"### Target Location Required\n\n{follow_up_msg} Please specify a district or state to proceed.",
                "risk_analysis": "Target location not specified.",
                "recommended_actions": [],
                "chart": {"type": "bar", "data": []},
                "districts": rankings[:6] if rankings else [],
                "action": None,
                "suggestions": ["Analyze Rajasthan", "Compare Rajasthan and Gujarat", "Explain NDVI"],
                "explainable_risk": None,
                "insights": []
            }

        # Check for Gemini API key
        if api_key:
            response_data = self._call_gemini_api(payload, target_district_1, target_state_1, rankings, db, api_key, intent, target_district_2, target_state_2, db_errors)
            if response_data:
                # Sanitize the output values
                if isinstance(response_data, dict):
                    if "explanation" in response_data:
                        response_data["explanation"] = sanitize_ai_jargon(response_data["explanation"])
                    if "risk_analysis" in response_data:
                        response_data["risk_analysis"] = sanitize_ai_jargon(response_data["risk_analysis"])
                return response_data
            else:
                logger.info("[COPILOT DEBUG] Fallback Condition Triggered: Gemini response generation returned empty or failed.")

        # Fallback to local expert engine if Gemini is not configured or fails
        logger.info("[COPILOT DEBUG] Fallback Condition Triggered: Invoking local offline fallback answer generator.")
        response_data = self._generate_offline_answer(payload, target_district_1, target_state_1, rankings, db, intent, target_district_2, target_state_2, db_errors)
        if isinstance(response_data, dict):
            if "explanation" in response_data:
                response_data["explanation"] = sanitize_ai_jargon(response_data["explanation"])
            if "risk_analysis" in response_data:
                response_data["risk_analysis"] = sanitize_ai_jargon(response_data["risk_analysis"])
        return response_data

    def _detect_intent(self, prompt: str, api_key: str | None) -> str:
        text = prompt.lower().strip()
        
        # Rule-based classification
        if any(k in text for k in ["how do i use", "how to use", "how does the simulator work", "how does the twin work", "help", "tutorial", "features", "dashboard", "how does the digital twin work", "how does the scenario simulator work"]):
            return "Platform Help"
        if any(k in text for k in ["compare", "versus", " vs ", "difference between", "comparison", "relative to", "contrast"]):
            return "Comparison"
        if any(k in text for k in ["simulate", "simulation", "scenario", "what if", "adjust", "projected"]):
            return "Scenario Analysis"
        if any(k in text for k in ["recommend", "action", "should do", "mitigate", "policy", "strategy", "prepare", "plan", "authority", "government", "emergency", "priority", "what should"]):
            return "Decision Support"
        
        conceptual_keywords = ["what is", "define", "explain", "meaning of", "ndvi", "aqi", "gcm", "carbon", "greenhouse", "return period", "el nino", "la nina", "spi", "soil moisture", "groundwater", "monsoon", "urban heat", "canopy", "forest"]
        if any(k in text for k in conceptual_keywords):
            if any(text.startswith(x) for x in ["what is", "what are", "define", "explain", "how does"]):
                return "Educational"
            if len(text.split()) <= 4:
                return "Educational"

        if any(k in text for k in ["risk", "hazard", "threat", "vulnerability", "alert", "warning", "hotspot", "probability"]):
            return "Risk Assessment"
        if any(k in text for k in ["report", "briefing", "summary", "document", "generate report", "pdf", "executive report", "district report", "state report"]):
            return "Report Generation"
        if any(k in text for k in ["help", "how to", "use", "platform", "dashboard", "features", "twin", "options"]):
            return "Platform Help"

        # LLM-based classification fallback if API key is present
        if api_key:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
                system_instruction = (
                    "Classify this user query into exactly one of the following categories:\n"
                    "- Climate Analysis\n"
                    "- Risk Assessment\n"
                    "- Educational\n"
                    "- Comparison\n"
                    "- Scenario Analysis\n"
                    "- Report Generation\n"
                    "- Decision Support\n"
                    "- Platform Help\n\n"
                    "Provide ONLY the category name as output."
                )
                body = {
                    "contents": [{"parts": [{"text": f"Instruction: {system_instruction}\nQuery: {prompt}"}]}],
                    "generationConfig": {"temperature": 0.0, "maxOutputTokens": 15}
                }
                req = urllib.request.Request(
                    url, data=json.dumps(body).encode("utf-8"),
                    headers={"Content-Type": "application/json"}, method="POST"
                )
                with urllib.request.urlopen(req, timeout=3) as response:
                    res_body = json.loads(response.read().decode("utf-8"))
                    classification = res_body["candidates"][0]["content"]["parts"][0]["text"].strip()
                    valid_intents = [
                        "Climate Analysis", "Risk Assessment", "Educational",
                        "Comparison", "Scenario Analysis", "Report Generation",
                        "Decision Support", "Platform Help"
                    ]
                    for intent in valid_intents:
                        if intent.lower() in classification.lower():
                            return intent
            except Exception as e:
                logger.error(f"[LLM ERROR] Error in LLM classification: {e}")

        return "Climate Analysis"

    def _retrieve_context(self, intent: str, payload: CopilotRequest, db: Session, target_district, target_state, rankings, target_district_2=None, target_state_2=None, db_errors=None) -> dict:
        if db_errors is None:
            db_errors = []
            
        context = {"intent": intent, "data_summary": ""}
        
        if intent == "Platform Help":
            context["data_summary"] = (
                "General Platform Help Query. Explain platform functionality including:\n"
                "- Map Mode toggle and risk layers (Composite Risk, Flood, Drought, Heatwave, Water Stress, AQI, NDVI)\n"
                "- Scenario Simulator inputs (temperature, rainfall, and reservoir adjustments)\n"
                "- Historical timelines and projection step selections\n"
                "- Regional Report downloads and District Dashboard KPI views"
            )
            return context
            
        elif intent == "Educational":
            context["data_summary"] = (
                "Educational Concept Query. Provide a detailed scientific breakdown explaining the parameter's "
                "definition, physical meaning, sensor source mapping (e.g. NRSC MODIS/Sentinel/INSAT or IMD grids), "
                "measurement units, and normal vs. extreme warning thresholds."
            )
            return context

        elif intent == "Comparison":
            if target_district and target_district_2:
                rc1, rc2, f1, f2, dr1, dr2 = 50.0, 50.0, 40.0, 40.0, 40.0, 40.0
                temp1, temp2, rain1, rain2 = 31.5, 31.5, 115.0, 115.0
                
                try:
                    r1 = db.query(RiskScore).filter(RiskScore.district_id == target_district.id).order_by(desc(RiskScore.valid_on)).first()
                    if r1:
                        rc1 = r1.composite_risk
                        f1 = r1.flood_risk
                        dr1 = r1.drought_risk
                except Exception as e:
                    logger.error(f"[DATABASE ERROR] RiskScore query failed for comparison district {target_district.id}: {e}")
                    db_errors.append(f"RiskScore (district_id={target_district.id})")
                    
                try:
                    r2 = db.query(RiskScore).filter(RiskScore.district_id == target_district_2.id).order_by(desc(RiskScore.valid_on)).first()
                    if r2:
                        rc2 = r2.composite_risk
                        f2 = r2.flood_risk
                        dr2 = r2.drought_risk
                except Exception as e:
                    logger.error(f"[DATABASE ERROR] RiskScore query failed for comparison district {target_district_2.id}: {e}")
                    db_errors.append(f"RiskScore (district_id={target_district_2.id})")
                    
                try:
                    w1 = db.query(WeatherData).filter(WeatherData.district_id == target_district.id).order_by(desc(WeatherData.observed_on)).first()
                    if w1:
                        temp1 = w1.temperature_c
                        rain1 = w1.rainfall_mm
                except Exception as e:
                    logger.error(f"[DATABASE ERROR] WeatherData query failed for comparison district {target_district.id}: {e}")
                    db_errors.append(f"WeatherData (district_id={target_district.id})")
                    
                try:
                    w2 = db.query(WeatherData).filter(WeatherData.district_id == target_district_2.id).order_by(desc(WeatherData.observed_on)).first()
                    if w2:
                        temp2 = w2.temperature_c
                        rain2 = w2.rainfall_mm
                except Exception as e:
                    logger.error(f"[DATABASE ERROR] WeatherData query failed for comparison district {target_district_2.id}: {e}")
                    db_errors.append(f"WeatherData (district_id={target_district_2.id})")
                
                context["data_summary"] = (
                    f"Comparing District Observations:\n"
                    f"- {target_district.name} ({target_district.state.name}): Composite Risk={rc1}/100, Flood Risk={f1}/100, Drought Risk={dr1}/100, Temp={temp1}°C, Rain={rain1}mm\n"
                    f"- {target_district_2.name} ({target_district_2.state.name}): Composite Risk={rc2}/100, Flood Risk={f2}/100, Drought Risk={dr2}/100, Temp={temp2}°C, Rain={rain2}mm\n"
                )
            elif target_state and target_state_2:
                avg1, avg2, f1, f2, dr1, dr2 = 50.0, 50.0, 40.0, 40.0, 40.0, 40.0
                try:
                    avg1 = db.query(func.avg(RiskScore.composite_risk)).join(District).filter(District.state_id == target_state.id).scalar() or 50.0
                    f1 = db.query(func.avg(RiskScore.flood_risk)).join(District).filter(District.state_id == target_state.id).scalar() or 40.0
                    dr1 = db.query(func.avg(RiskScore.drought_risk)).join(District).filter(District.state_id == target_state.id).scalar() or 40.0
                except Exception as e:
                    logger.error(f"[DATABASE ERROR] State average query failed for {target_state.name}: {e}")
                    db_errors.append(f"State risk averages (state_id={target_state.id})")
                    
                try:
                    avg2 = db.query(func.avg(RiskScore.composite_risk)).join(District).filter(District.state_id == target_state_2.id).scalar() or 50.0
                    f2 = db.query(func.avg(RiskScore.flood_risk)).join(District).filter(District.state_id == target_state_2.id).scalar() or 40.0
                    dr2 = db.query(func.avg(RiskScore.drought_risk)).join(District).filter(District.state_id == target_state_2.id).scalar() or 40.0
                except Exception as e:
                    logger.error(f"[DATABASE ERROR] State average query failed for {target_state_2.name}: {e}")
                    db_errors.append(f"State risk averages (state_id={target_state_2.id})")
                
                context["data_summary"] = (
                    f"Comparing State Averages:\n"
                    f"- {target_state.name}: Composite Risk={avg1:.1f}/100, Flood Risk={f1:.1f}/100, Drought Risk={dr1:.1f}/100\n"
                    f"- {target_state_2.name}: Composite Risk={avg2:.1f}/100, Flood Risk={f2:.1f}/100, Drought Risk={dr2:.1f}/100\n"
                )
            else:
                context["data_summary"] = "Comparison request detected, but not enough states or districts identified."
            
            if db_errors:
                context["data_summary"] += f"\nNote: connection issues restricted database retrievals for some fields ({', '.join(db_errors)})."
            return context

        elif intent == "Scenario Analysis":
            if payload.active_simulation:
                sim = payload.active_simulation
                temp_delta = sim.get("temperature_delta_c") or sim.get("adjusted_climate", {}).get("temperature_delta_c", 2.0)
                rain_delta = sim.get("rainfall_delta_pct") or sim.get("adjusted_climate", {}).get("rainfall_delta_pct", 10.0)
                res_delta = sim.get("reservoir_delta_pct") or sim.get("adjusted_climate", {}).get("reservoir_delta_pct", -15.0)
                context["data_summary"] = (
                    f"Active Simulation Parameters:\n"
                    f"- Temp Adjustment: {temp_delta:+.1f}°C\n"
                    f"- Rainfall Adjustment: {rain_delta:+.1f}%\n"
                    f"- Reservoir Adjustment: {res_delta:+.1f}%\n"
                    f"Simulation Outputs:\n"
                    f"- Water Availability: {sim.get('water_availability')}/100\n"
                    f"- Crop Stress: {sim.get('crop_stress')}/100\n"
                    f"- Flood Risk: {sim.get('flood_risk')}/100\n"
                    f"- Drought Risk: {sim.get('drought_risk')}/100\n"
                    f"- Composite Risk: {sim.get('composite_risk')}/100\n"
                    f"- Economic Loss: ₹{sim.get('economic_loss_m_inr')}M INR\n"
                    f"- Population At Risk: {sim.get('population_at_risk'):,}\n"
                )
            else:
                dist_id = target_district.id if target_district else 1
                temp, rain, deficit, humidity, aqi, river, soil, ndvi, reservoir = 31.5, 115.0, -2.5, 65.0, 75, 2.1, 42.0, 0.42, 48.0
                if target_district:
                    try:
                        weather = db.query(WeatherData).filter(WeatherData.district_id == target_district.id).order_by(desc(WeatherData.observed_on)).first()
                        if weather:
                            temp, rain, deficit, humidity, aqi, river, soil = weather.temperature_c, weather.rainfall_mm, weather.rainfall_deficit_pct, weather.humidity_pct, weather.aqi, weather.river_level_m, weather.soil_moisture_pct
                    except Exception as e:
                        logger.error(f"[DATABASE ERROR] WeatherData query failed for scenario analysis: {e}")
                        db_errors.append("WeatherData (Scenario baseline)")
                        
                    try:
                        sat = db.query(SatelliteData).filter(SatelliteData.district_id == target_district.id).order_by(desc(SatelliteData.observed_on)).first()
                        if sat:
                            ndvi, reservoir = sat.ndvi, sat.reservoir_level_pct
                    except Exception as e:
                        logger.error(f"[DATABASE ERROR] SatelliteData query failed for scenario analysis: {e}")
                        db_errors.append("SatelliteData (Scenario baseline)")
                
                base_dict = {"rainfall_mm": rain, "rainfall_deficit_pct": deficit, "temperature_c": temp, "humidity_pct": humidity, "river_level_m": river, "soil_moisture_pct": soil, "ndvi": ndvi, "reservoir_level_pct": reservoir}
                sim_result = self.simulator.run(base_dict, {"rainfall_delta_pct": -20.0, "temperature_delta_c": 2.0, "reservoir_delta_pct": -15.0, "planning_horizon_years": 5})
                context["data_summary"] = (
                    f"Scenario Simulation Run for target district:\n"
                    f"- Scenario Parameters: Temp Shift=+2.0°C, Rainfall Shift=-20.0%, Reservoir Shift=-15.0%\n"
                    f"- Projected Water Availability: {sim_result['water_availability']}/100\n"
                    f"- Projected Crop Stress: {sim_result['crop_stress']}/100\n"
                    f"- Projected Flood Risk: {sim_result['flood_risk']}/100\n"
                    f"- Projected Drought Risk: {sim_result['drought_risk']}/100\n"
                    f"- Projected Composite Risk: {sim_result['composite_risk']}/100\n"
                    f"- Economic Loss: ₹{sim_result['economic_loss_m_inr']}M INR\n"
                    f"- Population At Risk: {sim_result['population_at_risk']}\n"
                )
            
            if db_errors:
                context["data_summary"] += f"\nNote: connection issues restricted database retrievals for some fields ({', '.join(db_errors)})."
            return context

        elif intent == "Risk Assessment":
            comp_score, f_score, d_score, h_score, ws_score = 45.0, 40.0, 50.0, 35.0, 45.0
            alerts = []
            if target_district:
                try:
                    risk = db.query(RiskScore).filter(RiskScore.district_id == target_district.id).order_by(desc(RiskScore.valid_on)).first()
                    if risk:
                        comp_score, f_score, d_score, h_score, ws_score = risk.composite_risk, risk.flood_risk, risk.drought_risk, risk.heatwave_risk, risk.water_stress_risk
                except Exception as e:
                    logger.error(f"[DATABASE ERROR] RiskScore query failed for risk assessment: {e}")
                    db_errors.append("RiskScore (Assessment)")
                    
                try:
                    alerts = db.query(ClimateAlert).filter(ClimateAlert.district_id == target_district.id).all()
                except Exception as e:
                    logger.error(f"[DATABASE ERROR] ClimateAlert query failed: {e}")
                    db_errors.append("ClimateAlert")
                    
            alert_details = "\n".join([f"- Alert: {a.title} ({a.severity}): {a.message}" for a in alerts]) if alerts else "None active"
            
            context["data_summary"] = (
                f"Climate Risk Assessment Profile:\n"
                f"- Region: {target_district.name if target_district else 'National'}\n"
                f"- Composite Risk Rating: {comp_score}/100\n"
                f"- Hazard Indices: Flood={f_score}/100, Drought={d_score}/100, Heatwave={h_score}/100, Water Stress={ws_score}/100\n"
                f"- Active Emergency Alerts:\n{alert_details}\n"
            )
            if db_errors:
                context["data_summary"] += f"\nNote: connection issues restricted database retrievals for some fields ({', '.join(db_errors)})."
            return context

        elif intent == "Decision Support":
            comp_score, f_score, d_score, h_score, ws_score = 45.0, 40.0, 50.0, 35.0, 45.0
            soil, reservoir = 42.0, 48.0
            if target_district:
                try:
                    risk = db.query(RiskScore).filter(RiskScore.district_id == target_district.id).order_by(desc(RiskScore.valid_on)).first()
                    if risk:
                        comp_score, f_score, d_score, h_score, ws_score = risk.composite_risk, risk.flood_risk, risk.drought_risk, risk.heatwave_risk, risk.water_stress_risk
                except Exception as e:
                    logger.error(f"[DATABASE ERROR] RiskScore query failed for decision support: {e}")
                    db_errors.append("RiskScore (Decision support)")
                    
                try:
                    sat = db.query(SatelliteData).filter(SatelliteData.district_id == target_district.id).order_by(desc(SatelliteData.observed_on)).first()
                    if sat:
                        reservoir = sat.reservoir_level_pct
                except Exception as e:
                    logger.error(f"[DATABASE ERROR] SatelliteData query failed for decision support: {e}")
                    db_errors.append("SatelliteData (Decision support)")
                    
                    weather = db.query(WeatherData).filter(WeatherData.district_id == target_district.id).order_by(desc(WeatherData.observed_on)).first()
                    if weather:
                        soil = weather.soil_moisture_pct
                except Exception as e:
                    logger.error(f"[DATABASE ERROR] WeatherData query failed for decision support: {e}")
                    db_errors.append("WeatherData (Decision support)")
            
            context["data_summary"] = (
                f"Operational Context for Policy Planning:\n"
                f"- Target Region: {target_district.name if target_district else 'National'}\n"
                f"- Composite Risk: {comp_score}/100\n"
                f"- Key Vulnerabilities: Drought={d_score}, Flood={f_score}, Heatwave={h_score}, Water Stress={ws_score}\n"
                f"- Reservoir Capacity: {reservoir}%, Soil Moisture: {soil}%\n"
            )
            if db_errors:
                context["data_summary"] += f"\nNote: connection issues restricted database retrievals for some fields ({', '.join(db_errors)})."
            return context

        # Climate Analysis / Report Generation
        temp, rain, deficit, humidity, aqi, river, soil, ndvi, reservoir = 31.5, 115.0, -2.5, 65.0, 75, 2.1, 42.0, 0.42, 48.0
        comp_score, f_score, d_score, h_score, ws_score = 45.0, 40.0, 50.0, 35.0, 45.0
        
        if target_district:
            try:
                weather = db.query(WeatherData).filter(WeatherData.district_id == target_district.id).order_by(desc(WeatherData.observed_on)).first()
                if weather:
                    temp, rain, deficit, humidity, aqi, river, soil = weather.temperature_c, weather.rainfall_mm, weather.rainfall_deficit_pct, weather.humidity_pct, weather.aqi, weather.river_level_m, weather.soil_moisture_pct
            except Exception as e:
                logger.error(f"[DATABASE ERROR] WeatherData query failed: {e}")
                db_errors.append("WeatherData")
                
            try:
                sat = db.query(SatelliteData).filter(SatelliteData.district_id == target_district.id).order_by(desc(SatelliteData.observed_on)).first()
                if sat:
                    ndvi, reservoir = sat.ndvi, sat.reservoir_level_pct
            except Exception as e:
                logger.error(f"[DATABASE ERROR] SatelliteData query failed: {e}")
                db_errors.append("SatelliteData")
                
            try:
                risk = db.query(RiskScore).filter(RiskScore.district_id == target_district.id).order_by(desc(RiskScore.valid_on)).first()
                if risk:
                    comp_score, f_score, d_score, h_score, ws_score = risk.composite_risk, risk.flood_risk, risk.drought_risk, risk.heatwave_risk, risk.water_stress_risk
            except Exception as e:
                logger.error(f"[DATABASE ERROR] RiskScore query failed: {e}")
                db_errors.append("RiskScore")

        context["data_summary"] = (
            f"Monitored Climate Observations:\n"
            f"- Temp: {temp}°C, Rainfall: {rain}mm, Departure Anomaly: {deficit}%\n"
            f"- Soil Moisture: {soil}%, Reservoir Level: {reservoir}%, NDVI: {ndvi}\n"
            f"- Air Quality Index: {aqi}\n"
            f"- Regional composite risk score: {comp_score}/100 (Flood: {f_score}, Drought: {d_score})\n"
        )
        if rankings:
            context["data_summary"] += "\nTop High-Risk Districts Rankings:\n"
            for r in rankings[:5]:
                context["data_summary"] += f"- {r.get('district_name') or r.get('district')} ({r.get('state_name') or r.get('state')}): Composite Risk {r.get('composite_risk')}/100\n"

        if db_errors:
            context["data_summary"] += f"\n\n[WARNING: Database connection failed/timed out for sources: {', '.join(db_errors)}. "
            context["data_summary"] += "Unable to retrieve live telemetry or active observation grids. Baseline climatology values "
            context["data_summary"] += "are being substituted for safety. Please clearly state in your response that the system has "
            context["data_summary"] += "encountered a temporary database connection timeout and is displaying baseline climate data instead.]"

        return context

    def _call_gemini_api(self, payload: CopilotRequest, active_district, active_state, rankings, db: Session, api_key: str, intent: str, target_district_2=None, target_state_2=None, db_errors=None) -> dict | None:
        try:
            context = self._retrieve_context(intent, payload, db, active_district, active_state, rankings, target_district_2, target_state_2, db_errors)

            # Build custom prompts and personality instructions for each intent
            if intent == "Educational":
                system_instruction = (
                    "You are a Senior Climate Science Educator.\n"
                    "Your style is educational, technical, and clear. Avoid any executive climate reports or 7-heading structures.\n"
                    "Answer the user's educational query directly with definitions, physical meanings, units, and sensor details.\n"
                    "Prohibit any spacecraft assistant or science fiction jargon like 'telemetry', 'command execution', 'mission control'.\n"
                    "Write your main content entirely in the 'explanation' field of the JSON. Do not write generic reports.\n\n"
                    "JSON Schema:\n"
                    "{\n"
                    '  "explanation": "Markdown description directly explaining the requested concept educationally with definitions and sensor mapping.",\n'
                    '  "risk_analysis": "Educational translation of this metric into hazard risk scales.",\n'
                    '  "recommended_actions": ["List of 2-3 actions describing how researchers or authorities monitor this metric."],\n'
                    '  "chart": { "type": "bar", "data": [{"district": "Threshold scale", "risk": 50}] },\n'
                    '  "districts": [],\n'
                    '  "action": null,\n'
                    '  "suggestions": ["Follow-up query 1", "Follow-up query 2"],\n'
                    '  "explainable_risk": { "confidence": 95, "drivers": ["Metric baseline"], "actions": ["Monitor metric trends"], "sources": ["NRSC", "IMD"] },\n'
                    '  "insights": ["Takeaway 1"]\n'
                    "}"
                )
            elif intent == "Comparison":
                system_instruction = (
                    "You are a Senior Geospatial Intelligence Officer.\n"
                    "Analyze the comparison request and output a detailed comparison.\n"
                    "You MUST format the 'explanation' field to include:\n"
                    "1. A side-by-side markdown comparison table comparing composite risk, hazard risks, and observations.\n"
                    "2. Key Differences\n"
                    "3. Strengths\n"
                    "4. Weaknesses\n"
                    "5. Recommendations\n"
                    "Ensure no sci-fi jargon is used. Write the output as a valid JSON.\n\n"
                    "JSON Schema:\n"
                    "{\n"
                    '  "explanation": "Markdown text comparing the regions side-by-side, containing structured comparison tables.",\n'
                    '  "risk_analysis": "Comparative risk summary explaining differences in vulnerability.",\n'
                    '  "recommended_actions": ["Immediate cross-regional policy interventions."],\n'
                    '  "chart": { "type": "bar", "data": [{"district": "Region A", "risk": 45}, {"district": "Region B", "risk": 60}] },\n'
                    '  "districts": [],\n'
                    '  "action": { "type": "open_compare", "state1": "State A", "state2": "State B" },\n'
                    '  "suggestions": ["Compare with another state", "What is the biggest threat?"],\n'
                    '  "explainable_risk": { "confidence": 90, "drivers": ["Precipitation variance"], "actions": ["Joint watershed planning"], "sources": ["IMD", "NRSC"] },\n'
                    '  "insights": ["Takeaway 1", "Takeaway 2"]\n'
                    "}"
                )
            elif intent == "Decision Support":
                system_instruction = (
                    "You are a Senior Disaster Management Expert and Policy Advisor.\n"
                    "Provide practical operational recommendations, warning levels, policy frameworks, and guidelines.\n"
                    "Format the 'explanation' field to cover:\n"
                    "- Situation\n"
                    "- Recommended Actions\n"
                    "- Priority\n"
                    "- Timeline\n"
                    "- Expected Outcome\n"
                    "Ensure no sci-fi jargon is used. Write the output as a valid JSON.\n\n"
                    "JSON Schema:\n"
                    "{\n"
                    '  "explanation": "Markdown text delivering policy, operational, and adaptive action plans.",\n'
                    '  "risk_analysis": "Explanation of trigger levels and the physical drivers determining high risk priorities.",\n'
                    '  "recommended_actions": ["Immediate operational interventions."],\n'
                    '  "chart": { "type": "bar", "data": [{"district": "Flood Risk", "risk": 75}] },\n'
                    '  "districts": [],\n'
                    '  "action": null,\n'
                    '  "suggestions": ["Show mitigation guidelines", "Check reservoir status"],\n'
                    '  "explainable_risk": { "confidence": 92, "drivers": ["Hazard exposure metrics"], "actions": ["Pre-position assets"], "sources": ["NDMA", "SDMA"] },\n'
                    '  "insights": ["Actionable policy takeaway 1"]\n'
                    "}"
                )
            elif intent == "Scenario Analysis":
                system_instruction = (
                    "You are a Senior Scenario Simulator Expert.\n"
                    "Analyze the simulated adjustments and outcomes.\n"
                    "Format the 'explanation' field to cover:\n"
                    "- Scenario Summary\n"
                    "- Predicted Changes\n"
                    "- Risks\n"
                    "- Recommendations\n"
                    "- Confidence\n"
                    "Ensure no sci-fi jargon is used. Write the output as a valid JSON.\n\n"
                    "JSON Schema:\n"
                    "{\n"
                    '  "explanation": "Markdown text detailing simulated parameter impacts.",\n'
                    '  "risk_analysis": "Interpretation of composite simulated risk changes.",\n'
                    '  "recommended_actions": ["Actions to reinforce systems under this specific simulated scenario."],\n'
                    '  "chart": { "type": "bar", "data": [{"district": "Water Stress", "risk": 55}] },\n'
                    '  "districts": [],\n'
                    '  "action": null,\n'
                    '  "suggestions": ["Run simulation with +4 degrees", "Compare simulation outcomes"],\n'
                    '  "explainable_risk": { "confidence": 85, "drivers": ["Simulated anomalies"], "actions": ["Micro-irrigation layouts"], "sources": ["BCT Model"] },\n'
                    '  "insights": ["Simulation insight 1"]\n'
                    "}"
                )
            elif intent == "Platform Help":
                system_instruction = (
                    "You are a Support Guide for Bharat Climate Twin.\n"
                    "Help the user navigate map layers, timeline controls, scenario sliders, and reports.\n"
                    "Write your output as a valid JSON.\n\n"
                    "JSON Schema:\n"
                    "{\n"
                    '  "explanation": "Markdown user manual or help text describing platform features and how to leverage them.",\n'
                    '  "risk_analysis": "Guidance on how to interpret composite risk values.",\n'
                    '  "recommended_actions": ["User tips for using BCT tools effectively."],\n'
                    '  "chart": { "type": "bar", "data": [] },\n'
                    '  "districts": [],\n'
                    '  "action": null,\n'
                    '  "suggestions": ["Show Map Layers guide", "How do I run a scenario?"],\n'
                    '  "explainable_risk": { "confidence": 100, "drivers": ["User Interface"], "actions": ["Explore controls"], "sources": ["BCT Manual"] },\n'
                    '  "insights": ["Dashboard navigation tips"]\n'
                    "}"
                )
            elif intent == "Report Generation":
                system_instruction = (
                    "You are a Senior Climate Intelligence Officer.\n"
                    "Generate a detailed, formal report structured logically with headers, tables, and regional indicators.\n"
                    "Ensure no sci-fi jargon is used. Write the output as a valid JSON.\n\n"
                    "JSON Schema:\n"
                    "{\n"
                    '  "explanation": "Markdown text for a structured regional report document.",\n'
                    '  "risk_analysis": "Formal explanation of composite risk metrics.",\n'
                    '  "recommended_actions": ["Policy-level interventions."],\n'
                    '  "chart": { "type": "bar", "data": [{"district": "Composite Risk", "risk": 60}] },\n'
                    '  "districts": [],\n'
                    '  "action": null,\n'
                    '  "suggestions": ["Generate comparison reports"],\n'
                    '  "explainable_risk": { "confidence": 95, "drivers": ["Report base markers"], "actions": ["Drilldowns"], "sources": ["IMD", "NRSC"] },\n'
                    '  "insights": ["Report insight 1"]\n'
                    "}"
                )
            elif intent == "Risk Assessment":
                system_instruction = (
                    "You are a Senior Disaster Management Expert.\n"
                    "Provide a detailed hazard vulnerability profile.\n"
                    "Format the 'explanation' field to cover:\n"
                    "- Hazard Profile\n"
                    "- Active Warnings\n"
                    "- Vulnerability Drivers\n"
                    "- Actionable Safeguards\n"
                    "Ensure no sci-fi jargon is used. Write the output as a valid JSON.\n\n"
                    "JSON Schema:\n"
                    "{\n"
                    '  "explanation": "Markdown text for a detailed risk/hazard assessment profile.",\n'
                    '  "risk_analysis": "Physical drivers and composite risk interpretation.",\n'
                    '  "recommended_actions": ["Disaster readiness safeguards."],\n'
                    '  "chart": { "type": "bar", "data": [{"district": "Flood Risk", "risk": 70}] },\n'
                    '  "districts": [],\n'
                    '  "action": null,\n'
                    '  "suggestions": ["Show disaster contingency rules"],\n'
                    '  "explainable_risk": { "confidence": 93, "drivers": ["Atmospheric Temperature anomaly"], "actions": ["Deploy warning nets"], "sources": ["IMD", "NDMA"] },\n'
                    '  "insights": ["Risk vulnerability hotspot warning"]\n'
                    "}"
                )
            else: # Climate Analysis
                system_instruction = (
                    "You are a Senior Climate Scientist and Environmental Analyst.\n"
                    "You MUST strictly format the 'explanation' field using these exact headings:\n"
                    "### 1. Executive Summary\n"
                    "### 2. Climate Conditions\n"
                    "### 3. Risk Assessment\n"
                    "### 4. Key Insights\n"
                    "### 5. Recommendations\n"
                    "### 6. Confidence\n"
                    "### 7. Data Sources\n\n"
                    "Ensure no sci-fi jargon is used. Write the output as a valid JSON.\n\n"
                    "JSON Schema:\n"
                    "{\n"
                    '  "explanation": "Markdown description following the 7-heading structure for regional prompts.",\n'
                    '  "risk_analysis": "Explanation of what risk values mean and their physical drivers.",\n'
                    '  "recommended_actions": ["List of immediate policy or operational interventions."],\n'
                    '  "chart": { "type": "bar", "data": [{"district": "Region A", "risk": 45}] },\n'
                    '  "districts": [],\n'
                    '  "action": null,\n'
                    '  "suggestions": ["Follow-up suggestion 1"],\n'
                    '  "explainable_risk": { "confidence": 92, "drivers": ["Atmospheric Temperature Anomaly"], "actions": ["Verification drills"], "sources": ["IMD", "NRSC"] },\n'
                    '  "insights": ["Takeaway 1"]\n'
                    "}"
                )

            # Build query with history and context
            history_context = ""
            if payload.chat_history:
                history_context = "Recent Conversation History:\n"
                for msg in payload.chat_history:
                    role_name = "User" if msg.get("role") == "user" else "Officer"
                    history_context += f"- {role_name}: {msg.get('text', '')}\n"
                history_context += "\n"

            loc_str_1 = f"District: {active_district.name}" if active_district else (f"State: {active_state.name}" if active_state else "None")
            loc_str_2 = f" | District 2: {target_district_2.name}" if target_district_2 else (f" | State 2: {target_state_2.name}" if target_state_2 else "")

            prompt_content = (
                f"{system_instruction}\n\n"
                f"Active Context:\n"
                f"- Selected Location: {loc_str_1}{loc_str_2}\n"
                f"- Selected State ID: {payload.selected_state_id}\n"
                f"- Selected Dataset: {payload.selected_dataset}\n"
                f"- Active Risk Profile: {payload.active_risk}\n"
                f"- Current Generated Report Summary: {payload.current_report.get('name') if payload.current_report else 'None'}\n"
                f"- Active Layer: {payload.active_layer}\n"
                f"- Active Year: {payload.active_year}\n"
                f"- Timeline Step: {payload.timeline_step}\n"
                f"- Map Mode: {payload.map_mode}\n"
                f"- Active Simulation Inputs/Outputs: {payload.active_simulation}\n\n"
                f"{history_context}"
                f"Retrieved Database Context based on intent '{intent}':\n"
                f"{context['data_summary']}\n\n"
                f"Generate JSON for User Query: {payload.prompt}"
            )

            # Log LLM Request details
            logger.info(f"[COPILOT DEBUG] User Query: {payload.prompt}")
            logger.info(f"[COPILOT DEBUG] Detected Intent: {intent}")
            logger.info(f"[COPILOT DEBUG] Retrieved Context: {context['data_summary']}")
            logger.info(f"[COPILOT DEBUG] Gemini Request Prompt:\n{prompt_content}")

            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
            body = {
                "contents": [{"parts": [{"text": prompt_content}]}],
                "generationConfig": {"responseMimeType": "application/json"}
            }
            
            logger.info(f"[COPILOT DEBUG] Gemini API Request Body:\n{json.dumps(body)}")

            req = urllib.request.Request(
                url, data=json.dumps(body).encode("utf-8"),
                headers={"Content-Type": "application/json"}, method="POST"
            )
            with urllib.request.urlopen(req, timeout=12) as response:
                res_body = json.loads(response.read().decode("utf-8"))
                text_out = res_body["candidates"][0]["content"]["parts"][0]["text"].strip()
                
                # Log LLM response details
                logger.info(f"[COPILOT DEBUG] Gemini Raw Response:\n{text_out}")
                
                if text_out.startswith("```"):
                    text_out = text_out.split("\n", 1)[1].rsplit("\n", 1)[0]
                ans_dict = json.loads(text_out)
                if not ans_dict.get("districts") and rankings:
                    ans_dict["districts"] = rankings[:6]
                return ans_dict
        except Exception as e:
            logger.error(f"[LLM ERROR] Error calling Gemini API: {e}")
            return None

    def _generate_offline_answer(self, payload: CopilotRequest, active_district, active_state, rankings, db: Session, intent: str, target_district_2=None, target_state_2=None, db_errors=None) -> dict:
        if db_errors is None:
            db_errors = []
            
        prompt = payload.prompt
        text = prompt.lower()

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

        temp, rain, deficit, humidity, aqi, river, soil, ndvi, reservoir = 31.5, 115.0, -2.5, 65.0, 75, 2.1, 42.0, 0.42, 48.0
        comp_score, f_score, d_score, h_score, ws_score = 45.0, 40.0, 50.0, 35.0, 45.0
        trend = "stable"
        
        if active_district:
            try:
                weather = db.query(WeatherData).filter(WeatherData.district_id == active_district.id).order_by(desc(WeatherData.observed_on)).first()
                if weather:
                    temp, rain, deficit, humidity, aqi, river, soil = weather.temperature_c, weather.rainfall_mm, weather.rainfall_deficit_pct, weather.humidity_pct, weather.aqi, weather.river_level_m, weather.soil_moisture_pct
            except Exception as e:
                logger.error(f"[DATABASE ERROR] Offline WeatherData query failed: {e}")
                db_errors.append("WeatherData (Offline)")
                
            try:
                sat = db.query(SatelliteData).filter(SatelliteData.district_id == active_district.id).order_by(desc(SatelliteData.observed_on)).first()
                if sat:
                    ndvi, reservoir = sat.ndvi, sat.reservoir_level_pct
            except Exception as e:
                logger.error(f"[DATABASE ERROR] Offline SatelliteData query failed: {e}")
                db_errors.append("SatelliteData (Offline)")
                
            try:
                risk = db.query(RiskScore).filter(RiskScore.district_id == active_district.id).order_by(desc(RiskScore.valid_on)).first()
                if risk:
                    comp_score, f_score, d_score, h_score, ws_score, trend = risk.composite_risk, risk.flood_risk, risk.drought_risk, risk.heatwave_risk, risk.water_stress_risk, risk.trend
            except Exception as e:
                logger.error(f"[DATABASE ERROR] Offline RiskScore query failed: {e}")
                db_errors.append("RiskScore (Offline)")
                
        elif active_state:
            try:
                districts_in_state = db.query(District).filter(District.state_id == active_state.id).all()
                dist_ids = [d.id for d in districts_in_state]
                if dist_ids:
                    comp_score = db.query(func.avg(RiskScore.composite_risk)).filter(RiskScore.district_id.in_(dist_ids)).scalar() or 50.0
                    f_score = db.query(func.avg(RiskScore.flood_risk)).filter(RiskScore.district_id.in_(dist_ids)).scalar() or 40.0
                    d_score = db.query(func.avg(RiskScore.drought_risk)).filter(RiskScore.district_id.in_(dist_ids)).scalar() or 40.0
                    h_score = db.query(func.avg(RiskScore.heatwave_risk)).filter(RiskScore.district_id.in_(dist_ids)).scalar() or 35.0
                    ws_score = db.query(func.avg(RiskScore.water_stress_risk)).filter(RiskScore.district_id.in_(dist_ids)).scalar() or 45.0
            except Exception as e:
                logger.error(f"[DATABASE ERROR] Offline state average query failed: {e}")
                db_errors.append("State average stats (Offline)")

        if intent == "Comparison":
            if active_district and target_district_2:
                rc1, rc2, f1, f2, dr1, dr2 = 50.0, 50.0, 40.0, 40.0, 40.0, 40.0
                try:
                    r1 = db.query(RiskScore).filter(RiskScore.district_id == active_district.id).order_by(desc(RiskScore.valid_on)).first()
                    rc1 = r1.composite_risk if r1 else 50.0
                    f1 = r1.flood_risk if r1 else 40.0
                    dr1 = r1.drought_risk if r1 else 40.0
                except Exception as e:
                    logger.error(f"[DATABASE ERROR] Offline Comparison RiskScore 1 failed: {e}")
                    db_errors.append("RiskScore 1 (Offline)")
                    
                try:
                    r2 = db.query(RiskScore).filter(RiskScore.district_id == target_district_2.id).order_by(desc(RiskScore.valid_on)).first()
                    rc2 = r2.composite_risk if r2 else 50.0
                    f2 = r2.flood_risk if r2 else 40.0
                    dr2 = r2.drought_risk if r2 else 40.0
                except Exception as e:
                    logger.error(f"[DATABASE ERROR] Offline Comparison RiskScore 2 failed: {e}")
                    db_errors.append("RiskScore 2 (Offline)")
                
                better = active_district.name if rc1 < rc2 else target_district_2.name
                worse = target_district_2.name if rc1 < rc2 else active_district.name
                explanation = (
                    f"### Side-by-Side District Comparison\n\n"
                    f"Evaluating local environmental stress for **{active_district.name}** and **{target_district_2.name}**:\n\n"
                    f"| Risk Parameter | {active_district.name} | {target_district_2.name} | Variance |\n"
                    f"| :--- | :---: | :---: | :---: |\n"
                    f"| **Composite Risk** | {rc1}/100 | {rc2}/100 | {round(abs(rc1-rc2), 1)} |\n"
                    f"| **Flood Risk** | {f1}/100 | {f2}/100 | {round(abs(f1-f2), 1)} |\n"
                    f"| **Drought Risk** | {dr1}/100 | {dr2}/100 | {round(abs(dr1-dr2), 1)} |\n\n"
                    f"### Key Differences\n"
                    f"The district of **{worse}** experiences more significant stress due to moisture deficits compared to **{better}**.\n\n"
                    f"### Strengths\n"
                    f"- **{better}** shows higher relative resilience markers.\n\n"
                    f"### Weaknesses\n"
                    f"- **{worse}** registers higher baseline exposure.\n\n"
                    f"### Recommendations\n"
                    f"- Deploy emergency advisories in {worse}.\n"
                    f"- Reference local moisture indexes to schedule irrigation."
                )
                risk_analysis = f"Primary stress driver for {worse} is drought or soil moisture deficit."
                chart_data = [{"district": active_district.name, "risk": rc1}, {"district": target_district_2.name, "risk": rc2}]
                action = {"type": "open_compare", "districtA": active_district.id, "districtB": target_district_2.id}
                recommended_actions = [f"Deploy emergency advisories in {worse}.", "Reference local moisture indexes to schedule irrigation."]
                suggestions = ["Compare Jodhpur and Jaisalmer", "Analyze reservoir levels"]
                insights = [f"{better} displays higher resilience indicators."]
                explainable_risk = {"confidence": 90, "drivers": ["Soil moisture anomalies"], "actions": ["Optimize irrigation intervals"], "sources": ["IMD", "NRSC"]}
            elif active_state and target_state_2:
                avg1, avg2 = 50.0, 50.0
                try:
                    avg1 = db.query(func.avg(RiskScore.composite_risk)).join(District).filter(District.state_id == active_state.id).scalar() or 50.0
                    avg2 = db.query(func.avg(RiskScore.composite_risk)).join(District).filter(District.state_id == target_state_2.id).scalar() or 50.0
                except Exception as e:
                    logger.error(f"[DATABASE ERROR] Offline State Comparison averages failed: {e}")
                    db_errors.append("State averages comparison (Offline)")
                better = active_state.name if avg1 < avg2 else target_state_2.name
                worse = target_state_2.name if avg1 < avg2 else active_state.name
                explanation = (
                    f"### Side-by-Side State Comparison\n\n"
                    f"Evaluating state average composite risks:\n"
                    f"| State | Avg Composite Risk |\n"
                    f"| :--- | :---: |\n"
                    f"| **{active_state.name}** | {round(avg1, 1)}/100 |\n"
                    f"| **{target_state_2.name}** | {round(avg2, 1)}/100 |\n\n"
                    f"### Key Differences\n"
                    f"State-level averages demonstrate higher vulnerability in {worse}.\n\n"
                    f"### Strengths\n"
                    f"- {better} has lower average risk parameters.\n\n"
                    f"### Weaknesses\n"
                    f"- {worse} has elevated risk markers.\n\n"
                    f"### Recommendations\n"
                    f"- Standardize state boundary early warnings.\n"
                    f"- Set up emergency water contingency channels."
                )
                risk_analysis = f"{worse} exhibits higher composite risk markers."
                chart_data = [{"district": active_state.name, "risk": round(avg1, 1)}, {"district": target_state_2.name, "risk": round(avg2, 1)}]
                recommended_actions = [f"Deploy cross-border watershed planning buffers in {worse}."]
                insights = [f"{better} shows higher relative resilience."]
                explainable_risk = {"confidence": 88, "drivers": ["Precipitation variance"], "actions": ["Joint watershed planning"], "sources": ["IMD", "NRSC"]}
            else:
                explanation = "Please specify two regions (states or districts) to perform a comparative risk audit. E.g., 'Compare Rajasthan and Gujarat'."
                suggestions = ["Compare Rajasthan and Gujarat", "Compare Jaipur and Udaipur"]

        elif intent == "Scenario Analysis":
            temp_delta = 2.0
            rain_delta = 10.0
            res_delta = -15.0
            if payload.active_simulation:
                sim = payload.active_simulation
                temp_delta = sim.get("temperature_delta_c") or sim.get("adjusted_climate", {}).get("temperature_delta_c", 2.0)
                rain_delta = sim.get("rainfall_delta_pct") or sim.get("adjusted_climate", {}).get("rainfall_delta_pct", 10.0)
                res_delta = sim.get("reservoir_delta_pct") or sim.get("adjusted_climate", {}).get("reservoir_delta_pct", -15.0)
                water = sim.get("water_availability", 50)
                crop = sim.get("crop_stress", 45)
                f_risk = sim.get("flood_risk", 40)
                d_risk = sim.get("drought_risk", 55)
                comp = sim.get("composite_risk", 50)
                pop_risk = sim.get("population_at_risk", 250000)
                econ_loss = sim.get("economic_loss_m_inr", 85.5)
            else:
                dist_id = active_district.id if active_district else 1
                base_dict = {"rainfall_mm": rain, "rainfall_deficit_pct": deficit, "temperature_c": temp, "humidity_pct": humidity, "river_level_m": river, "soil_moisture_pct": soil, "ndvi": ndvi, "reservoir_level_pct": reservoir}
                sim_result = self.simulator.run(base_dict, {"rainfall_delta_pct": rain_delta, "temperature_delta_c": temp_delta, "reservoir_delta_pct": res_delta, "planning_horizon_years": 5})
                water = sim_result["water_availability"]
                crop = sim_result["crop_stress"]
                f_risk = sim_result["flood_risk"]
                d_risk = sim_result["drought_risk"]
                comp = sim_result["composite_risk"]
                pop_risk = sim_result["population_at_risk"]
                econ_loss = sim_result["economic_loss_m_inr"]
                action = {"type": "open_simulator", "params": {"district_id": dist_id, "rainfall_delta_pct": rain_delta, "temperature_delta_c": temp_delta, "reservoir_delta_pct": res_delta, "planning_horizon_years": 5}}

            loc_name = active_state.name if active_state else (active_district.name if active_district else "Rajasthan")
            explanation = (
                f"### Scenario Summary ({temp_delta:+.1f}°C Temp | {rain_delta:+.1f}% Rainfall)\n"
                f"Simulation projections for **{loc_name}** indicate shifting vulnerabilities under this scenario:\n"
                f"- **Water Availability Index**: {water}/100\n"
                f"- **Vegetation Canopy Stress**: {crop}/100\n"
                f"- **Projected Economic Loss**: ₹{econ_loss}M INR\n"
                f"- **Estimated Population Exposed**: {pop_risk:,} residents\n\n"
                f"### Predicted Changes\n"
                f"Topsoil moisture decays by roughly 15%, raising drought risks to **{d_risk}/100**.\n\n"
                f"### Risks\n"
                f"Accelerated surface runoff increases flash-flood exposures during heavy showers.\n\n"
                f"### Recommendations\n"
                f"- Implement drought-contingency water allocation layouts.\n"
                f"- Reinforce drainage gates for simulated high precipitation events.\n\n"
                f"### Confidence\n"
                f"Confidence level set to 85% based on BCT Simulator outputs."
            )
            risk_analysis = f"Simulated composite risk settles at {comp}/100 under modified inputs."
            chart_data = [{"district": "Water Stress", "risk": water}, {"district": "Crop Stress", "risk": crop}, {"district": "Drought Risk", "risk": d_risk}, {"district": "Flood Risk", "risk": f_risk}, {"district": "Composite Risk", "risk": comp}]
            recommended_actions = ["Implement drought-contingency water allocation layouts.", "Reinforce drainage gates for simulated high precipitation events."]
            suggestions = ["Explain current climate trends", "Compare Rajasthan and Gujarat"]
            insights = [f"Simulated risk settles at {comp}/100.", f"Economic exposure modeled at ₹{econ_loss}M."]
            explainable_risk = {"confidence": 85, "drivers": ["Temperature delta anomaly", "Evapotranspiration rise"], "actions": ["Drought advisory activation"], "sources": ["BCT Simulator Model v1.1"]}

        elif intent == "Educational":
            concept_name = "Climate Index"
            concept_desc = ""
            citations = []
            
            if "ndvi" in text:
                concept_name = "NDVI (Normalized Difference Vegetation Index)"
                concept_desc = (
                    "NDVI measures the density and greenness of vegetation from satellite observations. "
                    "It scales from -1.0 to +1.0, where values below 0.15 indicate barren land, sand, or water, "
                    "and values above 0.4 represent healthy vegetation canopy. Declines indicate crop stress or canopy drying."
                )
                citations = ["National Remote Sensing Centre (NRSC) Sentinel/LISS-III products"]
            elif "aqi" in text:
                concept_name = "AQI (Air Quality Index)"
                concept_desc = (
                    "AQI reports daily air quality based on five major air pollutants. It ranges from 0 to 500. "
                    "Values over 100 trigger health alerts for sensitive groups, and values above 300 indicate hazardous stagnation."
                )
                citations = ["Central Pollution Control Board (CPCB) monitor grids"]
            elif "soil moisture" in text:
                concept_name = "Soil Moisture Saturation"
                concept_desc = (
                    "Soil moisture represents the volumetric water content in soil root-zones, regulating agricultural crop sowing "
                    "efficiency, canopy hydration, and aquifer recharge rates."
                )
                citations = ["NRSC scatterometer grids"]
            else:
                concept_name = "Climate Science Indexes"
                concept_desc = (
                    "Geospatial indices integrate satellite data (NDVI, Land Surface Temp) and weather logs (IMD grids) "
                    "to compute localized composite hazard risk scales."
                )
                citations = ["IMD gridded data", "NRSC satellite products"]

            explanation = (
                f"### Educational Briefing: {concept_name}\n\n"
                f"{concept_desc}\n\n"
                f"- **Relevance**: Scales dynamically based on atmospheric conditions.\n"
                f"- **Data Flow**: Captured using orbital multi-spectral sensors and verified against ground telemetry."
            )
            risk_analysis = f"Vulnerabilities rise when {concept_name} deviates significantly from the 30-year historical baseline."
            recommended_actions = [f"Integrate {concept_name} into emergency warning triggers.", "Review sensor baseline calibration grids."]
            suggestions = ["What is NDVI?", "Explain AQI index", "How does soil moisture affect crop stress?"]
            insights = [f"{concept_name} is fully integrated in BCT risk models."]
            explainable_risk = {"confidence": 95, "drivers": ["Standard scientific calibrations"], "actions": ["Monitor daily drift values"], "sources": citations}

        elif intent == "Platform Help":
            explanation = (
                f"### Bharat Climate-Twin Platform Guide\n\n"
                f"Welcome to the Climate Intelligence Officer workspace. You can interact with the digital twin using these controls:\n\n"
                f"1. **Map Layers**: Toggle between Composite Risk, Flood, Drought, Heatwave, Water Stress, AQI, and NDVI layers.\n"
                f"2. **Scenario Simulator**: Adjust temperature anomalies (+1 to +5°C), rainfall deficits, and reservoir drawdown to project risk indexes.\n"
                f"3. **Historical Timelines**: Step through years (2020-2026) to trace multi-decadal changes.\n"
                f"4. **Regional Reports**: Click 'Download PDF Report' on the dashboard to access formal gridded reports."
            )
            risk_analysis = "Select a district on the map to display its current observation metrics and risk breakdown."
            recommended_actions = ["Explore the Scenario Simulator using the sidebar sliders.", "Select Jodhpur or Udaipur on the map to inspect local observations."]
            suggestions = ["How do I run a simulation?", "Compare Rajasthan and Gujarat", "Explain NDVI"]
            insights = ["Digital twin is connected to real-time IMD, NRSC, and CPCB database schemas."]
            explainable_risk = {"confidence": 100, "drivers": ["User Interface"], "actions": ["Explore map layers"], "sources": ["BCT Help Manual"]}

        elif intent == "Decision Support":
            loc_name = active_state.name if active_state else (active_district.name if active_district else "India")
            explanation = (
                f"### Situation\n"
                f"Coordinated guidelines are active for **{loc_name}** based on the current hazard threat landscape:\n"
                f"- **Drought Countermeasures**: Pre-position drinking water tankers and issue micro-irrigation guidelines.\n"
                f"- **Flood Readiness**: Verify drainage blockages, check channel headrooms, and place rescue units on standby.\n\n"
                f"### Recommended Actions\n"
                f"1. Convene the state disaster mitigation advisory committee for {loc_name}.\n"
                f"2. Activate emergency block-level cooling and hydration structures.\n"
                f"3. Authorize agricultural seed subsidies for drought-prone sub-blocks.\n\n"
                f"### Priority\n"
                f"Priority levels set to high for drought-prone sub-blocks.\n\n"
                f"### Timeline\n"
                f"Operationalize emergency measures within the next 48 to 72 hours.\n\n"
                f"### Expected Outcome\n"
                f"Stabilization of soil moisture conditions and mitigation of water scarcity."
            )
            risk_analysis = f"Mitigation plans are optimized matching the composite risk score of {comp_score}/100."
            chart_data = [{"district": "Flood Risk", "risk": f_score}, {"district": "Drought Risk", "risk": d_score}, {"district": "Heatwave Risk", "risk": h_score}, {"district": "Water Stress Risk", "risk": ws_score}]
            recommended_actions = [f"Convene the state disaster mitigation advisory committee for {loc_name}.", "Activate emergency block-level cooling and hydration structures.", "Authorize agricultural seed subsidies for drought-prone sub-blocks."]
            suggestions = ["Show active alerts", "Run future conditions simulation", "Explain risk drivers"]
            insights = [f"Operational guidance compiled for {loc_name}."]
            explainable_risk = {"confidence": 94, "drivers": ["Hazard exposure metrics"], "actions": ["Deploy field monitors"], "sources": ["NDMA", "SDMA"]}

        elif intent == "Report Generation":
            loc_title = f"{active_district.name} District ({active_district.state.name})" if active_district else (f"{active_state.name} State" if active_state else "National Overview")
            explanation = (
                f"### Structured Climate Intelligence Report\n\n"
                f"This report compiles regional climate indicators and risk projections for **{loc_title}**:\n"
                f"- Composite Risk: {comp_score}/100\n"
                f"- Soil Moisture: {soil}%\n"
                f"- Water Stress Risk: {ws_score}/100\n"
                f"- Temp: {temp}°C | Rainfall Deficit: {deficit}%\n\n"
                f"Vulnerabilities are primarily driven by localized precipitation deviations. Immediate agricultural and water resources planning is required."
            )
            risk_analysis = f"Formal explanation of composite risk metric of {comp_score}/100."
            chart_data = [{"district": "Composite Risk", "risk": comp_score}]
            recommended_actions = [f"Publish district crop advisory bulletins."]
            suggestions = ["Generate comparison reports"]
            insights = [f"Composite risk is {comp_score}/100."]
            explainable_risk = {"confidence": 95, "drivers": ["Report base markers"], "actions": ["Drilldowns"], "sources": ["IMD", "NRSC"]}

        elif intent == "Risk Assessment":
            loc_title = f"{active_district.name} District ({active_district.state.name})" if active_district else (f"{active_state.name} State" if active_state else "National Overview")
            explanation = (
                f"### Hazard Profile\n"
                f"Vulnerability assessment for **{loc_title}** exposes moderate-to-high risk markers:\n"
                f"- Composite Risk: {comp_score}/100\n"
                f"- Flood Risk Index: {f_score}/100\n"
                f"- Drought Risk Index: {d_score}/100\n\n"
                f"### Active Warnings\n"
                f"No major extreme warnings are active, but drought markers are being monitored closely.\n\n"
                f"### Vulnerability Drivers\n"
                f"Primary drivers are evaporation loss and lack of monsoon backup rainfall.\n\n"
                f"### Actionable Safeguards\n"
                f"- Implement crop rotations and prioritize groundwater recharge."
            )
            risk_analysis = f"Physical drivers and composite risk interpretation for composite score of {comp_score}/100."
            chart_data = [{"district": "Flood Risk", "risk": f_score}, {"district": "Drought Risk", "risk": d_score}]
            recommended_actions = ["Disaster readiness safeguards."]
            suggestions = ["Show disaster contingency rules"]
            insights = ["Risk vulnerability hotspot warning"]
            explainable_risk = {"confidence": 93, "drivers": ["Atmospheric Temperature anomaly"], "actions": ["Deploy warning nets"], "sources": ["IMD", "NDMA"]}

        else: # Climate Analysis
            loc_title = f"{active_district.name} District ({active_district.state.name})" if active_district else (f"{active_state.name} State" if active_state else "National Overview")
            
            alerts = []
            if active_district:
                try:
                    alerts = db.query(ClimateAlert).filter(ClimateAlert.district_id == active_district.id).all()
                except Exception as e:
                    logger.error(f"[DATABASE ERROR] Offline alerts query failed: {e}")
                    db_errors.append("ClimateAlert (Offline)")
            alert_text = f"\n> [!CAUTION]\n> **ACTIVE EMERGENCY WARNING**: {alerts[0].title} - {alerts[0].message}\n" if alerts else ""

            explanation = (
                f"### 1. Executive Summary\n"
                f"A professional climate intelligence report reviews weather observations and remote sensing indices for {loc_title}.{alert_text}\n\n"
                f"### 2. Climate Conditions\n"
                f"Latest monitored observations recorded in the gridded database:\n"
                f"- **Temperature**: {temp}°C | **Precipitation**: {rain} mm (Deficit: {deficit}%)\n"
                f"- **Soil Moisture**: {soil}% saturation | **Reservoir Storage**: {reservoir}%\n"
                f"- **Vegetation (NDVI)**: {ndvi} canopy index | **Air Quality (AQI)**: {aqi}\n\n"
                f"### 3. Risk Assessment\n"
                f"- **Flood Risk Index**: {f_score}/100. Standard monitoring protocols are active.\n"
                f"- **Drought Risk Index**: {d_score}/100. Soil dehydration is noted in agricultural sectors.\n"
                f"- **Heatwave Risk**: {h_score}/100. Thermal conditions are stable.\n\n"
                f"### 4. Key Insights\n"
                f"The composite risk index of **{comp_score}/100** ({trend}) is primarily driven by {'Drought' if d_score > f_score else 'Flood'} risk factors, following localized weather deviations.\n\n"
                f"### 5. Recommendations\n"
                f"- **Local Authorities**: Review water allocation limits matching reservoir capacities.\n"
                f"- **Farmers**: Reference localized moisture indexes to schedule sowing.\n\n"
                f"### 6. Confidence\n"
                f"High. Aggregated from active observation layers.\n\n"
                f"### 7. Data Sources\n"
                f"Precipitation grids from IMD, canopy maps from NRSC, air quality indexes from CPCB ground stations."
            )
            risk_analysis = f"Composite risk of {comp_score}/100 reflects local temperature anomalies and rain deficits."
            chart_data = [{"district": "Flood Risk", "risk": f_score}, {"district": "Drought Risk", "risk": d_score}, {"district": "Heatwave Risk", "risk": h_score}, {"district": "Water Stress", "risk": ws_score}, {"district": "Composite Risk", "risk": comp_score}]
            recommended_actions = [f"Publish district crop advisory bulletins.", "Verify reservoir headroom rules.", "Verify CPCB air monitoring sensor outputs."]
            suggestions = ["Show active alerts", "Compare with neighbouring districts", "How is composite risk calculated?"]
            insights = [f"Composite risk is {comp_score}/100.", f"Primary driver is {'Drought' if d_score > f_score else 'Flood'} risk."]
            explainable_risk = {"confidence": 92, "drivers": ["Surface Temperature anomaly", "Precipitation deficit"], "actions": ["Optimize water releases"], "sources": ["IMD", "NRSC", "CPCB"]}

        # Populate districts mapping list for frontend
        focus_districts = []
        if rankings:
            for r in rankings:
                if any(c["district"] == r["district_name"] for c in chart_data):
                    focus_districts.append(r)
        if not focus_districts and rankings:
            focus_districts = rankings[:6]

        if db_errors:
            explanation += f"\n\n*Note: Due to a temporary climate database connection timeout, some live observations could not be loaded. Showing baseline indexes instead.*"

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
    ndvi_stress = max(0.0, 1.0 - ndvi) * 60.0
    soil_stress = max(0.0, 100.0 - soil_moisture) * 0.4
    return min(100.0, ndvi_stress + soil_stress)
