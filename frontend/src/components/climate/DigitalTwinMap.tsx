"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { 
  Layers, 
  LocateFixed, 
  Search, 
  X, 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  Cpu, 
  Database,
  Thermometer,
  Droplets,
  CloudRain,
  Sun,
  Shield,
  AlertTriangle,
  Compass,
  Users
} from "lucide-react";
import mapboxgl from "mapbox-gl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api";
import type { District, Ranking, ClimateObservation } from "@/lib/types";
import { riskFill } from "@/lib/utils";
import { useClimate } from "@/store/useClimateStore";
import { INDIA_OUTLINE } from "@/lib/indiaOutline";
import { INDIA_STATES } from "@/lib/indiaStates";

// ─── Layer Metadata ──────────────────────────────────────────────────
const layerMeta: Record<
  string,
  {
    label: string;
    unit: string;
    min: number;
    max: number;
    ranges: string[];
    colors: string[];
    thresholds: number[];
  }
> = {
  composite_risk: {
    label: "Composite Risk",
    unit: "%",
    min: 0,
    max: 100,
    ranges: ["Safe (<35)", "Moderate (35-60)", "High (60-80)", "Critical (>=80)"],
    colors: ["#22C55E", "#eab308", "#f97316", "#ef4444"],
    thresholds: [35, 60, 80],
  },
  flood_risk: {
    label: "Flood Risk",
    unit: "%",
    min: 0,
    max: 100,
    ranges: ["Safe (<35)", "Moderate (35-60)", "High (60-80)", "Critical (>=80)"],
    colors: ["#22C55E", "#eab308", "#f97316", "#ef4444"],
    thresholds: [35, 60, 80],
  },
  heatwave_risk: {
    label: "Heatwave Risk",
    unit: "%",
    min: 0,
    max: 100,
    ranges: ["Safe (<35)", "Moderate (35-60)", "High (60-80)", "Critical (>=80)"],
    colors: ["#22C55E", "#eab308", "#f97316", "#ef4444"],
    thresholds: [35, 60, 80],
  },
  drought_risk: {
    label: "Drought Risk",
    unit: "%",
    min: 0,
    max: 100,
    ranges: ["Safe (<35)", "Moderate (35-60)", "High (60-80)", "Critical (>=80)"],
    colors: ["#22C55E", "#eab308", "#f97316", "#ef4444"],
    thresholds: [35, 60, 80],
  },
  water_stress_risk: {
    label: "Water Stress",
    unit: "%",
    min: 0,
    max: 100,
    ranges: ["Safe (<35)", "Moderate (35-60)", "High (60-80)", "Critical (>=80)"],
    colors: ["#22C55E", "#eab308", "#f97316", "#ef4444"],
    thresholds: [35, 60, 80],
  },
  rainfall: {
    label: "Rainfall",
    unit: " mm",
    min: 0,
    max: 600,
    ranges: ["Light (<50)", "Moderate (50-150)", "Heavy (150-300)", "Torrential (>=300)"],
    colors: ["#ecfeff", "#6EE7B7", "#3b82f6", "#1d4ed8"],
    thresholds: [50, 150, 300],
  },
  temperature: {
    label: "Temperature",
    unit: " °C",
    min: 0,
    max: 50,
    ranges: ["Cold (<20)", "Mild (20-28)", "Warm (28-36)", "Extreme (>=36)"],
    colors: ["#3b82f6", "#22C55E", "#f97316", "#ef4444"],
    thresholds: [20, 28, 36],
  },
  aqi: {
    label: "Air Quality Index",
    unit: "",
    min: 0,
    max: 300,
    ranges: ["Good (<50)", "Moderate (50-100)", "Unhealthy (100-150)", "Hazardous (>=150)"],
    colors: ["#22C55E", "#eab308", "#f97316", "#ef4444"],
    thresholds: [50, 100, 150],
  },
  humidity: {
    label: "Humidity",
    unit: "%",
    min: 0,
    max: 100,
    ranges: ["Dry (<40)", "Normal (40-70)", "Humid (>=70)"],
    colors: ["#a8a29e", "#4DA8DA", "#2563eb"],
    thresholds: [40, 70],
  },
  soil_moisture: {
    label: "Soil Moisture",
    unit: "%",
    min: 0,
    max: 100,
    ranges: ["Deficit (<25)", "Normal (25-55)", "Saturated (>=55)"],
    colors: ["#ca8a04", "#84cc16", "#15803d"],
    thresholds: [25, 55],
  },
  ndvi: {
    label: "NDVI Index",
    unit: "",
    min: 0,
    max: 1,
    ranges: ["Barren (<0.3)", "Moderate (0.3-0.6)", "Lush (>=0.6)"],
    colors: ["#ca8a04", "#4ade80", "#166534"],
    thresholds: [0.3, 0.6],
  },
  reservoir_level: {
    label: "Reservoir Level",
    unit: "%",
    min: 0,
    max: 100,
    ranges: ["Low (<35)", "Moderate (35-70)", "High (>=70)"],
    colors: ["#ef4444", "#eab308", "#3b82f6"],
    thresholds: [35, 70],
  },
  river_level: {
    label: "River Level",
    unit: " m",
    min: 0,
    max: 5,
    ranges: ["Normal (<1.5)", "Alert (1.5-2.5)", "Danger (>=2.5)"],
    colors: ["#22C55E", "#f97316", "#ef4444"],
    thresholds: [1.5, 2.5],
  },
  population_density: {
    label: "Population",
    unit: "",
    min: 0,
    max: 15000000,
    ranges: ["Rural (<1.5M)", "Urban (1.5M-5M)", "Metropolitan (>=5M)"],
    colors: ["#fef08a", "#f97316", "#c084fc"],
    thresholds: [1500000, 5000000],
  },
  sustainability_score: {
    label: "Sustainability Score",
    unit: " pts",
    min: 0,
    max: 100,
    ranges: ["Critical (<40)", "Moderate (40-60)", "High (60-80)", "Lush (>=80)"],
    colors: ["#ef4444", "#4DA8DA", "#4DA8DA", "#22C55E"],
    thresholds: [40, 60, 80],
  },
  green_cover: {
    label: "Green Cover",
    unit: "%",
    min: 0,
    max: 100,
    ranges: ["Barren (<30)", "Normal (30-65)", "Dense (>=65)"],
    colors: ["#ca8a04", "#84cc16", "#15803d"],
    thresholds: [30, 65],
  },
  water_resources: {
    label: "Water Resources",
    unit: "%",
    min: 0,
    max: 100,
    ranges: ["Scarcity (<35)", "Stressed (35-70)", "Abundant (>=70)"],
    colors: ["#ef4444", "#eab308", "#3b82f6"],
    thresholds: [35, 70],
  },
  air_quality: {
    label: "Air Quality Score",
    unit: " AQI",
    min: 0,
    max: 300,
    ranges: ["Good (<50)", "Moderate (50-100)", "Unhealthy (100-150)", "Hazardous (>=150)"],
    colors: ["#22C55E", "#eab308", "#f97316", "#ef4444"],
    thresholds: [50, 100, 150],
  },
  carbon_impact: {
    label: "Carbon Impact",
    unit: " tons",
    min: 0,
    max: 100,
    ranges: ["Low (<35)", "Moderate (35-65)", "High (>=65)"],
    colors: ["#22C55E", "#f97316", "#ef4444"],
    thresholds: [35, 65],
  },
  climate_resilience: {
    label: "Climate Resilience",
    unit: "%",
    min: 0,
    max: 100,
    ranges: ["Vulnerable (<40)", "Adaptive (40-75)", "Resilient (>=75)"],
    colors: ["#ef4444", "#eab308", "#22C55E"],
    thresholds: [40, 75],
  },
  environmental_health: {
    label: "Environmental Health",
    unit: "%",
    min: 0,
    max: 100,
    ranges: ["Poor (<45)", "Fair (45-75)", "Excellent (>=75)"],
    colors: ["#ef4444", "#eab308", "#22C55E"],
    thresholds: [45, 75],
  },
};

// ─── Color Scales ────────────────────────────────────────────────────
function getLayerColor(layer: string, value: number): string {
  const meta = layerMeta[layer];
  if (!meta) return "#4DA8DA";
  for (let i = 0; i < meta.thresholds.length; i++) {
    if (value < meta.thresholds[i]) {
      return meta.colors[i];
    }
  }
  return meta.colors[meta.colors.length - 1];
}

function getMapboxColorSteps(layer: string): any[] {
  const meta = layerMeta[layer];
  if (!meta) return ["#4DA8DA"];
  const steps: any[] = [meta.colors[0]];
  for (let i = 0; i < meta.thresholds.length; i++) {
    steps.push(meta.thresholds[i]);
    steps.push(meta.colors[i + 1]);
  }
  return steps;
}

// ─── Projections and Grid setup ──────────────────────────────────────
const SVG_W = 320;
const SVG_H = 340;
const centerLon = 80.0;
const centerLat = 22.5;
const scaleX = 8.5;
const scaleY = 9.2;

function lonToX(lon: number, lat: number = 22.5) {
  const latRad = (lat * Math.PI) / 180;
  return SVG_W / 2 + (lon - centerLon) * scaleX * Math.cos(latRad) - 19.0;
}

function latToY(lat: number) {
  const latRad = (lat * Math.PI) / 180;
  const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  const centerLatRad = (centerLat * Math.PI) / 180;
  const mercCenter = Math.log(Math.tan(Math.PI / 4 + centerLatRad / 2));
  return SVG_H / 2 - (mercN - mercCenter) * scaleY * 57.2958 + 9.0;
}

// Extract specific layer value at current timeline step
// Extract specific layer value at current timeline step
function getTimelineMetricValue(
  districtId: number,
  layer: string,
  rankings: Ranking[],
  allDistricts: District[],
  historyData: ClimateObservation[],
  timelineStep: string,
  features: GeoJSON.Feature[] = []
): number {
  if (layer === "population_density") {
    const dist = allDistricts.find((x) => x.id === districtId);
    return dist?.population ?? 1500000;
  }

  // Find properties from the backend features array if available
  const feature = features.find((f) => Number(f.properties?.district_id) === districtId);
  const props = feature?.properties || {};

  // For observations layer, if we have local historyData (selected district), get the timeline step observation
  let hasObs = false;
  let obsVal = 0;
  let monthIdx = 5; // June (default)
  if (timelineStep === "tomorrow") monthIdx = 5;
  if (timelineStep === "7d") monthIdx = 6;
  if (timelineStep === "30d") monthIdx = 7;

  const obs = historyData && historyData[monthIdx];
  if (obs) {
    hasObs = true;
    if (layer === "temperature") obsVal = obs.temperature_c;
    else if (layer === "rainfall") obsVal = obs.rainfall_mm;
    else if (layer === "aqi" || layer === "air_quality") obsVal = obs.aqi;
    else if (layer === "humidity") obsVal = obs.humidity_pct;
    else if (layer === "soil_moisture") obsVal = obs.soil_moisture_pct;
    else if (layer === "ndvi") obsVal = obs.ndvi ?? 0.5;
    else if (layer === "reservoir_level") obsVal = obs.reservoir_level_pct ?? 50;
    else if (layer === "river_level") obsVal = obs.river_level_m;
    else hasObs = false;
  }

  // If we don't have history data, retrieve the value from the backend features
  let val = 50;
  if (hasObs) {
    val = obsVal;
  } else {
    if (layer === "composite_risk") val = Number(props.composite_risk ?? 50);
    else if (layer === "flood_risk") val = Number(props.flood_risk ?? 50);
    else if (layer === "drought_risk") val = Number(props.drought_risk ?? 50);
    else if (layer === "heatwave_risk") val = Number(props.heatwave_risk ?? 50);
    else if (layer === "water_stress_risk") val = Number(props.water_stress_risk ?? 50);
    else if (layer === "temperature") val = Number(props.temperature ?? 25);
    else if (layer === "rainfall") val = Number(props.rainfall ?? 100);
    else if (layer === "aqi" || layer === "air_quality") val = Number(props.air_quality ?? 60);
    else if (layer === "soil_moisture") val = Number(props.soil_moisture ?? 40);
    else if (layer === "ndvi") val = Number(props.ndvi ?? 0.5);
    else if (layer === "reservoir_level") val = Number(props.reservoir_level ?? 50);
    else if (layer === "river_level") val = Number(props.rainfall ?? 100) / 100;
    else if (layer === "humidity") val = Math.min(100, Math.max(10, 40 + Number(props.rainfall ?? 100) * 0.1));
    else if (layer === "sustainability_score") {
      const risk = Number(props.composite_risk ?? 50);
      const ndvi = Number(props.ndvi ?? 0.5) * 100;
      const aqi = Math.max(0, Math.min(100, 100 - (Number(props.air_quality ?? 60) - 50) * 0.4));
      const reservoir = Number(props.reservoir_level ?? 50);
      val = Math.round(ndvi * 0.25 + aqi * 0.2 + reservoir * 0.2 + (100 - risk) * 0.2 + (Number(props.soil_moisture ?? 40)) * 0.15);
    }
    else if (layer === "green_cover") val = Number(props.ndvi ?? 0.5) * 100;
    else if (layer === "water_resources") val = Number(props.reservoir_level ?? 50);
    else if (layer === "carbon_impact") {
      const ndvi = Number(props.ndvi ?? 0.5) * 100;
      const aqi = Math.max(0, Math.min(100, 100 - (Number(props.air_quality ?? 60) - 50) * 0.4));
      val = Math.round(100 - (ndvi * 0.6 + (100 - aqi) * 0.4));
    }
    else if (layer === "climate_resilience") val = 100 - Number(props.composite_risk ?? 50);
    else if (layer === "environmental_health") {
      const ndvi = Number(props.ndvi ?? 0.5) * 100;
      const aqi = Math.max(0, Math.min(100, 100 - (Number(props.air_quality ?? 60) - 50) * 0.4));
      const soil = Number(props.soil_moisture ?? 40);
      val = Math.round(ndvi * 0.4 + aqi * 0.3 + soil * 0.3);
    }
  }

  // Adjust for future timelineStep projections
  if (timelineStep === "tomorrow") val = Math.min(100, Math.max(0, val + Math.sin(districtId) * 2));
  else if (timelineStep === "7d") val = Math.min(100, Math.max(0, val + Math.sin(districtId + 1) * 5));
  else if (timelineStep === "30d") val = Math.min(100, Math.max(0, val + Math.sin(districtId + 2) * 8));
  else if (timelineStep === "2030") val = Math.min(100, Math.max(0, val + Math.sin(districtId + 3) * 12));

  return val;
}

function getStateMetricValue(
  stateName: string,
  layer: string,
  rankings: Ranking[],
  allDistricts: District[],
  timelineStep: string,
  features: GeoJSON.Feature[] = []
): number {
  const stateDistricts = allDistricts.filter((d) => d.state_name === stateName);
  if (stateDistricts.length === 0) return 50;
  let sum = 0;
  for (const d of stateDistricts) {
    sum += getTimelineMetricValue(d.id, layer, rankings, allDistricts, [], timelineStep, features);
  }
  return sum / stateDistricts.length;
}

function getStateForecastText(stateName: string, layer: string, value: number, year: number): string {
  const rounded = value.toFixed(1);
  if (layer === "temperature") {
    if (value > 38) return `Extreme Heatwave alert. Temperature forecast is ${rounded}°C. High thermal risk.`;
    if (value > 30) return `Warm seasonal temperature at ${rounded}°C. Nominal urban heat index.`;
    return `Mild conditions at ${rounded}°C. No thermal warnings active.`;
  }
  if (layer === "rainfall") {
    if (value > 250) return `Heavy precipitation alert: ${rounded} mm. Risk of localized run-offs.`;
    if (value > 100) return `Moderate monsoon showers at ${rounded} mm. Stable hydrological replenishment.`;
    return `Light rainfall forecast: ${rounded} mm. Dry atmospheric column.`;
  }
  if (layer.includes("risk") || layer === "composite_risk") {
    const riskLabel = value > 80 ? "Critical Risk" : value > 60 ? "High Risk" : value > 35 ? "Moderate Risk" : "Safe/Normal";
    return `Composite climate hazard index is at ${rounded}% (${riskLabel}). Adaptation models active.`;
  }
  if (layer === "aqi") {
    if (value > 150) return `Hazardous air quality index: ${rounded}. Elevated particulate concentration.`;
    if (value > 100) return `Moderate/Unhealthy air quality index at ${rounded}. Sensory precautions advised.`;
    return `Clean atmosphere. AQI is at ${rounded} (Good).`;
  }
  if (layer === "sustainability_score") {
    return `Composite ecological sustainability score is ${rounded} pts. Environmental systems are ${value >= 75 ? "robust and healthy" : value >= 50 ? "moderately balanced" : "vulnerable/under stress"}.`;
  }
  if (layer === "green_cover") {
    return `Forest cover health and NDVI density is estimated at ${rounded}%. Canopy density matches normal seasonal variation.`;
  }
  if (layer === "water_resources") {
    return `Basin water reserves and hydrological storage is at ${rounded}%. Recharge grids are functioning within nominal rates.`;
  }
  if (layer === "air_quality") {
    return `Local air protection indices average ${rounded} AQI. Particulate densities are within acceptable grid limits.`;
  }
  if (layer === "carbon_impact") {
    return `Carbon footprint index is ${rounded} tons CO2eq. Net emission index matches regional target guidelines.`;
  }
  if (layer === "climate_resilience") {
    return `Adaptive capacity index stands at ${rounded}%. Infrastructure adaptation layers are operational.`;
  }
  if (layer === "environmental_health") {
    return `Unified ecological health rating is ${rounded}%. Soil, biodiversity, and green covers show high integrity.`;
  }

  return `${layerMeta[layer]?.label || "Environmental metric"} is at ${rounded}${layerMeta[layer]?.unit || ""}. Status nominal.`;
}


// ─── Custom Sparkline Component ──────────────────────────────────────
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const points = useMemo(() => {
    if (data.length === 0) return "";
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const width = 110;
    const height = 32;
    return data
      .map((val, idx) => {
        const x = (idx / (data.length - 1)) * width;
        const y = height - ((val - min) / range) * (height - 4) - 2;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [data]);

  if (data.length === 0) return null;

  const width = 110;
  const height = 32;
  const fillPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <svg width={width} height={height} className="overflow-visible select-none">
      <defs>
        <linearGradient id={`spark-grad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0.0} />
        </linearGradient>
      </defs>
      <polygon fill={`url(#spark-grad-${color.replace("#", "")})`} points={fillPoints} />
      <polyline fill="none" stroke={color} strokeWidth={1.5} points={points} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Weather Effects Component ──────────────────────────────────────
function WeatherEffects({ type }: { type: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener("resize", handleResize);

    const rainParticles: Array<{ x: number; y: number; speed: number; len: number }> = [];
    if (type === "rain") {
      for (let i = 0; i < 40; i++) {
        rainParticles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          speed: 4 + Math.random() * 4,
          len: 8 + Math.random() * 8
        });
      }
    }

    let time = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      if (type === "rain") {
        ctx.strokeStyle = "rgba(110, 231, 183, 0.35)";
        ctx.lineWidth = 1;
        ctx.lineCap = "round";
        for (const p of rainParticles) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - 0.8, p.y + p.len);
          ctx.stroke();

          p.y += p.speed;
          p.x -= 0.3;
          if (p.y > height) {
            p.y = -p.len;
            p.x = Math.random() * width;
          }
        }
      } else if (type === "heat") {
        time += 0.04;
        const gradient = ctx.createRadialGradient(
          width / 2,
          height / 2,
          10,
          width / 2,
          height / 2,
          width * 0.7
        );
        const intensity = 0.025 + Math.sin(time) * 0.012;
        gradient.addColorStop(0, `rgba(239, 68, 68, ${intensity})`);
        gradient.addColorStop(1, "rgba(239, 68, 68, 0)");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
      } else if (type === "wind") {
        time += 0.012;
        ctx.strokeStyle = "rgba(52, 211, 153, 0.04)";
        ctx.lineWidth = 1.2;
        for (let i = 0; i < 5; i++) {
          const y = (height / 6) * (i + 1) + Math.sin(time + i) * 16;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.bezierCurveTo(width / 3, y - 12, (width * 2) / 3, y + 12, width, y);
          ctx.stroke();
        }
      }

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationId);
    };
  }, [type]);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-10 w-full h-full" />;
}

// ─── Region Selector Modal ───────────────────────────────────────────
function RegionSelectorModal({
  districts,
  features,
  onSelect,
  onClose
}: {
  districts: District[];
  features: GeoJSON.Feature[];
  onSelect: (feature: GeoJSON.Feature) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");

  const featureByDistrictId = useMemo(() => {
    const map = new Map<number, GeoJSON.Feature>();
    for (const f of features) {
      const props = f.properties as Record<string, number | string>;
      map.set(Number(props.district_id), f);
    }
    return map;
  }, [features]);

  const filtered = useMemo(() => {
    if (!search.trim()) return districts;
    const q = search.toLowerCase();
    return districts.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (d.state_name ?? "").toLowerCase().includes(q)
    );
  }, [districts, search]);

  const stateGroups = useMemo(() => {
    const groups = new Map<string, District[]>();
    for (const d of filtered) {
      const state = d.state_name ?? "Unknown";
      if (!groups.has(state)) groups.set(state, []);
      groups.get(state)!.push(d);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  function handleSelect(district: District) {
    const feature = featureByDistrictId.get(district.id);
    if (feature) {
      onSelect(feature);
      onClose();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="glass-panel relative mx-4 flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-background"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Select Region</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Click a district on the map or search by name</p>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-md border border-white/[0.08] bg-white/5 text-muted-foreground hover:text-white transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="hidden shrink-0 border-r border-white/[0.08] bg-background/60 p-4 md:block">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-brand-titanium/70">
              India District Map
            </p>
            <svg
              width={SVG_W}
              height={SVG_H}
              viewBox={`0 0 ${SVG_W} ${SVG_H}`}
              className="rounded-md border border-white/[0.08] bg-background"
            >
              {[70, 75, 80, 85, 90, 95].map((lon) => {
                const x = lonToX(lon, 22.5);
                return (
                  <g key={`lon-line-${lon}`}>
                    <line
                      x1={x}
                      y1={15}
                      x2={x}
                      y2={SVG_H - 15}
                      stroke="rgba(34,211,238,0.05)"
                      strokeWidth={1}
                      strokeDasharray="2 4"
                    />
                    <text
                      x={x}
                      y={SVG_H - 5}
                      fontSize={6.5}
                      fill="rgba(34,211,238,0.25)"
                      textAnchor="middle"
                      fontFamily="monospace"
                    >
                      {lon}°E
                    </text>
                  </g>
                );
              })}
              {[10, 15, 20, 25, 30, 35].map((lat) => {
                const y = latToY(lat);
                return (
                  <g key={`lat-line-${lat}`}>
                    <line
                      x1={15}
                      y1={y}
                      x2={SVG_W - 15}
                      y2={y}
                      stroke="rgba(34,211,238,0.05)"
                      strokeWidth={1}
                      strokeDasharray="2 4"
                    />
                    <text
                      x={5}
                      y={y + 2}
                      fontSize={6.5}
                      fill="rgba(34,211,238,0.25)"
                      textAnchor="start"
                      fontFamily="monospace"
                    >
                      {lat}°N
                    </text>
                  </g>
                );
              })}

              {INDIA_STATES.map((state) => (
                <g key={state.name}>
                  {state.paths.map((path, idx) => {
                    const pathData = path
                      .map((pt, i) => {
                        const x = lonToX(pt.lon, pt.lat);
                        const y = latToY(pt.lat);
                        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
                      })
                      .join(" ") + " Z";
                    return (
                      <path
                        key={idx}
                        d={pathData}
                        fill="rgba(8, 20, 34, 0.45)"
                        stroke="rgba(52, 211, 153, 0.16)"
                        strokeWidth={0.7}
                        strokeLinejoin="round"
                      />
                    );
                  })}
                </g>
              ))}

              {(() => {
                const pathData = INDIA_OUTLINE
                  .map((pt, i) => {
                     const x = lonToX(pt.lon, pt.lat);
                     const y = latToY(pt.lat);
                     return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
                  })
                  .join(" ") + " Z";

                return (
                  <>
                    <path
                      d={pathData}
                      fill="rgba(52, 211, 153, 0.02)"
                      stroke="rgba(52, 211, 153, 0.35)"
                      strokeWidth={1.5}
                      strokeLinejoin="round"
                      style={{ pointerEvents: "none" }}
                    />
                    <path
                      d={pathData}
                      fill="none"
                      stroke="rgba(52, 211, 153, 0.08)"
                      strokeWidth={1.5}
                      strokeLinejoin="round"
                      filter="url(#glow-modal)"
                      style={{ pointerEvents: "none" }}
                    />
                    <defs>
                      <filter id="glow-modal" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="1" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>
                  </>
                );
              })()}

              {districts.map((d) => {
                const x = lonToX(d.centroid_lon, d.centroid_lat);
                const y = latToY(d.centroid_lat);
                const isFiltered = filtered.some((f) => f.id === d.id);
                return (
                  <g key={d.id} onClick={() => handleSelect(d)} className="cursor-pointer">
                    <circle
                      cx={x}
                      cy={y}
                      r={isFiltered ? 10 : 7}
                      fill={isFiltered ? "rgba(34,211,238,0.22)" : "rgba(148,163,184,0.08)"}
                      stroke={isFiltered ? "#4DA8DA" : "rgba(148,163,184,0.2)"}
                      strokeWidth={1.5}
                    />
                    <circle
                      cx={x}
                      cy={y}
                      r={isFiltered ? 4 : 3}
                      fill={isFiltered ? "#4DA8DA" : "rgba(148,163,184,0.35)"}
                    />
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="border-b border-white/[0.08] px-4 py-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Search district or state..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background/50 pl-9 pr-3 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3">
              {stateGroups.length === 0 ? (
                <p className="mt-8 text-center text-sm text-muted-foreground">No districts match your search.</p>
              ) : (
                <div className="grid gap-4">
                  {stateGroups.map(([state, stateDistricts]) => (
                    <div key={state}>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-brand-titanium/70">
                        {state}
                      </p>
                      <div className="grid gap-1">
                        {stateDistricts.map((d) => (
                          <button
                            key={d.id}
                            onClick={() => handleSelect(d)}
                            className="flex items-center justify-between rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-left text-sm text-secondary-foreground transition hover:border-white/[0.08] hover:bg-brand-blue/10 hover:text-white"
                          >
                            <span className="font-medium">{d.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {d.centroid_lat.toFixed(1)}°N, {d.centroid_lon.toFixed(1)}°E
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Digital Twin Map Component ─────────────────────────────────
export function DigitalTwinMap({ compact = false }: { compact?: boolean }) {
  const mapNode = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  
  const [data, setData] = useState<GeoJSON.FeatureCollection | null>(null);
  const features = useMemo(() => data?.features ?? [], [data]);
  const [allDistricts, setAllDistricts] = useState<District[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [isLayerPanelExpanded, setIsLayerPanelExpanded] = useState(true);
  const [showSelector, setShowSelector] = useState(false);

  // Local state for selected district observations
  const [districtHistory, setDistrictHistory] = useState<ClimateObservation[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<{
    summary: string;
    confidence: number;
    trend: string;
    drivers: string[];
    actions: string[];
  } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Interactive State hover & click telemetry
  const [hoveredStateName, setHoveredStateName] = useState<string | null>(null);
  const [tooltipCoords, setTooltipCoords] = useState<{ x: number; y: number } | null>(null);
  const [hoverCoords, setHoverCoords] = useState<{ x: number; y: number } | null>(null);

  // Extract rankings, timeline, and layers from global context store
  const climateContext = useClimate();
  const activeLayer = climateContext?.activeLayer ?? "composite_risk";
  const setActiveLayer = climateContext?.setActiveLayer ?? (() => undefined);
  const selectedDistrictId = climateContext?.selectedDistrictId;
  const setSelectedDistrictId = climateContext?.setSelectedDistrictId ?? (() => undefined);
  const rankings = climateContext?.rankings ?? [];
  const activeYear = climateContext?.activeYear ?? 2026;
  const timelineStep = climateContext?.timelineStep ?? "today";
  const setTimelineStep = climateContext?.setTimelineStep ?? (() => undefined);
  const mapMode = climateContext?.mapMode ?? "streets";
  const setMapMode = climateContext?.setMapMode ?? (() => undefined);
  const selectedStateName = climateContext?.selectedStateName ?? null;
  const setSelectedStateName = climateContext?.setSelectedStateName ?? (() => undefined);

  const zoomTransform = useMemo(() => {
    if (!selectedStateName) return "";
    const state = INDIA_STATES.find(s => s.name === selectedStateName);
    if (!state) return "";
    
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    state.paths.forEach(path => {
      path.forEach(pt => {
        const x = lonToX(pt.lon, pt.lat);
        const y = latToY(pt.lat);
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      });
    });
    
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    
    const stateW = maxX - minX;
    const stateH = maxY - minY;
    
    const baseScale = Math.min((SVG_W - 80) / stateW, (SVG_H - 80) / stateH);
    const scale = Math.min(Math.max(baseScale, 1.8), 5.5);
    
    const tx = (SVG_W / 2) - cx * scale;
    const ty = (SVG_H / 2) - cy * scale;
    
    return `translate(${tx}px, ${ty}px) scale(${scale})`;
  }, [selectedStateName, lonToX, latToY]);

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  const statesGeoJson = useMemo(() => {
    return {
      type: "FeatureCollection",
      features: INDIA_STATES.map((state) => ({
        type: "Feature",
        properties: {
          name: state.name,
          active_val: getStateMetricValue(state.name, activeLayer, rankings, allDistricts, timelineStep, features)
        },
        geometry: {
          type: "Polygon",
          coordinates: state.paths.map((path) =>
            path.map((pt) => [pt.lon, pt.lat])
          )
        }
      }))
    } as GeoJSON.FeatureCollection;
  }, [activeLayer, rankings, allDistricts, timelineStep, features]);

  useEffect(() => {
    api.layers(activeYear).then(setData).catch(() => setData(null));
  }, [activeYear]);

  useEffect(() => {
    api.districts().then(setAllDistricts).catch(() => undefined);
  }, []);

  // Synchronize selected district from URL query parameters on mount or URL changes
  useEffect(() => {
    if (!compact && typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const dId = params.get("district_id");
      if (dId) {
        setSelectedDistrictId(Number(dId));
      } else {
        setSelectedDistrictId(undefined);
      }
    }
  }, [compact, setSelectedDistrictId]);

  // Handle selected district history fetching
  useEffect(() => {
    if (!selectedDistrictId) {
      setDistrictHistory([]);
      return;
    }
    setHistoryLoading(true);
    api.history(selectedDistrictId, activeYear)
      .then(setDistrictHistory)
      .catch(() => setDistrictHistory([]))
      .finally(() => setHistoryLoading(false));
  }, [selectedDistrictId, activeYear]);

  // Extract selected district metadata
  const selectedDistrict = useMemo(() => {
    return allDistricts.find((d) => d.id === selectedDistrictId);
  }, [allDistricts, selectedDistrictId]);

  // Build metrics values for the selected district
  const selectedMetrics = useMemo(() => {
    if (!selectedDistrictId) return null;
    const metrics: Record<string, number> = {};
    for (const key of Object.keys(layerMeta)) {
      metrics[key] = getTimelineMetricValue(
        selectedDistrictId,
        key,
        rankings,
        allDistricts,
        districtHistory,
        timelineStep,
        features
      );
    }
    return metrics;
  }, [selectedDistrictId, rankings, allDistricts, districtHistory, timelineStep, features]);

  // AI Climate Analysis summary fetched dynamically from backend
  useEffect(() => {
    if (!selectedDistrict || !selectedMetrics) {
      setAiAnalysis(null);
      return;
    }
    setAiLoading(true);
    api.copilot(`Explain risk drivers for district ${selectedDistrict.name}`, {
      selected_district_id: selectedDistrict.id,
      active_layer: activeLayer,
      active_year: activeYear,
      timeline_step: timelineStep,
      map_mode: mapMode
    })
      .then((res) => {
        setAiAnalysis({
          summary: res.explanation || res.risk_analysis,
          confidence: res.explainable_risk?.confidence ?? 92,
          trend: (() => {
            const distRanking = rankings.find(r => r.district_id === selectedDistrict.id);
            return distRanking?.trend === "Stable" ? "Stable" : distRanking?.trend === "Increasing" ? "Increasing" : "Decreasing";
          })(),
          drivers: res.explainable_risk?.drivers ?? [
            `Surface Temperature Anomaly: ${selectedMetrics.temperature?.toFixed(1)}°C`,
            `Precipitation: ${selectedMetrics.rainfall?.toFixed(0)}mm`,
            `Soil Moisture: ${selectedMetrics.soil_moisture?.toFixed(0)}%`
          ],
          actions: res.explainable_risk?.actions ?? res.recommended_actions ?? []
        });
      })
      .catch(() => {
        setAiAnalysis(null);
      })
      .finally(() => {
        setAiLoading(false);
      });
  }, [selectedDistrict, activeLayer, activeYear, timelineStep, mapMode, selectedMetrics]);


  // Build the search result suggestions
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return allDistricts.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (d.state_name ?? "").toLowerCase().includes(q)
    ).slice(0, 5);
  }, [allDistricts, searchQuery]);

  function handleSearchSelect(d: District) {
    setSelectedDistrictId(d.id);
    setSearchQuery(d.name);
    setShowSearchDropdown(false);

    if (mapRef.current) {
      mapRef.current.easeTo({
        center: [d.centroid_lon, d.centroid_lat],
        zoom: compact ? 4.5 : 5.8,
        duration: 1200
      });
    }
  }

  // Weather effects helper
  const weatherType = useMemo(() => {
    if (activeLayer === "rainfall" || activeLayer === "flood_risk") return "rain";
    if (activeLayer === "temperature" || activeLayer === "heatwave_risk") return "heat";
    if (activeLayer === "soil_moisture" || activeLayer === "ndvi" || activeLayer === "drought_risk") return "wind";
    return "none";
  }, [activeLayer]);

  // Rebuild GeoJSON features dynamically for Mapbox and SVG fallback
  const mappedFeatures = useMemo(() => {
    return features.map((f) => {
      const props = f.properties as Record<string, number | string>;
      const dId = Number(props.district_id);
      const val = getTimelineMetricValue(dId, activeLayer, rankings, allDistricts, [], timelineStep, features);
      return {
        ...f,
        properties: {
          ...props,
          active_val: val
        }
      };
    });
  }, [features, activeLayer, rankings, allDistricts, timelineStep]);

  // Mapbox GL initialization and updates
  const latestMapData = useRef({ activeLayer, mappedFeatures, statesGeoJson, compact });
  useEffect(() => {
    latestMapData.current = { activeLayer, mappedFeatures, statesGeoJson, compact };
  }, [activeLayer, mappedFeatures, statesGeoJson, compact]);

  useEffect(() => {
    if (!token || !mapNode.current || !data || mapRef.current) return;
    mapboxgl.accessToken = token;
    
    let initialStyle = "mapbox://styles/mapbox/dark-v11";
    if (mapMode === "satellite") initialStyle = "mapbox://styles/mapbox/satellite-v9";
    else if (mapMode === "terrain") initialStyle = "mapbox://styles/mapbox/outdoors-v12";
    else if (mapMode === "hybrid") initialStyle = "mapbox://styles/mapbox/satellite-streets-v12";

    const map = new mapboxgl.Map({
      container: mapNode.current,
      style: initialStyle,
      center: [78.9629, 22.5937],
      zoom: compact ? 3.2 : 4.2,
      attributionControl: false
    });
    mapRef.current = map;

    map.on("load", () => {
      if (!map.getSource("mapbox-dem")) {
        map.addSource("mapbox-dem", {
          type: "raster-dem",
          url: "mapbox://mapbox.mapbox-terrain-dem-v1",
          tileSize: 512,
          maxzoom: 14
        });
        map.setTerrain({ source: "mapbox-dem", exaggeration: 1.5 });
      }

      map.addSource("state-boundaries", {
        type: "geojson",
        data: statesGeoJson
      });

      map.addLayer({
        id: "state-fill",
        type: "fill",
        source: "state-boundaries",
        paint: {
          "fill-color": [
            "step",
            ["get", "active_val"],
            ...getMapboxColorSteps(activeLayer)
          ],
          "fill-opacity": 0.25
        }
      });

      map.addLayer({
        id: "state-line",
        type: "line",
        source: "state-boundaries",
        paint: {
          "line-color": "rgba(52, 211, 153, 0.15)",
          "line-width": 0.6
        }
      });

      map.addLayer({
        id: "state-highlight-fill",
        type: "fill",
        source: "state-boundaries",
        paint: {
          "fill-color": "rgba(34, 211, 238, 0.12)",
        },
        filter: ["==", "name", ""]
      });

      map.addLayer({
        id: "state-highlight-line",
        type: "line",
        source: "state-boundaries",
        paint: {
          "line-color": "rgba(34, 211, 238, 0.8)",
          "line-width": 2.5,
          "line-blur": 1.5
        },
        filter: ["==", "name", ""]
      });

      map.addSource("district-risk", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: mappedFeatures
        }
      });

      map.addLayer({
        id: "district-risk-fill",
        type: "circle",
        source: "district-risk",
        paint: {
          "circle-color": [
            "step",
            ["get", "active_val"],
            ...getMapboxColorSteps(activeLayer)
          ],
          "circle-radius": compact ? 7 : 9,
          "circle-opacity": 0.8,
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#ffffff"
        }
      });

      // Mousemove and mouseleave events for states in Mapbox GL
      map.on("mousemove", "state-fill", (e) => {
        if (e.features && e.features.length > 0) {
          map.getCanvas().style.cursor = "pointer";
          const feature = e.features[0];
          const name = feature.properties?.name;
          if (name) {
            setHoveredStateName(name);
            setHoverCoords({ x: e.point.x, y: e.point.y });
          }
        }
      });

      map.on("mouseleave", "state-fill", () => {
        map.getCanvas().style.cursor = "";
        setHoveredStateName(null);
        setHoverCoords(null);
      });

      map.on("click", "state-fill", (e) => {
        if (e.features && e.features.length > 0) {
          const feature = e.features[0];
          const name = feature.properties?.name;
          if (name) {
            setSelectedStateName(name);
            setTooltipCoords({ x: e.point.x, y: e.point.y });
            // Prevent map general click handler from running
            (e as any)._stateClick = true;
            // Zooming is now handled by the global useEffect
          }
        }
      });

      map.on("click", "district-risk-fill", (event) => {
        const feature = event.features?.[0];
        if (feature) {
          const props = feature.properties as Record<string, number | string>;
          setSelectedDistrictId(Number(props.district_id));
          // Close state tooltip when selecting a district
          setSelectedStateName(null);
          setTooltipCoords(null);
          (event as any)._stateClick = true;
        }
      });

      map.on("click", (e) => {
        if (!(e as any)._stateClick) {
          setSelectedStateName(null);
          setSelectedDistrictId(undefined);
          setTooltipCoords(null);
        }
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [compact, data, token, setSelectedDistrictId, statesGeoJson]);

  // Update Mapbox features when layer/timeline changes
  useEffect(() => {
    if (!mapRef.current) return;
    const source = mapRef.current.getSource("district-risk") as mapboxgl.GeoJSONSource;
    if (source) {
      source.setData({
        type: "FeatureCollection",
        features: mappedFeatures
      });
    }

    const stateSource = mapRef.current.getSource("state-boundaries") as mapboxgl.GeoJSONSource;
    if (stateSource) {
      stateSource.setData(statesGeoJson);
    }

    const colors = getMapboxColorSteps(activeLayer);

    // Set paint colors dynamically to match color mapping
    if (mapRef.current.getLayer("district-risk-fill")) {
      mapRef.current.setPaintProperty("district-risk-fill", "circle-color", [
        "step",
        ["get", "active_val"],
        ...colors
      ]);
    }

    if (mapRef.current.getLayer("state-fill")) {
      mapRef.current.setPaintProperty("state-fill", "fill-color", [
        "step",
        ["get", "active_val"],
        ...colors
      ]);
    }
  }, [mappedFeatures, statesGeoJson, activeLayer]);

  // Reactive state-hover updates for Mapbox GL layers (smooth opacity/width transitions)
  useEffect(() => {
    if (!mapRef.current) return;
    if (mapRef.current.getLayer("state-fill")) {
      mapRef.current.setPaintProperty("state-fill", "fill-opacity", [
        "case",
        ["==", ["get", "name"], hoveredStateName || ""],
        0.65, // Hover opacity
        0.25  // Default opacity
      ]);
    }
    if (mapRef.current.getLayer("state-line")) {
      mapRef.current.setPaintProperty("state-line", "line-width", [
        "case",
        ["==", ["get", "name"], hoveredStateName || ""],
        1.8,  // Hover outline width
        0.6   // Default outline width
      ]);
      mapRef.current.setPaintProperty("state-line", "line-color", [
        "case",
        ["==", ["get", "name"], hoveredStateName || ""],
        "#4DA8DA", // Hover outline color
        "rgba(52, 211, 153, 0.15)" // Default outline color
      ]);
    }
  }, [hoveredStateName]);

  // Handle dynamic map mode (style) changes for Mapbox
  const currentModeRef = useRef<string>(mapMode);
  useEffect(() => {
    if (!mapRef.current || !token) return;
    if (currentModeRef.current === mapMode) return;
    currentModeRef.current = mapMode;

    const map = mapRef.current;
    let newStyle = "mapbox://styles/mapbox/dark-v11";
    if (mapMode === "satellite") newStyle = "mapbox://styles/mapbox/satellite-v9";
    else if (mapMode === "terrain") newStyle = "mapbox://styles/mapbox/outdoors-v12";
    else if (mapMode === "hybrid") newStyle = "mapbox://styles/mapbox/satellite-streets-v12";

    map.once("style.load", () => {
      const { activeLayer, mappedFeatures, statesGeoJson, compact } = latestMapData.current;
      
      if (!map.getSource("mapbox-dem")) {
        map.addSource("mapbox-dem", {
          type: "raster-dem",
          url: "mapbox://mapbox.mapbox-terrain-dem-v1",
          tileSize: 512,
          maxzoom: 14
        });
        map.setTerrain({ source: "mapbox-dem", exaggeration: 1.5 });
      }

      if (!map.getSource("state-boundaries")) {
        map.addSource("state-boundaries", { type: "geojson", data: statesGeoJson });
        map.addLayer({
          id: "state-fill",
          type: "fill",
          source: "state-boundaries",
          paint: {
            "fill-color": [
              "step",
              ["get", "active_val"],
              ...getMapboxColorSteps(activeLayer)
            ],
            "fill-opacity": 0.25
          }
        });
        map.addLayer({
          id: "state-line",
          type: "line",
          source: "state-boundaries",
          paint: {
            "line-color": "rgba(52, 211, 153, 0.15)",
            "line-width": 0.6
          }
        });
      }

      if (!map.getSource("district-risk")) {
        map.addSource("district-risk", {
          type: "geojson",
          data: { type: "FeatureCollection", features: mappedFeatures }
        });
        map.addLayer({
          id: "district-risk-fill",
          type: "circle",
          source: "district-risk",
          paint: {
            "circle-color": [
              "step",
              ["get", "active_val"],
              ...getMapboxColorSteps(activeLayer)
            ],
            "circle-radius": compact ? 7 : 9,
            "circle-opacity": 0.8,
            "circle-stroke-width": 1.5,
            "circle-stroke-color": "#ffffff"
          }
        });
      }
    });

    map.setStyle(newStyle);
  }, [mapMode, token]);

  // Reactive panning to global selected district or state
  useEffect(() => {
    if (!mapRef.current) return;

    if (selectedDistrictId && allDistricts.length > 0) {
      const d = allDistricts.find((dist) => dist.id === selectedDistrictId);
      if (d) {
        mapRef.current.flyTo({
          center: [d.centroid_lon, d.centroid_lat],
          zoom: compact ? 6.5 : 7.8,
          duration: 1500,
          essential: true
        });
      }
    } else if (selectedStateName) {
      const stateObj = INDIA_STATES.find(s => s.name === selectedStateName);
      if (stateObj) {
        let minLon = 180, maxLon = -180, minLat = 90, maxLat = -90;
        stateObj.paths.forEach(path => {
          path.forEach(pt => {
            if (pt.lon < minLon) minLon = pt.lon;
            if (pt.lon > maxLon) maxLon = pt.lon;
            if (pt.lat < minLat) minLat = pt.lat;
            if (pt.lat > maxLat) maxLat = pt.lat;
          });
        });
        mapRef.current.fitBounds(
          [[minLon, minLat], [maxLon, maxLat]],
          { padding: 80, maxZoom: 8.5, duration: 1200, essential: true }
        );
      }
    } else {
      mapRef.current.flyTo({ center: [78.9629, 22.5937], zoom: compact ? 3.2 : 4.2, duration: 1000 });
    }
  }, [selectedDistrictId, selectedStateName, allDistricts, compact]);

  // Reactive Mapbox state highlighting
  useEffect(() => {
    if (!mapRef.current) return;
    if (mapRef.current.getLayer("state-highlight-fill")) {
      mapRef.current.setFilter("state-highlight-fill", ["==", "name", selectedStateName || ""]);
      mapRef.current.setFilter("state-highlight-line", ["==", "name", selectedStateName || ""]);
    }
  }, [selectedStateName]);

  const themeConfig = useMemo(() => {
    switch (mapMode) {
      case "satellite":
        return {
          bg: "bg-[radial-gradient(circle_at_center,rgba(11,35,30,0.60),transparent_60%),linear-gradient(135deg,#051009,#0a1b12)]",
          grid: "rgba(52,211,153,0.08)",
          gridText: "rgba(52,211,153,0.3)",
          boundaryStroke: "rgba(52, 211, 153, 0.45)",
          boundaryGlow: "rgba(52, 211, 153, 0.1)",
          stateStroke: "rgba(52, 211, 153, 0.18)"
        };
      case "terrain":
        return {
          bg: "bg-[radial-gradient(circle_at_center,rgba(50,40,20,0.40),transparent_60%),linear-gradient(135deg,#120f09,#1e1810)]",
          grid: "rgba(217,119,6,0.06)",
          gridText: "rgba(217,119,6,0.25)",
          boundaryStroke: "rgba(217, 119, 6, 0.45)",
          boundaryGlow: "rgba(217, 119, 6, 0.1)",
          stateStroke: "rgba(217, 119, 6, 0.18)"
        };
      case "hybrid":
        return {
          bg: "bg-[radial-gradient(circle_at_center,rgba(30,20,50,0.50),transparent_60%),linear-gradient(135deg,#0a0512,#140a24)]",
          grid: "rgba(167,139,250,0.06)",
          gridText: "rgba(167,139,250,0.25)",
          boundaryStroke: "rgba(167, 139, 250, 0.45)",
          boundaryGlow: "rgba(167, 139, 250, 0.1)",
          stateStroke: "rgba(167, 139, 250, 0.18)"
        };
      case "streets":
      default:
        return {
          bg: "bg-[radial-gradient(circle_at_center,rgba(6,25,44,0.60),transparent_48%),linear-gradient(135deg,#030914,#081c2e)]",
          grid: "rgba(34,211,238,0.04)",
          gridText: "rgba(34,211,238,0.2)",
          boundaryStroke: "rgba(52, 211, 153, 0.35)", // Using the existing emerald color for default boundary
          boundaryGlow: "rgba(52, 211, 153, 0.08)",
          stateStroke: "rgba(52, 211, 153, 0.12)"     // Using the existing emerald color for default state
        };
    }
  }, [mapMode]);

  return (
    <div className={`relative w-full overflow-hidden rounded-2xl border border-white/[0.08] bg-background ${compact ? "h-full" : "h-[calc(100vh-112px)]"}`}>
      {/* Map Content Container */}
      <div className="relative w-full h-full">
        {token ? (
          <div ref={mapNode} className="w-full h-full" />
        ) : (
          /* Premium Fallback Geographic Vector Map */
          <div 
            onClick={() => {
              setSelectedStateName(null);
              setTooltipCoords(null);
            }}
            className={`relative w-full h-full overflow-hidden ${themeConfig.bg} select-none transition-colors duration-700`}
          >
            <div className="absolute inset-0 bg-radar-grid bg-[size:40px_40px] opacity-25" />
            
            <svg
              width="100%"
              height="100%"
              viewBox={`0 0 ${SVG_W} ${SVG_H}`}
              className="absolute inset-0 w-full h-full p-6 transition-colors duration-700"
              onMouseMove={(e) => {
                if (!selectedStateName) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setHoverCoords({
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top
                  });
                }
              }}
              onMouseLeave={() => setHoverCoords(null)}
            >
              <g style={{ transform: zoomTransform, transition: 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)', transformOrigin: 'center' }}>
              {/* SVG Map Projection Grid Lines */}
              {[70, 75, 80, 85, 90, 95].map((lon) => {
                const x = lonToX(lon, 22.5);
                return (
                  <g key={`lon-${lon}`}>
                    <line
                      x1={x}
                      y1={15}
                      x2={x}
                      y2={SVG_H - 15}
                      stroke={themeConfig.grid}
                      strokeWidth={0.8}
                      strokeDasharray="3 5"
                      className="transition-colors duration-700"
                    />
                    <text
                      x={x}
                      y={SVG_H - 5}
                      fontSize={6}
                      fill={themeConfig.gridText}
                      textAnchor="middle"
                      fontFamily="monospace"
                      className="transition-colors duration-700"
                    >
                      {lon}°E
                    </text>
                  </g>
                );
              })}
              {[10, 15, 20, 25, 30, 35].map((lat) => {
                const y = latToY(lat);
                return (
                  <g key={`lat-${lat}`}>
                    <line
                      x1={15}
                      y1={y}
                      x2={SVG_W - 15}
                      y2={y}
                      stroke={themeConfig.grid}
                      strokeWidth={0.8}
                      strokeDasharray="3 5"
                      className="transition-colors duration-700"
                    />
                    <text
                      x={5}
                      y={y + 1.8}
                      fontSize={6}
                      fill={themeConfig.gridText}
                      textAnchor="start"
                      fontFamily="monospace"
                      className="transition-colors duration-700"
                    >
                      {lat}°N
                    </text>
                  </g>
                );
              })}

              {/* Geographic States outlines */}
              {INDIA_STATES.map((state) => {
                const stateVal = getStateMetricValue(state.name, activeLayer, rankings, allDistricts, timelineStep, features);
                const stateColor = getLayerColor(activeLayer, stateVal);
                return (
                  <g key={state.name} id={`fallback-state-${state.name.toLowerCase().replace(/\s+/g, '-')}`}>
                    {state.paths.map((path, idx) => {
                      const pathData = path
                        .map((pt, i) => {
                          const x = lonToX(pt.lon, pt.lat);
                          const y = latToY(pt.lat);
                          return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
                        })
                        .join(" ") + " Z";
                      return (
                        <path
                          key={idx}
                          d={pathData}
                          fill={stateColor}
                          fillOpacity={hoveredStateName === state.name ? 0.65 : (selectedStateName === state.name ? 0.8 : 0.25)}
                          stroke={hoveredStateName === state.name ? "#4DA8DA" : (selectedStateName === state.name ? "#22d3ee" : themeConfig.stateStroke)}
                          strokeWidth={hoveredStateName === state.name ? 1.5 : (selectedStateName === state.name ? 2.5 : 0.6)}
                          filter={selectedStateName === state.name ? "drop-shadow(0px 0px 4px rgba(34, 211, 238, 0.6))" : "none"}
                          strokeLinejoin="round"
                          className="transition-all duration-300 cursor-pointer"
                          onMouseEnter={() => setHoveredStateName(state.name)}
                          onMouseLeave={() => {
                            setHoveredStateName(null);
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            const rect = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
                            if (rect) {
                              setSelectedStateName(state.name);
                              setTooltipCoords({
                                x: e.clientX - rect.left,
                                y: e.clientY - rect.top
                              });
                            }
                          }}
                        />
                      );
                    })}
                  </g>
                );
              })}

              {/* Complete Outer Boundary of India */}
              {(() => {
                const pathData = INDIA_OUTLINE
                  .map((pt, i) => {
                     const x = lonToX(pt.lon, pt.lat);
                     const y = latToY(pt.lat);
                     return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
                  })
                  .join(" ") + " Z";

                return (
                  <>
                    <path
                      d={pathData}
                      fill="rgba(52, 211, 153, 0.01)"
                      stroke={themeConfig.boundaryStroke}
                      strokeWidth={1.5}
                      strokeLinejoin="round"
                      style={{ pointerEvents: "none" }}
                      className="transition-colors duration-700"
                    />
                    <path
                      d={pathData}
                      fill="none"
                      stroke={themeConfig.boundaryGlow}
                      strokeWidth={1.5}
                      strokeLinejoin="round"
                      filter="url(#glow-fallback)"
                      style={{ pointerEvents: "none" }}
                      className="transition-colors duration-700"
                    />
                    <defs>
                      <filter id="glow-fallback" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3.5" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>
                  </>
                );
              })()}

              {/* Sri Lanka Fallback shape */}
              {(() => {
                const sriLanka = [
                  { lat: 9.8, lon: 80.0 },
                  { lat: 8.0, lon: 79.7 },
                  { lat: 6.0, lon: 80.2 },
                  { lat: 6.2, lon: 81.2 },
                  { lat: 7.5, lon: 81.8 },
                  { lat: 9.5, lon: 80.8 },
                  { lat: 9.8, lon: 80.0 }
                ];
                const pathData = sriLanka
                  .map((pt, i) => {
                    const x = lonToX(pt.lon, pt.lat);
                    const y = latToY(pt.lat);
                    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
                  })
                  .join(" ") + " Z";
                return (
                  <path
                    d={pathData}
                    fill="rgba(52, 211, 153, 0.03)"
                    stroke="rgba(52, 211, 153, 0.15)"
                    strokeWidth={1}
                    strokeLinejoin="round"
                  />
                );
              })()}

              {/* Interactive district markers */}
              {allDistricts.map((d) => {
                const x = lonToX(d.centroid_lon, d.centroid_lat);
                const y = latToY(d.centroid_lat);
                const isSelected = d.id === selectedDistrictId;
                
                const val = getTimelineMetricValue(d.id, activeLayer, rankings, allDistricts, [], timelineStep);
                const color = getLayerColor(activeLayer, val);

                return (
                  <g 
                    key={d.id} 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedDistrictId(d.id);
                      setSelectedStateName(null);
                      setTooltipCoords(null);
                    }} 
                    className="cursor-pointer"
                  >
                    {/* Animated High-Risk Radar Ping */}
                    {val > 75 && (
                      <circle
                        cx={x}
                        cy={y}
                        r={isSelected ? 11 : 6.5}
                        fill="transparent"
                        stroke={color}
                        strokeWidth={1}
                        className="animate-ping opacity-75"
                        style={{ animationDuration: '2.5s' }}
                      />
                    )}
                    <circle
                      cx={x}
                      cy={y}
                      r={isSelected ? 11 : 6.5}
                      fill={`${color}40`}
                      stroke={isSelected ? "#4DA8DA" : "rgba(255,255,255,0.15)"}
                      strokeWidth={isSelected ? 1.8 : 0.8}
                      className="transition-all duration-300"
                    />
                    <circle
                      cx={x}
                      cy={y}
                      r={isSelected ? 4.5 : 2.5}
                      fill={color}
                      className="transition-all duration-300"
                    />
                    
                    {/* Weather Condition Icons (Only show for a few major cities to prevent clutter) */}
                    {(!isSelected && [1, 2, 3, 5, 8, 12, 16, 21].includes(d.id)) && (() => {
                      const rain = getTimelineMetricValue(d.id, "rainfall", rankings, allDistricts, [], timelineStep);
                      const temp = getTimelineMetricValue(d.id, "temperature", rankings, allDistricts, [], timelineStep);
                      let Icon = CloudRain;
                      let iconColor = "#3b82f6";
                      if (rain < 10) {
                        if (temp > 35) { Icon = Thermometer; iconColor = "#ef4444"; }
                        else if (temp > 25) { Icon = Sun; iconColor = "#fbbf24"; }
                        else { Icon = Sun; iconColor = "#fde047"; }
                      }
                      return (
                        <foreignObject x={x - 12} y={y - 18} width={12} height={12}>
                          <div className="flex items-center justify-center w-full h-full bg-background/80 backdrop-blur rounded-full border border-white/[0.08] shadow-sm">
                            <Icon color={iconColor} size={7} strokeWidth={3} />
                          </div>
                        </foreignObject>
                      );
                    })()}
                  </g>
                );
              })}
              </g>
            </svg>
          </div>
        )}

        {/* Hover Tooltip (Instant Preview) */}
        {!selectedStateName && hoveredStateName && hoverCoords && (
          <div 
            className="absolute z-[1000] pointer-events-none transition-all duration-75 ease-out select-none"
            style={{ 
              left: `${hoverCoords.x + 15}px`, 
              top: `${hoverCoords.y + 15}px`,
            }}
          >
            <div className="glass-panel backdrop-blur-md bg-background/90 border border-white/[0.08] rounded-xl p-2.5 shadow-xl w-[140px]">
              <span className="font-bold text-[10px] text-white block mb-1.5">{hoveredStateName}</span>
              <div className="grid grid-cols-2 gap-1.5 text-[8px]">
                <div>
                  <span className="text-muted-foreground block text-[7px] uppercase">Temp</span>
                  <span className="font-mono text-brand-titanium">{getStateMetricValue(hoveredStateName, "temperature", rankings, allDistricts, timelineStep, features).toFixed(1)}°C</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[7px] uppercase">Rain</span>
                  <span className="font-mono text-brand-titanium">{getStateMetricValue(hoveredStateName, "rainfall", rankings, allDistricts, timelineStep, features).toFixed(0)} mm</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[7px] uppercase">AQI</span>
                  <span className="font-mono text-brand-titanium">{getStateMetricValue(hoveredStateName, "aqi", rankings, allDistricts, timelineStep, features).toFixed(0)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[7px] uppercase">Risk</span>
                  <span className="font-mono text-rose-400">{getStateMetricValue(hoveredStateName, "composite_risk", rankings, allDistricts, timelineStep, features).toFixed(0)}%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Floating Tooltip Cloud for State Click */}
        {selectedStateName && tooltipCoords && (
          <div 
            className="absolute z-[1000] pointer-events-auto transition-all duration-75 ease-out select-none"
            style={{ 
              left: `${tooltipCoords.x + 15}px`, 
              top: `${tooltipCoords.y + 15}px`,
              transform: `translate(${tooltipCoords.x > 350 ? -240 : 0}px, ${tooltipCoords.y > 300 ? -200 : 0}px)`
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="glass-panel backdrop-blur-md bg-background/90 border border-white/[0.08] rounded-2xl p-3.5 shadow-2xl shadow-black/50 shadow-none w-[210px] space-y-2.5">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-1.5">
                <span className="font-bold text-xs text-white leading-none tracking-wide">{selectedStateName}</span>
                <button
                  onClick={() => {
                    setSelectedStateName(null);
                    setSelectedDistrictId(undefined);
                    setTooltipCoords(null);
                  }}
                  className="text-muted-foreground hover:text-white transition"
                  aria-label="Close state tooltip"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              
              {/* Weather Stats Grid */}
              <div className="grid grid-cols-2 gap-2 text-[9px]">
                <div className="flex flex-col bg-white/[0.02] border border-white/[0.08] rounded p-1.5">
                  <span className="text-muted-foreground font-semibold uppercase text-[7.5px]">Temperature</span>
                  <span className="font-mono font-bold text-brand-titanium mt-0.5">
                    {getStateMetricValue(selectedStateName, "temperature", rankings, allDistricts, timelineStep, features).toFixed(1)}°C
                  </span>
                </div>
                <div className="flex flex-col bg-white/[0.02] border border-white/[0.08] rounded p-1.5">
                  <span className="text-muted-foreground font-semibold uppercase text-[7.5px]">Rainfall</span>
                  <span className="font-mono font-bold text-brand-titanium mt-0.5">
                    {getStateMetricValue(selectedStateName, "rainfall", rankings, allDistricts, timelineStep, features).toFixed(0)} mm
                  </span>
                </div>
                <div className="flex flex-col bg-white/[0.02] border border-white/[0.08] rounded p-1.5">
                  <span className="text-muted-foreground font-semibold uppercase text-[7.5px]">AQI</span>
                  <span className="font-mono font-bold text-brand-titanium mt-0.5">
                    {getStateMetricValue(selectedStateName, "aqi", rankings, allDistricts, timelineStep, features).toFixed(0)}
                  </span>
                </div>
                <div className="flex flex-col bg-white/[0.02] border border-white/[0.08] rounded p-1.5">
                  <span className="text-muted-foreground font-semibold uppercase text-[7.5px]">Risk Index</span>
                  <span className="font-mono font-bold text-rose-400 mt-0.5">
                    {getStateMetricValue(selectedStateName, "composite_risk", rankings, allDistricts, timelineStep, features).toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Dynamic Forecast Summary */}
              <div className="border-t border-white/[0.08] pt-2 text-[9px] text-secondary-foreground leading-normal font-sans italic">
                {getStateForecastText(
                  selectedStateName,
                  activeLayer,
                  getStateMetricValue(selectedStateName, activeLayer, rankings, allDistricts, timelineStep, features),
                  activeYear
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── Weather Effects Layer ────────────────────────────────── */}
        {weatherType !== "none" && <WeatherEffects type={weatherType} />}

        {/* ─── FLOATING UI OVERLAYS ──────────────────────────────────── */}

        {/* 1. Select Region Button */}
        {!compact && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 pointer-events-auto">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setShowSelector(true)}
              className="border border-white/[0.08] bg-background/85 hover:bg-surface text-brand-titanium text-xs rounded-full flex items-center gap-1.5 px-4.5 py-1.5 shadow-lg shadow-none transition-all"
            >
              <LocateFixed className="h-3.5 w-3.5 text-brand-blue" />
              <span>Select Region</span>
            </Button>
          </div>
        )}

        {/* 2. Floating Layer Control Panel */}
        {!compact && (
          <div className="absolute top-4 left-4 z-20 max-w-[155px] md:max-w-[185px] pointer-events-auto">
            <div className="bg-background/85 backdrop-blur border border-white/[0.08] rounded-lg overflow-hidden shadow-lg">
              <button
                onClick={() => setIsLayerPanelExpanded(!isLayerPanelExpanded)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider text-brand-titanium hover:bg-surface-elevated border-b border-white/[0.08] transition"
              >
                <span>Thematic Feed</span>
                <Layers className="h-3.5 w-3.5" />
              </button>
              {isLayerPanelExpanded && (
                <div className="p-1 max-h-56 overflow-y-auto space-y-2 select-none text-[9.5px] scrollbar-thin">
                  <div>
                    <p className="px-2 py-0.5 text-[7.5px] font-bold text-muted-foreground uppercase tracking-widest">Risk Models</p>
                    <div className="mt-0.5 space-y-0.5">
                      {["composite_risk", "flood_risk", "heatwave_risk", "drought_risk", "water_stress_risk"].map((lyr) => (
                        <button
                          key={lyr}
                          onClick={() => setActiveLayer(lyr)}
                          title={`Display ${layerMeta[lyr]?.label} distribution map`}
                          className={`w-full flex items-center justify-between text-left px-2 py-1 rounded transition ${
                            activeLayer === lyr
                              ? "bg-brand-blue/10 text-brand-titanium font-semibold"
                              : "text-secondary-foreground hover:bg-white/5"
                          }`}
                        >
                          <span>{layerMeta[lyr]?.label}</span>
                          {activeLayer === lyr && <div className="h-1.5 w-1.5 rounded-full bg-brand-blue" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="px-2 py-0.5 text-[7.5px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Climate Observations</p>
                    <div className="mt-0.5 space-y-0.5">
                      {["rainfall", "temperature", "aqi", "humidity", "soil_moisture", "ndvi"].map((lyr) => (
                        <button
                          key={lyr}
                          onClick={() => setActiveLayer(lyr)}
                          title={`Display real-time ${layerMeta[lyr]?.label} data layer`}
                          className={`w-full flex items-center justify-between text-left px-2 py-1 rounded transition ${
                            activeLayer === lyr
                              ? "bg-brand-blue/10 text-brand-titanium font-semibold"
                              : "text-secondary-foreground hover:bg-white/5"
                          }`}
                        >
                          <span>{layerMeta[lyr]?.label}</span>
                          {activeLayer === lyr && <div className="h-1.5 w-1.5 rounded-full bg-brand-blue" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="px-2 py-0.5 text-[7.5px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Infrastructures</p>
                    <div className="mt-0.5 space-y-0.5">
                      {["reservoir_level", "river_level", "population_density"].map((lyr) => (
                        <button
                          key={lyr}
                          onClick={() => setActiveLayer(lyr)}
                          title={`Display ${layerMeta[lyr]?.label} infrastructure layer`}
                          className={`w-full flex items-center justify-between text-left px-2 py-1 rounded transition ${
                            activeLayer === lyr
                              ? "bg-brand-blue/10 text-brand-titanium font-semibold"
                              : "text-secondary-foreground hover:bg-white/5"
                          }`}
                        >
                          <span>{layerMeta[lyr]?.label}</span>
                          {activeLayer === lyr && <div className="h-1.5 w-1.5 rounded-full bg-brand-blue" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. Map Mode Toggles */}
        {!compact && (
          <div className="absolute top-4 right-4 z-20 flex bg-background/85 backdrop-blur border border-white/[0.08] rounded-full p-0.5 shadow-lg select-none pointer-events-auto">
            {[
              { id: "streets", label: "Map" },
              { id: "satellite", label: "Satellite" },
              { id: "terrain", label: "Terrain" },
              { id: "hybrid", label: "Hybrid" }
            ].map((mode) => (
              <button
                key={mode.id}
                onClick={() => setMapMode(mode.id)}
                className={`px-3 py-1 rounded-full text-[9px] font-medium tracking-wide transition ${
                  mapMode === mode.id
                    ? "bg-brand-blue text-slate-950 font-bold"
                    : "text-secondary-foreground hover:text-white"
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        )}

        {/* 4. Map Legend */}
        {!compact && (
          <div className="absolute bottom-4 left-4 z-20 p-3 bg-background/85 backdrop-blur border border-white/[0.08] rounded-lg max-w-[200px] shadow-lg pointer-events-auto">
            <p className="text-[10px] font-bold uppercase tracking-wider text-brand-titanium">
              {layerMeta[activeLayer]?.label || "Layer Details"}
            </p>
            <p className="text-[9px] text-muted-foreground mt-0.5">
              Unit: {layerMeta[activeLayer]?.unit || "N/A"}
            </p>
            <div className="mt-2 space-y-1">
              {layerMeta[activeLayer]?.ranges.map((range, idx) => {
                const color = layerMeta[activeLayer]?.colors[idx] || "#4DA8DA";

                return (
                  <div key={idx} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-[9px] text-secondary-foreground leading-none">{range}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 5. Live Telemetry Status Card */}
        {!compact && (
          <div className="absolute bottom-4 right-4 z-20 p-2.5 bg-background/85 backdrop-blur border border-white/[0.08] rounded-lg text-[9px] shadow-lg max-w-[150px] pointer-events-auto">
            <div className="flex items-center gap-1.5 font-bold uppercase text-brand-titanium">
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-blue opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-brand-blue"></span>
              </span>
              Live Status
            </div>
            <div className="mt-1.5 pt-1.5 border-t border-white/[0.08] space-y-1 text-secondary-foreground select-none">
              <div className="flex justify-between">
                <span>Database:</span>
                <span className="text-brand-blue font-semibold">ONLINE</span>
              </div>
              <div className="flex justify-between">
                <span>AI Core:</span>
                <span className="text-brand-blue font-semibold">ONLINE</span>
              </div>
              <div className="flex justify-between">
                <span>IMD Feed:</span>
                <span className="text-brand-blue font-semibold">SYNCED</span>
              </div>
            </div>
          </div>
        )}

        {/* 6. Timeline Projection Slider */}
        {!compact && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20 w-64 md:w-[360px] bg-background/85 backdrop-blur border border-white/[0.08] rounded-full px-4 py-2.5 shadow-lg flex items-center gap-3 select-none pointer-events-auto">
            <div className="text-[9px] font-bold uppercase tracking-wider text-brand-titanium whitespace-nowrap">
              Timeline
            </div>
            <div className="flex-1 flex justify-between gap-1 items-center relative">
              <div className="absolute left-1.5 right-1.5 h-0.5 bg-surface-elevated" />
              <div
                className="absolute left-1.5 h-0.5 bg-brand-blue"
                style={{
                  width: `${
                    timelineStep === "today" ? 0 :
                    timelineStep === "tomorrow" ? 25 :
                    timelineStep === "7d" ? 50 :
                    timelineStep === "30d" ? 75 : 100
                  }%`
                }}
              />
              {[
                { id: "today", label: "Today" },
                { id: "tomorrow", label: "Tomorrow" },
                { id: "7d", label: "7 Days" },
                { id: "30d", label: "30 Days" },
                { id: "2030", label: "2030" }
              ].map((step) => (
                <button
                  key={step.id}
                  onClick={() => setTimelineStep(step.id)}
                  className="relative z-10 flex flex-col items-center group focus:outline-none"
                >
                  <span
                    className={`w-2.5 h-2.5 rounded-full border border-slate-700 transition ${
                      timelineStep === step.id
                        ? "bg-brand-blue scale-125 border-emerald-400 shadow-[0_0_8px_#4DA8DA]"
                        : "bg-background group-hover:bg-surface-elevated"
                    }`}
                  />
                  <span
                    className={`absolute top-4 text-[8px] transition font-medium ${
                      timelineStep === step.id
                        ? "text-brand-titanium font-bold scale-105"
                        : "text-muted-foreground group-hover:text-secondary-foreground"
                    }`}
                  >
                    {step.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 7. Locate Trigger Button (Moved to Center) */}
      </div>

      {/* ─── SLIDING DISTRICT INFORMATION SIDEBAR PANEL ──────────────── */}
      <div
        className={`fixed inset-y-0 right-0 z-[100] w-full sm:w-[420px] bg-background/95 border-l border-white/[0.08] backdrop-blur shadow-2xl transition-transform duration-300 ease-in-out transform ${
          selectedDistrictId ? "translate-x-0" : "translate-x-full"
        } flex flex-col`}
      >
        {/* Panel Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] p-4 shrink-0">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-blue">
              District Cockpit ({activeYear})
            </span>
            <h3 className="text-lg font-bold text-white mt-0.5">
              {selectedDistrict?.name || "Select District"}
            </h3>
            <p className="text-xs text-muted-foreground">
              {selectedDistrict?.state_name || "National view"} State
            </p>
          </div>
          <button
            onClick={() => setSelectedDistrictId(undefined)}
            className="grid h-7 w-7 place-items-center rounded-md border border-white/[0.08] bg-white/5 text-muted-foreground hover:text-white transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Panel Scroll Container */}
        {selectedMetrics ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-5 scrollbar-thin">
            {/* Primary Demographics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/[0.02] border border-white/[0.08] rounded-lg p-2.5">
                <p className="text-[9px] text-muted-foreground font-semibold uppercase">Population</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Users className="h-3.5 w-3.5 text-brand-blue" />
                  <span className="text-xs font-bold text-white font-mono">
                    {selectedDistrict?.population?.toLocaleString() || "N/A"}
                  </span>
                </div>
              </div>
              <div className="bg-white/[0.02] border border-white/[0.08] rounded-lg p-2.5">
                <p className="text-[9px] text-muted-foreground font-semibold uppercase">Total Area</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Compass className="h-3.5 w-3.5 text-brand-blue" />
                  <span className="text-xs font-bold text-white font-mono">
                    {selectedDistrict?.area_sq_km?.toLocaleString() || "N/A"} km²
                  </span>
                </div>
              </div>
            </div>

            {/* Risk Gauges */}
            <div className="space-y-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-brand-titanium">
                Risk Modeling Profiles
              </p>
              <div className="space-y-2 bg-white/[0.01] border border-white/[0.08] p-3 rounded-lg">
                {[
                  { key: "composite_risk", label: "Composite Risk Index" },
                  { key: "flood_risk", label: "Flood Inundation Risk" },
                  { key: "heatwave_risk", label: "Extreme Heatwaves Risk" },
                  { key: "drought_risk", label: "Agricultural Drought Risk" },
                  { key: "water_stress_risk", label: "Hydrologic Water Stress" }
                ].map((item) => {
                  const val = selectedMetrics[item.key] || 0;
                  const fill = riskFill(val);
                  return (
                    <div key={item.key}>
                      <div className="flex justify-between text-[10px] font-medium mb-1">
                        <span className="text-secondary-foreground">{item.label}</span>
                        <span className="font-bold font-mono" style={{ color: fill }}>
                          {val.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${val}%`,
                            backgroundColor: fill,
                            boxShadow: `0 0 6px ${fill}90`
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Environmental Feeds Grid */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-brand-titanium">
                Telemetry Observations
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { icon: Thermometer, label: "Temperature", val: selectedMetrics.temperature, unit: "°C", color: "text-brand-blue", source: "IMD" },
                  { icon: Droplets, label: "Humidity", val: selectedMetrics.humidity, unit: "%", color: "text-blue-400", source: "IMD" },
                  { icon: CloudRain, label: "Rainfall", val: selectedMetrics.rainfall, unit: " mm", color: "text-brand-blue", source: "IMD" },
                  { icon: Activity, label: "AQI Index", val: selectedMetrics.aqi, unit: "", color: "text-brand-blue", source: "CPCB" },
                  { icon: Droplets, label: "Soil Moisture", val: selectedMetrics.soil_moisture, unit: "%", color: "text-lime-400", source: "NRSC" },
                  { icon: Sun, label: "Vegetation NDVI", val: selectedMetrics.ndvi, unit: "", color: "text-green-400", source: "NRSC" },
                  { icon: Shield, label: "Reservoir Level", val: selectedMetrics.reservoir_level, unit: "%", color: "text-brand-blue", source: "India-WRIS" },
                  { icon: AlertTriangle, label: "River Discharge", val: selectedMetrics.river_level, unit: "m", color: "text-brand-titanium", source: "CWC" }
                ].map((item, idx) => (
                  <div key={idx} className="bg-surface/60 border border-white/[0.08] rounded-lg p-2 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] font-bold text-muted-foreground uppercase">{item.label}</span>
                      <item.icon className={`h-3 w-3 ${item.color}`} />
                    </div>
                    <div className="mt-1.5 flex justify-between items-end">
                      <div>
                        <span className="text-xs font-bold text-white font-mono">
                          {typeof item.val === "number" ? item.val.toFixed(item.label.includes("NDVI") || item.label.includes("River") ? 2 : 0) : "N/A"}
                        </span>
                        <span className="text-[9px] text-muted-foreground ml-0.5">{item.unit}</span>
                      </div>
                      {item.source && <span className="text-[7px] text-muted-foreground/80 font-bold uppercase" title={`Source: ${item.source}`}>{item.source}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Climate Analysis Panel */}
            {aiLoading ? (
              <div className="text-xs text-muted-foreground py-6 text-center animate-pulse">
                Consulting AI Command Core...
              </div>
            ) : aiAnalysis ? (
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-brand-titanium">
                  AI Cognitive Insights
                </p>
                <div className="bg-brand-blue/[0.02] border border-white/[0.08] rounded-lg p-3 space-y-3">
                  <div className="flex items-center justify-between text-[10px] font-medium">
                    <span className="text-muted-foreground">Confidence Score:</span>
                    <span className="text-brand-titanium font-mono font-bold bg-surface-elevated px-1.5 py-0.5 rounded">
                      {aiAnalysis.confidence}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-medium">
                    <span className="text-muted-foreground">Risk Trend Profile:</span>
                    <div className="flex items-center gap-1 text-xs">
                      {aiAnalysis.trend === "Increasing" ? (
                        <span className="flex items-center text-rose-400 font-bold gap-0.5">
                          <TrendingUp className="h-3 w-3" />
                          Increasing
                        </span>
                      ) : aiAnalysis.trend === "Decreasing" ? (
                        <span className="flex items-center text-brand-blue font-bold gap-0.5">
                          <TrendingDown className="h-3 w-3" />
                          Decreasing
                        </span>
                      ) : (
                        <span className="text-brand-blue font-bold">Stable</span>
                      )}
                    </div>
                  </div>

                  <div className="text-[10px] leading-relaxed text-secondary-foreground border-t border-white/[0.08] pt-2 bg-background/40 p-2 rounded">
                    {aiAnalysis.summary}
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-brand-blue/90 uppercase">Risk Drivers</span>
                    <div className="space-y-0.5">
                      {aiAnalysis.drivers.map((drv, idx) => (
                        <div key={idx} className="text-[9.5px] text-secondary-foreground flex items-start gap-1">
                          <span className="text-brand-blue mt-0.5">•</span>
                          <span>{drv}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1 border-t border-white/[0.08] pt-2.5">
                    <span className="text-[9px] font-bold text-brand-blue/90 uppercase">Recommended Actions</span>
                    <div className="space-y-1">
                      {aiAnalysis.actions.map((act, idx) => (
                        <div key={idx} className="text-[9.5px] text-secondary-foreground flex items-start gap-1">
                          <span className="text-brand-blue mt-0.5">⚠</span>
                          <span>{act}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Mini Analytics sparklines */}
            {districtHistory.length > 0 && (
              <div className="space-y-2 border-t border-white/[0.08] pt-3 select-none">
                <p className="text-[10px] font-bold uppercase tracking-wider text-brand-titanium">
                  Analytics & Trends (12 Months)
                </p>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="bg-surface/40 border border-white/[0.08] rounded-lg p-2.5 flex items-center justify-between">
                    <div>
                      <p className="text-[8px] font-bold text-muted-foreground uppercase">Temp Trend</p>
                      <p className="text-[10px] text-secondary-foreground font-mono mt-1">Avg 28°C</p>
                    </div>
                    <Sparkline data={districtHistory.map((h) => h.temperature_c)} color="#fbbf24" />
                  </div>
                  <div className="bg-surface/40 border border-white/[0.08] rounded-lg p-2.5 flex items-center justify-between">
                    <div>
                      <p className="text-[8px] font-bold text-muted-foreground uppercase">Rain Trend</p>
                      <p className="text-[10px] text-secondary-foreground font-mono mt-1">Monsoon Peak</p>
                    </div>
                    <Sparkline data={districtHistory.map((h) => h.rainfall_mm)} color="#3b82f6" />
                  </div>
                  <div className="bg-surface/40 border border-white/[0.08] rounded-lg p-2.5 flex items-center justify-between">
                    <div>
                      <p className="text-[8px] font-bold text-muted-foreground uppercase">AQI Trend</p>
                      <p className="text-[10px] text-secondary-foreground font-mono mt-1">Max 145</p>
                    </div>
                    <Sparkline data={districtHistory.map((h) => h.aqi)} color="#22C55E" />
                  </div>
                  <div className="bg-surface/40 border border-white/[0.08] rounded-lg p-2.5 flex items-center justify-between">
                    <div>
                      <p className="text-[8px] font-bold text-muted-foreground uppercase">Risk Index</p>
                      <p className="text-[10px] text-secondary-foreground font-mono mt-1">Stable</p>
                    </div>
                    <Sparkline data={rankings.map((r) => r.composite_risk)} color="#ef4444" />
                  </div>
                </div>
              </div>
            )}

            <div className="text-[9px] text-center text-muted-foreground border-t border-white/[0.08] pt-3 flex flex-wrap justify-center gap-1.5">
              <span>Last updated: Just now</span>
              <span className="text-slate-600">|</span>
              <span>Sources: IMD, NRSC, CPCB, CWC, India-WRIS</span>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8 text-center text-muted-foreground">
            {historyLoading ? "Loading district observation history..." : "Select a district to initialize telemetry streams."}
          </div>
        )}
      </div>

      {/* Region Selector Modal */}
      {showSelector && (
        <RegionSelectorModal
          districts={allDistricts}
          features={features}
          onSelect={(feature) => {
            const props = feature.properties as Record<string, number | string>;
            setSelectedDistrictId(Number(props.district_id));
          }}
          onClose={() => setShowSelector(false)}
        />
      )}
    </div>
  );
}
