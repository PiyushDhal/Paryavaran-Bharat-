import type {
  Analytics,
  ClimateAlert,
  ClimateObservation,
  CopilotResponse,
  District,
  Prediction,
  Ranking,
  RiskScore,
  ScenarioPayload,
  SimulationResult,
  State
} from "@/lib/types";

import {
  MOCK_STATES,
  MOCK_DISTRICTS,
  MOCK_ALERTS,
  generateHistory,
  generateRankings,
  generateAnalytics,
  runSimulation,
  getCopilotResponse
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

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
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
      throw new Error(`Request failed: ${response.status}`);
    }
    return response.json() as Promise<T>;
  } catch {
    throw new Error("API unreachable");
  }
}

async function withMockFallback<T>(fetcher: () => Promise<T>, fallback: () => T): Promise<T> {
  try {
    return await fetcher();
  } catch {
    return fallback();
  }
}

function mockRisk(districtId: number): RiskScore {
  const rankings = generateRankings(2025);
  const r = rankings.find((x) => x.district_id === districtId) ?? rankings[0];
  return { ...r, valid_on: new Date().toISOString(), drivers: {} };
}

function mockPredict(kind: string, districtId: number): Prediction {
  const prob = kind === "flood" ? 0.72 : kind === "drought" ? 0.85 : 0.64;
  return {
    prediction_type: kind,
    probability: prob,
    risk_zone: prob > 0.7 ? "High" : prob > 0.4 ? "Moderate" : "Low",
    model_name: kind === "flood" ? "RandomForestFlood" : kind === "drought" ? "XGBoostDrought" : "SklearnHeatAlert",
    model_version: "v1.2.0",
    valid_for: "Next 7 days",
    explanation: `Based on current climate conditions, the ${kind} risk for district ${districtId} is ${prob > 0.7 ? "elevated" : "moderate"}. The model analyzed rainfall patterns, temperature anomalies, and historical trends to generate this forecast.`,
    inputs: { district_id: districtId, rainfall_mm: 142, temperature_c: 32.4, soil_moisture: 45, reservoir_pct: 68 }
  };
}

function mockLayers(): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: MOCK_DISTRICTS.map((d) => {
      const r = generateRankings(2025).find((x) => x.district_id === d.id);
      return {
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [d.centroid_lon, d.centroid_lat]
        },
        properties: {
          district_id: d.id,
          district: d.name,
          state: d.state_name,
          flood_risk: r?.flood_risk ?? 50,
          drought_risk: r?.drought_risk ?? 50,
          heatwave_risk: r?.heatwave_risk ?? 50,
          water_stress_risk: r?.water_stress_risk ?? 50,
          composite_risk: r?.composite_risk ?? 50
        }
      };
    })
  };
}

export const api = {
  login: (email: string, password: string) =>
    withMockFallback(
      () => apiFetch<{ access_token: string; user: { full_name: string; role: string } }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      }),
      () => {
        if (email && password) {
          const token = "mock_jwt_token_" + Date.now();
          return { access_token: token, user: { full_name: email.split("@")[0], role: "analyst" } };
        }
        throw new Error("Invalid credentials");
      }
    ),

  register: (payload: { email: string; full_name: string; password: string; role: string }) =>
    withMockFallback(
      () => apiFetch<{ access_token: string; user: { full_name: string; role: string } }>("/auth/register", {
        method: "POST",
        body: JSON.stringify(payload)
      }),
      () => ({ access_token: "mock_jwt_token_" + Date.now(), user: { full_name: payload.full_name, role: payload.role } })
    ),

  states: () => withMockFallback(() => apiFetch<State[]>("/climate/states"), () => MOCK_STATES),

  districts: (stateId?: number) =>
    withMockFallback(
      () => apiFetch<District[]>(`/climate/districts${stateId ? `?state_id=${stateId}` : ""}`),
      () => stateId ? MOCK_DISTRICTS.filter((d) => d.state_id === stateId) : MOCK_DISTRICTS
    ),

  history: (districtId: number, year?: number) =>
    withMockFallback(
      () => apiFetch<ClimateObservation[]>(`/climate/districts/${districtId}/history${year ? `?year=${year}` : ""}`),
      () => generateHistory(districtId, year)
    ),

  layers: () => withMockFallback(() => apiFetch<GeoJSON.FeatureCollection>("/climate/map/layers"), mockLayers),

  rankings: (limit = 10) =>
    withMockFallback(
      () => apiFetch<Ranking[]>(`/climate/rankings?limit=${limit}`),
      () => generateRankings(2025).slice(0, limit)
    ),

  analytics: () => withMockFallback(() => apiFetch<Analytics>("/climate/analytics"), () => generateAnalytics()),

  alerts: () => withMockFallback(() => apiFetch<ClimateAlert[]>("/climate/alerts"), () => MOCK_ALERTS),

  risk: (districtId: number) =>
    withMockFallback(() => apiFetch<RiskScore>(`/risk/district/${districtId}`), () => mockRisk(districtId)),

  riskTrends: (districtId: number) =>
    withMockFallback(
      () => apiFetch<Array<Record<string, number | string>>>(`/risk/district/${districtId}/trends`),
      () => {
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const isWet = [201, 202, 203, 401, 701, 702].includes(districtId);
        return months.map((date) => ({
          date,
          flood: Math.round(isWet ? 40 + Math.random() * 50 : 8 + Math.random() * 25),
          drought: Math.round(isWet ? 10 + Math.random() * 20 : 50 + Math.random() * 40),
          heatwave: Math.round(20 + Math.random() * 40),
          water_stress: Math.round(isWet ? 15 + Math.random() * 25 : 40 + Math.random() * 45)
        }));
      }
    ),

  predict: (kind: "flood" | "drought" | "heatwave", districtId: number) =>
    withMockFallback(
      () => apiFetch<Prediction>(`/predictions/${kind}`, {
        method: "POST",
        body: JSON.stringify({ district_id: districtId })
      }),
      () => mockPredict(kind, districtId)
    ),

  simulate: (payload: ScenarioPayload) =>
    withMockFallback(
      () => apiFetch<{ scenario: ScenarioPayload; results: SimulationResult }>("/simulations/run", {
        method: "POST",
        body: JSON.stringify(payload)
      }),
      () => runSimulation(payload)
    ),

  copilot: (
    prompt: string,
    context?: {
      selected_district_id?: number;
      active_layer?: string;
      active_year?: number;
      timeline_step?: string;
      map_mode?: string;
    }
  ) =>
    withMockFallback(
      () => apiFetch<CopilotResponse>("/copilot/chat", {
        method: "POST",
        body: JSON.stringify({ prompt, ...context })
      }),
      () => getCopilotResponse(prompt, context)
    ),

  adminOverview: () =>
    withMockFallback(
      () => apiFetch<{
        users: number;
        states: number;
        districts: number;
        risk_scores: number;
        predictions: number;
        simulations: number;
        integrations: Array<{ name: string; status: string }>;
      }>("/admin/overview"),
      () => ({
        users: 128,
        states: MOCK_STATES.length,
        districts: MOCK_DISTRICTS.length,
        risk_scores: MOCK_DISTRICTS.length * 365,
        predictions: 2450,
        simulations: 890,
        integrations: [
          { name: "IMD Gridded Rainfall", status: "active" },
          { name: "IMD Max Temperature", status: "active" },
          { name: "INSAT Land Surface Temp", status: "active" },
          { name: "India-WRIS Reservoir", status: "pending" },
          { name: "CPCB Air Quality", status: "pending" },
          { name: "Bhuvan NRSC NDVI", status: "planned" }
        ]
      })
    )
};

export { API_BASE_URL };
