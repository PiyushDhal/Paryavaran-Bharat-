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
import {
  MOCK_STATES,
  MOCK_DISTRICTS,
  generateHistory,
  generateRankings,
  runSimulation,
  getCopilotResponse,
  generateAnalytics,
  MOCK_ALERTS
} from "@/lib/mock/engine";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:8000";
const API_PREFIX = `${API_BASE_URL}/api/v1`;

export function getToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("bct_token");
}

export function setToken(token: string) {
  window.localStorage.setItem("bct_token", token);
}

export function clearToken() {
  window.localStorage.removeItem("bct_token");
}

async function apiFetch<T>(path: string, options: RequestInit = {}, fallbackData?: any): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  try {
    const response = await fetch(`${API_PREFIX}${path}`, {
      ...options,
      headers,
      cache: "no-store"
    });
    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }
    return await response.json() as T;
  } catch (error) {
    console.warn(`API request to ${path} failed, falling back to mock:`, error);
    if (fallbackData !== undefined) {
      return fallbackData as T;
    }
    throw error;
  }
}

export const api = {
  login: (email: string, password: string) =>
    apiFetch<{ access_token: string; user: { full_name: string; role: string } }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    }, {
      access_token: "mock_jwt_token_admin",
      user: { full_name: "ISRO Mission Commander", role: "Admin" }
    }),
  register: (payload: { email: string; full_name: string; password: string; role: string }) =>
    apiFetch<{ access_token: string; user: { full_name: string; role: string } }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload)
    }, {
      access_token: "mock_jwt_token_custom",
      user: { full_name: payload.full_name, role: payload.role }
    }),
  states: () => Promise.resolve(MOCK_STATES),
  districts: (stateId?: number) => {
    if (stateId) {
      return Promise.resolve(MOCK_DISTRICTS.filter((d) => d.state_id === stateId));
    }
    return Promise.resolve(MOCK_DISTRICTS);
  },
  history: (districtId: number, year?: number) => {
    return Promise.resolve(generateHistory(districtId, year || 2025));
  },
  layers: () => Promise.resolve({
    type: "FeatureCollection",
    features: MOCK_DISTRICTS.map((d) => ({
      type: "Feature",
      id: d.id,
      geometry: {
        type: "Point",
        coordinates: [d.centroid_lon, d.centroid_lat]
      },
      properties: {
        name: d.name,
        state_name: d.state_name,
        code: d.code
      }
    }))
  } as any),
  rankings: (limit = 10) => {
    return Promise.resolve(generateRankings(2025).slice(0, limit));
  },
  analytics: () => {
    return Promise.resolve(generateAnalytics(2025));
  },
  alerts: () => Promise.resolve(MOCK_ALERTS),
  risk: (districtId: number) => {
    const districtRankings = generateRankings(2025);
    const found = districtRankings.find((r) => r.district_id === districtId);
    if (found) {
      return Promise.resolve({
        ...found,
        valid_on: new Date().toISOString(),
        drivers: { "Temperature Rise": "+1.8C", "Rainfall Deviation": "-15%" }
      } as RiskScore);
    }
    return Promise.reject(new Error("District risk profile not found"));
  },
  riskTrends: (districtId: number) => {
    const history = generateHistory(districtId, 2025);
    const trendList = history.map((h, i) => ({
      month: `M${i + 1}`,
      "Composite Risk": Math.round((h.temperature_c * 1.5) + (h.rainfall_mm * 0.1)),
      "Flood Risk": Math.round(h.rainfall_mm * 0.25),
      "Drought Risk": Math.max(0, 100 - h.soil_moisture_pct)
    }));
    return Promise.resolve(trendList);
  },
  predict: (kind: "flood" | "drought" | "heatwave", districtId: number) => {
    const d = MOCK_DISTRICTS.find((dist) => dist.id === districtId) || MOCK_DISTRICTS[0];
    return Promise.resolve({
      prediction_type: kind.toUpperCase(),
      probability: Math.round(65 + Math.random() * 25),
      risk_zone: "Zone-IV (High Exposure)",
      model_name: kind === "flood" ? "RandomForestFlood" : kind === "drought" ? "XGBoostDrought" : "SklearnHeatAlert",
      model_version: "v1.2.0-stable",
      valid_for: "Next 48 Hours",
      explanation: `Model forecasts heightened regional probability of ${kind} based on deep sequential analysis of INSAT LST anomalies.`,
      inputs: { "Surface Temperature (C)": 38.4, "Rainfall Deficit (%)": -35 }
    });
  },
  simulate: (payload: {
    district_id?: number;
    rainfall_delta_pct: number;
    temperature_delta_c: number;
    reservoir_delta_pct: number;
    planning_horizon_years: number;
  }) => {
    return Promise.resolve(runSimulation(payload));
  },
  copilot: (prompt: string) => {
    return Promise.resolve(getCopilotResponse(prompt));
  },
  adminOverview: () =>
    Promise.resolve({
      users: 18,
      states: 36,
      districts: 748,
      risk_scores: 748,
      predictions: 12405,
      simulations: 3410,
      integrations: [
        { name: "IMD Gridded Feeds", status: "Active" },
        { name: "INSAT-3D Meteorological", status: "Active" },
        { name: "India-WRIS Reservoir Status", status: "Active" },
        { name: "CPCB Air Quality Feed", status: "Active" }
      ]
    })
};

export { API_BASE_URL };
