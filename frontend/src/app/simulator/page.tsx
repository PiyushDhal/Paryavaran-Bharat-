"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Play, RotateCcw, Save, FolderOpen, Download, FileText,
  ChevronDown, ChevronUp, Zap, AlertTriangle, TrendingUp,
  Users, DollarSign, Building2, Leaf, Wind, Droplets,
  Thermometer, CloudRain, Mountain, TreePine, Wheat,
  Activity, BarChart3, ArrowUpRight, ArrowDownRight, Minus,
  Layers, Clock, Copy, Trash2, Check, Info, X
} from "lucide-react";

import { DistrictSelector } from "@/components/climate/DistrictSelector";
import { RiskGauge } from "@/components/climate/RiskGauge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { useClimate } from "@/store/useClimateStore";
import type { ScenarioPayload, SimulationResult } from "@/lib/types";

// ─── Types ───────────────────────────────────────────────────────────────────
type SavedScenario = {
  id: string;
  name: string;
  payload: ScenarioPayload;
  result: SimulationResult;
  savedAt: string;
};

type TabKey = "atmospheric" | "hydrological" | "socioeconomic";
type ViewTab = "results" | "compare" | "ai";

// ─── Presets ─────────────────────────────────────────────────────────────────
const PRESETS = [
  {
    id: "extreme_flood",
    label: "Extreme Flood",
    icon: "🌊",
    color: "#3b82f6",
    payload: {
      rainfall_delta_pct: 60,
      temperature_delta_c: 0,
      reservoir_delta_pct: 20,
      planning_horizon_years: 5,
      humidity_delta_pct: 30,
      river_level_delta_m: 4,
      soil_moisture_delta_pct: 40,
      groundwater_delta_m: 5,
      forest_cover_delta_pct: -5,
      urbanization_delta_pct: 0,
      population_growth_pct: 0,
      agricultural_land_delta_pct: 0,
      wind_speed_delta_kmh: 20,
      cyclone_intensity_delta_pct: 0,
      heatwave_duration_days: 0,
    },
  },
  {
    id: "severe_drought",
    label: "Severe Drought",
    icon: "☀️",
    color: "#4DA8DA",
    payload: {
      rainfall_delta_pct: -60,
      temperature_delta_c: 3,
      reservoir_delta_pct: -50,
      planning_horizon_years: 10,
      humidity_delta_pct: -30,
      river_level_delta_m: -3,
      soil_moisture_delta_pct: -40,
      groundwater_delta_m: -15,
      forest_cover_delta_pct: -10,
      urbanization_delta_pct: 5,
      population_growth_pct: 10,
      agricultural_land_delta_pct: -20,
      wind_speed_delta_kmh: 10,
      cyclone_intensity_delta_pct: 0,
      heatwave_duration_days: 45,
    },
  },
  {
    id: "heatwave",
    label: "Urban Heatwave",
    icon: "🌡️",
    color: "#ef4444",
    payload: {
      rainfall_delta_pct: -20,
      temperature_delta_c: 5,
      reservoir_delta_pct: -20,
      planning_horizon_years: 5,
      humidity_delta_pct: -15,
      river_level_delta_m: -1,
      soil_moisture_delta_pct: -20,
      groundwater_delta_m: -5,
      forest_cover_delta_pct: -15,
      urbanization_delta_pct: 25,
      population_growth_pct: 15,
      agricultural_land_delta_pct: -10,
      wind_speed_delta_kmh: -5,
      cyclone_intensity_delta_pct: 0,
      heatwave_duration_days: 60,
    },
  },
  {
    id: "cyclone",
    label: "Cyclone Landfall",
    icon: "🌀",
    color: "#8b5cf6",
    payload: {
      rainfall_delta_pct: 40,
      temperature_delta_c: 1,
      reservoir_delta_pct: 0,
      planning_horizon_years: 1,
      humidity_delta_pct: 40,
      river_level_delta_m: 3,
      soil_moisture_delta_pct: 20,
      groundwater_delta_m: 2,
      forest_cover_delta_pct: -8,
      urbanization_delta_pct: 0,
      population_growth_pct: 0,
      agricultural_land_delta_pct: -15,
      wind_speed_delta_kmh: 80,
      cyclone_intensity_delta_pct: 70,
      heatwave_duration_days: 0,
    },
  },
  {
    id: "2050_climate",
    label: "2050 Climate",
    icon: "🌍",
    color: "#22C55E",
    payload: {
      rainfall_delta_pct: -15,
      temperature_delta_c: 4,
      reservoir_delta_pct: -25,
      planning_horizon_years: 25,
      humidity_delta_pct: -10,
      river_level_delta_m: -0.5,
      soil_moisture_delta_pct: -15,
      groundwater_delta_m: -20,
      forest_cover_delta_pct: -20,
      urbanization_delta_pct: 40,
      population_growth_pct: 30,
      agricultural_land_delta_pct: -25,
      wind_speed_delta_kmh: 15,
      cyclone_intensity_delta_pct: 30,
      heatwave_duration_days: 30,
    },
  },
  {
    id: "green_recovery",
    label: "Green Recovery",
    icon: "🌱",
    color: "#22c55e",
    payload: {
      rainfall_delta_pct: 10,
      temperature_delta_c: -0.5,
      reservoir_delta_pct: 20,
      planning_horizon_years: 15,
      humidity_delta_pct: 5,
      river_level_delta_m: 0.5,
      soil_moisture_delta_pct: 20,
      groundwater_delta_m: 10,
      forest_cover_delta_pct: 30,
      urbanization_delta_pct: -10,
      population_growth_pct: 5,
      agricultural_land_delta_pct: 15,
      wind_speed_delta_kmh: 0,
      cyclone_intensity_delta_pct: -10,
      heatwave_duration_days: 0,
    },
  },
];

// ─── Slider config ────────────────────────────────────────────────────────────
const SLIDER_GROUPS: Record<TabKey, Array<{
  key: keyof ScenarioPayload;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
  icon: React.ReactNode;
  description: string;
}>> = {
  atmospheric: [
    { key: "rainfall_delta_pct", label: "Rainfall", min: -80, max: 80, step: 1, unit: "%", icon: <CloudRain className="w-3.5 h-3.5" />, description: "Change in annual rainfall relative to baseline" },
    { key: "temperature_delta_c", label: "Temperature Rise", min: -5, max: 8, step: 0.1, unit: "°C", icon: <Thermometer className="w-3.5 h-3.5" />, description: "Surface temperature anomaly from mean" },
    { key: "humidity_delta_pct", label: "Humidity", min: -50, max: 50, step: 1, unit: "%", icon: <Droplets className="w-3.5 h-3.5" />, description: "Relative humidity deviation" },
    { key: "wind_speed_delta_kmh", label: "Wind Speed", min: -30, max: 100, step: 1, unit: " km/h", icon: <Wind className="w-3.5 h-3.5" />, description: "Mean wind speed delta" },
    { key: "cyclone_intensity_delta_pct", label: "Cyclone Intensity", min: -50, max: 100, step: 1, unit: "%", icon: <Activity className="w-3.5 h-3.5" />, description: "Change in tropical cyclone intensity" },
    { key: "heatwave_duration_days", label: "Heatwave Duration", min: 0, max: 90, step: 1, unit: " days", icon: <Zap className="w-3.5 h-3.5" />, description: "Consecutive days above critical heat threshold" },
  ],
  hydrological: [
    { key: "reservoir_delta_pct", label: "Reservoir Level", min: -80, max: 50, step: 1, unit: "%", icon: <Mountain className="w-3.5 h-3.5" />, description: "Reservoir storage capacity change" },
    { key: "river_level_delta_m", label: "River Level", min: -5, max: 8, step: 0.1, unit: " m", icon: <Droplets className="w-3.5 h-3.5" />, description: "Change in mean river discharge level" },
    { key: "soil_moisture_delta_pct", label: "Soil Moisture", min: -60, max: 60, step: 1, unit: "%", icon: <Layers className="w-3.5 h-3.5" />, description: "Topsoil moisture content deviation" },
    { key: "groundwater_delta_m", label: "Groundwater Level", min: -30, max: 20, step: 0.5, unit: " m", icon: <Building2 className="w-3.5 h-3.5" />, description: "Change in groundwater table depth" },
    { key: "forest_cover_delta_pct", label: "Forest Cover", min: -40, max: 40, step: 1, unit: "%", icon: <TreePine className="w-3.5 h-3.5" />, description: "Percentage change in forest canopy area" },
  ],
  socioeconomic: [
    { key: "urbanization_delta_pct", label: "Urbanization", min: -20, max: 60, step: 1, unit: "%", icon: <Building2 className="w-3.5 h-3.5" />, description: "Change in urban land area" },
    { key: "population_growth_pct", label: "Population Growth", min: -10, max: 50, step: 1, unit: "%", icon: <Users className="w-3.5 h-3.5" />, description: "Population increase over horizon" },
    { key: "agricultural_land_delta_pct", label: "Agricultural Land", min: -40, max: 30, step: 1, unit: "%", icon: <Wheat className="w-3.5 h-3.5" />, description: "Change in cultivated land area" },
    { key: "planning_horizon_years", label: "Planning Horizon", min: 1, max: 30, step: 1, unit: " yrs", icon: <Clock className="w-3.5 h-3.5" />, description: "Projection period for risk calculations" },
  ],
};

const DEFAULT_PAYLOAD: ScenarioPayload = {
  rainfall_delta_pct: -20,
  temperature_delta_c: 2,
  reservoir_delta_pct: -30,
  planning_horizon_years: 5,
  humidity_delta_pct: 0,
  river_level_delta_m: 0,
  soil_moisture_delta_pct: 0,
  groundwater_delta_m: 0,
  forest_cover_delta_pct: 0,
  urbanization_delta_pct: 0,
  population_growth_pct: 0,
  agricultural_land_delta_pct: 0,
  wind_speed_delta_kmh: 0,
  cyclone_intensity_delta_pct: 0,
  heatwave_duration_days: 0,
};

const ZERO_PAYLOAD: ScenarioPayload = {
  rainfall_delta_pct: 0,
  temperature_delta_c: 0,
  reservoir_delta_pct: 0,
  planning_horizon_years: 1,
  humidity_delta_pct: 0,
  river_level_delta_m: 0,
  soil_moisture_delta_pct: 0,
  groundwater_delta_m: 0,
  forest_cover_delta_pct: 0,
  urbanization_delta_pct: 0,
  population_growth_pct: 0,
  agricultural_land_delta_pct: 0,
  wind_speed_delta_kmh: 0,
  cyclone_intensity_delta_pct: 0,
  heatwave_duration_days: 0,
};

const BASELINE_FALLBACK: SimulationResult = {
  water_availability: 72,
  crop_stress: 35,
  drought_risk: 38,
  heatwave_risk: 52,
  flood_risk: 42,
  water_stress_risk: 44,
  composite_risk: 44,
  population_at_risk: 180000,
  economic_loss_m_inr: 95,
  infrastructure_risk: 38,
  environmental_impact_score: 62,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function riskColor(v: number) {
  if (v >= 75) return "#f87171";
  if (v >= 50) return "#fbbf24";
  if (v >= 35) return "#4DA8DA";
  return "#34d399";
}
function riskLabel(v: number) {
  if (v >= 75) return "Critical";
  if (v >= 50) return "High";
  if (v >= 35) return "Moderate";
  return "Low";
}
function delta(current: number, baseline: number) {
  const d = current - baseline;
  return { d, pct: baseline !== 0 ? ((d / baseline) * 100).toFixed(1) : "0" };
}

function formatLargeNum(n: number) {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return `${n}`;
}


// ─── Component ────────────────────────────────────────────────────────────────
export default function SimulatorPage() {
  const { setActiveSimulation } = useClimate();

  const [districtId, setDistrictId] = useState<number | undefined>(101);
  const [activeTab, setActiveTab] = useState<TabKey>("atmospheric");
  const [viewTab, setViewTab] = useState<ViewTab>("results");
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [payload, setPayload] = useState<ScenarioPayload>({ ...DEFAULT_PAYLOAD });
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [baselineResult, setBaselineResult] = useState<SimulationResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [expandedSliders, setExpandedSliders] = useState(true);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load baseline results when district changes
  useEffect(() => {
    if (!districtId) return;
    api.simulate({ district_id: districtId, ...ZERO_PAYLOAD })
      .then((res) => {
        setBaselineResult(res.results);
      })
      .catch(() => undefined);
  }, [districtId]);

  // Load URL params + saved scenarios from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const dId = params.get("district_id");
      if (dId) setDistrictId(Number(dId));

      const paramMap: Partial<Record<keyof ScenarioPayload, string | null>> = {
        rainfall_delta_pct: params.get("rainfall"),
        temperature_delta_c: params.get("temp"),
        reservoir_delta_pct: params.get("reservoir"),
      };
      setPayload((prev) => ({
        ...prev,
        ...(paramMap.rainfall_delta_pct ? { rainfall_delta_pct: Number(paramMap.rainfall_delta_pct) } : {}),
        ...(paramMap.temperature_delta_c ? { temperature_delta_c: Number(paramMap.temperature_delta_c) } : {}),
        ...(paramMap.reservoir_delta_pct ? { reservoir_delta_pct: Number(paramMap.reservoir_delta_pct) } : {}),
      }));

      try {
        const stored = localStorage.getItem("bct_saved_scenarios");
        if (stored) setSavedScenarios(JSON.parse(stored));
      } catch { /* empty */ }
    }
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(null), 3000);
  }, []);

  async function run() {
    setIsRunning(true);
    try {
      const response = await api.simulate({ district_id: districtId, ...payload });
      const r = response.results as SimulationResult;
      setResult(r);
      setActiveSimulation(r);
      setViewTab("results");
      showToast("Simulation complete — results updated on map");
    } finally {
      setIsRunning(false);
    }
  }

  function applyPreset(preset: typeof PRESETS[0]) {
    setPayload({ ...preset.payload, district_id: districtId });
    setActivePreset(preset.id);
    setResult(null);
  }

  function reset() {
    setPayload({ ...DEFAULT_PAYLOAD, district_id: districtId });
    setActivePreset(null);
    setResult(null);
    setActiveSimulation(null);
  }

  function handleSlider(key: keyof ScenarioPayload, value: number) {
    setPayload((prev) => ({ ...prev, [key]: value }));
    setActivePreset(null);
  }

  function saveScenario() {
    if (!result) return;
    const name = saveName.trim() || `Scenario ${new Date().toLocaleTimeString()}`;
    const entry: SavedScenario = {
      id: crypto.randomUUID(),
      name,
      payload: { ...payload },
      result: { ...result },
      savedAt: new Date().toLocaleString(),
    };
    const updated = [entry, ...savedScenarios].slice(0, 10);
    setSavedScenarios(updated);
    localStorage.setItem("bct_saved_scenarios", JSON.stringify(updated));
    setSaveDialogOpen(false);
    setSaveName("");
    showToast(`"${name}" saved successfully`);
  }

  function loadScenario(s: SavedScenario) {
    setPayload(s.payload);
    setResult(s.result);
    setDistrictId(s.payload.district_id);
    setActiveSimulation(s.result);
    showToast(`Loaded "${s.name}"`);
  }

  function deleteScenario(id: string) {
    const updated = savedScenarios.filter((s) => s.id !== id);
    setSavedScenarios(updated);
    localStorage.setItem("bct_saved_scenarios", JSON.stringify(updated));
    showToast("Scenario deleted");
  }

  function exportCSV() {
    if (!result) return;
    const base = baselineResult ?? BASELINE_FALLBACK;
    const rows = [
      ["Metric", "Baseline", "Simulated", "Delta"],
      ["Composite Risk", base.composite_risk, result.composite_risk, result.composite_risk - base.composite_risk],
      ["Flood Risk", base.flood_risk, result.flood_risk, result.flood_risk - base.flood_risk],
      ["Drought Risk", base.drought_risk, result.drought_risk, result.drought_risk - base.drought_risk],
      ["Heatwave Risk", base.heatwave_risk, result.heatwave_risk, result.heatwave_risk - base.heatwave_risk],
      ["Water Stress", base.water_stress_risk, result.water_stress_risk, result.water_stress_risk - base.water_stress_risk],
      ["Water Availability", base.water_availability, result.water_availability, result.water_availability - base.water_availability],
      ["Crop Stress", base.crop_stress, result.crop_stress, result.crop_stress - base.crop_stress],
      ["Population at Risk", base.population_at_risk ?? 0, result.population_at_risk ?? 0, (result.population_at_risk ?? 0) - (base.population_at_risk ?? 0)],
      ["Economic Loss (M INR)", base.economic_loss_m_inr ?? 0, result.economic_loss_m_inr ?? 0, (result.economic_loss_m_inr ?? 0) - (base.economic_loss_m_inr ?? 0)],
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bharat_climate_simulation.csv";
    a.click();
    URL.revokeObjectURL(url);
    showToast("CSV exported");
  }

  function printReport() {
    window.print();
  }

  const ai = result?.ai_analysis || null;

  const IMPACT_METRICS = result
    ? [
        { label: "Population at Risk", value: formatLargeNum(result.population_at_risk ?? 0), icon: <Users className="w-4 h-4" />, color: "#f87171", sub: "people exposed" },
        { label: "Economic Loss", value: `₹${result.economic_loss_m_inr ?? 0}M`, icon: <DollarSign className="w-4 h-4" />, color: "#fbbf24", sub: "projected INR" },
        { label: "Infrastructure Risk", value: `${result.infrastructure_risk ?? 0}%`, icon: <Building2 className="w-4 h-4" />, color: "#a78bfa", sub: "structural exposure" },
        { label: "Env. Impact Score", value: `${result.environmental_impact_score ?? 0}`, icon: <Leaf className="w-4 h-4" />, color: "#34d399", sub: "ecosystem stress" },
      ]
    : [];

  const RISK_BARS = [
    { key: "flood_risk", label: "Flood Risk" },
    { key: "drought_risk", label: "Drought Risk" },
    { key: "heatwave_risk", label: "Heatwave Risk" },
    { key: "water_stress_risk", label: "Water Stress" },
    { key: "water_availability", label: "Water Availability" },
    { key: "crop_stress", label: "Crop Stress" },
  ] as const;

  return (
    <div className="simulator-root grid gap-6 print:gap-4">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-surface/95 px-4 py-3 text-sm text-white shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-2">
          <Check className="w-4 h-4 text-brand-blue" />
          {toastMsg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Badge className="mb-2">Future Conditions Lab</Badge>
          <h1 className="text-3xl font-bold text-white font-orbitron tracking-[0.12em] uppercase">
            AI Climate Simulation Engine
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Model 14 climate stressors simultaneously. Visualize cascading impacts across hydrology, ecology, and society.
          </p>
        </div>
        <div className="flex gap-2 shrink-0 print:hidden">
          {result && (
            <>
              <Button onClick={() => setSaveDialogOpen(true)} variant="outline" size="sm" className="gap-1.5">
                <Save className="w-3.5 h-3.5" /> Save
              </Button>
              <Button onClick={exportCSV} variant="outline" size="sm" className="gap-1.5">
                <Download className="w-3.5 h-3.5" /> CSV
              </Button>
              <Button onClick={printReport} variant="outline" size="sm" className="gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Report
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Save Dialog */}
      {saveDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-surface p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-white">Save Scenario</h3>
              <button onClick={() => setSaveDialogOpen(false)} className="text-muted-foreground hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              className="w-full rounded-lg border border-white/10 bg-surface-elevated px-3 py-2 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-emerald-400"
              placeholder="Scenario name…"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveScenario()}
              autoFocus
            />
            <div className="mt-4 flex gap-2">
              <Button onClick={saveScenario} className="flex-1">Save</Button>
              <Button onClick={() => setSaveDialogOpen(false)} variant="outline" className="flex-1">Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* Preset Grid */}
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">Quick Presets</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => applyPreset(p)}
              className={`group relative overflow-hidden rounded-2xl border px-3 py-2.5 text-left transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
                activePreset === p.id
                  ? "border-white/[0.08] bg-brand-blue/10 shadow-lg shadow-none"
                  : "border-white/8 bg-white/4 hover:border-white/15 hover:bg-white/8"
              }`}
            >
              <div className="text-xl leading-none">{p.icon}</div>
              <div className="mt-1 text-xs font-medium text-white">{p.label}</div>
              {activePreset === p.id && (
                <div className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-brand-blue" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main Layout */}
      <div className="grid gap-5 xl:grid-cols-[1fr_1.15fr]">
        {/* LEFT: Inputs */}
        <div className="flex flex-col gap-4">
          {/* District + Horizon */}
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Scenario Parameters</CardTitle>
                <button
                  onClick={() => setExpandedSliders((v) => !v)}
                  className="text-muted-foreground hover:text-white transition-colors"
                >
                  {expandedSliders ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
              <CardDescription>District context and 14 adjustable stressors</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-1.5">
                <Label className="text-xs text-muted-foreground">Target District</Label>
                <DistrictSelector value={districtId} onChange={(id) => { setDistrictId(id); setPayload((p) => ({ ...p, district_id: id })); }} />
              </div>

              {expandedSliders && (
                <>
                  {/* Tab Switcher */}
                  <div className="flex gap-1 rounded-lg border border-white/8 bg-white/4 p-1">
                    {(["atmospheric", "hydrological", "socioeconomic"] as TabKey[]).map((t) => (
                      <button
                        key={t}
                        onClick={() => setActiveTab(t)}
                        className={`flex-1 rounded-md py-1.5 text-xs font-medium capitalize transition-all ${
                          activeTab === t
                            ? "bg-brand-blue/10 text-brand-titanium shadow"
                            : "text-muted-foreground hover:text-slate-200"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>

                  {/* Sliders */}
                  <div className="grid gap-3.5">
                    {SLIDER_GROUPS[activeTab].map((slider) => {
                      const val = Number(payload[slider.key] ?? slider.min);
                      const pct = ((val - slider.min) / (slider.max - slider.min)) * 100;
                      const isPositive = val > 0;
                      const isNegative = val < 0;
                      const accentColor = isPositive ? "#4DA8DA" : isNegative ? "#f87171" : "#64748b";
                      return (
                        <div key={slider.key} className="group">
                          <div className="mb-1.5 flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="text-muted-foreground">{slider.icon}</span>
                              <label className="text-xs font-medium text-slate-200">{slider.label}</label>
                            </div>
                            <span
                              className="rounded-md px-1.5 py-0.5 text-xs font-mono font-bold"
                              style={{ color: accentColor, background: `${accentColor}18` }}
                            >
                              {isPositive ? "+" : ""}{typeof val === "number" && slider.step < 1 ? val.toFixed(1) : val}{slider.unit}
                            </span>
                          </div>
                          <input
                            type="range"
                            min={slider.min}
                            max={slider.max}
                            step={slider.step}
                            value={val}
                            onChange={(e) => handleSlider(slider.key, Number(e.target.value))}
                            className="h-1.5 w-full cursor-pointer rounded-full appearance-none bg-white/10"
                            style={{ accentColor }}
                          />
                          <div className="mt-0.5 flex justify-between text-[10px] text-slate-600">
                            <span>{slider.min}{slider.unit}</span>
                            <span>{slider.max}{slider.unit}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-1">
                <Button onClick={run} disabled={isRunning} className="flex-1 gap-2 font-semibold">
                  {isRunning ? (
                    <>
                      <Activity className="w-4 h-4 animate-spin" />
                      Computing…
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Run Simulation
                    </>
                  )}
                </Button>
                <Button onClick={reset} variant="outline" size="icon" className="shrink-0" title="Reset all parameters">
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Saved Scenarios */}
          {savedScenarios.length > 0 && (
            <Card className="glass-card print:hidden">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <FolderOpen className="w-4 h-4 text-brand-blue" />
                  Saved Scenarios
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 max-h-56 overflow-y-auto pr-1">
                  {savedScenarios.map((s) => (
                    <div key={s.id} className="flex items-center gap-2 rounded-lg border border-white/8 bg-white/4 px-3 py-2 text-xs">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-white truncate">{s.name}</div>
                        <div className="text-muted-foreground text-[10px]">{s.savedAt} · Risk {s.result.composite_risk}%</div>
                      </div>
                      <button onClick={() => loadScenario(s)} className="text-brand-blue hover:text-brand-titanium transition-colors" title="Load">
                        <FolderOpen className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteScenario(s.id)} className="text-muted-foreground hover:text-red-400 transition-colors" title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* RIGHT: Results */}
        <div className="flex flex-col gap-4">
          {!result ? (
            <Card className="glass-card flex h-full min-h-[420px] flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.08] bg-brand-blue/10 text-brand-blue">
                <BarChart3 className="w-7 h-7" />
              </div>
              <h3 className="font-semibold text-white">Ready to Simulate</h3>
              <p className="mt-2 max-w-xs text-sm text-muted-foreground">
                Select a district and a preset, or adjust the sliders to define your scenario. Then click <strong className="text-brand-blue">Run Simulation</strong>.
              </p>
            </Card>
          ) : (
            <>
              {/* Impact Counters */}
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {IMPACT_METRICS.map((m) => (
                  <div key={m.label} className="rounded-2xl border border-white/8 bg-white/4 px-4 py-3">
                    <div className="mb-1 flex items-center gap-1.5" style={{ color: m.color }}>
                      {m.icon}
                      <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: m.color }}>{m.label}</span>
                    </div>
                    <div className="text-xl font-bold text-white">{m.value}</div>
                    <div className="text-[10px] text-muted-foreground">{m.sub}</div>
                  </div>
                ))}
              </div>

              {/* View Tabs */}
              <div className="flex gap-1 rounded-lg border border-white/8 bg-white/4 p-1 print:hidden">
                {([
                  ["results", "Risk Results", <TrendingUp key="r" className="w-3.5 h-3.5" />],
                  ["compare", "Before vs After", <Layers key="c" className="w-3.5 h-3.5" />],
                  ["ai", "AI Analysis", <Zap key="a" className="w-3.5 h-3.5" />],
                ] as [ViewTab, string, React.ReactNode][]).map(([key, label, icon]) => (
                  <button
                    key={key}
                    onClick={() => setViewTab(key)}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-all ${
                      viewTab === key
                        ? "bg-brand-blue/10 text-brand-titanium shadow"
                        : "text-muted-foreground hover:text-slate-200"
                    }`}
                  >
                    {icon}{label}
                  </button>
                ))}
              </div>

              {/* Results Tab */}
              {viewTab === "results" && (
                <Card className="glass-card scanline">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle>Projected Impact</CardTitle>
                      <div
                        className="rounded-full px-3 py-1 text-xs font-semibold"
                        style={{ color: riskColor(result.composite_risk), background: `${riskColor(result.composite_risk)}18`, border: `1px solid ${riskColor(result.composite_risk)}30` }}
                      >
                        {riskLabel(result.composite_risk)} Risk
                      </div>
                    </div>
                    <CardDescription>Scenario output updates map risk overlays in real time.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-5 md:grid-cols-[220px_1fr]">
                      <RiskGauge value={result.composite_risk} label="Composite Risk" />
                      <div className="grid gap-2.5">
                        {RISK_BARS.map(({ key, label }) => {
                          const v = Number(result[key] ?? 0);
                          const fill = riskColor(v);
                          return (
                            <div key={key} className="rounded-2xl border border-white/[0.08] bg-surface/30 p-3 hover:border-white/[0.08] transition-colors">
                              <div className="mb-1.5 flex justify-between text-xs">
                                <span className="font-medium text-secondary-foreground">{label}</span>
                                <span className="font-mono font-bold text-white">{v}<span className="text-muted-foreground">%</span></span>
                              </div>
                              <div className="h-2 overflow-hidden rounded-full bg-white/8">
                                <div
                                  className="h-full rounded-full transition-all duration-700"
                                  style={{ width: `${v}%`, backgroundColor: fill, boxShadow: `0 0 10px ${fill}80` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Compare Tab */}
              {viewTab === "compare" && (
                <Card className="glass-card">
                  <CardHeader className="pb-3">
                    <CardTitle>Baseline vs Simulated</CardTitle>
                    <CardDescription>Side-by-side comparison of all risk metrics with percentage delta.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-2">
                      {/* Header */}
                      <div className="grid grid-cols-[1fr_80px_80px_80px] gap-2 border-b border-white/8 pb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        <span>Metric</span>
                        <span className="text-center">Baseline</span>
                        <span className="text-center">Simulated</span>
                        <span className="text-center">Δ Change</span>
                      </div>
                      {([
                        ["Composite Risk", "composite_risk"],
                        ["Flood Risk", "flood_risk"],
                        ["Drought Risk", "drought_risk"],
                        ["Heatwave Risk", "heatwave_risk"],
                        ["Water Stress", "water_stress_risk"],
                        ["Water Availability", "water_availability"],
                        ["Crop Stress", "crop_stress"],
                        ["Infrastructure Risk", "infrastructure_risk"],
                        ["Env. Impact", "environmental_impact_score"],
                      ] as [string, keyof SimulationResult][]).map(([label, key]) => {
                        const sim = Number(result[key] ?? 0);
                        const baseVal = baselineResult ?? BASELINE_FALLBACK;
                        const base = Number(baseVal[key] ?? 0);
                        const { d } = delta(sim, base);
                        const isImproved = key === "water_availability" || key === "environmental_impact_score" ? d > 0 : d < 0;
                        const DeltaIcon = d > 0 ? ArrowUpRight : d < 0 ? ArrowDownRight : Minus;
                        const deltaColor = isImproved ? "#34d399" : d === 0 ? "#64748b" : "#f87171";
                        return (
                          <div key={key} className="grid grid-cols-[1fr_80px_80px_80px] items-center gap-2 rounded-lg px-2 py-2.5 hover:bg-white/4 transition-colors">
                            <span className="text-xs text-secondary-foreground">{label}</span>
                            <span className="text-center text-xs font-mono text-muted-foreground">{base}</span>
                            <span className="text-center text-xs font-mono font-bold text-white">{sim}</span>
                            <div className="flex items-center justify-center gap-0.5" style={{ color: deltaColor }}>
                              <DeltaIcon className="w-3 h-3" />
                              <span className="text-xs font-mono font-semibold">{d > 0 ? "+" : ""}{d.toFixed(0)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* AI Analysis Tab */}
              {viewTab === "ai" && ai && (
                <Card className="glass-card">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-blue/10">
                        <Zap className="w-3.5 h-3.5 text-brand-blue" />
                      </div>
                      <div>
                        <CardTitle>AI Climate Analysis</CardTitle>
                        <CardDescription>Confidence: {ai.confidence}% · Powered by Climate Risk Engine v2</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="grid gap-5">
                    {/* Alert Banner */}
                    <div
                      className="flex items-start gap-3 rounded-2xl border p-4"
                      style={{
                        borderColor: `${riskColor(result.composite_risk)}30`,
                        background: `${riskColor(result.composite_risk)}0a`
                      }}
                    >
                      <AlertTriangle className="mt-0.5 w-4 h-4 shrink-0" style={{ color: riskColor(result.composite_risk) }} />
                      <p className="text-sm text-slate-200 leading-relaxed">{ai.headline}</p>
                    </div>

                    {/* Drivers + Zones */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Key Drivers</p>
                        <ul className="grid gap-1.5">
                          {ai.drivers.map((d, i) => (
                            <li key={i} className="flex items-center gap-2 text-xs text-secondary-foreground">
                              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-blue" />
                              {d}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vulnerable Zones</p>
                        <ul className="grid gap-1.5">
                          {ai.vulnerableZones.map((z, i) => (
                            <li key={i} className="flex items-center gap-2 text-xs text-secondary-foreground">
                              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-blue" />
                              {z}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Recommendations */}
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Priority Recommendations</p>
                      <ol className="grid gap-2">
                        {ai.recommendations.map((r, i) => (
                          <li key={i} className="flex items-start gap-3 rounded-lg border border-white/6 bg-white/4 px-3 py-2.5">
                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-blue/10 text-[10px] font-bold text-brand-blue">{i + 1}</span>
                            <span className="text-xs text-secondary-foreground leading-relaxed">{r}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        .simulator-root {
          padding-bottom: 2rem;
        }
        input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
          height: 6px;
          border-radius: 9999px;
          background: rgba(255,255,255,0.1);
          outline: none;
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          box-shadow: 0 0 0 3px rgba(34,211,238,0.3);
          transition: box-shadow 0.2s;
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          box-shadow: 0 0 0 5px rgba(34,211,238,0.4);
        }
        input[type="range"]::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border: none;
          border-radius: 50%;
          background: white;
          cursor: pointer;
        }
        @keyframes slide-in-from-bottom-2 {
          from { transform: translateY(8px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-in { animation: slide-in-from-bottom-2 0.2s ease; }
        @media print {
          .print\\:hidden { display: none !important; }
          .glass-card { background: white !important; color: black !important; border: 1px solid #ddd !important; }
        }
      `}</style>
    </div>
  );
}
