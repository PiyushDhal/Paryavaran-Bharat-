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

    def _detect_intent(self, prompt: str, api_key: str | None) -> str:
        text = prompt.lower().strip()
        
        # Rule-based classification
        if any(k in text for k in ["compare", "versus", " vs ", "difference between", "comparison"]):
            return "State Comparison"
        if any(k in text for k in ["simulate", "simulation", "scenario", "what if", "adjust", "projected"]):
            return "Scenario Analysis"
        if any(k in text for k in ["recommend", "action", "should do", "mitigate", "policy", "strategy", "prepare", "plan", "authority", "government", "emergency", "priority"]):
            return "Decision Support"
        
        conceptual_keywords = ["what is", "define", "explain", "meaning of", "ndvi", "aqi", "gcm", "carbon", "greenhouse", "return period", "el nino", "la nina", "spi", "soil moisture", "groundwater", "monsoon", "urban heat", "canopy", "forest"]
        if any(k in text for k in conceptual_keywords):
            if any(text.startswith(x) for x in ["what is", "what are", "define", "explain", "how does"]):
                return "Educational Explanation"
            if len(text.split()) <= 4:
                return "Educational Explanation"

        if any(k in text for k in ["risk", "hazard", "threat", "vulnerability", "alert", "warning", "hotspot", "probability", "predict", "forecast"]):
            return "Risk Assessment"
        if any(k in text for k in ["report", "briefing", "summary", "document", "generate report", "pdf"]):
            return "Report Generation"
        if any(k in text for k in ["help", "how to", "use", "platform", "dashboard", "features", "twin", "options"]):
            return "General Platform Help"

        # LLM-based classification fallback if API key is present
        if api_key:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
                system_instruction = (
                    "Classify this user query into exactly one of the following categories:\n"
                    "- Climate Analysis\n"
                    "- Risk Assessment\n"
                    "- Educational Explanation\n"
                    "- State Comparison\n"
                    "- Scenario Analysis\n"
                    "- Report Generation\n"
                    "- Decision Support\n"
                    "- General Platform Help\n\n"
                    "Provide ONLY the category name as output."
                )
                body = {
                    "contents": [{"parts": [{"text": f"Instruction: {system_instruction}\nQuery: {prompt}"}]}],
                    "generationConfig": {"temperature": 0.0, "maxOutputTokens": 10}
                }
                req = urllib.request.Request(
                    url, data=json.dumps(body).encode("utf-8"),
                    headers={"Content-Type": "application/json"}, method="POST"
                )
                with urllib.request.urlopen(req, timeout=3) as response:
                    res_body = json.loads(response.read().decode("utf-8"))
                    classification = res_body["candidates"][0]["content"]["parts"][0]["text"].strip()
                    valid_intents = [
                        "Climate Analysis", "Risk Assessment", "Educational Explanation",
                        "State Comparison", "Scenario Analysis", "Report Generation",
                        "Decision Support", "General Platform Help"
                    ]
                    for intent in valid_intents:
                        if intent.lower() in classification.lower():
                            return intent
            except Exception as e:
                logger.error(f"Error in LLM classification: {e}")

        return "Climate Analysis"

    def _retrieve_context(self, intent: str, payload: CopilotRequest, db: Session, target_district, target_state, rankings) -> dict:
        context = {"intent": intent, "data_summary": ""}
        text = payload.prompt.lower()

        # Retrieve default variables if district exists
        temp, rain, deficit, humidity, aqi, river, soil, ndvi, reservoir = 31.5, 115.0, -2.5, 65.0, 75, 2.1, 42.0, 0.42, 48.0
        comp_score, f_score, d_score, h_score, ws_score = 45.0, 40.0, 50.0, 35.0, 45.0
        
        if target_district:
            weather = db.query(WeatherData).filter(WeatherData.district_id == target_district.id).order_by(desc(WeatherData.observed_on)).first()
            sat = db.query(SatelliteData).filter(SatelliteData.district_id == target_district.id).order_by(desc(SatelliteData.observed_on)).first()
            risk = db.query(RiskScore).filter(RiskScore.district_id == target_district.id).order_by(desc(RiskScore.valid_on)).first()
            if weather:
                temp, rain, deficit, humidity, aqi, river, soil = weather.temperature_c, weather.rainfall_mm, weather.rainfall_deficit_pct, weather.humidity_pct, weather.aqi, weather.river_level_m, weather.soil_moisture_pct
            if sat:
                ndvi, reservoir = sat.ndvi, sat.reservoir_level_pct
            if risk:
                comp_score, f_score, d_score, h_score, ws_score = risk.composite_risk, risk.flood_risk, risk.drought_risk, risk.heatwave_risk, risk.water_stress_risk

        if intent == "State Comparison":
            # Extract state or district mentions
            matched_states = []
            db_states = db.query(State).all()
            for s in db_states:
                if s.name.lower() in text:
                    matched_states.append(s)
            
            matched_districts = []
            db_districts = db.query(District).all()
            for d in db_districts:
                if d.name.lower() in text:
                    matched_districts.append(d)

            if len(matched_states) >= 2:
                s1, s2 = matched_states[0], matched_states[1]
                avg1 = db.query(func.avg(RiskScore.composite_risk)).join(District).filter(District.state_id == s1.id).scalar() or 50.0
                avg2 = db.query(func.avg(RiskScore.composite_risk)).join(District).filter(District.state_id == s2.id).scalar() or 50.0
                f1 = db.query(func.avg(RiskScore.flood_risk)).join(District).filter(District.state_id == s1.id).scalar() or 40.0
                f2 = db.query(func.avg(RiskScore.flood_risk)).join(District).filter(District.state_id == s2.id).scalar() or 40.0
                dr1 = db.query(func.avg(RiskScore.drought_risk)).join(District).filter(District.state_id == s1.id).scalar() or 40.0
                dr2 = db.query(func.avg(RiskScore.drought_risk)).join(District).filter(District.state_id == s2.id).scalar() or 40.0
                context["data_summary"] = (
                    f"Comparing State Averages:\n"
                    f"- {s1.name}: Composite Risk={avg1:.1f}/100, Flood Risk={f1:.1f}/100, Drought Risk={dr1:.1f}/100\n"
                    f"- {s2.name}: Composite Risk={avg2:.1f}/100, Flood Risk={f2:.1f}/100, Drought Risk={dr2:.1f}/100\n"
                )
            elif len(matched_districts) >= 2 or (target_district and len(matched_districts) == 1):
                d1 = matched_districts[0]
                d2 = matched_districts[1] if len(matched_districts) >= 2 else target_district
                r1 = db.query(RiskScore).filter(RiskScore.district_id == d1.id).order_by(desc(RiskScore.valid_on)).first()
                r2 = db.query(RiskScore).filter(RiskScore.district_id == d2.id).order_by(desc(RiskScore.valid_on)).first()
                rc1 = r1.composite_risk if r1 else 50.0
                rc2 = r2.composite_risk if r2 else 50.0
                f1 = r1.flood_risk if r1 else 40.0
                f2 = r2.flood_risk if r2 else 40.0
                dr1 = r1.drought_risk if r1 else 40.0
                dr2 = r2.drought_risk if r2 else 40.0
                context["data_summary"] = (
                    f"Comparing District Observations:\n"
                    f"- {d1.name} ({d1.state.name}): Composite Risk={rc1}/100, Flood Risk={f1}/100, Drought Risk={dr1}/100\n"
                    f"- {d2.name} ({d2.state.name}): Composite Risk={rc2}/100, Flood Risk={f2}/100, Drought Risk={dr2}/100\n"
                )
            else:
                context["data_summary"] = "Comparison request detected, but not enough states or districts identified in query."

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
                # Retrieve simulator pre-run baseline
                dist_id = target_district.id if target_district else 1
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

        elif intent == "Risk Assessment":
            alerts = db.query(ClimateAlert).filter(ClimateAlert.district_id == target_district.id).all() if target_district else []
            alert_details = "\n".join([f"- Alert: {a.title} ({a.severity}): {a.message}" for a in alerts]) if alerts else "None active"
            context["data_summary"] = (
                f"Climate Risk Assessment Profile:\n"
                f"- Region: {target_district.name if target_district else 'National'}\n"
                f"- Composite Risk Rating: {comp_score}/100\n"
                f"- Hazard Indices: Flood={f_score}/100, Drought={d_score}/100, Heatwave={h_score}/100, Water Stress={ws_score}/100\n"
                f"- Active Emergency Alerts:\n{alert_details}\n"
            )

        elif intent == "Decision Support":
            context["data_summary"] = (
                f"Operational Context for Policy Planning:\n"
                f"- Target Region: {target_district.name if target_district else 'National'}\n"
                f"- Composite Risk: {comp_score}/100\n"
                f"- Key Vulnerabilities: Drought={d_score}, Flood={f_score}, Heatwave={h_score}, Water Stress={ws_score}\n"
                f"- Reservoir Capacity: {reservoir}%, Soil Moisture: {soil}%\n"
            )

        elif intent == "Educational Explanation":
            context["data_summary"] = (
                "Educational Concept Query. Provide a detailed scientific breakdown explaining the parameter's "
                "definition, physical meaning, sensor source mapping (e.g. NRSC MODIS/Sentinel/INSAT or IMD grids), "
                "measurement units, and normal vs. extreme warning thresholds."
            )

        elif intent == "General Platform Help":
            context["data_summary"] = (
                "General Platform Help Query. Explain platform functionality including:\n"
                "- Map Mode toggle and risk layers (Composite Risk, Flood, Drought, Heatwave, Water Stress, AQI, NDVI)\n"
                "- Scenario Simulator inputs (temperature, rainfall, and reservoir adjustments)\n"
                "- Historical timelines and projection step selections\n"
                "- Regional Report downloads and District Dashboard KPI views"
            )

        else: # Climate Analysis / Report Generation
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

        return context

    def _call_gemini_api(self, payload: CopilotRequest, active_district, active_state, mentioned_district, mentioned_state, rankings, db: Session, api_key: str) -> dict | None:
        try:
            target_district = mentioned_district or active_district
            target_state = mentioned_state or (active_state if not mentioned_district else None)
            
            intent = self._detect_intent(payload.prompt, api_key)
            context = self._retrieve_context(intent, payload, db, target_district, target_state, rankings)

            # Select system instruction template according to intent
            if intent == "Educational Explanation":
                system_instruction = (
                    "You are the **Bharat Climate Science Educator**—a senior environmental scientist and remote sensing specialist.\n"
                    "Your tone is objective, technical, clear, and educational. Do NOT use the 7-heading regional climate report structure.\n"
                    "Explain the concept (e.g. NDVI, AQI, soil moisture, return periods) directly and clearly. Define what it is, its measurement scale, "
                    "typical thresholds (good vs. bad), and the sensor/satellite/ground systems (e.g., NRSC Landsat/Sentinel or IMD grids or CPCB sensors) "
                    "that capture it. Output a valid JSON response block matching the schema below.\n\n"
                    "JSON Schema:\n"
                    "{\n"
                    '  "explanation": "Markdown description directly explaining the requested concept educationally, without forcing the 7-heading structure.",\n'
                    '  "risk_analysis": "Concept risk translation (e.g., how values map to hazard scales).",\n'
                    '  "recommended_actions": ["List of 2-3 actions describing how researchers or authorities monitor or apply this metric."],\n'
                    '  "chart": { "type": "bar", "data": [{"district": "Threshold scale", "risk": 50}] },\n'
                    '  "districts": [],\n'
                    '  "action": null,\n'
                    '  "suggestions": ["Follow-up query 1", "Follow-up query 2"],\n'
                    '  "explainable_risk": { "confidence": 95, "drivers": ["Metric baseline"], "actions": ["Monitor metric trends"], "sources": ["NRSC", "IMD"] },\n'
                    '  "insights": ["Scientific takeaway 1"]\n'
                    "}"
                )
            elif intent == "State Comparison":
                system_instruction = (
                    "You are the **Bharat Climate Comparison Analyst**—a senior geospatial and regional planner.\n"
                    "Focus on comparing the requested states, districts, or regions side-by-side. You MUST include markdown comparison tables "
                    "comparing composite risk, hazard risks (flood, drought, heatwave, water stress), and basic weather observations. "
                    "Highlight variances, vulnerabilities, and relative systemic resilience. Avoid cinematic phrasing.\n\n"
                    "JSON Schema:\n"
                    "{\n"
                    '  "explanation": "Markdown text comparing the regions side-by-side, containing structured comparison tables.",\n'
                    '  "risk_analysis": "Comparative risk summary explaining why one region registers higher exposure.",\n'
                    '  "recommended_actions": ["Immediate trans-boundary or cross-regional policy interventions."],\n'
                    '  "chart": { "type": "bar", "data": [{"district": "Region A", "risk": 45}, {"district": "Region B", "risk": 60}] },\n'
                    '  "districts": [],\n'
                    '  "action": { "type": "open_compare", "state1": "State A", "state2": "State B" },\n'
                    '  "suggestions": ["Compare with another state", "What is the biggest threat in Region B?"],\n'
                    '  "explainable_risk": { "confidence": 90, "drivers": ["Precipitation variance"], "actions": ["Joint watershed planning"], "sources": ["IMD", "NRSC"] },\n'
                    '  "insights": ["Comparison takeaway 1", "Comparison takeaway 2"]\n'
                    "}"
                )
            elif intent == "Decision Support":
                system_instruction = (
                    "You are the **Bharat Climate Policy Advisor**—a senior disaster management and policy advisor.\n"
                    "Focus heavily on providing actionable, localized operational recommendations, warning trigger levels, policy frameworks, "
                    "and adaptation strategies. Do not repeat basic observations. Provide targeted guidelines for local authorities, "
                    "disaster management agencies (SDMA/NDMA), farmers, and infrastructure planners.\n\n"
                    "JSON Schema:\n"
                    "{\n"
                    '  "explanation": "Markdown text delivering policy, operational, and adaptive action plans for the hazard watch.",\n'
                    '  "risk_analysis": "Explanation of trigger levels and the physical drivers determining high risk priorities.",\n'
                    '  "recommended_actions": ["List of 3-4 immediate operational interventions."],\n'
                    '  "chart": { "type": "bar", "data": [{"district": "Flood Risk", "risk": 75}] },\n'
                    '  "districts": [],\n'
                    '  "action": null,\n'
                    '  "suggestions": ["Show mitigation guidelines", "Check reservoir capacity status"],\n'
                    '  "explainable_risk": { "confidence": 92, "drivers": ["Hazard exposure metrics"], "actions": ["Pre-position assets"], "sources": ["NDMA", "SDMA"] },\n'
                    '  "insights": ["Actionable policy takeaway 1"]\n'
                    "}"
                )
            elif intent == "Scenario Analysis":
                system_instruction = (
                    "You are the **Bharat Climate Simulator Expert**—a senior systems modeler.\n"
                    "Analyze the simulated adjustments (e.g. temp anomalies, rainfall shifts, reservoir changes). Explain the expected climate, agricultural, "
                    "hydrological, and socio-economic impacts (population at risk, economic loss) under future projection stress.\n\n"
                    "JSON Schema:\n"
                    "{\n"
                    '  "explanation": "Markdown text detailing simulated parameter impacts on crops, water holdings, and local infrastructure.",\n'
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
            elif intent == "General Platform Help":
                system_instruction = (
                    "You are the **Bharat Climate Twin Support Guide**.\n"
                    "Provide clear instructions on how to use the dashboard features. Do not invent climate statistics. "
                    "Help the user navigate map layers, timeline controls, scenario sliders, and report downloads.\n\n"
                    "JSON Schema:\n"
                    "{\n"
                    '  "explanation": "Markdown user manual or help text describing platform features and how to leverage them.",\n'
                    '  "risk_analysis": "Guidance on how to interpret composite risk values displayed in the UI.",\n'
                    '  "recommended_actions": ["User tips for using BCT tools effectively."],\n'
                    '  "chart": { "type": "bar", "data": [] },\n'
                    '  "districts": [],\n'
                    '  "action": null,\n'
                    '  "suggestions": ["Show Map Layers guide", "How do I run a scenario?"],\n'
                    '  "explainable_risk": { "confidence": 100, "drivers": ["User Interface"], "actions": ["Explore controls"], "sources": ["BCT Manual"] },\n'
                    '  "insights": ["Dashboard navigation tips"]\n'
                    "}"
                )
            else: # Climate Analysis / Report Generation / Risk Assessment (using 7 headings)
                system_instruction = (
                    "You are the **Bharat Climate Intelligence Officer**—a senior climate scientist and disaster management advisor.\n"
                    "Your tone is highly objective, evidence-based, professional, and clear. Avoid all dramatic, cinematic, or fictional phrasing.\n"
                    "Whenever answering about a region (district or state), you MUST strictly format the 'explanation' field using these exact headings:\n"
                    "### 1. Executive Summary\n"
                    "### 2. Current Climate Conditions\n"
                    "### 3. Risk Assessment\n"
                    "### 4. Key Insights\n"
                    "### 5. Recommended Actions\n"
                    "### 6. Confidence\n"
                    "### 7. Data Sources\n\n"
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

            prompt_content = (
                f"{system_instruction}\n\n"
                f"Active Context:\n"
                f"- Selected District: {active_district.name if active_district else 'None'}\n"
                f"- Selected State: {active_state.name if active_state else 'None'}\n"
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

            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
            body = {
                "contents": [{"parts": [{"text": prompt_content}]}],
                "generationConfig": {"responseMimeType": "application/json"}
            }
            req = urllib.request.Request(
                url, data=json.dumps(body).encode("utf-8"),
                headers={"Content-Type": "application/json"}, method="POST"
            )
            with urllib.request.urlopen(req, timeout=12) as response:
                res_body = json.loads(response.read().decode("utf-8"))
                text_out = res_body["candidates"][0]["content"]["parts"][0]["text"].strip()
                if text_out.startswith("```"):
                    text_out = text_out.split("\n", 1)[1].rsplit("\n", 1)[0]
                ans_dict = json.loads(text_out)
                if not ans_dict.get("districts") and rankings:
                    ans_dict["districts"] = rankings[:6]
                return ans_dict
        except Exception as e:
            logger.error(f"Error calling Gemini API: {e}")
            return None

    def _generate_offline_answer(self, payload: CopilotRequest, active_district, active_state, mentioned_district, mentioned_state, rankings, db: Session) -> dict:
        prompt = payload.prompt
        text = prompt.lower()
        intent = self._detect_intent(prompt, None)

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

        target_district = mentioned_district or active_district
        target_state = mentioned_state or (active_state if not mentioned_district else None)

        temp, rain, deficit, humidity, aqi, river, soil, ndvi, reservoir = 31.5, 115.0, -2.5, 65.0, 75, 2.1, 42.0, 0.42, 48.0
        comp_score, f_score, d_score, h_score, ws_score = 45.0, 40.0, 50.0, 35.0, 45.0
        trend = "stable"
        
        if target_district:
            weather = db.query(WeatherData).filter(WeatherData.district_id == target_district.id).order_by(desc(WeatherData.observed_on)).first()
            sat = db.query(SatelliteData).filter(SatelliteData.district_id == target_district.id).order_by(desc(SatelliteData.observed_on)).first()
            risk = db.query(RiskScore).filter(RiskScore.district_id == target_district.id).order_by(desc(RiskScore.valid_on)).first()
            if weather:
                temp, rain, deficit, humidity, aqi, river, soil = weather.temperature_c, weather.rainfall_mm, weather.rainfall_deficit_pct, weather.humidity_pct, weather.aqi, weather.river_level_m, weather.soil_moisture_pct
            if sat:
                ndvi, reservoir = sat.ndvi, sat.reservoir_level_pct
            if risk:
                comp_score, f_score, d_score, h_score, ws_score, trend = risk.composite_risk, risk.flood_risk, risk.drought_risk, risk.heatwave_risk, risk.water_stress_risk, risk.trend
        elif target_state:
            districts_in_state = db.query(District).filter(District.state_id == target_state.id).all()
            dist_ids = [d.id for d in districts_in_state]
            if dist_ids:
                comp_score = db.query(func.avg(RiskScore.composite_risk)).filter(RiskScore.district_id.in_(dist_ids)).scalar() or 50.0
                f_score = db.query(func.avg(RiskScore.flood_risk)).filter(RiskScore.district_id.in_(dist_ids)).scalar() or 40.0
                d_score = db.query(func.avg(RiskScore.drought_risk)).filter(RiskScore.district_id.in_(dist_ids)).scalar() or 40.0
                h_score = db.query(func.avg(RiskScore.heatwave_risk)).filter(RiskScore.district_id.in_(dist_ids)).scalar() or 35.0
                ws_score = db.query(func.avg(RiskScore.water_stress_risk)).filter(RiskScore.district_id.in_(dist_ids)).scalar() or 45.0

        if intent == "State Comparison":
            matched_states = []
            db_states = db.query(State).all()
            for s in db_states:
                if s.name.lower() in text:
                    matched_states.append(s)
            
            matched_districts = []
            db_districts = db.query(District).all()
            for d in db_districts:
                if d.name.lower() in text:
                    matched_districts.append(d)

            if len(matched_states) >= 2:
                s1, s2 = matched_states[0], matched_states[1]
                avg1 = db.query(func.avg(RiskScore.composite_risk)).join(District).filter(District.state_id == s1.id).scalar() or 50.0
                avg2 = db.query(func.avg(RiskScore.composite_risk)).join(District).filter(District.state_id == s2.id).scalar() or 50.0
                f1 = db.query(func.avg(RiskScore.flood_risk)).join(District).filter(District.state_id == s1.id).scalar() or 40.0
                f2 = db.query(func.avg(RiskScore.flood_risk)).join(District).filter(District.state_id == s2.id).scalar() or 40.0
                dr1 = db.query(func.avg(RiskScore.drought_risk)).join(District).filter(District.state_id == s1.id).scalar() or 40.0
                dr2 = db.query(func.avg(RiskScore.drought_risk)).join(District).filter(District.state_id == s2.id).scalar() or 40.0
                better = s1.name if avg1 < avg2 else s2.name
                worse = s2.name if avg1 < avg2 else s1.name
                
                explanation = (
                    f"### Side-by-Side State Comparison\n\n"
                    f"A comparative geospatial assessment was conducted between the states of **{s1.name}** and **{s2.name}** to identify relative vulnerabilities:\n\n"
                    f"| Parameter (State Average) | {s1.name} | {s2.name} | Variance |\n"
                    f"| :--- | :---: | :---: | :---: |\n"
                    f"| **Composite Risk** | {round(avg1, 1)}/100 | {round(avg2, 1)}/100 | {round(abs(avg1-avg2), 1)} |\n"
                    f"| **Flood Risk Index** | {round(f1, 1)}/100 | {round(f2, 1)}/100 | {round(abs(f1-f2), 1)} |\n"
                    f"| **Drought Risk Index** | {round(dr1, 1)}/100 | {round(dr2, 1)}/100 | {round(abs(dr1-dr2), 1)} |\n\n"
                    f"- **Systemic Resilience**: {better} displays lower composite risk across active zones.\n"
                    f"- **Vulnerable Focus**: {worse} registers higher baseline sensitivities to precipitation anomalies."
                )
                risk_analysis = f"{worse} exhibits elevated risk markers. Joint coordination channels should be activated."
                chart_data = [{"district": f"{s1.name} Avg", "risk": round(avg1, 1)}, {"district": f"{s2.name} Avg", "risk": round(avg2, 1)}]
                action = {"type": "open_compare", "state1": s1.name, "state2": s2.name}
                recommended_actions = [f"Deploy cross-border watershed planning buffers in {worse}.", "Standardize early warning frameworks across states."]
                suggestions = ["Which states are safest?", f"Analyse {s2.name}", "What is the biggest threat?"]
                insights = [f"{better} shows higher relative resilience.", f"{worse} is the higher risk region."]
                explainable_risk = {"confidence": 88, "drivers": ["Precipitation deficit variance"], "actions": ["Verify cross-state flows"], "sources": ["IMD", "NRSC"]}
            elif len(matched_districts) >= 2 or (target_district and len(matched_districts) == 1):
                d1 = matched_districts[0]
                d2 = matched_districts[1] if len(matched_districts) >= 2 else target_district
                r1 = db.query(RiskScore).filter(RiskScore.district_id == d1.id).order_by(desc(RiskScore.valid_on)).first()
                r2 = db.query(RiskScore).filter(RiskScore.district_id == d2.id).order_by(desc(RiskScore.valid_on)).first()
                rc1 = r1.composite_risk if r1 else 50.0
                rc2 = r2.composite_risk if r2 else 50.0
                f1 = r1.flood_risk if r1 else 40.0
                f2 = r2.flood_risk if r2 else 40.0
                dr1 = r1.drought_risk if r1 else 40.0
                dr2 = r2.drought_risk if r2 else 40.0
                better = d1.name if rc1 < rc2 else d2.name
                worse = d2.name if rc1 < rc2 else d1.name
                explanation = (
                    f"### Side-by-Side District Comparison\n\n"
                    f"Evaluating local environmental stress for **{d1.name}** and **{d2.name}**:\n\n"
                    f"| Risk Parameter | {d1.name} | {d2.name} | Variance |\n"
                    f"| :--- | :---: | :---: | :---: |\n"
                    f"| **Composite Risk** | {rc1}/100 | {rc2}/100 | {round(abs(rc1-rc2), 1)} |\n"
                    f"| **Flood Risk** | {f1}/100 | {f2}/100 | {round(abs(f1-f2), 1)} |\n"
                    f"| **Drought Risk** | {dr1}/100 | {dr2}/100 | {round(abs(dr1-dr2), 1)} |\n\n"
                    f"The district of **{worse}** experiences more significant stress due to moisture deficits compared to **{better}**."
                )
                risk_analysis = f"Primary stress driver for {worse} is drought or soil moisture deficit."
                chart_data = [{"district": d1.name, "risk": rc1}, {"district": d2.name, "risk": rc2}]
                action = {"type": "open_compare", "districtA": d1.id, "districtB": d2.id}
                recommended_actions = [f"Deploy emergency advisories in {worse}.", "Reference local moisture indexes to schedule irrigation."]
                suggestions = ["Compare Jodhpur and Jaisalmer", "Analyze reservoir levels"]
                insights = [f"{better} displays higher resilience indicators."]
                explainable_risk = {"confidence": 90, "drivers": ["Soil moisture anomalies"], "actions": ["Optimize irrigation intervals"], "sources": ["IMD", "NRSC"]}
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
                infra = sim.get("infrastructure_risk", 45)
            else:
                dist_id = target_district.id if target_district else 1
                base_dict = {"rainfall_mm": rain, "rainfall_deficit_pct": deficit, "temperature_c": temp, "humidity_pct": humidity, "river_level_m": river, "soil_moisture_pct": soil, "ndvi": ndvi, "reservoir_level_pct": reservoir}
                sim_result = self.simulator.run(base_dict, {"rainfall_delta_pct": rain_delta, "temperature_delta_c": temp_delta, "reservoir_delta_pct": res_delta, "planning_horizon_years": 5})
                water = sim_result["water_availability"]
                crop = sim_result["crop_stress"]
                f_risk = sim_result["flood_risk"]
                d_risk = sim_result["drought_risk"]
                comp = sim_result["composite_risk"]
                pop_risk = sim_result["population_at_risk"]
                econ_loss = sim_result["economic_loss_m_inr"]
                infra = sim_result["infrastructure_risk"]
                action = {"type": "open_simulator", "params": {"district_id": dist_id, "rainfall_delta_pct": rain_delta, "temperature_delta_c": temp_delta, "reservoir_delta_pct": res_delta, "planning_horizon_years": 5}}

            loc_name = target_state.name if target_state else (target_district.name if target_district else "Rajasthan")
            explanation = (
                f"### Simulated Climate Scenario Analysis ({temp_delta:+.1f}°C Temp | {rain_delta:+.1f}% Rainfall)\n\n"
                f"Projections for **{loc_name}** indicate shifting vulnerabilities under this scenario:\n"
                f"- **Water Availability Index**: {water}/100\n"
                f"- **Vegetation Canopy Stress**: {crop}/100\n"
                f"- **Projected Economic Loss**: ₹{econ_loss}M INR\n"
                f"- **Estimated Population Exposed**: {pop_risk:,} residents\n\n"
                f"Increased thermal anomalies accelerate topsoil moisture decay, raising drought risks to **{d_risk}/100**."
            )
            risk_analysis = f"Simulated composite risk settles at {comp}/100 under modified inputs."
            chart_data = [{"district": "Water Stress", "risk": water}, {"district": "Crop Stress", "risk": crop}, {"district": "Drought Risk", "risk": d_risk}, {"district": "Flood Risk", "risk": f_risk}, {"district": "Composite Risk", "risk": comp}]
            recommended_actions = ["Implement drought-contingency water allocation layouts.", "Reinforce drainage gates for simulated high precipitation events.", "Activate municipal cooling protocols."]
            suggestions = ["Explain current climate trends", "Compare Rajasthan and Gujarat"]
            insights = [f"Simulated risk settles at {comp}/100.", f"Economic exposure modeled at ₹{econ_loss}M."]
            explainable_risk = {"confidence": 85, "drivers": ["Temperature delta anomaly", "Evapotranspiration rise"], "actions": ["Drought advisory activation"], "sources": ["BCT Simulator Model v1.1"]}

        elif intent == "Educational Explanation":
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

        elif intent == "General Platform Help":
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
            loc_name = target_state.name if target_state else (target_district.name if target_district else "India")
            explanation = (
                f"### Operational Mitigation Briefing for {loc_name}\n\n"
                f"Coordinated guidelines are active for this region based on the current hazard threat landscape:\n"
                f"- **Drought Countermeasures**: Pre-position drinking water tankers and issue micro-irrigation guidelines.\n"
                f"- **Flood Readiness**: Verify drainage blockages, check channel headrooms, and place rescue units on standby.\n"
                f"- **Agricultural Adaptation**: Advise shifting crops to short-duration pulses or drought-tolerant varieties."
            )
            risk_analysis = f"Mitigation plans are optimized matching the composite risk score of {comp_score}/100."
            chart_data = [{"district": "Flood Risk", "risk": f_score}, {"district": "Drought Risk", "risk": d_score}, {"district": "Heatwave Risk", "risk": h_score}, {"district": "Water Stress Risk", "risk": ws_score}]
            recommended_actions = [f"Convene the state disaster mitigation advisory committee for {loc_name}.", "Activate emergency block-level cooling and hydration structures.", "Authorize agricultural seed subsidies for drought-prone sub-blocks."]
            suggestions = ["Show active alerts", "Run future conditions simulation", "Explain risk drivers"]
            insights = [f"Operational guidance compiled for {loc_name}."]
            explainable_risk = {"confidence": 94, "drivers": ["Hazard exposure metrics"], "actions": ["Deploy field monitors"], "sources": ["NDMA", "SDMA"]}

        else: # Climate Analysis / Report Generation (7-heading structure required)
            loc_title = f"{target_district.name} District ({target_district.state.name})" if target_district else (f"{target_state.name} State" if target_state else "National Overview")
            
            alerts = db.query(ClimateAlert).filter(ClimateAlert.district_id == target_district.id).all() if target_district else []
            alert_text = f"\n> [!CAUTION]\n> **ACTIVE EMERGENCY WARNING**: {alerts[0].title} - {alerts[0].message}\n" if alerts else ""

            explanation = (
                f"### 1. Executive Summary\n"
                f"A professional climate intelligence report reviews weather observations and remote sensing indices for {loc_title}.{alert_text}\n\n"
                f"### 2. Current Climate Conditions\n"
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
                f"### 5. Recommended Actions\n"
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
