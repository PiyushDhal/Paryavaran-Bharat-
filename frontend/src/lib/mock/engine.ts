import type {
  Analytics,
  ClimateAlert,
  ClimateObservation,
  CopilotResponse,
  District,
  Prediction,
  Ranking,
  RiskScore,
  State
} from "@/lib/types";

// Static mock state and district data reflecting administrative regions of India
export const MOCK_STATES: State[] = [
  { id: 1, name: "Maharashtra", code: "MH", centroid_lat: 19.7515, centroid_lon: 75.7139 },
  { id: 2, name: "Assam", code: "AS", centroid_lat: 26.2006, centroid_lon: 92.9376 },
  { id: 3, name: "Rajasthan", code: "RJ", centroid_lat: 27.0238, centroid_lon: 74.2179 },
  { id: 4, name: "Tamil Nadu", code: "TN", centroid_lat: 11.1271, centroid_lon: 78.6569 },
  { id: 5, name: "Gujarat", code: "GJ", centroid_lat: 22.2587, centroid_lon: 71.1924 }
];

export const MOCK_DISTRICTS: District[] = [
  { id: 101, state_id: 1, name: "Mumbai", code: "MH-MUM", population: 12442373, area_sq_km: 603, centroid_lat: 19.0760, centroid_lon: 72.8777, state_name: "Maharashtra" },
  { id: 102, state_id: 1, name: "Pune", code: "MH-PUN", population: 9429408, area_sq_km: 15643, centroid_lat: 18.5204, centroid_lon: 73.8567, state_name: "Maharashtra" },
  { id: 103, state_id: 1, name: "Nagpur", code: "MH-NAG", population: 4653570, area_sq_km: 9892, centroid_lat: 21.1458, centroid_lon: 79.0882, state_name: "Maharashtra" },
  { id: 201, state_id: 2, name: "Guwahati", code: "AS-GUW", population: 1260419, area_sq_km: 328, centroid_lat: 26.1445, centroid_lon: 91.7362, state_name: "Assam" },
  { id: 202, state_id: 2, name: "Dibrugarh", code: "AS-DIB", population: 1326520, area_sq_km: 3381, centroid_lat: 27.4722, centroid_lon: 94.9125, state_name: "Assam" },
  { id: 301, state_id: 3, name: "Jaipur", code: "RJ-JAI", population: 6626178, area_sq_km: 11143, centroid_lat: 26.9124, centroid_lon: 75.7873, state_name: "Rajasthan" },
  { id: 302, state_id: 3, name: "Jodhpur", code: "RJ-JOD", population: 3687165, area_sq_km: 22850, centroid_lat: 26.2389, centroid_lon: 73.0243, state_name: "Rajasthan" },
  { id: 401, state_id: 4, name: "Chennai", code: "TN-CHE", population: 4646732, area_sq_km: 426, centroid_lat: 13.0827, centroid_lon: 80.2707, state_name: "Tamil Nadu" },
  { id: 402, state_id: 4, name: "Coimbatore", code: "TN-COI", population: 3458250, area_sq_km: 4723, centroid_lat: 11.0168, centroid_lon: 76.9558, state_name: "Tamil Nadu" },
  { id: 501, state_id: 5, name: "Kutch", code: "GJ-KUT", population: 2092371, area_sq_km: 45674, centroid_lat: 23.2500, centroid_lon: 69.6667, state_name: "Gujarat" }
];

// Generates time-series climate observations
export function generateHistory(districtId: number, year: number = 2025): ClimateObservation[] {
  const observations: ClimateObservation[] = [];
  const startMonth = 1;
  const isWet = [201, 202, 401].includes(districtId);
  const isHot = [301, 302, 501].includes(districtId);

  // Climate projections based on year slider (2020 -> 2050)
  const tempOffset = (year - 2020) * 0.08; // ~2.4C rise by 2050
  const rainfallFactor = 1 + (year - 2020) * 0.004 * (isWet ? 1.2 : -0.8); // dry regions get drier, wet regions get wetter

  for (let m = startMonth; m <= 12; m++) {
    const isMonsoon = m >= 6 && m <= 9;
    const baseRain = isMonsoon ? (isWet ? 350 : 80) : (isWet ? 40 : 5);
    const rain = Math.round(baseRain * (0.85 + Math.random() * 0.4) * rainfallFactor);

    const baseTemp = m >= 4 && m <= 6 ? (isHot ? 38 : 31) : (isHot ? 26 : 22);
    const temp = Math.round((baseTemp + (Math.random() * 3 - 1.5) + tempOffset) * 10) / 10;

    const humidity = isMonsoon ? 85 : 45;
    const soilMoisture = Math.round(Math.min(95, Math.max(10, (rain / 4) + (isMonsoon ? 50 : 20))));
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

// Generates dynamic rankings based on the active timeline year
export function generateRankings(year: number = 2025): Ranking[] {
  const tempOffset = (year - 2020) * 0.08;
  return MOCK_DISTRICTS.map((d) => {
    const isWet = [101, 201, 202, 401].includes(d.id);
    const isDry = [301, 302, 501].includes(d.id);

    let flood = isWet ? 75 : 20;
    let drought = isDry ? 85 : 30;
    let heat = isDry ? 80 : 40;
    let water = isDry ? 82 : 45;

    // Apply global warming factors over temporal scale
    flood = Math.min(100, Math.round(flood + (year - 2020) * (isWet ? 0.7 : 0.2)));
    drought = Math.min(100, Math.round(drought + (year - 2020) * (isDry ? 0.6 : -0.1)));
    heat = Math.min(100, Math.round(heat + (year - 2020) * 0.8));
    water = Math.min(100, Math.round(water + (year - 2020) * (isDry ? 0.5 : 0.2)));

    const composite = Math.round((flood * 0.35) + (drought * 0.25) + (heat * 0.2) + (water * 0.2));
    const trend = year > 2030 ? "Rising Alert" : "Stable";

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

// Interactive custom scenario calculator
export function runSimulation(payload: {
  district_id?: number;
  rainfall_delta_pct: number;
  temperature_delta_c: number;
  reservoir_delta_pct: number;
  planning_horizon_years: number;
}) {
  const dId = payload.district_id || 101;
  const isWet = [101, 201, 202, 401].includes(dId);

  // Base values
  const baseFlood = isWet ? 70 : 25;
  const baseDrought = isWet ? 30 : 80;
  const baseWater = isWet ? 40 : 75;

  const tempFactor = payload.temperature_delta_c * 5.5;
  const rainFactor = payload.rainfall_delta_pct * -0.65; // lower rainfall -> higher drought/water stress
  const reservoirFactor = payload.reservoir_delta_pct * -0.45; // lower reservoir -> higher water stress

  const flood_risk = Math.min(100, Math.max(5, Math.round(baseFlood + (payload.rainfall_delta_pct * 0.8) + (payload.temperature_delta_c * 1.5))));
  const drought_risk = Math.min(100, Math.max(5, Math.round(baseDrought + rainFactor + tempFactor)));
  const water_stress_risk = Math.min(100, Math.max(5, Math.round(baseWater + rainFactor + reservoirFactor + (payload.planning_horizon_years * 0.5))));
  const heatwave_risk = Math.min(100, Math.max(5, Math.round(50 + (payload.temperature_delta_c * 9.5) + (payload.planning_horizon_years * 0.4))));

  const composite_risk = Math.round((flood_risk * 0.3) + (drought_risk * 0.3) + (heatwave_risk * 0.2) + (water_stress_risk * 0.2));

  return {
    scenario: {
      rainfall_delta_pct: payload.rainfall_delta_pct,
      temperature_delta_c: payload.temperature_delta_c,
      reservoir_delta_pct: payload.reservoir_delta_pct,
      planning_horizon_years: payload.planning_horizon_years
    },
    results: {
      water_availability: Math.max(0, Math.min(100, Math.round(75 + (payload.rainfall_delta_pct * 0.6) + (payload.reservoir_delta_pct * 0.4)))),
      crop_stress: Math.max(0, Math.min(100, Math.round(40 + (payload.temperature_delta_c * 6.5) - (payload.rainfall_delta_pct * 0.4)))),
      drought_risk,
      heatwave_risk,
      flood_risk,
      water_stress_risk,
      composite_risk
    }
  };
}

// AI Copilot conversational engine
export function getCopilotResponse(prompt: string): CopilotResponse {
  const query = prompt.toLowerCase();
  let explanation = "";
  let risk_analysis = "";
  let recommended_actions: string[] = [];

  if (query.includes("maharashtra") || query.includes("rainfall")) {
    explanation = "Based on our LSTM projection model under the SSP5-8.5 high emission scenario, a 20% rainfall deficit in Maharashtra would significantly accelerate drought progression in Marathwada and Vidarbha.";
    risk_analysis = "Our digital twin forecasts a critical drop in reservoir levels to below 30% by mid-winter, causing high soil moisture depletion and extreme crop stress for seasonal cash crops.";
    recommended_actions = [
      "Restrict water release from major reservoirs to non-essential crop irrigation.",
      "Deploy micro-irrigation subsidies for farmers in high-risk zones.",
      "Activate early drought relief financial frameworks."
    ];
  } else if (query.includes("assam") || query.includes("flood")) {
    explanation = "The digital twin's hydrological engine shows severe upstream precipitation anomalies in the Brahmaputra basin. Soil saturation indices are currently exceeding 92%.";
    risk_analysis = "Flood probability is estimated at 88% with an expected peak river level anomaly of +2.4m within the next 48 hours.";
    recommended_actions = [
      "Initiate evacuation alerts for low-lying districts along the Brahmaputra.",
      "Activate emergency flood barriers and mobile pumping stations.",
      "Deploy localized weather warning feeds to rural communities."
    ];
  } else {
    explanation = "Bharat Climate Twin Copilot has analyzed your operational query. Global surface anomalies indicate stable monsoon distribution but higher localized temperature deviations.";
    risk_analysis = "Composite risk is currently led by heatwave severity across northwestern states, coupled with standard coastal monsoon warnings.";
    recommended_actions = [
      "Monitor daily IMD gridded maximum temperature anomalies.",
      "Review reservoir headroom margins across drought-prone basins.",
      "Publish weekly advisory updates to localized command layers."
    ];
  }

  return {
    explanation,
    risk_analysis,
    recommended_actions,
    chart: {
      type: "bar",
      data: [
        { district: "Mumbai", risk: query.includes("assam") ? 35 : 75 },
        { district: "Kutch", risk: query.includes("assam") ? 20 : 92 },
        { district: "Guwahati", risk: query.includes("assam") ? 95 : 40 },
        { district: "Chennai", risk: 65 }
      ]
    },
    districts: generateRankings(2025).slice(0, 4)
  };
}

// Global analytics metrics
export function generateAnalytics(year: number = 2025): Analytics {
  const historyData = generateHistory(101, year); // Use Mumbai as a representative national average baseline
  const trendPoints = historyData.map((h, index) => ({
    date: `Month ${index + 1}`,
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

// Static alert notifications
export const MOCK_ALERTS: ClimateAlert[] = [
  {
    id: 1,
    district: "Dibrugarh",
    state: "Assam",
    severity: "CRITICAL",
    alert_type: "Flood",
    title: "Brahmaputra Active Inundation Alert",
    message: "Hydrological models predict river overflow exceeding warning marks. Urgent action required.",
    issued_at: "Just Now"
  },
  {
    id: 2,
    district: "Kutch",
    state: "Gujarat",
    severity: "HIGH",
    alert_type: "Drought",
    title: "Extreme Water Stress Alert",
    message: "Precipitation deficit reaches 65% with critical storage exhaustion in regional water reservoirs.",
    issued_at: "2 hours ago"
  },
  {
    id: 3,
    district: "Jaipur",
    state: "Rajasthan",
    severity: "HIGH",
    alert_type: "Heatwave",
    title: "Extreme Max Temp Warning",
    message: "Daily high indices forecasted to hit 47C. Direct exposure limits highly advised.",
    issued_at: "5 hours ago"
  }
];
