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
const layerMeta: Record<string, { label: string; unit: string; min: number; max: number; ranges: string[] }> = {
  composite_risk: { label: "Composite Risk", unit: "%", min: 0, max: 100, ranges: ["Safe (<35)", "Moderate (35-60)", "High (60-80)", "Critical (>=80)"] },
  flood_risk: { label: "Flood Risk", unit: "%", min: 0, max: 100, ranges: ["Safe (<35)", "Moderate (35-60)", "High (60-80)", "Critical (>=80)"] },
  heatwave_risk: { label: "Heatwave Risk", unit: "%", min: 0, max: 100, ranges: ["Safe (<35)", "Moderate (35-60)", "High (60-80)", "Critical (>=80)"] },
  drought_risk: { label: "Drought Risk", unit: "%", min: 0, max: 100, ranges: ["Safe (<35)", "Moderate (35-60)", "High (60-80)", "Critical (>=80)"] },
  water_stress_risk: { label: "Water Stress", unit: "%", min: 0, max: 100, ranges: ["Safe (<35)", "Moderate (35-60)", "High (60-80)", "Critical (>=80)"] },
  rainfall: { label: "Rainfall", unit: " mm", min: 0, max: 600, ranges: ["Light (<50)", "Moderate (50-150)", "Heavy (150-300)", "Torrential (>=300)"] },
  temperature: { label: "Temperature", unit: " °C", min: 0, max: 50, ranges: ["Cold (<20)", "Mild (20-28)", "Warm (28-36)", "Extreme (>=36)"] },
  aqi: { label: "Air Quality Index", unit: "", min: 0, max: 300, ranges: ["Good (<50)", "Moderate (50-100)", "Unhealthy (100-150)", "Hazardous (>=150)"] },
  humidity: { label: "Humidity", unit: "%", min: 0, max: 100, ranges: ["Dry (<40)", "Normal (40-70)", "Humid (>=70)"] },
  soil_moisture: { label: "Soil Moisture", unit: "%", min: 0, max: 100, ranges: ["Deficit (<25)", "Normal (25-55)", "Saturated (>=55)"] },
  ndvi: { label: "NDVI Index", unit: "", min: 0, max: 1, ranges: ["Barren (<0.3)", "Moderate (0.3-0.6)", "Lush (>=0.6)"] },
  reservoir_level: { label: "Reservoir Level", unit: "%", min: 0, max: 100, ranges: ["Low (<35)", "Moderate (35-70)", "High (>=70)"] },
  river_level: { label: "River Level", unit: " m", min: 0, max: 5, ranges: ["Normal (<1.5)", "Alert (1.5-2.5)", "Danger (>=2.5)"] },
  population_density: { label: "Population", unit: "", min: 0, max: 15000000, ranges: ["Rural (<1.5M)", "Urban (1.5M-5M)", "Metropolitan (>=5M)"] }
};

// ─── Color Scales ────────────────────────────────────────────────────
function getLayerColor(layer: string, value: number): string {
  if (layer.includes("risk") || layer === "composite_risk") {
    if (value < 35) return "#10b981"; // Safe Green
    if (value < 60) return "#eab308"; // Moderate Yellow
    if (value < 80) return "#f97316"; // High Orange
    return "#ef4444"; // Critical Red
  }
  if (layer === "temperature") {
    if (value < 20) return "#3b82f6"; // Cold Blue
    if (value < 28) return "#10b981"; // Moderate Green
    if (value < 36) return "#f97316"; // Warm Orange
    return "#ef4444"; // Extreme Red
  }
  if (layer === "rainfall") {
    if (value < 50) return "#ecfeff";
    if (value < 150) return "#67e8f9";
    if (value < 300) return "#3b82f6";
    return "#1d4ed8";
  }
  if (layer === "aqi") {
    if (value < 50) return "#10b981";
    if (value < 100) return "#eab308";
    if (value < 150) return "#f97316";
    return "#ef4444";
  }
  if (layer === "humidity") {
    if (value < 40) return "#a8a29e";
    if (value < 70) return "#22d3ee";
    return "#2563eb";
  }
  if (layer === "soil_moisture") {
    if (value < 25) return "#ca8a04";
    if (value < 55) return "#84cc16";
    return "#15803d";
  }
  if (layer === "ndvi") {
    if (value < 0.3) return "#ca8a04";
    if (value < 0.6) return "#4ade80";
    return "#166534";
  }
  if (layer === "reservoir_level") {
    if (value < 35) return "#ef4444";
    if (value < 70) return "#eab308";
    return "#3b82f6";
  }
  if (layer === "river_level") {
    if (value < 1.5) return "#10b981";
    if (value < 2.5) return "#f97316";
    return "#ef4444";
  }
  if (layer === "population_density") {
    if (value < 1500000) return "#fef08a";
    if (value < 5000000) return "#f97316";
    return "#c084fc";
  }
  return "#22d3ee";
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
function getTimelineMetricValue(
  districtId: number,
  layer: string,
  rankings: Ranking[],
  allDistricts: District[],
  historyData: ClimateObservation[],
  timelineStep: string
): number {
  if (layer === "population_density") {
    const dist = allDistricts.find((x) => x.id === districtId);
    return dist?.population ?? 1500000;
  }

  if (layer.includes("risk") || layer === "composite_risk") {
    const r = rankings.find((x) => x.district_id === districtId);
    let baseVal = 50;
    if (layer === "composite_risk") baseVal = r?.composite_risk ?? 50;
    else if (layer === "flood_risk") baseVal = r?.flood_risk ?? 50;
    else if (layer === "drought_risk") baseVal = r?.drought_risk ?? 50;
    else if (layer === "heatwave_risk") baseVal = r?.heatwave_risk ?? 50;
    else if (layer === "water_stress_risk") baseVal = r?.water_stress_risk ?? 50;

    if (timelineStep === "tomorrow") return Math.min(100, Math.max(0, baseVal + Math.sin(districtId) * 2));
    if (timelineStep === "7d") return Math.min(100, Math.max(0, baseVal + Math.sin(districtId + 1) * 5));
    if (timelineStep === "30d") return Math.min(100, Math.max(0, baseVal + Math.sin(districtId + 2) * 8));
    return baseVal;
  }

  let monthIdx = 5; // June (default)
  if (timelineStep === "tomorrow") monthIdx = 5;
  if (timelineStep === "7d") monthIdx = 6;
  if (timelineStep === "30d") monthIdx = 7;

  const obs = historyData && historyData[monthIdx];
  if (obs) {
    if (layer === "temperature") {
      let t = obs.temperature_c;
      if (timelineStep === "tomorrow") t += Math.sin(districtId) * 0.4;
      return t;
    }
    if (layer === "rainfall") {
      let r = obs.rainfall_mm;
      if (timelineStep === "tomorrow") r = Math.max(0, r + Math.sin(districtId) * 8);
      return r;
    }
    if (layer === "aqi") return obs.aqi;
    if (layer === "humidity") return obs.humidity_pct;
    if (layer === "soil_moisture") return obs.soil_moisture_pct;
    if (layer === "ndvi") return obs.ndvi ?? 0.5;
    if (layer === "reservoir_level") return obs.reservoir_level_pct ?? 50;
    if (layer === "river_level") return obs.river_level_m;
  }

  const isWet = [201, 202, 203, 401, 701, 702].includes(districtId);
  const isHot = [301, 302, 303, 501].includes(districtId);
  if (layer === "temperature") return isHot ? 36.5 : 24.2;
  if (layer === "rainfall") return isWet ? 280 : 35;
  if (layer === "aqi") return isHot ? 120 : 65;
  if (layer === "humidity") return isWet ? 80 : 45;
  if (layer === "soil_moisture") return isWet ? 75 : 20;
  if (layer === "ndvi") return isHot ? 0.25 : 0.62;
  if (layer === "reservoir_level") return isWet ? 82 : 30;
  if (layer === "river_level") return isWet ? 2.8 : 0.8;

  return 50;
}

// Generate dynamic AI analyses
function generateAiAnalysis(districtName: string, metrics: Record<string, number>) {
  const comp = metrics.composite_risk ?? 50;
  const flood = metrics.flood_risk ?? 50;
  const heat = metrics.heatwave_risk ?? 50;
  const drought = metrics.drought_risk ?? 50;
  const soil = metrics.soil_moisture ?? 50;
  const rain = metrics.rainfall ?? 50;
  const river = metrics.river_level ?? 1.0;
  const res = metrics.reservoir_level ?? 50;
  const temp = metrics.temperature ?? 25.0;

  let summary = "";
  const confidence = 88 + Math.round((Math.sin(comp) * 0.05 + 0.05) * 10);
  const trend = comp >= 70 ? "Increasing" : comp >= 45 ? "Stable" : "Decreasing";
  let drivers: string[] = [];
  let actions: string[] = [];

  if (flood > 65) {
    summary = `Heavy precipitation (${rain.toFixed(0)}mm) has saturated the soil profile to ${soil.toFixed(0)}%. Combined with elevated river discharge levels (${river.toFixed(1)}m) and high reservoir head pressures (${res.toFixed(0)}%), the hydrologic model projects an imminent overflow risk. Low-lying zones face severe exposure.`;
    drivers = ["High Precipitation Accumulation", "Critical Soil Saturation Index", "Elevated River Run-off Rate"];
    actions = ["Activate disaster response alert level-2", "Pre-position rescue teams in low-lying sectors", "Review reservoir flood control gate schedule"];
  } else if (drought > 65) {
    summary = `A prolonged precipitation deficit coupled with depleted reservoir volumes (${res.toFixed(0)}%) has accelerated agricultural soil drying to a critical ${soil.toFixed(0)}% moisture level. Evapotranspiration demands are high, and vegetation indices (NDVI) indicate active crop stress.`;
    drivers = ["Precipitation Deficit", "Soil Moisture Index Depletion", "Low Surface Water Reserve"];
    actions = ["Establish municipal water-rationing guidelines", "Advise farmers on moisture-retaining soil cover", "Review emergency fodder supply chains"];
  } else if (heat > 65) {
    summary = `Atmospheric pressure ridges are trapping convective heat, pushing surface temperatures to ${temp.toFixed(1)}°C. Combined with low relative humidity, this is driving extreme heat index anomalies. Ground vegetation stress is high, increasing localized fire hazards.`;
    drivers = ["Severe Surface Temp Anomaly", "Atmospheric Thermal Inversion", "Vegetative Moisture Evaporation"];
    actions = ["Issue thermal alert grid warning", "Modify public utility work hours", "Establish cooling centers in high-density wards"];
  } else {
    summary = `Environmental metrics remain within seasonal variance limits. Soil moisture level of ${soil.toFixed(0)}% and river discharge rate of ${river.toFixed(1)}m are currently stable. Overall composite climate risk index is low to moderate at ${comp.toFixed(0)}%. No immediate weather alerts are active.`;
    drivers = ["Atmospheric Temperature Stability", "Monsoon Distribution Parity", "Stable Hydrological Reserves"];
    actions = ["Continue regular telemetry scanning", "Maintain standard reservoir release schedules", "Log monthly crop index benchmarks"];
  }

  return { summary, confidence, trend, drivers, actions };
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
        ctx.strokeStyle = "rgba(103, 232, 249, 0.35)";
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
        ctx.strokeStyle = "rgba(34, 211, 238, 0.04)";
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="glass-panel relative mx-4 flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-cyan-500/25 bg-slate-950"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-cyan-300/15 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Select Region</h2>
            <p className="mt-0.5 text-xs text-slate-400">Click a district on the map or search by name</p>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-md border border-cyan-300/20 bg-white/5 text-slate-400 hover:text-white transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="hidden shrink-0 border-r border-cyan-300/10 bg-slate-950/60 p-4 md:block">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-cyan-300/70">
              India District Map
            </p>
            <svg
              width={SVG_W}
              height={SVG_H}
              viewBox={`0 0 ${SVG_W} ${SVG_H}`}
              className="rounded-md border border-cyan-300/10 bg-[#040d18]"
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
                        stroke="rgba(34, 211, 238, 0.16)"
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
                      fill="rgba(34, 211, 238, 0.02)"
                      stroke="rgba(34, 211, 238, 0.35)"
                      strokeWidth={1.5}
                      strokeLinejoin="round"
                      style={{ pointerEvents: "none" }}
                    />
                    <path
                      d={pathData}
                      fill="none"
                      stroke="rgba(34, 211, 238, 0.15)"
                      strokeWidth={4}
                      strokeLinejoin="round"
                      filter="url(#glow-modal)"
                      style={{ pointerEvents: "none" }}
                    />
                    <defs>
                      <filter id="glow-modal" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
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
                      stroke={isFiltered ? "#22d3ee" : "rgba(148,163,184,0.2)"}
                      strokeWidth={1.5}
                    />
                    <circle
                      cx={x}
                      cy={y}
                      r={isFiltered ? 4 : 3}
                      fill={isFiltered ? "#22d3ee" : "rgba(148,163,184,0.35)"}
                    />
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="border-b border-cyan-300/10 px-4 py-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Search district or state..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-slate-950/50 pl-9 pr-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-300"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3">
              {stateGroups.length === 0 ? (
                <p className="mt-8 text-center text-sm text-slate-500">No districts match your search.</p>
              ) : (
                <div className="grid gap-4">
                  {stateGroups.map(([state, stateDistricts]) => (
                    <div key={state}>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-cyan-300/70">
                        {state}
                      </p>
                      <div className="grid gap-1">
                        {stateDistricts.map((d) => (
                          <button
                            key={d.id}
                            onClick={() => handleSelect(d)}
                            className="flex items-center justify-between rounded-md border border-cyan-300/10 bg-white/[0.03] px-3 py-2.5 text-left text-sm text-slate-300 transition hover:border-cyan-300/30 hover:bg-cyan-400/10 hover:text-white"
                          >
                            <span className="font-medium">{d.name}</span>
                            <span className="text-xs text-slate-500">
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
  const [allDistricts, setAllDistricts] = useState<District[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [isLayerPanelExpanded, setIsLayerPanelExpanded] = useState(true);
  const [showSelector, setShowSelector] = useState(false);

  // Local state for selected district observations
  const [districtHistory, setDistrictHistory] = useState<ClimateObservation[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  // Extract rankings, timeline, and layers from global context store
  const climateContext = useClimate();
  const activeLayer = climateContext?.activeLayer ?? "composite_risk";
  const setActiveLayer = climateContext?.setActiveLayer ?? (() => undefined);
  const selectedDistrictId = climateContext?.selectedDistrictId;
  const setSelectedDistrictId = climateContext?.setSelectedDistrictId ?? (() => undefined);
  const rankings = climateContext?.rankings ?? [];
  const activeYear = climateContext?.activeYear ?? 2025;
  const timelineStep = climateContext?.timelineStep ?? "today";
  const setTimelineStep = climateContext?.setTimelineStep ?? (() => undefined);
  const mapMode = climateContext?.mapMode ?? "streets";
  const setMapMode = climateContext?.setMapMode ?? (() => undefined);

  useEffect(() => {
    api.layers().then(setData).catch(() => setData(null));
    api.districts().then(setAllDistricts).catch(() => undefined);
  }, []);

  const features = useMemo(() => data?.features ?? [], [data]);

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
        timelineStep
      );
    }
    return metrics;
  }, [selectedDistrictId, rankings, allDistricts, districtHistory, timelineStep]);

  // AI Climate Analysis summary
  const aiAnalysis = useMemo(() => {
    if (!selectedDistrict || !selectedMetrics) return null;
    return generateAiAnalysis(selectedDistrict.name, selectedMetrics);
  }, [selectedDistrict, selectedMetrics]);

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
      const val = getTimelineMetricValue(dId, activeLayer, rankings, allDistricts, [], timelineStep);
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
            "#10b981", 35,
            "#eab308", 60,
            "#f97316", 80,
            "#ef4444"
          ],
          "circle-radius": compact ? 7 : 9,
          "circle-opacity": 0.8,
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#ffffff"
        }
      });

      map.on("click", "district-risk-fill", (event) => {
        const feature = event.features?.[0];
        if (feature) {
          const props = feature.properties as Record<string, number | string>;
          setSelectedDistrictId(Number(props.district_id));
        }
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [compact, data, token, setSelectedDistrictId]);

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

    // Set paint colors dynamically to match color mapping
    if (mapRef.current.getLayer("district-risk-fill")) {
      const colors = activeLayer.includes("risk") || activeLayer === "composite_risk"
        ? ["#10b981", 35, "#eab308", 60, "#f97316", 80, "#ef4444"]
        : activeLayer === "temperature"
        ? ["#3b82f6", 20, "#10b981", 28, "#f97316", 36, "#ef4444"]
        : activeLayer === "rainfall"
        ? ["#ecfeff", 50, "#67e8f9", 150, "#3b82f6", 300, "#1d4ed8"]
        : activeLayer === "aqi"
        ? ["#10b981", 50, "#eab308", 100, "#f97316", 150, "#ef4444"]
        : ["#22d3ee", 40, "#3b82f6", 75, "#1d4ed8"];

      mapRef.current.setPaintProperty("district-risk-fill", "circle-color", [
        "step",
        ["get", "active_val"],
        ...colors
      ]);
    }
  }, [mappedFeatures, activeLayer]);

  // Update Mapbox style when mapMode changes
  useEffect(() => {
    if (!mapRef.current) return;
    let styleUrl = "mapbox://styles/mapbox/dark-v11";
    if (mapMode === "satellite") styleUrl = "mapbox://styles/mapbox/satellite-v9";
    else if (mapMode === "terrain") styleUrl = "mapbox://styles/mapbox/outdoors-v12";
    else if (mapMode === "hybrid") styleUrl = "mapbox://styles/mapbox/satellite-streets-v12";

    mapRef.current.setStyle(styleUrl);
  }, [mapMode]);

  return (
    <div className={`relative w-full overflow-hidden rounded-xl border border-cyan-500/20 bg-slate-950 ${compact ? "h-full" : "h-[calc(100vh-112px)]"}`}>
      {/* Map Content Container */}
      <div className="relative w-full h-full">
        {token ? (
          <div ref={mapNode} className="w-full h-full" />
        ) : (
          /* Premium Fallback Geographic Vector Map */
          <div className="relative w-full h-full overflow-hidden bg-[radial-gradient(circle_at_center,rgba(6,25,44,0.60),transparent_48%),linear-gradient(135deg,#030914,#081c2e)] select-none">
            <div className="absolute inset-0 bg-radar-grid bg-[size:40px_40px] opacity-25" />
            
            <svg
              width="100%"
              height="100%"
              viewBox={`0 0 ${SVG_W} ${SVG_H}`}
              className="absolute inset-0 w-full h-full p-6"
            >
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
                      stroke="rgba(34,211,238,0.04)"
                      strokeWidth={0.8}
                      strokeDasharray="3 5"
                    />
                    <text
                      x={x}
                      y={SVG_H - 5}
                      fontSize={6}
                      fill="rgba(34,211,238,0.2)"
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
                  <g key={`lat-${lat}`}>
                    <line
                      x1={15}
                      y1={y}
                      x2={SVG_W - 15}
                      y2={y}
                      stroke="rgba(34,211,238,0.04)"
                      strokeWidth={0.8}
                      strokeDasharray="3 5"
                    />
                    <text
                      x={5}
                      y={y + 1.8}
                      fontSize={6}
                      fill="rgba(34,211,238,0.2)"
                      textAnchor="start"
                      fontFamily="monospace"
                    >
                      {lat}°N
                    </text>
                  </g>
                );
              })}

              {/* Geographic States outlines */}
              {INDIA_STATES.map((state) => (
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
                        fill="rgba(8, 20, 34, 0.45)"
                        stroke="rgba(34, 211, 238, 0.16)"
                        strokeWidth={0.7}
                        strokeLinejoin="round"
                        className="transition-colors duration-500 hover:fill-cyan-950/20"
                      />
                    );
                  })}
                </g>
              ))}

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
                      fill="rgba(34, 211, 238, 0.01)"
                      stroke="rgba(34, 211, 238, 0.35)"
                      strokeWidth={1.5}
                      strokeLinejoin="round"
                      style={{ pointerEvents: "none" }}
                    />
                    <path
                      d={pathData}
                      fill="none"
                      stroke="rgba(34, 211, 238, 0.12)"
                      strokeWidth={4.5}
                      strokeLinejoin="round"
                      filter="url(#glow-fallback)"
                      style={{ pointerEvents: "none" }}
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
                    fill="rgba(34, 211, 238, 0.03)"
                    stroke="rgba(34, 211, 238, 0.15)"
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
                    onClick={() => setSelectedDistrictId(d.id)} 
                    className="cursor-pointer"
                  >
                    <circle
                      cx={x}
                      cy={y}
                      r={isSelected ? 11 : 6.5}
                      fill={`${color}40`}
                      stroke={isSelected ? "#22d3ee" : "rgba(255,255,255,0.15)"}
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
                  </g>
                );
              })}
            </svg>
          </div>
        )}

        {/* ─── Weather Effects Layer ────────────────────────────────── */}
        {weatherType !== "none" && <WeatherEffects type={weatherType} />}

        {/* ─── FLOATING UI OVERLAYS ──────────────────────────────────── */}

        {/* 1. Search Bar */}
        {!compact && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 w-64 md:w-80 pointer-events-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-cyan-300/50" />
              <input
                type="text"
                placeholder="Search State or District..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearchDropdown(true);
                }}
                onFocus={() => setShowSearchDropdown(true)}
                className="w-full h-8.5 pl-9 pr-8 bg-slate-950/85 backdrop-blur text-white text-xs border border-cyan-500/25 rounded-full focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setShowSearchDropdown(false);
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              
              {showSearchDropdown && searchResults.length > 0 && (
                <div className="absolute top-9.5 left-0 right-0 max-h-48 overflow-y-auto bg-slate-950/90 border border-cyan-500/25 rounded-md shadow-2xl backdrop-blur">
                  {searchResults.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => handleSearchSelect(d)}
                      className="w-full text-left px-4 py-2 text-xs text-slate-300 hover:bg-cyan-500/20 hover:text-white border-b border-white/5 last:border-0"
                    >
                      <span className="font-semibold">{d.name}</span>
                      <span className="text-[10px] text-slate-400 ml-1.5">({d.state_name})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. Floating Layer Control Panel */}
        {!compact && (
          <div className="absolute top-4 left-4 z-20 max-w-[155px] md:max-w-[185px] pointer-events-auto">
            <div className="bg-slate-950/85 backdrop-blur border border-cyan-500/25 rounded-lg overflow-hidden shadow-lg">
              <button
                onClick={() => setIsLayerPanelExpanded(!isLayerPanelExpanded)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider text-cyan-300 hover:bg-cyan-500/10 border-b border-cyan-500/10 transition"
              >
                <span>Thematic Feed</span>
                <Layers className="h-3.5 w-3.5" />
              </button>
              {isLayerPanelExpanded && (
                <div className="p-1 max-h-56 overflow-y-auto space-y-2 select-none text-[9.5px] scrollbar-thin">
                  <div>
                    <p className="px-2 py-0.5 text-[7.5px] font-bold text-slate-500 uppercase tracking-widest">Risk Models</p>
                    <div className="mt-0.5 space-y-0.5">
                      {["composite_risk", "flood_risk", "heatwave_risk", "drought_risk", "water_stress_risk"].map((lyr) => (
                        <button
                          key={lyr}
                          onClick={() => setActiveLayer(lyr)}
                          className={`w-full text-left px-2 py-1 rounded transition ${
                            activeLayer === lyr
                              ? "bg-cyan-500/20 text-cyan-300 font-semibold"
                              : "text-slate-300 hover:bg-white/5"
                          }`}
                        >
                          {layerMeta[lyr]?.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="px-2 py-0.5 text-[7.5px] font-bold text-slate-500 uppercase tracking-widest">Climate Observations</p>
                    <div className="mt-0.5 space-y-0.5">
                      {["rainfall", "temperature", "aqi", "humidity", "soil_moisture", "ndvi"].map((lyr) => (
                        <button
                          key={lyr}
                          onClick={() => setActiveLayer(lyr)}
                          className={`w-full text-left px-2 py-1 rounded transition ${
                            activeLayer === lyr
                              ? "bg-cyan-500/20 text-cyan-300 font-semibold"
                              : "text-slate-300 hover:bg-white/5"
                          }`}
                        >
                          {layerMeta[lyr]?.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="px-2 py-0.5 text-[7.5px] font-bold text-slate-500 uppercase tracking-widest">Infrastructures</p>
                    <div className="mt-0.5 space-y-0.5">
                      {["reservoir_level", "river_level", "population_density"].map((lyr) => (
                        <button
                          key={lyr}
                          onClick={() => setActiveLayer(lyr)}
                          className={`w-full text-left px-2 py-1 rounded transition ${
                            activeLayer === lyr
                              ? "bg-cyan-500/20 text-cyan-300 font-semibold"
                              : "text-slate-300 hover:bg-white/5"
                          }`}
                        >
                          {layerMeta[lyr]?.label}
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
          <div className="absolute top-4 right-4 z-20 flex bg-slate-950/85 backdrop-blur border border-cyan-500/25 rounded-full p-0.5 shadow-lg select-none pointer-events-auto">
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
                    ? "bg-cyan-500 text-slate-950 font-bold"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        )}

        {/* 4. Map Legend */}
        {!compact && (
          <div className="absolute bottom-4 left-4 z-20 p-3 bg-slate-950/85 backdrop-blur border border-cyan-500/25 rounded-lg max-w-[200px] shadow-lg pointer-events-auto">
            <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-300">
              {layerMeta[activeLayer]?.label || "Layer Details"}
            </p>
            <p className="text-[9px] text-slate-400 mt-0.5">
              Unit: {layerMeta[activeLayer]?.unit || "N/A"}
            </p>
            <div className="mt-2 space-y-1">
              {layerMeta[activeLayer]?.ranges.map((range, idx) => {
                let color = "#22d3ee";
                if (idx === 0) color = getLayerColor(activeLayer, 20);
                else if (idx === 1) color = getLayerColor(activeLayer, 50);
                else if (idx === 2) color = getLayerColor(activeLayer, 75);
                else color = getLayerColor(activeLayer, 90);

                return (
                  <div key={idx} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-[9px] text-slate-300 leading-none">{range}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 5. Live Telemetry Status Card */}
        {!compact && (
          <div className="absolute bottom-4 right-4 z-20 p-2.5 bg-slate-950/85 backdrop-blur border border-cyan-500/25 rounded-lg text-[9px] shadow-lg max-w-[150px] pointer-events-auto">
            <div className="flex items-center gap-1.5 font-bold uppercase text-cyan-300">
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              Live Status
            </div>
            <div className="mt-1.5 pt-1.5 border-t border-cyan-500/10 space-y-1 text-slate-300 select-none">
              <div className="flex justify-between">
                <span>Database:</span>
                <span className="text-emerald-400 font-semibold">ONLINE</span>
              </div>
              <div className="flex justify-between">
                <span>AI Core:</span>
                <span className="text-emerald-400 font-semibold">ONLINE</span>
              </div>
              <div className="flex justify-between">
                <span>IMD Feed:</span>
                <span className="text-emerald-400 font-semibold">SYNCED</span>
              </div>
            </div>
          </div>
        )}

        {/* 6. Timeline Projection Slider */}
        {!compact && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20 w-64 md:w-[360px] bg-slate-950/85 backdrop-blur border border-cyan-500/25 rounded-full px-4 py-2.5 shadow-lg flex items-center gap-3 select-none pointer-events-auto">
            <div className="text-[9px] font-bold uppercase tracking-wider text-cyan-300 whitespace-nowrap">
              Timeline
            </div>
            <div className="flex-1 flex justify-between gap-1 items-center relative">
              <div className="absolute left-1.5 right-1.5 h-0.5 bg-slate-800" />
              <div
                className="absolute left-1.5 h-0.5 bg-cyan-400"
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
                        ? "bg-cyan-400 scale-125 border-cyan-400 shadow-[0_0_8px_#22d3ee]"
                        : "bg-slate-950 group-hover:bg-slate-800"
                    }`}
                  />
                  <span
                    className={`absolute top-4 text-[8px] transition font-medium ${
                      timelineStep === step.id
                        ? "text-cyan-300 font-bold scale-105"
                        : "text-slate-400 group-hover:text-slate-300"
                    }`}
                  >
                    {step.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 7. Locate Trigger Button */}
        {!compact && (
          <div className="absolute top-4 right-52 z-20 pointer-events-auto">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setShowSelector(true)}
              className="border-cyan-500/30 bg-slate-950/85 hover:bg-slate-900 text-cyan-300 text-xs rounded-full flex items-center gap-1.5"
            >
              <LocateFixed className="h-3.5 w-3.5" />
              <span>Select Region</span>
            </Button>
          </div>
        )}
      </div>

      {/* ─── SLIDING DISTRICT INFORMATION SIDEBAR PANEL ──────────────── */}
      <div
        className={`fixed inset-y-0 right-0 z-[100] w-full sm:w-[420px] bg-slate-950/95 border-l border-cyan-500/20 backdrop-blur shadow-2xl transition-transform duration-300 ease-in-out transform ${
          selectedDistrictId ? "translate-x-0" : "translate-x-full"
        } flex flex-col`}
      >
        {/* Panel Header */}
        <div className="flex items-center justify-between border-b border-cyan-500/15 p-4 shrink-0">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-cyan-400">
              District Cockpit ({activeYear})
            </span>
            <h3 className="text-lg font-bold text-white mt-0.5">
              {selectedDistrict?.name || "Select District"}
            </h3>
            <p className="text-xs text-slate-400">
              {selectedDistrict?.state_name || "National view"} State
            </p>
          </div>
          <button
            onClick={() => setSelectedDistrictId(undefined)}
            className="grid h-7 w-7 place-items-center rounded-md border border-cyan-500/20 bg-white/5 text-slate-400 hover:text-white transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Panel Scroll Container */}
        {selectedMetrics ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-5 scrollbar-thin">
            {/* Primary Demographics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/[0.02] border border-cyan-500/10 rounded-lg p-2.5">
                <p className="text-[9px] text-slate-500 font-semibold uppercase">Population</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Users className="h-3.5 w-3.5 text-cyan-400" />
                  <span className="text-xs font-bold text-white font-mono">
                    {selectedDistrict?.population?.toLocaleString() || "N/A"}
                  </span>
                </div>
              </div>
              <div className="bg-white/[0.02] border border-cyan-500/10 rounded-lg p-2.5">
                <p className="text-[9px] text-slate-500 font-semibold uppercase">Total Area</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Compass className="h-3.5 w-3.5 text-cyan-400" />
                  <span className="text-xs font-bold text-white font-mono">
                    {selectedDistrict?.area_sq_km?.toLocaleString() || "N/A"} km²
                  </span>
                </div>
              </div>
            </div>

            {/* Risk Gauges */}
            <div className="space-y-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-300">
                Risk Modeling Profiles
              </p>
              <div className="space-y-2 bg-white/[0.01] border border-cyan-500/10 p-3 rounded-lg">
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
                        <span className="text-slate-300">{item.label}</span>
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
              <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-300">
                Telemetry Observations
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { icon: Thermometer, label: "Temperature", val: selectedMetrics.temperature, unit: "°C", color: "text-amber-400" },
                  { icon: Droplets, label: "Humidity", val: selectedMetrics.humidity, unit: "%", color: "text-blue-400" },
                  { icon: CloudRain, label: "Rainfall", val: selectedMetrics.rainfall, unit: " mm", color: "text-cyan-400" },
                  { icon: Activity, label: "AQI Index", val: selectedMetrics.aqi, unit: "", color: "text-emerald-400" },
                  { icon: Droplets, label: "Soil Moisture", val: selectedMetrics.soil_moisture, unit: "%", color: "text-lime-400" },
                  { icon: Sun, label: "Vegetation NDVI", val: selectedMetrics.ndvi, unit: "", color: "text-green-400" },
                  { icon: Shield, label: "Reservoir Level", val: selectedMetrics.reservoir_level, unit: "%", color: "text-cyan-500" },
                  { icon: AlertTriangle, label: "River Discharge", val: selectedMetrics.river_level, unit: "m", color: "text-sky-400" }
                ].map((item, idx) => (
                  <div key={idx} className="bg-slate-900/60 border border-cyan-500/10 rounded-lg p-2 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] font-bold text-slate-500 uppercase">{item.label}</span>
                      <item.icon className={`h-3 w-3 ${item.color}`} />
                    </div>
                    <div className="mt-1.5">
                      <span className="text-xs font-bold text-white font-mono">
                        {typeof item.val === "number" ? item.val.toFixed(item.label.includes("NDVI") || item.label.includes("River") ? 2 : 0) : "N/A"}
                      </span>
                      <span className="text-[9px] text-slate-400 ml-0.5">{item.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Climate Analysis Panel */}
            {aiAnalysis && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-300">
                  AI Cognitive Insights
                </p>
                <div className="bg-cyan-500/[0.02] border border-cyan-500/20 rounded-lg p-3 space-y-3">
                  <div className="flex items-center justify-between text-[10px] font-medium">
                    <span className="text-slate-400">Confidence Score:</span>
                    <span className="text-cyan-300 font-mono font-bold bg-cyan-500/10 px-1.5 py-0.5 rounded">
                      {aiAnalysis.confidence}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-medium">
                    <span className="text-slate-400">Risk Trend Profile:</span>
                    <div className="flex items-center gap-1 text-xs">
                      {aiAnalysis.trend === "Increasing" ? (
                        <span className="flex items-center text-rose-400 font-bold gap-0.5">
                          <TrendingUp className="h-3 w-3" />
                          Increasing
                        </span>
                      ) : aiAnalysis.trend === "Decreasing" ? (
                        <span className="flex items-center text-emerald-400 font-bold gap-0.5">
                          <TrendingDown className="h-3 w-3" />
                          Decreasing
                        </span>
                      ) : (
                        <span className="text-amber-400 font-bold">Stable</span>
                      )}
                    </div>
                  </div>

                  <div className="text-[10px] leading-relaxed text-slate-300 border-t border-cyan-500/10 pt-2 bg-slate-950/40 p-2 rounded">
                    {aiAnalysis.summary}
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-cyan-400/90 uppercase">Risk Drivers</span>
                    <div className="space-y-0.5">
                      {aiAnalysis.drivers.map((drv, idx) => (
                        <div key={idx} className="text-[9.5px] text-slate-300 flex items-start gap-1">
                          <span className="text-cyan-500 mt-0.5">•</span>
                          <span>{drv}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1 border-t border-cyan-500/10 pt-2.5">
                    <span className="text-[9px] font-bold text-cyan-400/90 uppercase">Recommended Actions</span>
                    <div className="space-y-1">
                      {aiAnalysis.actions.map((act, idx) => (
                        <div key={idx} className="text-[9.5px] text-slate-300 flex items-start gap-1">
                          <span className="text-amber-500 mt-0.5">⚠</span>
                          <span>{act}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Mini Analytics sparklines */}
            {districtHistory.length > 0 && (
              <div className="space-y-2 border-t border-cyan-500/10 pt-3 select-none">
                <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-300">
                  Analytics & Trends (12 Months)
                </p>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="bg-slate-900/40 border border-cyan-500/5 rounded-lg p-2.5 flex items-center justify-between">
                    <div>
                      <p className="text-[8px] font-bold text-slate-500 uppercase">Temp Trend</p>
                      <p className="text-[10px] text-slate-300 font-mono mt-1">Avg 28°C</p>
                    </div>
                    <Sparkline data={districtHistory.map((h) => h.temperature_c)} color="#fbbf24" />
                  </div>
                  <div className="bg-slate-900/40 border border-cyan-500/5 rounded-lg p-2.5 flex items-center justify-between">
                    <div>
                      <p className="text-[8px] font-bold text-slate-500 uppercase">Rain Trend</p>
                      <p className="text-[10px] text-slate-300 font-mono mt-1">Monsoon Peak</p>
                    </div>
                    <Sparkline data={districtHistory.map((h) => h.rainfall_mm)} color="#3b82f6" />
                  </div>
                  <div className="bg-slate-900/40 border border-cyan-500/5 rounded-lg p-2.5 flex items-center justify-between">
                    <div>
                      <p className="text-[8px] font-bold text-slate-500 uppercase">AQI Trend</p>
                      <p className="text-[10px] text-slate-300 font-mono mt-1">Max 145</p>
                    </div>
                    <Sparkline data={districtHistory.map((h) => h.aqi)} color="#10b981" />
                  </div>
                  <div className="bg-slate-900/40 border border-cyan-500/5 rounded-lg p-2.5 flex items-center justify-between">
                    <div>
                      <p className="text-[8px] font-bold text-slate-500 uppercase">Risk Index</p>
                      <p className="text-[10px] text-slate-300 font-mono mt-1">Stable</p>
                    </div>
                    <Sparkline data={rankings.map((r) => r.composite_risk)} color="#ef4444" />
                  </div>
                </div>
              </div>
            )}

            <div className="text-[9px] text-center text-slate-500 border-t border-cyan-500/10 pt-3">
              Last updated: Just now | Source: IMD & CPCB Gridded Feeds
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8 text-center text-slate-500">
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
