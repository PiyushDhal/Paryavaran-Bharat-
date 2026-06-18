import type {
  Analytics,
  ClimateAlert,
  ClimateObservation,
  CopilotResponse,
  District,
  Ranking,
  ScenarioPayload,
  SimulationResult,
  State
} from "@/lib/types";

// ─── Static mock data ────────────────────────────────────────────────
export const MOCK_STATES: State[] = [
  { id: 1, name: "Maharashtra", code: "MH", centroid_lat: 19.7515, centroid_lon: 75.7139 },
  { id: 2, name: "Assam", code: "AS", centroid_lat: 26.2006, centroid_lon: 92.9376 },
  { id: 3, name: "Rajasthan", code: "RJ", centroid_lat: 27.0238, centroid_lon: 74.2179 },
  { id: 4, name: "Tamil Nadu", code: "TN", centroid_lat: 11.1271, centroid_lon: 78.6569 },
  { id: 5, name: "Gujarat", code: "GJ", centroid_lat: 22.2587, centroid_lon: 71.1924 },
  { id: 6, name: "Karnataka", code: "KA", centroid_lat: 15.3173, centroid_lon: 75.7139 },
  { id: 7, name: "West Bengal", code: "WB", centroid_lat: 22.9868, centroid_lon: 87.8550 },
  { id: 8, name: "Uttar Pradesh", code: "UP", centroid_lat: 26.8467, centroid_lon: 80.9462 }
];

export const MOCK_DISTRICTS: District[] = [
  { id: 101, state_id: 1, name: "Mumbai", code: "MH-MUM", population: 12442373, area_sq_km: 603, centroid_lat: 19.076, centroid_lon: 72.8777, state_name: "Maharashtra" },
  { id: 102, state_id: 1, name: "Pune", code: "MH-PUN", population: 9429408, area_sq_km: 15643, centroid_lat: 18.5204, centroid_lon: 73.8567, state_name: "Maharashtra" },
  { id: 103, state_id: 1, name: "Nagpur", code: "MH-NAG", population: 4653570, area_sq_km: 9892, centroid_lat: 21.1458, centroid_lon: 79.0882, state_name: "Maharashtra" },
  { id: 201, state_id: 2, name: "Guwahati", code: "AS-GUW", population: 1260419, area_sq_km: 328, centroid_lat: 26.1445, centroid_lon: 91.7362, state_name: "Assam" },
  { id: 202, state_id: 2, name: "Dibrugarh", code: "AS-DIB", population: 1326520, area_sq_km: 3381, centroid_lat: 27.4722, centroid_lon: 94.9125, state_name: "Assam" },
  { id: 203, state_id: 2, name: "Dhubri", code: "AS-DHU", population: 1948632, area_sq_km: 2838, centroid_lat: 26.0192, centroid_lon: 89.9820, state_name: "Assam" },
  { id: 301, state_id: 3, name: "Jaipur", code: "RJ-JAI", population: 6626178, area_sq_km: 11143, centroid_lat: 26.9124, centroid_lon: 75.7873, state_name: "Rajasthan" },
  { id: 302, state_id: 3, name: "Jodhpur", code: "RJ-JOD", population: 3687165, area_sq_km: 22850, centroid_lat: 26.2389, centroid_lon: 73.0243, state_name: "Rajasthan" },
  { id: 303, state_id: 3, name: "Jaisalmer", code: "RJ-JAI", population: 672008, area_sq_km: 38401, centroid_lat: 26.9157, centroid_lon: 70.9083, state_name: "Rajasthan" },
  { id: 401, state_id: 4, name: "Chennai", code: "TN-CHE", population: 4646732, area_sq_km: 426, centroid_lat: 13.0827, centroid_lon: 80.2707, state_name: "Tamil Nadu" },
  { id: 402, state_id: 4, name: "Coimbatore", code: "TN-COI", population: 3458250, area_sq_km: 4723, centroid_lat: 11.0168, centroid_lon: 76.9558, state_name: "Tamil Nadu" },
  { id: 501, state_id: 5, name: "Kutch", code: "GJ-KUT", population: 2092371, area_sq_km: 45674, centroid_lat: 23.25, centroid_lon: 69.6667, state_name: "Gujarat" },
  { id: 502, state_id: 5, name: "Ahmedabad", code: "GJ-AHM", population: 5633927, area_sq_km: 8707, centroid_lat: 23.0225, centroid_lon: 72.5714, state_name: "Gujarat" },
  { id: 601, state_id: 6, name: "Bengaluru Urban", code: "KA-BLR", population: 9621551, area_sq_km: 741, centroid_lat: 12.9716, centroid_lon: 77.5946, state_name: "Karnataka" },
  { id: 701, state_id: 7, name: "Kolkata", code: "WB-KOL", population: 4496694, area_sq_km: 206, centroid_lat: 22.5726, centroid_lon: 88.3639, state_name: "West Bengal" },
  { id: 702, state_id: 7, name: "Sunderbans", code: "WB-SUN", population: 4430000, area_sq_km: 4260, centroid_lat: 21.9497, centroid_lon: 89.1833, state_name: "West Bengal" }
];

// ─── History generator ───────────────────────────────────────────────
export function generateHistory(districtId: number, year: number = 2025): ClimateObservation[] {
  const observations: ClimateObservation[] = [];
  const isWet = [201, 202, 203, 401, 701, 702].includes(districtId);
  const isHot = [301, 302, 303, 501].includes(districtId);

  const tempOffset = (year - 2020) * 0.08;
  const rainfallFactor = 1 + (year - 2020) * 0.004 * (isWet ? 1.2 : -0.8);

  for (let m = 1; m <= 12; m++) {
    const isMonsoon = m >= 6 && m <= 9;
    const baseRain = isMonsoon ? (isWet ? 350 : 80) : (isWet ? 40 : 5);
    const rain = Math.round(baseRain * (0.85 + Math.random() * 0.4) * rainfallFactor);

    const baseTemp = m >= 4 && m <= 6 ? (isHot ? 38 : 31) : (isHot ? 26 : 22);
    const temp = Math.round((baseTemp + (Math.random() * 3 - 1.5) + tempOffset) * 10) / 10;

    const humidity = isMonsoon ? 85 : 45;
    const soilMoisture = Math.round(Math.min(95, Math.max(10, rain / 4 + (isMonsoon ? 50 : 20))));
    const reservoir = Math.round(Math.min(100, Math.max(15, soilMoisture + 10 + (isMonsoon ? 25 : -15))));
    const ndvi = isHot ? 0.22 : 0.65;
    const aqi = isHot ? 140 : 65;

    observations.push({
      observed_on: `${year}-${String(m).padStart(2, "0")}-15`,
      rainfall_mm: rain,
      rainfall_deficit_pct: rain < baseRain ? Math.round(((baseRain - rain) / baseRain) * 100) : 0,
      temperature_c: temp,
      humidity_pct: humidity,
      river_level_m: Math.round((rain / 100 + 1) * 10) / 10,
      soil_moisture_pct: soilMoisture,
      aqi,
      ndvi: Math.round(ndvi * 100) / 100,
      reservoir_level_pct: reservoir
    });
  }
  return observations;
}

// ─── Rankings generator ──────────────────────────────────────────────
export function generateRankings(year: number = 2025): Ranking[] {
  return MOCK_DISTRICTS.map((d) => {
    const isWet = [101, 201, 202, 203, 401, 701, 702].includes(d.id);
    const isDry = [301, 302, 303, 501].includes(d.id);

    let flood = isWet ? 75 : 20;
    let drought = isDry ? 85 : 30;
    let heat = isDry ? 80 : 40;
    let water = isDry ? 82 : 45;

    flood = Math.min(100, Math.round(flood + (year - 2020) * (isWet ? 0.7 : 0.2)));
    drought = Math.min(100, Math.round(drought + (year - 2020) * (isDry ? 0.6 : -0.1)));
    heat = Math.min(100, Math.round(heat + (year - 2020) * 0.8));
    water = Math.min(100, Math.round(water + (year - 2020) * (isDry ? 0.5 : 0.2)));

    const composite = Math.round(flood * 0.35 + drought * 0.25 + heat * 0.2 + water * 0.2);
    const trend = composite >= 70 ? "Increasing" : composite >= 50 ? "Stable" : "Decreasing";

    return {
      district_id: d.id,
      district_name: d.name,
      state_name: d.state_name || "",
      flood_risk: flood,
      drought_risk: drought,
      heatwave_risk: heat,
      water_stress_risk: water,
      composite_risk: composite,
      trend
    };
  }).sort((a, b) => b.composite_risk - a.composite_risk);
}

// ─── Simulation engine ───────────────────────────────────────────────
function clamp(val: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, val));
}

export function runSimulation(payload: ScenarioPayload): { scenario: ScenarioPayload; results: SimulationResult } {
  const dId = payload.district_id || 101;
  const district = MOCK_DISTRICTS.find((d) => d.id === dId) || MOCK_DISTRICTS[0];
  const isWet = [101, 201, 202, 203, 401, 701, 702].includes(dId);

  const rain = payload.rainfall_delta_pct;
  const temp = payload.temperature_delta_c;
  const res = payload.reservoir_delta_pct;
  const horizon = payload.planning_horizon_years;
  const humidity = payload.humidity_delta_pct ?? 0;
  const riverLevel = payload.river_level_delta_m ?? 0;
  const soilMoisture = payload.soil_moisture_delta_pct ?? 0;
  const groundwater = payload.groundwater_delta_m ?? 0;
  const forestCover = payload.forest_cover_delta_pct ?? 0;
  const urbanization = payload.urbanization_delta_pct ?? 0;
  const population = payload.population_growth_pct ?? 0;
  const agriLand = payload.agricultural_land_delta_pct ?? 0;
  const windSpeed = payload.wind_speed_delta_kmh ?? 0;
  const cyclone = payload.cyclone_intensity_delta_pct ?? 0;
  const heatwaveDays = payload.heatwave_duration_days ?? 0;

  const baseFlood = isWet ? 70 : 25;
  const baseDrought = isWet ? 30 : 80;
  const baseWater = isWet ? 40 : 75;

  const flood_risk = clamp(
    baseFlood + rain * 0.8 + temp * 1.5 + riverLevel * 6.0 + urbanization * 0.15 + cyclone * 0.2
  );
  const drought_risk = clamp(
    baseDrought + rain * -0.65 + temp * 5.5 - groundwater * 0.3 - forestCover * 0.2 + heatwaveDays * 0.4
  );
  const heatwave_risk = clamp(
    50 + temp * 9.5 + horizon * 0.4 + heatwaveDays * 0.5 + urbanization * 0.2
  );
  const water_stress_risk = clamp(
    baseWater + rain * -0.65 + res * -0.45 + horizon * 0.5 - groundwater * 0.4 + population * 0.15
  );
  const composite_risk = clamp(
    flood_risk * 0.3 + drought_risk * 0.3 + heatwave_risk * 0.2 + water_stress_risk * 0.2
  );

  const water_availability = clamp(75 + rain * 0.6 + res * 0.4 + soilMoisture * 0.2 - temp * 1.5);
  const crop_stress = clamp(40 + temp * 6.5 - rain * 0.4 - agriLand * 0.2 + drought_risk * 0.3);

  const basePopulation = district.population;
  const population_at_risk = Math.round(
    basePopulation * (composite_risk / 100) * (1 + population / 100)
  );
  const economic_loss_m_inr = Math.round(
    ((population_at_risk * 420 + flood_risk * 15000 + drought_risk * 10000) *
      (1 + urbanization / 100)) /
      1e6
  );
  const infrastructure_risk = clamp(
    flood_risk * 0.4 + riverLevel * 5 + urbanization * 0.2 + cyclone * 0.1 + windSpeed * 0.05
  );
  const environmental_impact_score = clamp(
    100 - (forestCover + soilMoisture * 0.2 + agriLand * 0.3) - composite_risk * 0.35
  );

  return {
    scenario: { ...payload },
    results: {
      water_availability: Math.round(water_availability),
      crop_stress: Math.round(crop_stress),
      drought_risk: Math.round(drought_risk),
      heatwave_risk: Math.round(heatwave_risk),
      flood_risk: Math.round(flood_risk),
      water_stress_risk: Math.round(water_stress_risk),
      composite_risk: Math.round(composite_risk),
      population_at_risk,
      economic_loss_m_inr,
      infrastructure_risk: Math.round(infrastructure_risk),
      environmental_impact_score: Math.round(environmental_impact_score)
    }
  };
}

// ─── Copilot response engine ─────────────────────────────────────────
export function getCopilotResponse(
  prompt: string,
  context?: {
    selected_district_id?: number;
    active_layer?: string;
    active_year?: number;
    timeline_step?: string;
    map_mode?: string;
  }
): CopilotResponse {
  const q = prompt.toLowerCase();
  let explanation = "";
  let risk_analysis = "";
  let recommended_actions: string[] = [];

  if (q.includes("drought") || q.includes("kutch") || q.includes("gujarat")) {
    explanation = "Based on the latest moisture sensor integration and satellite observations, the Kutch and Banaskantha districts in Gujarat are showing extreme drought signals. The monsoon arrival in these sectors has been delayed by 14 days, leading to a critical soil moisture deficit.";
    risk_analysis = "Composite risk indices for the region have spiked to 82/100. Water storage levels in local medium-scale reservoirs are currently at 18% of total capacity, which is 12% below the 5-year average for this week.";
    recommended_actions = [
      "Initiate controlled release from Narmada main canal to Kutch sub-canals immediately.",
      "Deploy drought-contingency advisory for groundnut farmers in vulnerable blocks.",
      "Activate early drought relief financial frameworks for affected talukas."
    ];
  } else if (q.includes("assam") || q.includes("flood") || q.includes("brahmaputra")) {
    explanation = "The digital twin's hydrological engine shows severe upstream precipitation anomalies in the Brahmaputra basin. Soil saturation indices are currently exceeding 92%.";
    risk_analysis = "Flood probability is estimated at 88% with an expected peak river level anomaly of +2.4m within the next 48 hours. Dibrugarh and Dhubri districts face maximum exposure.";
    recommended_actions = [
      "Initiate evacuation alerts for low-lying districts along the Brahmaputra.",
      "Activate emergency flood barriers and mobile pumping stations.",
      "Deploy localized weather warning feeds to rural communities."
    ];
  } else if (q.includes("temperature") || q.includes("heat") || q.includes("crop")) {
    explanation = "Our LSTM projection model under the SSP5-8.5 scenario shows a persistent temperature anomaly across Rajasthan and Gujarat. Crop stress models indicate significant risk to kharif crop yields.";
    risk_analysis = "Surface temperature anomalies are 2.8°C above seasonal norms. NDVI values have dropped below 0.2 in western Rajasthan, indicating severe vegetation stress.";
    recommended_actions = [
      "Issue heat advisory for outdoor labor in affected districts.",
      "Deploy micro-irrigation subsidies for farmers in high-stress zones.",
      "Review reservoir release schedules to maintain crop irrigation supply."
    ];
  } else {
    explanation = "Bharat Climate Twin Copilot has analyzed your operational query. Global surface anomalies indicate stable monsoon distribution but higher localized temperature deviations in northwestern states.";
    risk_analysis = "Composite risk is currently led by heatwave severity across northwestern states, coupled with standard coastal monsoon warnings for eastern India.";
    recommended_actions = [
      "Monitor daily IMD gridded maximum temperature anomalies.",
      "Review reservoir headroom margins across drought-prone basins.",
      "Publish weekly advisory updates to localized command layers."
    ];
  }

  let action: any = null;
  const suggestions: string[] = ["Which states are safest?", "Compare Odisha and Maharashtra", "Explain current climate trends"];
  let explainable_risk: any = null;
  let insights: string[] = ["Composite risk indicators show stable levels across northern India."];

  if (q.includes("flood") || q.includes("layer")) {
    action = { type: "set_layer", layer: "flood" };
  } else if (q.includes("zoom") || q.includes("mumbai")) {
    action = { type: "zoom_to_district", district_id: 101, district_name: "Mumbai", lat: 19.076, lon: 72.8777 };
  } else if (q.includes("compare")) {
    action = { type: "open_compare", state1: "Odisha", state2: "Maharashtra" };
  } else if (q.includes("simulate") || q.includes("run")) {
    action = {
      type: "open_simulator",
      params: {
        district_id: 101,
        rainfall_delta_pct: -20,
        temperature_delta_c: 2,
        reservoir_delta_pct: -30,
        planning_horizon_years: 5
      }
    };
  } else if (q.includes("report") || q.includes("pdf")) {
    action = { type: "download_report", report_type: "district", id: 302, name: "Jodhpur" };
  }

  if (q.includes("drought") || q.includes("flood") || q.includes("heat")) {
    explainable_risk = {
      confidence: 90,
      drivers: [
        "Precipitation Anomaly Index",
        "Soil Moisture Depletion Rate",
        "INSAT Surface Thermal Profile"
      ],
      actions: [
        "Coordinate warning advisories with SDMA.",
        "Assess municipal water contingency reserves."
      ],
      sources: [
        "IMD Gridded Observations",
        "NRSC Bhuvan Surface Datasets"
      ]
    };
    insights = [
      "Vulnerability metrics show an upward trend.",
      "Soil moisture levels have declined below the 5-year average."
    ];
  }

  return {
    explanation,
    risk_analysis,
    recommended_actions,
    chart: {
      type: "bar",
      data: [
        { district: "Kutch", risk: q.includes("assam") ? 20 : 82 },
        { district: "Jaisalmer", risk: q.includes("assam") ? 15 : 76 },
        { district: "Dibrugarh", risk: q.includes("assam") ? 95 : 42 },
        { district: "Mumbai", risk: 55 },
        { district: "Chennai", risk: 65 },
        { district: "Sunderbans", risk: q.includes("flood") ? 88 : 48 }
      ]
    },
    districts: generateRankings(2025).slice(0, 6),
    action,
    suggestions,
    explainable_risk,
    insights
  };
}

// ─── Analytics generator ─────────────────────────────────────────────
export function generateAnalytics(year: number = 2025): Analytics {
  const historyData = generateHistory(101, year);
  const trendPoints = historyData.map((h, i) => ({
    date: `Month ${i + 1}`,
    temperature_c: h.temperature_c,
    rainfall_mm: h.rainfall_mm,
    aqi: h.aqi,
    reservoir_level_pct: h.reservoir_level_pct || 50
  }));

  const temps = trendPoints.map((t) => t.temperature_c);
  const rains = trendPoints.map((t) => t.rainfall_mm);
  const aqis = trendPoints.map((t) => t.aqi);
  const reservoirs = trendPoints.map((t) => t.reservoir_level_pct);

  return {
    national_trends: trendPoints,
    summary: {
      avg_temperature_c: Math.round((temps.reduce((a, b) => a + b, 0) / temps.length) * 10) / 10,
      avg_rainfall_mm: Math.round(rains.reduce((a, b) => a + b, 0) / rains.length),
      avg_aqi: Math.round(aqis.reduce((a, b) => a + b, 0) / aqis.length),
      avg_reservoir_level_pct: Math.round(reservoirs.reduce((a, b) => a + b, 0) / reservoirs.length),
      districts_monitored: MOCK_DISTRICTS.length
    }
  };
}

// ─── Static alert notifications ──────────────────────────────────────
export const MOCK_ALERTS: ClimateAlert[] = [
  {
    id: 1,
    district: "Dhubri",
    state: "Assam",
    severity: "CRITICAL",
    alert_type: "Flood",
    title: "Brahmaputra Flash Flood Warning",
    message: "Rapid water level rise detected at Gauge Station ID: BH-72. Discharge rate exceeding safety thresholds. Immediate evacuation of low-lying floodplains advised.",
    issued_at: "2 mins ago"
  },
  {
    id: 2,
    district: "Churu",
    state: "Rajasthan",
    severity: "HIGH",
    alert_type: "Heatwave",
    title: "Loo Wind & Extreme Heat Surge",
    message: "Temperatures projected to reach 48.2°C. Power grid load alerts active for municipal zones. Direct outdoor exposure limits in effect.",
    issued_at: "45 mins ago"
  },
  {
    id: 3,
    district: "Kutch",
    state: "Gujarat",
    severity: "HIGH",
    alert_type: "Drought",
    title: "Extreme Water Stress Alert",
    message: "Precipitation deficit reaches 65% with critical storage exhaustion in regional water reservoirs. Groundwater levels dropped 1.2m below seasonal baseline.",
    issued_at: "2 hours ago"
  },
  {
    id: 4,
    district: "Sunderbans",
    state: "West Bengal",
    severity: "CRITICAL",
    alert_type: "Flood",
    title: "Cyclonic Storm Surge Warning",
    message: "Bay of Bengal depression intensifying. Storm surge expected to impact coastal embankments. Pre-positioning of disaster response teams recommended.",
    issued_at: "4 hours ago"
  },
  {
    id: 5,
    district: "Nagpur",
    state: "Maharashtra",
    severity: "MEDIUM",
    alert_type: "Heatwave",
    title: "Severe Heatwave Advisory",
    message: "Daily high indices forecasted to exceed 46°C for 3 consecutive days. Advisory for vulnerable populations and outdoor workers issued.",
    issued_at: "5 hours ago"
  }
];
