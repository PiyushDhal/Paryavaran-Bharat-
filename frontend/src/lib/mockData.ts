import type { State, District, Ranking, RiskScore, ClimateObservation, Analytics, ClimateAlert, Prediction, CopilotResponse } from "./types";

export const MOCK_STATES: State[] = [
  { id: 1, name: "Andhra Pradesh", code: "AP", centroid_lat: 15.91, centroid_lon: 79.74 },
  { id: 2, name: "Arunachal Pradesh", code: "AR", centroid_lat: 28.21, centroid_lon: 94.72 },
  { id: 3, name: "Assam", code: "AS", centroid_lat: 26.2, centroid_lon: 92.93 },
  { id: 4, name: "Bihar", code: "BR", centroid_lat: 25.09, centroid_lon: 85.31 },
  { id: 5, name: "Chhattisgarh", code: "CG", centroid_lat: 21.27, centroid_lon: 81.86 },
  { id: 6, name: "Goa", code: "GA", centroid_lat: 15.29, centroid_lon: 74.12 },
  { id: 7, name: "Gujarat", code: "GJ", centroid_lat: 22.25, centroid_lon: 71.19 },
  { id: 8, name: "Haryana", code: "HR", centroid_lat: 29.05, centroid_lon: 76.08 },
  { id: 9, name: "Himachal Pradesh", code: "HP", centroid_lat: 31.1, centroid_lon: 77.17 },
  { id: 10, name: "Jharkhand", code: "JH", centroid_lat: 23.61, centroid_lon: 85.27 },
  { id: 11, name: "Karnataka", code: "KA", centroid_lat: 15.31, centroid_lon: 75.71 },
  { id: 12, name: "Kerala", code: "KL", centroid_lat: 10.85, centroid_lon: 76.27 },
  { id: 13, name: "Madhya Pradesh", code: "MP", centroid_lat: 22.97, centroid_lon: 78.65 },
  { id: 14, name: "Maharashtra", code: "MH", centroid_lat: 19.75, centroid_lon: 75.71 },
  { id: 15, name: "Manipur", code: "MN", centroid_lat: 24.66, centroid_lon: 93.9 },
  { id: 16, name: "Meghalaya", code: "ML", centroid_lat: 25.46, centroid_lon: 91.36 },
  { id: 17, name: "Mizoram", code: "MZ", centroid_lat: 23.16, centroid_lon: 92.93 },
  { id: 18, name: "Nagaland", code: "NL", centroid_lat: 26.15, centroid_lon: 94.56 },
  { id: 19, name: "Odisha", code: "OD", centroid_lat: 20.95, centroid_lon: 83.3 },
  { id: 20, name: "Punjab", code: "PB", centroid_lat: 31.14, centroid_lon: 75.34 },
  { id: 21, name: "Rajasthan", code: "RJ", centroid_lat: 27.39, centroid_lon: 73.43 },
  { id: 22, name: "Sikkim", code: "SK", centroid_lat: 27.53, centroid_lon: 88.51 },
  { id: 23, name: "Tamil Nadu", code: "TN", centroid_lat: 11.12, centroid_lon: 78.65 },
  { id: 24, name: "Telangana", code: "TG", centroid_lat: 18.11, centroid_lon: 79.01 },
  { id: 25, name: "Tripura", code: "TR", centroid_lat: 23.94, centroid_lon: 91.98 },
  { id: 26, name: "Uttar Pradesh", code: "UP", centroid_lat: 26.84, centroid_lon: 80.88 },
  { id: 27, name: "Uttarakhand", code: "UK", centroid_lat: 30.06, centroid_lon: 79.01 },
  { id: 28, name: "West Bengal", code: "WB", centroid_lat: 22.98, centroid_lon: 87.85 },
  { id: 29, name: "Andaman and Nicobar Islands", code: "AN", centroid_lat: 11.74, centroid_lon: 92.71 },
  { id: 30, name: "Chandigarh (UT)", code: "CH", centroid_lat: 30.73, centroid_lon: 76.77 },
  { id: 31, name: "Dadra and Nagar Haveli (UT)", code: "DN", centroid_lat: 20.18, centroid_lon: 73.01 },
  { id: 32, name: "Daman and Diu (UT)", code: "DD", centroid_lat: 20.39, centroid_lon: 72.83 },
  { id: 33, name: "Delhi (NCR)", code: "DL", centroid_lat: 28.61, centroid_lon: 77.2 },
  { id: 34, name: "Jammu and Kashmir", code: "JK", centroid_lat: 33.77, centroid_lon: 76.57 },
  { id: 35, name: "Ladakh", code: "LA", centroid_lat: 34.15, centroid_lon: 77.57 },
  { id: 36, name: "Lakshadweep (UT)", code: "LD", centroid_lat: 10.56, centroid_lon: 72.64 }
];

export const MOCK_DISTRICTS: District[] = [
  { id: 101, state_id: 1, state_name: "Andhra Pradesh", name: "Amaravati", code: "AP-AM", population: 1500000, area_sq_km: 217, centroid_lat: 16.5062, centroid_lon: 80.6480 },
  { id: 102, state_id: 2, state_name: "Arunachal Pradesh", name: "Itanagar", code: "AR-IT", population: 80000, area_sq_km: 150, centroid_lat: 27.0844, centroid_lon: 93.6053 },
  { id: 103, state_id: 3, state_name: "Assam", name: "Dispur", code: "AS-DI", population: 120000, area_sq_km: 80, centroid_lat: 26.1433, centroid_lon: 91.7898 },
  { id: 104, state_id: 4, state_name: "Bihar", name: "Patna", code: "BR-PA", population: 2500000, area_sq_km: 250, centroid_lat: 25.5941, centroid_lon: 85.1376 },
  { id: 105, state_id: 5, state_name: "Chhattisgarh", name: "Raipur", code: "CG-RA", population: 1300000, area_sq_km: 220, centroid_lat: 21.2514, centroid_lon: 81.6296 },
  { id: 106, state_id: 6, state_name: "Goa", name: "Panaji", code: "GA-PA", population: 110000, area_sq_km: 36, centroid_lat: 15.4909, centroid_lon: 73.8278 },
  { id: 107, state_id: 7, state_name: "Gujarat", name: "Gandhinagar", code: "GJ-GA", population: 300000, area_sq_km: 326, centroid_lat: 23.2156, centroid_lon: 72.6369 },
  { id: 108, state_id: 8, state_name: "Haryana", name: "Chandigarh", code: "HR-CH", population: 1000000, area_sq_km: 114, centroid_lat: 30.7333, centroid_lon: 76.7794 },
  { id: 109, state_id: 9, state_name: "Himachal Pradesh", name: "Shimla", code: "HP-SH", population: 200000, area_sq_km: 25, centroid_lat: 31.1048, centroid_lon: 77.1734 },
  { id: 110, state_id: 10, state_name: "Jharkhand", name: "Ranchi", code: "JH-RA", population: 1500000, area_sq_km: 175, centroid_lat: 23.3441, centroid_lon: 85.3096 },
  { id: 111, state_id: 11, state_name: "Karnataka", name: "Bengaluru", code: "KA-BE", population: 12000000, area_sq_km: 741, centroid_lat: 12.9716, centroid_lon: 77.5946 },
  { id: 112, state_id: 12, state_name: "Kerala", name: "Thiruvananthapuram", code: "KL-TH", population: 1000000, area_sq_km: 214, centroid_lat: 8.5241, centroid_lon: 76.9366 },
  { id: 113, state_id: 13, state_name: "Madhya Pradesh", name: "Bhopal", code: "MP-BH", population: 2000000, area_sq_km: 285, centroid_lat: 23.2599, centroid_lon: 77.4126 },
  { id: 114, state_id: 14, state_name: "Maharashtra", name: "Mumbai", code: "MH-MU", population: 20000000, area_sq_km: 603, centroid_lat: 19.0760, centroid_lon: 72.8777 },
  { id: 115, state_id: 15, state_name: "Manipur", name: "Imphal", code: "MN-IM", population: 300000, area_sq_km: 120, centroid_lat: 24.8170, centroid_lon: 93.9368 },
  { id: 116, state_id: 16, state_name: "Meghalaya", name: "Shillong", code: "ML-SH", population: 150000, area_sq_km: 64, centroid_lat: 25.5788, centroid_lon: 91.8933 },
  { id: 117, state_id: 17, state_name: "Mizoram", name: "Aizawl", code: "MZ-AI", population: 300000, area_sq_km: 129, centroid_lat: 23.7271, centroid_lon: 92.7176 },
  { id: 118, state_id: 18, state_name: "Nagaland", name: "Kohima", code: "NL-KO", population: 100000, area_sq_km: 20, centroid_lat: 25.6751, centroid_lon: 94.1086 },
  { id: 119, state_id: 19, state_name: "Odisha", name: "Bhubaneswar", code: "OD-BH", population: 900000, area_sq_km: 161, centroid_lat: 20.2961, centroid_lon: 85.8245 },
  { id: 120, state_id: 20, state_name: "Punjab", name: "Chandigarh", code: "PB-CH", population: 1000000, area_sq_km: 114, centroid_lat: 30.7333, centroid_lon: 76.7794 },
  { id: 121, state_id: 21, state_name: "Rajasthan", name: "Jaipur", code: "RJ-JA", population: 4000000, area_sq_km: 467, centroid_lat: 26.9124, centroid_lon: 75.7873 },
  { id: 122, state_id: 22, state_name: "Sikkim", name: "Gangtok", code: "SK-GA", population: 100000, area_sq_km: 25, centroid_lat: 27.3314, centroid_lon: 88.6138 },
  { id: 123, state_id: 23, state_name: "Tamil Nadu", name: "Chennai", code: "TN-CH", population: 10000000, area_sq_km: 426, centroid_lat: 13.0827, centroid_lon: 80.2707 },
  { id: 124, state_id: 24, state_name: "Telangana", name: "Hyderabad", code: "TG-HY", population: 10000000, area_sq_km: 650, centroid_lat: 17.3850, centroid_lon: 78.4867 },
  { id: 125, state_id: 25, state_name: "Tripura", name: "Agartala", code: "TR-AG", population: 500000, area_sq_km: 76, centroid_lat: 23.8315, centroid_lon: 91.2868 },
  { id: 126, state_id: 26, state_name: "Uttar Pradesh", name: "Lucknow", code: "UP-LU", population: 3500000, area_sq_km: 350, centroid_lat: 26.8467, centroid_lon: 80.9462 },
  { id: 127, state_id: 27, state_name: "Uttarakhand", name: "Dehradun", code: "UK-DE", population: 800000, area_sq_km: 300, centroid_lat: 30.3165, centroid_lon: 78.0322 },
  { id: 128, state_id: 28, state_name: "West Bengal", name: "Kolkata", code: "WB-KO", population: 15000000, area_sq_km: 206, centroid_lat: 22.5726, centroid_lon: 88.3639 },
  { id: 129, state_id: 29, state_name: "Andaman and Nicobar Islands", name: "Port Blair", code: "AN-PB", population: 100000, area_sq_km: 16, centroid_lat: 11.6234, centroid_lon: 92.7265 },
  { id: 130, state_id: 30, state_name: "Chandigarh (UT)", name: "Chandigarh", code: "CH-CH", population: 1000000, area_sq_km: 114, centroid_lat: 30.7333, centroid_lon: 76.7794 },
  { id: 131, state_id: 31, state_name: "Dadra and Nagar Haveli (UT)", name: "Daman", code: "DN-DA", population: 200000, area_sq_km: 72, centroid_lat: 20.3974, centroid_lon: 72.8328 },
  { id: 132, state_id: 32, state_name: "Daman and Diu (UT)", name: "Daman", code: "DD-DA", population: 40000, area_sq_km: 40, centroid_lat: 20.3974, centroid_lon: 72.8328 },
  { id: 133, state_id: 33, state_name: "Delhi (NCR)", name: "New Delhi", code: "DL-ND", population: 22000000, area_sq_km: 1484, centroid_lat: 28.6139, centroid_lon: 77.2090 },
  { id: 134, state_id: 34, state_name: "Jammu and Kashmir", name: "Srinagar", code: "JK-SR", population: 1300000, area_sq_km: 294, centroid_lat: 34.0837, centroid_lon: 74.7973 },
  { id: 135, state_id: 35, state_name: "Ladakh", name: "Leh", code: "LA-LE", population: 30000, area_sq_km: 45, centroid_lat: 34.1526, centroid_lon: 77.5771 },
  { id: 136, state_id: 36, state_name: "Lakshadweep (UT)", name: "Kavaratti", code: "LD-KA", population: 12000, area_sq_km: 4, centroid_lat: 10.5667, centroid_lon: 72.6417 }
];

export const MOCK_RANKINGS: Ranking[] = MOCK_DISTRICTS.map((d, index) => {
  const risks = [
    Math.round((0.1 + (d.id % 5) * 0.15) * 100),
    Math.round((0.2 + (d.id % 4) * 0.18) * 100),
    Math.round((0.05 + (d.id % 6) * 0.12) * 100),
    Math.round((0.25 + (d.id % 3) * 0.2) * 100)
  ];
  const comp = Math.round((risks[0] + risks[1] + risks[2] + risks[3]) / 4);
  return {
    district_id: d.id,
    district_name: d.name,
    state_name: d.state_name || "",
    flood_risk: risks[0],
    drought_risk: risks[1],
    heatwave_risk: risks[2],
    water_stress_risk: risks[3],
    composite_risk: comp,
    trend: index % 3 === 0 ? "Increasing" : index % 3 === 1 ? "Stable" : "Decreasing"
  };
});

export const MOCK_ALERTS: ClimateAlert[] = [
  { id: 1, district: "Mumbai", state: "Maharashtra", severity: "High", alert_type: "Heatwave", title: "Heatwave Advisory", message: "Extreme temperatures forecast in coastal Maharashtra. Keep hydrated and limit outdoor activity.", issued_at: new Date().toISOString() },
  { id: 2, district: "Patna", state: "Bihar", severity: "Moderate", alert_type: "Flood", title: "Flood Level Warning", message: "Ganges river levels are rising steadily. Low-lying zones should remain alert.", issued_at: new Date().toISOString() }
];

export function generateMockHistory(districtId: number): ClimateObservation[] {
  const results: ClimateObservation[] = [];
  const startYear = 2020;
  const endYear = 2026;
  const seed = districtId;
  
  for (let year = startYear; year <= endYear; year++) {
    const rainfall = 800 + (seed % 10) * 120 + (year % 3) * 50;
    const temp = 24.5 + (seed % 5) * 0.8 + (year % 2) * 0.3;
    results.push({
      observed_on: `${year}-12-31`,
      rainfall_mm: rainfall,
      rainfall_deficit_pct: (seed % 2 === 0) ? -(seed % 15) : (seed % 15),
      temperature_c: Number(temp.toFixed(1)),
      humidity_pct: 60 + (seed % 4) * 5,
      river_level_m: 2.1 + (seed % 5) * 0.5,
      soil_moisture_pct: 35 + (seed % 6) * 6,
      aqi: 50 + (seed % 8) * 20 + (year % 2) * 10,
      ndvi: 0.45 + (seed % 5) * 0.05,
      reservoir_level_pct: 65 + (seed % 3) * 8,
      data_source: "synthetic-simulation"
    });
  }
  return results;
}

export function getMockDataForPath(path: string): any {
  let relativePath = path;
  if (path.startsWith("http")) {
    try {
      const url = new URL(path);
      relativePath = url.pathname + url.search;
    } catch {
      // fallback
    }
  }

  const queryIdx = relativePath.indexOf("?");
  const pathname = queryIdx === -1 ? relativePath : relativePath.slice(0, queryIdx);
  const searchParams = new URLSearchParams(queryIdx === -1 ? "" : relativePath.slice(queryIdx));

  if (pathname.endsWith("/climate/states")) {
    return MOCK_STATES;
  }
  
  if (pathname.endsWith("/climate/districts")) {
    const stateIdStr = searchParams.get("state_id");
    if (stateIdStr) {
      const stateId = Number(stateIdStr);
      return MOCK_DISTRICTS.filter(d => d.state_id === stateId);
    }
    return MOCK_DISTRICTS;
  }

  if (pathname.includes("/climate/districts/") && pathname.endsWith("/history")) {
    const parts = pathname.split("/");
    const histIdx = parts.indexOf("history");
    const id = Number(parts[histIdx - 1]);
    return generateMockHistory(isNaN(id) ? 101 : id);
  }

  if (pathname.endsWith("/climate/map/layers")) {
    return {
      type: "FeatureCollection",
      features: MOCK_DISTRICTS.map((d) => ({
        type: "Feature",
        id: d.id,
        geometry: {
          type: "Point",
          coordinates: [d.centroid_lon, d.centroid_lat]
        },
        properties: {
          id: d.id,
          name: d.name,
          state_id: d.state_id,
          state_name: d.state_name,
          population: d.population,
          area_sq_km: d.area_sq_km,
          composite_risk: Math.round((0.15 + (d.id % 7) * 0.1) * 100),
          flood_risk: Math.round((0.1 + (d.id % 5) * 0.15) * 100),
          drought_risk: Math.round((0.2 + (d.id % 4) * 0.18) * 100),
          heatwave_risk: Math.round((0.05 + (d.id % 6) * 0.12) * 100),
          water_stress_risk: Math.round((0.25 + (d.id % 3) * 0.2) * 100)
        }
      }))
    };
  }

  if (pathname.endsWith("/climate/rankings")) {
    return MOCK_RANKINGS.slice(0, 10);
  }

  if (pathname.endsWith("/climate/analytics")) {
    const trends = [];
    for (let i = 0; i < 12; i++) {
      const month = String(i + 1).padStart(2, '0');
      trends.push({
        date: `2026-${month}-01`,
        temperature_c: 24 + Math.sin(i / 2) * 5 + Math.random(),
        rainfall_mm: 10 + Math.sin(i / 1.5) * 150 + Math.random() * 20,
        aqi: 90 + Math.cos(i / 2) * 30 + Math.random() * 10,
        reservoir_level_pct: 70 + Math.sin(i / 3) * 15
      });
    }
    return {
      national_trends: trends,
      summary: {
        avg_temperature_c: 26.2,
        avg_rainfall_mm: 112.5,
        avg_aqi: 105,
        avg_reservoir_level_pct: 72.8,
        districts_monitored: 36
      }
    };
  }

  if (pathname.endsWith("/climate/alerts")) {
    return MOCK_ALERTS;
  }

  if (pathname.includes("/risk/district/")) {
    const parts = pathname.split("/");
    const idx = parts.indexOf("district");
    const id = Number(parts[idx + 1]);
    const isTrends = parts.length > idx + 2 && parts[idx + 2] === "trends";
    
    const ranking = MOCK_RANKINGS.find(r => r.district_id === id) || MOCK_RANKINGS[0];
    
    if (isTrends) {
      const trendsList = [];
      for (let y = 2020; y <= 2026; y++) {
        trendsList.push({
          year: y,
          composite_risk: Math.round(ranking.composite_risk + (y - 2020) * 2.5 * (id % 2 === 0 ? 1 : -1))
        });
      }
      return trendsList;
    }
    
    return {
      ...ranking,
      valid_on: "2026-06-29",
      drivers: {
        "Deforestation Factor": 0.35 + (id % 3) * 0.1,
        "Urbanization Rate": 0.45 + (id % 2) * 0.15,
        "Water Deficit": 0.5 + (id % 4) * 0.08
      }
    };
  }

  if (pathname.includes("/predictions/")) {
    const parts = pathname.split("/");
    const kind = parts[parts.length - 1];
    return {
      prediction_type: kind,
      probability: 0.65 + (Math.random() * 0.25),
      risk_zone: "High Risk Zone",
      model_name: "LSTM Climate Prediction Model",
      model_version: "2.1.0",
      valid_for: "July - Sept 2026",
      explanation: `Historical regression parameters suggest a significant risk spike for ${kind} due to seasonal anomalies.`,
      inputs: {
        "rainfall_deficit": 12.5,
        "soil_moisture": 28.4
      }
    };
  }

  if (pathname.endsWith("/simulations/run")) {
    return {
      scenario: {
        rainfall_delta_pct: 0,
        temperature_delta_c: 0,
        reservoir_delta_pct: 0,
        planning_horizon_years: 5
      },
      results: {
        water_availability: 85,
        crop_stress: 40,
        drought_risk: 35,
        heatwave_risk: 25,
        flood_risk: 15,
        water_stress_risk: 45,
        composite_risk: 30,
        population_at_risk: 450000,
        economic_loss_m_inr: 120,
        infrastructure_risk: 0.2,
        environmental_impact_score: 65,
        ai_analysis: {
          headline: "Sustainable planning scenario demonstrates reasonable resilience.",
          confidence: 0.88,
          drivers: ["Deforestation Rate", "Groundwater Table"],
          vulnerableZones: ["Urban Core", "Irrigated Periphery"],
          recommendations: ["Increase urban canopy cover by 15%", "Construct check dams in northern stream beds"],
          alertLevel: "Yellow"
        }
      }
    };
  }

  if (pathname.endsWith("/copilot/chat")) {
    return {
      explanation: "I am currently running in client-side simulation mode. Based on local climate twin metrics, central and southern zones of India are experiencing elevated composite risk due to delayed monsoon precipitation trends. I recommend implementing watershed harvesting strategies and heat stress limits for municipal construction.",
      risk_analysis: "Composite Risk: 42% (Elevated). Drivers include soil moisture deficits (-12% vs baseline) and elevated daily max temperatures (+1.8°C).",
      recommended_actions: [
        "Implement rain-water harvesting mandates for commercial building plans.",
        "Configure shaded municipal resting hubs during peak daylight hours.",
        "Initiate reservoir discharge throttling plans."
      ],
      chart: {
        type: "bar",
        data: [
          { district: "Mumbai", risk: 55 },
          { district: "Jaipur", risk: 62 },
          { district: "Bengaluru", risk: 38 }
        ]
      },
      districts: MOCK_RANKINGS.slice(0, 3)
    };
  }

  if (pathname.endsWith("/climate/timeline")) {
    return [
      { id: 1, year: 2026, status: "Current", risk: 42 },
      { id: 2, year: 2030, status: "Projected Mid-Term", risk: 49 },
      { id: 3, year: 2050, status: "Projected Long-Term", risk: 61 }
    ];
  }

  if (pathname.endsWith("/climate/analytics/metrics")) {
    return {
      avg_temp: 27.2,
      avg_precip: 104.5,
      water_stress_pct: 42,
      vulnerability_index: 0.52
    };
  }

  if (pathname.endsWith("/climate/national-brief")) {
    return {
      title: "National Climate Brief",
      summary: "India is observing stable overall patterns with regional spikes in heat risks and composite water stresses.",
      last_updated: new Date().toISOString()
    };
  }

  if (pathname.endsWith("/copilot/history")) {
    return [];
  }

  return {};
}
