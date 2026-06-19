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

export type ScenarioPayload = {
  district_id?: number;
  rainfall_delta_pct: number;
  temperature_delta_c: number;
  reservoir_delta_pct: number;
  planning_horizon_years: number;
  humidity_delta_pct?: number;
  river_level_delta_m?: number;
  soil_moisture_delta_pct?: number;
  groundwater_delta_m?: number;
  forest_cover_delta_pct?: number;
  urbanization_delta_pct?: number;
  population_growth_pct?: number;
  agricultural_land_delta_pct?: number;
  wind_speed_delta_kmh?: number;
  cyclone_intensity_delta_pct?: number;
  heatwave_duration_days?: number;
};

export type SimulationResult = {
  water_availability: number;
  crop_stress: number;
  drought_risk: number;
  heatwave_risk: number;
  flood_risk: number;
  water_stress_risk: number;
  composite_risk: number;
  population_at_risk?: number;
  economic_loss_m_inr?: number;
  infrastructure_risk?: number;
  environmental_impact_score?: number;
  ai_analysis?: {
    headline: string;
    confidence: number;
    drivers: string[];
    vulnerableZones: string[];
    recommendations: string[];
    alertLevel: string;
  };
};
