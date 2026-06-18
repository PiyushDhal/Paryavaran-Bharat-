export type State = {
  id: number;
  name: string;
  code: string;
  centroid_lat: number;
  centroid_lon: number;
};

export type District = {
  id: number;
  state_id: number;
  state_name?: string;
  name: string;
  code: string;
  population: number;
  area_sq_km: number;
  centroid_lat: number;
  centroid_lon: number;
  boundary_geojson?: GeoJSON.Feature;
};

export type Ranking = {
  district_id: number;
  district_name: string;
  state_name: string;
  flood_risk: number;
  drought_risk: number;
  heatwave_risk: number;
  water_stress_risk: number;
  composite_risk: number;
  trend: string;
};

export type RiskScore = Ranking & {
  valid_on: string;
  drivers: Record<string, number | string>;
};

export type ClimateObservation = {
  observed_on: string;
  rainfall_mm: number;
  rainfall_deficit_pct: number;
  temperature_c: number;
  humidity_pct: number;
  river_level_m: number;
  soil_moisture_pct: number;
  aqi: number;
  ndvi?: number;
  reservoir_level_pct?: number;
};

export type Analytics = {
  national_trends: Array<{
    date: string;
    temperature_c: number;
    rainfall_mm: number;
    aqi: number;
    reservoir_level_pct: number;
  }>;
  summary: {
    avg_temperature_c: number;
    avg_rainfall_mm: number;
    avg_aqi: number;
    avg_reservoir_level_pct: number;
    districts_monitored: number;
  };
};

export type ClimateAlert = {
  id: number;
  district: string;
  state: string;
  severity: string;
  alert_type: string;
  title: string;
  message: string;
  issued_at: string;
};

export type Prediction = {
  prediction_type: string;
  probability: number;
  risk_zone: string;
  model_name: string;
  model_version: string;
  valid_for: string;
  explanation: string;
  inputs: Record<string, number>;
};

export type CopilotResponse = {
  explanation: string;
  risk_analysis: string;
  recommended_actions: string[];
  chart: { type: string; data: Array<{ district: string; risk: number }> };
  districts: Ranking[];
  action?: {
    type: string;
    [key: string]: any;
  };
  suggestions?: string[];
  explainable_risk?: {
    confidence: number;
    drivers: string[];
    actions: string[];
    sources: string[];
  };
  insights?: string[];
};
