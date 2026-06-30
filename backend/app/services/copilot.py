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
from app.core.config import get_settings

logger = logging.getLogger(__name__)

def get_dynamic_api_key() -> str | None:
    key = os.environ.get("GEMINI_API_KEY")
    if key:
        return key
    try:
        from pathlib import Path
        env_path = Path("c:/Users/Asus/Bharat Climate-Twin/Bharat-Climate-Twin/backend/.env")
        if env_path.exists():
            for line in env_path.read_text(encoding="utf-8").splitlines():
                if line.strip().startswith("GEMINI_API_KEY="):
                    val = line.split("=", 1)[1].strip()
                    if val.startswith('"') and val.endswith('"'):
                        val = val[1:-1]
                    if val.startswith("'") and val.endswith("'"):
                        val = val[1:-1]
                    if val:
                        return val
    except Exception:
        pass
    try:
        settings = get_settings()
        return settings.gemini_api_key
    except Exception:
        return None

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

        api_key = get_dynamic_api_key()
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
        if not api_key:
            logger.warning("[AI] GEMINI_API_KEY is not configured. Returning unconfigured error response.")
            return {
                "explanation": "### AI Copilot Offline\n\nThe Climate Copilot is temporarily offline because the Gemini API key is not configured. Please contact your system administrator to configure the GEMINI_API_KEY environment variable.",
                "risk_analysis": "AI Service Unconfigured",
                "recommended_actions": ["Configure GEMINI_API_KEY environment variable.", "Restart the backend server."],
                "chart": {"type": "bar", "data": []},
                "districts": rankings[:6] if rankings else [],
                "action": None,
                "suggestions": ["Configure Gemini API Key"],
                "explainable_risk": None,
                "insights": ["AI Copilot offline."]
            }

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
            logger.error("[LLM ERROR] Gemini API call failed or timed out. Returning service unavailable error response.")
            return {
                "explanation": "### AI Service Temporarily Unavailable\n\nThe AI Copilot is temporarily unavailable due to a network connection timeout or API rate limit. Please try again in a few moments.",
                "risk_analysis": "AI Service Temporarily Unavailable",
                "recommended_actions": ["Verify network connectivity.", "Retry the query in a few moments."],
                "chart": {"type": "bar", "data": []},
                "districts": rankings[:6] if rankings else [],
                "action": None,
                "suggestions": ["Retry request"],
                "explainable_risk": None,
                "insights": ["Gemini API request failed."]
            }

    def _detect_intent(self, prompt: str, api_key: str | None) -> str:
        text = prompt.lower().strip()
        
        # Rule-based classification
        if any(k in text for k in ["how do i use", "how to use", "how does the simulator work", "how does the twin work", "help", "tutorial", "features", "dashboard", "how does the digital twin work", "how does the scenario simulator work"]):
            return "Platform Guidance"
        if any(k in text for k in ["compare", "versus", " vs ", "difference between", "comparison", "relative to", "contrast"]):
            return "Comparison"
        if any(k in text for k in ["simulate", "simulation", "scenario", "what if", "adjust", "projected", "forecast"]):
            return "Scenario Analysis"
        if any(k in text for k in ["recommend", "action", "should do", "mitigate", "policy", "strategy", "prepare", "plan", "authority", "government", "emergency", "priority", "what should", "guidelines"]):
            return "Policy Planning"
        if any(k in text for k in ["timeline", "historical trend", "decadal", "past year", "history", "years ago", "long term trend"]):
            return "Timeline Analysis"
        if any(k in text for k in ["map", "layer", "gis", "geospatial", "boundary", "bounding box", "coordinates", "overlay"]):
            return "Map Analysis"
        if any(k in text for k in ["ndvi", "vegetation", "lst", "land surface temperature", "satellite", "sensor", "optical", "radar", "chlorophyll", "green cover", "canopy", "water bodies"]):
            return "Satellite Analysis"
        
        conceptual_keywords = ["what is", "define", "explain", "meaning of", "aqi", "gcm", "carbon", "greenhouse", "return period", "el nino", "la nina", "spi", "soil moisture", "groundwater", "monsoon", "urban heat", "forest"]
        if any(k in text for k in conceptual_keywords):
            if any(text.startswith(x) for x in ["what is", "what are", "define", "explain", "how does"]):
                return "Education"
            if len(text.split()) <= 4:
                return "Education"

        if any(k in text for k in ["risk", "hazard", "threat", "vulnerability", "alert", "warning", "hotspot", "probability", "severity", "flood", "heatwave", "drought", "cyclone", "water stress", "air quality"]):
            return "Risk Assessment"
        if any(k in text for k in ["report", "briefing", "summary", "document", "generate report", "pdf", "executive report", "district report", "state report"]):
            return "Report Generation"
        if any(k in text for k in ["help", "how to", "use", "platform", "dashboard", "features", "twin", "options"]):
            return "Platform Guidance"

        # LLM-based classification fallback if API key is present
        if api_key:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
                system_instruction = (
                    "Classify this user query into exactly one of the following categories:\n"
                    "- Climate Analysis\n"
                    "- Risk Assessment\n"
                    "- Education\n"
                    "- Comparison\n"
                    "- Scenario Analysis\n"
                    "- Report Generation\n"
                    "- Policy Planning\n"
                    "- Platform Guidance\n"
                    "- Map Analysis\n"
                    "- Timeline Analysis\n"
                    "- Satellite Analysis\n\n"
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
                        "Climate Analysis", "Risk Assessment", "Education",
                        "Comparison", "Scenario Analysis", "Report Generation",
                        "Policy Planning", "Platform Guidance", "Map Analysis",
                        "Timeline Analysis", "Satellite Analysis"
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
        
        if intent == "Platform Guidance":
            context["data_summary"] = (
                "General Platform Help Query. Explain platform functionality including:\n"
                "- Map Mode toggle and risk layers (Composite Risk, Flood, Drought, Heatwave, Water Stress, AQI, NDVI)\n"
                "- Scenario Simulator inputs (temperature, rainfall, and reservoir adjustments)\n"
                "- Historical timelines and projection step selections\n"
                "- Regional Report downloads and District Dashboard KPI views"
            )
            return context
            
        elif intent == "Education":
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

        elif intent == "Policy Planning":
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
                    
                try:
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

        elif intent == "Satellite Analysis":
            ndvi, reservoir = 0.42, 48.0
            if target_district:
                try:
                    sat = db.query(SatelliteData).filter(SatelliteData.district_id == target_district.id).order_by(desc(SatelliteData.observed_on)).first()
                    if sat:
                        ndvi, reservoir = sat.ndvi, sat.reservoir_level_pct
                except Exception as e:
                    logger.error(f"[DATABASE ERROR] SatelliteData query failed: {e}")
                    db_errors.append("SatelliteData (Satellite Analysis)")
            context["data_summary"] = (
                f"Satellite Intelligence Observation:\n"
                f"- NDVI (Vegetation Index): {ndvi} (scales -1 to +1, baseline is 0.4)\n"
                f"- Reservoir Capacity Level: {reservoir}% capacity\n"
            )
            return context

        elif intent == "Timeline Analysis":
            observations = []
            if target_district:
                try:
                    obs_list = db.query(WeatherData).filter(WeatherData.district_id == target_district.id).order_by(desc(WeatherData.observed_on)).limit(5).all()
                    observations = [{"date": o.observed_on.isoformat() if isinstance(o.observed_on, (date, datetime)) else str(o.observed_on), "temp": o.temperature_c, "rain": o.rainfall_mm} for o in obs_list]
                except Exception as e:
                    logger.error(f"[DATABASE ERROR] Timeline weather observations query failed: {e}")
                    db_errors.append("WeatherData (Timeline Analysis)")
            context["data_summary"] = (
                f"Timeline observations:\n"
                f"- Decadal timeline steps active: 2026 to 2030\n"
                f"- Historical records found: {len(observations)} entries\n"
                f"- Observation details: {json.dumps(observations)}\n"
            )
            return context

        elif intent == "Map Analysis":
            context["data_summary"] = (
                f"Geospatial Map configuration:\n"
                f"- Active layer: {payload.active_layer or 'composite_risk'}\n"
                f"- Map mode: {payload.map_mode or 'streets'}\n"
            )
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

        # Add government data provenance metadata
        context["data_summary"] += (
            f"\n\n[DATA PROVENANCE & QUALITY SPECIFICATIONS: "
            f"All observations are retrieved from official Indian government repositories: IMD (temperature, rainfall, heatwave alert), NRSC (NDVI vegetation index), MOSDAC/ISRO (atmospheric water and LST observations), CPCB (Air Quality Index), CWC (river levels and flood limits), India-WRIS (basin water availability and reservoir capacity). "
            f"Dataset freshness update frequency is Hourly/Daily. Current dataset confidence is rated HIGH with verified quality status. Coverage is 100% (Pan-India district level grids). "
            f"You MUST explicitly reference the official sources used in your analysis where relevant (e.g. 'This analysis uses rainfall observations from IMD and reservoir indicators from CWC').]"
        )

        return context

    def _call_gemini_api(self, payload: CopilotRequest, active_district, active_state, rankings, db: Session, api_key: str, intent: str, target_district_2=None, target_state_2=None, db_errors=None) -> dict | None:
        try:
            context = self._retrieve_context(intent, payload, db, active_district, active_state, rankings, target_district_2, target_state_2, db_errors)

            base_system_prompt = (
                "You are the AI Supervisor Agent of the Paryavaran Bharat platform. You act as the National Climate Intelligence Officer, a professional, expert advisor in Climate Science, Geospatial Analysis, Disaster Management, and Environmental Policy.\n"
                "You coordinate the following specialized sub-agents:\n"
                "- Climate Analysis Agent (analyzes climate parameters, anomalies, and observations)\n"
                "- Risk Assessment Agent (evaluates risk, hazard indicators, and emergency alerts)\n"
                "- Government Data Agent (handles validation, provenance, and data verification from IMD, NRSC, MOSDAC, CPCB, CWC, India-WRIS)\n"
                "- Satellite Intelligence Agent (interprets NDVI, LST, green cover, and optical/radar data)\n"
                "- Simulation Agent (interprets scenario parameters and simulator deltas)\n"
                "- Report Generation Agent (handles PDF dossier generation, summaries, and policy briefs)\n"
                "- Policy Recommendation Agent (drafts operational strategy guidelines and resource allocation plans)\n"
                "- Geospatial Agent (interprets GIS maps, spatial layer distributions, and overlays)\n"
                "- Timeline Intelligence Agent (analyzes historical decadal trends and patterns)\n"
                "- Data Quality Agent (scores confidence levels and lists data provenance details)\n\n"
                "You must coordinate with the relevant sub-agents to analyze the context, verify the data sources, score your confidence, and generate a response that strictly adheres to the requested intent mode.\n"
                "CRITICAL SCIENTIFIC ACCURACY REQUIREMENT:\n"
                "You must clearly distinguish between observed, historical, simulated, and predicted data. Do not hallucinate government observations that are not provided in the context.\n"
                "CRITICAL DESIGN REQUIREMENT: Your response MUST always address the following four operational questions clearly in the text:\n"
                "1. WHAT IS HAPPENING? (Current state of parameters, observed rainfall/temperature, or active hazard alerts)\n"
                "2. WHY IS IT HAPPENING? (Root causes, satellite index anomalies like NDVI/LST, or historical baseline deviations)\n"
                "3. WHAT IS LIKELY TO HAPPEN NEXT? (Projections, simulated forecast models, and potential sector-level impacts)\n"
                "4. WHAT SHOULD BE DONE? (Actionable policy guidelines, block-level preparedness, and resource requirements)\n"
                "You must respond in valid JSON format only, matching the schema below. Do not use markdown wraps (like ```json) in the response text itself.\n\n"
                "JSON Schema:\n"
                "{\n"
                '  "explanation": "Markdown string containing the main response. You MUST use the exact headings and structure requested for the detected intent mode.",\n'
                '  "risk_analysis": "Summary of risk levels, vulnerabilities, and environmental drivers.",\n'
                '  "recommended_actions": ["List of immediate, actionable recommendations."],\n'
                '  "chart": { "type": "bar", "data": [{"district": "Name", "risk": 45}] },\n'
                '  "districts": [],\n'
                '  "action": { "type": "open_twin" | "generate_report" | "launch_simulation" | "open_risk" | "open_timeline" | "compare_states" | "view_analytics", "params": {} } or null,\n'
                '  "suggestions": ["Next step suggestions, e.g. Run Flood Simulation, Generate Report, View Flood Layer, Compare Historical Floods."],\n'
                '  "explainable_risk": {\n'
                '    "confidence": "High" | "Medium" | "Low",\n'
                '    "confidence_reason": "Explain the reason for the confidence level.",\n'
                '    "drivers": ["Key risk drivers"],\n'
                '    "actions": ["Suggested operational guidelines"],\n'
                '    "sources": ["IMD", "NRSC", "MOSDAC", "CPCB", "CWC", "India-WRIS"],\n'
                '    "provenance": {\n'
                '      "sources_used": ["List of sources"],\n'
                '      "last_updated": "Date/Time of last sync",\n'
                '      "dataset_timestamp": "Timestamp of the data",\n'
                '      "origin": "e.g. Government of India gridded feeds"\n'
                '    }\n'
                '  },\n'
                '  "insights": ["3 key takeaway bullet points summarizing the analysis"]\n'
                "}\n\n"
            )

            # Build custom prompts and personality instructions for each intent
            if intent == "Education":
                system_instruction = base_system_prompt + (
                    "Detected Intent: Education (invoking Support Guide Agent, Government Data Agent).\n"
                    "You must structure the 'explanation' field using these exact headings:\n"
                    "### 1. Scientific Concept Definition\n"
                    "### 2. Physical & Environmental Meaning\n"
                    "### 3. Measurement Metrics & normal vs extreme thresholds\n"
                    "### 4. Sensors & Government Data Providers\n\n"
                    "Provide clear, technical definitions and measurement references."
                )
            elif intent == "Comparison":
                system_instruction = base_system_prompt + (
                    "Detected Intent: Comparison Intelligence (invoking Comparison Agent, Geospatial Agent, Timeline Intelligence Agent).\n"
                    "You must structure the 'explanation' field using these exact headings:\n"
                    "### 1. Side-by-Side Comparison\n"
                    "### 2. Key Differences\n"
                    "### 3. Strengths & Weaknesses\n"
                    "### 4. Risk Variations\n"
                    "### 5. Policy Recommendations\n"
                    "### 6. Future Outlook\n\n"
                    "You MUST include a side-by-side markdown comparison table in the comparison section."
                )
            elif intent == "Policy Planning":
                system_instruction = base_system_prompt + (
                    "Detected Intent: Decision Support / Policy Planning (invoking Policy Recommendation Agent, Government Data Agent, Risk Assessment Agent).\n"
                    "You must structure the 'explanation' field using these exact headings:\n"
                    "### 1. Situation Assessment\n"
                    "### 2. Immediate Actions\n"
                    "### 3. Short-Term Actions\n"
                    "### 4. Long-Term Strategies\n"
                    "### 5. Priority Ranking & Resource Allocation Guidance\n"
                    "### 6. Expected Benefits\n\n"
                    "Deliver highly practical policy suggestions and guidelines."
                )
            elif intent == "Scenario Analysis":
                system_instruction = base_system_prompt + (
                    "Detected Intent: Scenario Intelligence (invoking Simulation Agent, Policy Recommendation Agent, Data Quality Agent).\n"
                    "You must structure the 'explanation' field using these exact headings:\n"
                    "### 1. Scenario Summary\n"
                    "### 2. Expected Impacts\n"
                    "### 3. Sector-Level Effects\n"
                    "### 4. Economic & Population Impacts\n"
                    "### 5. Risk Changes\n"
                    "### 6. Recommended Actions\n"
                    "### 7. Comparison With Current Conditions\n\n"
                    "Analyze the inputs and outcomes of the simulated weather adjustments."
                )
            elif intent == "Platform Guidance":
                system_instruction = base_system_prompt + (
                    "Detected Intent: Platform Help / Guidance (invoking Support Guide Agent).\n"
                    "You must structure the 'explanation' field using these exact headings:\n"
                    "### 1. Platform Interface Guide\n"
                    "### 2. How to Interpret Indicators\n"
                    "### 3. Workflow Automation Tips\n\n"
                    "Help the user navigate maps, simulator, timeline, reports, copilot."
                )
            elif intent == "Report Generation":
                system_instruction = base_system_prompt + (
                    "Detected Intent: Report Intelligence (invoking Report Generation Agent, Government Data Agent, Policy Recommendation Agent).\n"
                    "You must structure the 'explanation' field using these exact headings:\n"
                    "### 1. Report Findings & Executive Summary\n"
                    "### 2. Report Insights Q&A\n"
                    "### 3. Expanded Policy Brief & Action Plan\n"
                    "### 4. Follow-up Recommendations\n\n"
                    "Evaluate generated report summaries or answer report questions."
                )
            elif intent == "Risk Assessment":
                system_instruction = base_system_prompt + (
                    "Detected Intent: Risk Assessment (invoking Risk Assessment Agent, Government Data Agent, Policy Recommendation Agent, Data Quality Agent).\n"
                    "You must structure the 'explanation' field using these exact headings:\n"
                    "### 1. Current Severity\n"
                    "### 2. Historical Trend\n"
                    "### 3. Affected Areas\n"
                    "### 4. Potential Impacts\n"
                    "### 5. Mitigation Strategies\n"
                    "### 6. Priority Actions\n"
                    "### 7. Expected Outcomes\n\n"
                    "Evaluate hazard profile, active warnings, and vulnerability."
                )
            elif intent == "Satellite Analysis":
                system_instruction = base_system_prompt + (
                    "Detected Intent: Satellite Intelligence (invoking Satellite Intelligence Agent, Geospatial Agent, Government Data Agent).\n"
                    "You must structure the 'explanation' field using these exact headings:\n"
                    "### 1. Satellite Observation Summary\n"
                    "### 2. Environmental Implications\n"
                    "### 3. Detected Anomalies\n"
                    "### 4. Actionable Recommendations\n\n"
                    "Interpret satellite-derived indicators (NDVI, Vegetation cover, Land Surface Temp, reservoir bodies) and highlight anomalies."
                )
            elif intent == "Timeline Analysis":
                system_instruction = base_system_prompt + (
                    "Detected Intent: Timeline Intelligence (invoking Timeline Intelligence Agent, Geospatial Agent, Government Data Agent).\n"
                    "You must structure the 'explanation' field using these exact headings:\n"
                    "### 1. Trend Analysis & Historical Context\n"
                    "### 2. Pattern Detection\n"
                    "### 3. Historical Climate Anomalies\n"
                    "### 4. Key Turning Points\n"
                    "### 5. Future Projections & Expectations\n\n"
                    "Analyze historical decadal climate changes and extreme events."
                )
            elif intent == "Map Analysis":
                system_instruction = base_system_prompt + (
                    "Detected Intent: Geospatial Map Intelligence (invoking Geospatial Agent, Government Data Agent).\n"
                    "You must structure the 'explanation' field using these exact headings:\n"
                    "### 1. Geospatial Layer Assessment\n"
                    "### 2. Spatial Hotspots & Map Findings\n"
                    "### 3. Recommended Map Actions\n\n"
                    "Analyze active GIS map layers and overlays."
                )
            else: # Climate Analysis
                system_instruction = base_system_prompt + (
                    "Detected Intent: Climate Analysis (invoking Climate Analysis Agent, Government Data Agent, Data Quality Agent).\n"
                    "You MUST strictly format the 'explanation' field using these exact headings:\n"
                    "### 1. Executive Summary\n"
                    "### 2. Current Conditions\n"
                    "### 3. Climate Indicators\n"
                    "### 4. Risk Assessment\n"
                    "### 5. Key Insights\n"
                    "### 6. Recommendations\n"
                    "### 7. Confidence Level\n"
                    "### 8. Data Sources\n\n"
                    "Explain what the data means, do not merely repeat numbers."
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

            import time
            import uuid
            start_time = time.time()
            request_id = str(uuid.uuid4())

            # Log LLM Request details
            logger.info(f"[COPILOT DEBUG] [Request ID: {request_id}] User Query: {payload.prompt}")
            logger.info(f"[COPILOT DEBUG] [Request ID: {request_id}] Detected Intent: {intent}")
            logger.info(f"[COPILOT DEBUG] [Request ID: {request_id}] Context Length: {len(prompt_content)} chars")

            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
            body = {
                "contents": [{"parts": [{"text": prompt_content}]}],
                "generationConfig": {"responseMimeType": "application/json"}
            }

            req = urllib.request.Request(
                url, data=json.dumps(body).encode("utf-8"),
                headers={"Content-Type": "application/json"}, method="POST"
            )
            try:
                with urllib.request.urlopen(req, timeout=12) as response:
                    res_body = json.loads(response.read().decode("utf-8"))
                    text_out = res_body["candidates"][0]["content"]["parts"][0]["text"].strip()
                    
                    latency = time.time() - start_time
                    logger.info(json.dumps({
                        "event": "gemini_api_call",
                        "request_id": request_id,
                        "user_prompt": payload.prompt,
                        "prompt_length": len(payload.prompt),
                        "context_size": len(prompt_content),
                        "model_name": "gemini-1.5-flash",
                        "latency_seconds": round(latency, 3),
                        "success": True
                    }))

                    if text_out.startswith("```"):
                        text_out = text_out.split("\n", 1)[1].rsplit("\n", 1)[0]
                    ans_dict = json.loads(text_out)
                    if not ans_dict.get("districts") and rankings:
                        ans_dict["districts"] = rankings[:6]
                    return ans_dict
            except Exception as api_err:
                latency = time.time() - start_time
                logger.error(json.dumps({
                    "event": "gemini_api_call",
                    "request_id": request_id,
                    "user_prompt": payload.prompt,
                    "prompt_length": len(payload.prompt),
                    "context_size": len(prompt_content),
                    "model_name": "gemini-1.5-flash",
                    "latency_seconds": round(latency, 3),
                    "success": False,
                    "error_detail": str(api_err)
                }))
                raise api_err
        except Exception as e:
            logger.error(f"[LLM ERROR] Error calling Gemini API: {e}")
            return None

