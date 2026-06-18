"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Layers, LocateFixed, Search, X } from "lucide-react";
import mapboxgl from "mapbox-gl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api";
import type { District } from "@/lib/types";
import { riskFill } from "@/lib/utils";
import { useClimate } from "@/store/useClimateStore";
import { INDIA_OUTLINE } from "@/lib/indiaOutline";
import { INDIA_STATES } from "@/lib/indiaStates";

const layerOptions = [
  "temperature",
  "rainfall",
  "ndvi",
  "air_quality",
  "soil_moisture",
  "water_bodies",
  "reservoir_level",
  "flood_risk",
  "drought_risk"
];

function colorForFeature(feature: GeoJSON.Feature, layer: string) {
  const props = feature.properties as Record<string, number | string>;
  const value = Number(props[layer] ?? props.composite_risk ?? 50);
  if (layer.includes("risk")) return riskFill(value);
  if (layer === "temperature") return value >= 38 ? "#f87171" : "#22d3ee";
  if (layer === "rainfall" || layer === "water_bodies") return "#38bdf8";
  if (layer === "ndvi") return "#34d399";
  if (layer === "air_quality") return value > 150 ? "#f59e0b" : "#22d3ee";
  return "#2dd4bf";
}

const INDIA_LON_MIN = 68;
const INDIA_LON_MAX = 97;
const INDIA_LAT_MIN = 8;
const INDIA_LAT_MAX = 37;
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
        className="glass-panel relative mx-4 flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-cyan-300/15 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Select Region</h2>
            <p className="mt-0.5 text-xs text-slate-400">Click a district on the map or search by name</p>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-md border border-cyan-300/20 bg-white/5 text-slate-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* India SVG map */}
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
              {/* Grid lines with labels */}
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

              {/* India States Boundaries */}
              {INDIA_STATES.map((state) => (
                <g key={state.name} id={`state-${state.name.toLowerCase().replace(/\s+/g, '-')}`}>
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
                        className="transition-all duration-300 hover:stroke-cyan-400 hover:fill-cyan-950/20"
                      />
                    );
                  })}
                </g>
              ))}

              {/* India outline border */}
              {(() => {
                const indiaOutline = INDIA_OUTLINE;
                const pathData = indiaOutline
                  .map((pt, i) => {
                     const x = lonToX(pt.lon, pt.lat);
                     const y = latToY(pt.lat);
                     return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
                  })
                  .join(" ") + " Z";

                return (
                  <>
                    {/* Filled India shape */}
                    <path
                      d={pathData}
                      fill="rgba(34, 211, 238, 0.02)"
                      stroke="rgba(34, 211, 238, 0.35)"
                      strokeWidth={1.5}
                      strokeLinejoin="round"
                      style={{ pointerEvents: "none" }}
                    />
                    {/* Glow outline */}
                    <path
                      d={pathData}
                      fill="none"
                      stroke="rgba(34, 211, 238, 0.15)"
                      strokeWidth={4}
                      strokeLinejoin="round"
                      filter="url(#glow)"
                      style={{ pointerEvents: "none" }}
                    />
                    {/* SVG glow filter */}
                    <defs>
                      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
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

              {/* Sri Lanka small outline */}
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

              {/* District dots */}
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
                    {isFiltered && (
                      <text
                        x={x}
                        y={y - 13}
                        textAnchor="middle"
                        fontSize={8}
                        fill="#67e8f9"
                        fontFamily="sans-serif"
                      >
                        {d.name}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Search + list */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Search box */}
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

            {/* District list grouped by state */}
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

export function DigitalTwinMap({ compact = false }: { compact?: boolean }) {
  const mapNode = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [data, setData] = useState<GeoJSON.FeatureCollection | null>(null);
  const [layer, setLayer] = useState("flood_risk");
  const [selected, setSelected] = useState<GeoJSON.Feature | null>(null);
  const [showSelector, setShowSelector] = useState(false);
  const [allDistricts, setAllDistricts] = useState<District[]>([]);
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  useEffect(() => {
    api.layers().then(setData).catch(() => setData(null));
    api.districts().then(setAllDistricts).catch(() => undefined);
  }, []);

  const features = useMemo(() => data?.features ?? [], [data]);

  useEffect(() => {
    if (!token || !mapNode.current || !data || mapRef.current) return;
    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: mapNode.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [78.9629, 22.5937],
      zoom: compact ? 3.2 : 4.2,
      attributionControl: false
    });
    mapRef.current = map;
    map.on("load", () => {
      map.addSource("district-risk", {
        type: "geojson",
        data
      });
      map.addLayer({
        id: "district-risk-fill",
        type: "fill",
        source: "district-risk",
        paint: {
          "fill-color": [
            "step",
            ["get", "composite_risk"],
            "#34d399",
            35,
            "#22d3ee",
            60,
            "#fbbf24",
            80,
            "#f87171"
          ],
          "fill-opacity": 0.36
        }
      });
      map.addLayer({
        id: "district-risk-line",
        type: "line",
        source: "district-risk",
        paint: {
          "line-color": "#67e8f9",
          "line-opacity": 0.7,
          "line-width": 1.5
        }
      });
      map.on("click", "district-risk-fill", (event) => {
        const feature = event.features?.[0];
        if (feature) setSelected(feature as GeoJSON.Feature);
      });
    });
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [compact, data, token]);

  // Extract rankings and activeYear from the global climate context store
  const climateContext = useClimate();
  const activeRankings = climateContext?.rankings ?? [];

  const selectedProps = (selected?.properties ?? features[0]?.properties ?? {}) as Record<string, string | number>;
  const activeRanking = activeRankings.find((r) => r.district_id === Number(selectedProps.district_id));

  // Dynamic values
  const getDynamicRiskVal = (key: string, staticVal: number) => {
    if (!activeRanking) return staticVal;
    if (key === "Flood") return activeRanking.flood_risk;
    if (key === "Drought") return activeRanking.drought_risk;
    if (key === "Heatwave") return activeRanking.heatwave_risk;
    if (key === "Water Stress") return activeRanking.water_stress_risk;
    if (key === "Composite") return activeRanking.composite_risk;
    return staticVal;
  };

  return (
    <div className={compact ? "grid gap-4 lg:grid-cols-[1fr_300px]" : "grid min-h-[calc(100vh-112px)] gap-4 xl:grid-cols-[1fr_340px]"}>
      <div className="relative min-h-[520px] overflow-hidden rounded-lg border border-cyan-300/20 bg-slate-950/70 shadow-glow">
        {token ? (
          <div ref={mapNode} className="h-full min-h-[520px] w-full" />
        ) : (
          <div className="relative h-full min-h-[520px] overflow-hidden bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.20),transparent_34%),linear-gradient(135deg,#061525,#0a2019)]">
            <div className="absolute inset-0 bg-radar-grid bg-[size:40px_40px] opacity-70" />
            {features.map((feature, index) => {
              const props = feature.properties as Record<string, number | string>;
              const left = 18 + (index % 5) * 15 + (index % 2) * 4;
              const top = 15 + Math.floor(index / 5) * 32 + (index % 3) * 8;
              
              const districtRanking = activeRankings.find((x) => x.district_id === Number(props.district_id));
              let val = 50;
              if (districtRanking) {
                if (layer === "flood_risk") val = districtRanking.flood_risk;
                else if (layer === "drought_risk") val = districtRanking.drought_risk;
                else if (layer === "heatwave_risk") val = districtRanking.heatwave_risk;
                else if (layer === "water_stress_risk") val = districtRanking.water_stress_risk;
                else if (layer === "composite_risk") val = districtRanking.composite_risk;
                else val = Number(props[layer] ?? props.composite_risk ?? 50);
              } else {
                val = Number(props[layer] ?? props.composite_risk ?? 50);
              }

              const dotColor = layer.includes("risk") || layer === "composite_risk"
                ? riskFill(val)
                : (layer === "temperature" ? (val >= 38 ? "#f87171" : "#22d3ee")
                : (layer === "rainfall" || layer === "water_bodies" ? "#38bdf8"
                : (layer === "ndvi" ? "#34d399"
                : (layer === "air_quality" ? (val > 150 ? "#f59e0b" : "#22d3ee") : "#2dd4bf"))));

              return (
                <button
                  key={`${props.district}-${index}`}
                  className="map-pulse absolute rounded-full border border-white/50 p-1"
                  style={{
                    left: `${left}%`,
                    top: `${top}%`,
                    backgroundColor: `${dotColor}44`
                  }}
                  onClick={() => setSelected(feature)}
                  title={`${props.district}`}
                >
                  <span
                    className="block h-8 w-8 rounded-full"
                    style={{ backgroundColor: dotColor }}
                  />
                </button>
              );
            })}
            <div className="absolute left-6 top-6 max-w-sm">
              <Badge>Mapbox token optional</Badge>
              <h2 className="mt-3 text-2xl font-semibold text-white">India Climate Risk Mesh</h2>
              <p className="mt-2 text-sm text-slate-300">
                Fallback command view renders dynamic district overlays (Active Year: {climateContext?.activeYear ?? 2025}).
              </p>
            </div>
          </div>
        )}

        <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center gap-2 rounded-md border border-cyan-300/20 bg-slate-950/82 p-2 backdrop-blur">
          <Layers className="h-4 w-4 text-cyan-200" />
          {layerOptions.map((item) => (
            <button
              key={item}
              onClick={() => setLayer(item)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                layer === item ? "bg-cyan-300 text-slate-950" : "bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
            >
              {item.replaceAll("_", " ")}
            </button>
          ))}
        </div>
      </div>

      <Card className="glass-card p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Selected district ({climateContext?.activeYear ?? 2025})</p>
            <h3 className="mt-1 text-xl font-bold text-white">
              {selectedProps.district ?? "Awaiting data"}
            </h3>
            <p className="text-sm text-cyan-200">{selectedProps.state ?? "National view"}</p>
          </div>
          <Button size="icon" variant="outline" aria-label="Locate" onClick={() => setShowSelector(true)} className="border-slate-700 hover:bg-slate-800">
            <LocateFixed className="h-4 w-4 text-slate-300" />
          </Button>
        </div>
        <div className="mt-6 grid gap-4">
          {[
            ["Flood", Number(selectedProps.flood_risk ?? 0)],
            ["Drought", Number(selectedProps.drought_risk ?? 0)],
            ["Heatwave", Number(selectedProps.heatwave_risk ?? 0)],
            ["Water Stress", Number(selectedProps.water_stress_risk ?? 0)],
            ["Composite", Number(selectedProps.composite_risk ?? 0)]
          ].map(([name, staticValue]) => {
            const activeVal = getDynamicRiskVal(name as string, staticValue as number);
            return (
              <div key={name as string}>
                <div className="mb-1.5 flex justify-between text-xs font-medium">
                  <span className="text-slate-300">{name as string}</span>
                  <span className="font-mono font-bold text-white">{Number(activeVal).toFixed(1)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10 border border-white/5">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Number(activeVal)}%`,
                      backgroundColor: riskFill(Number(activeVal)),
                      boxShadow: `0 0 6px ${riskFill(Number(activeVal))}99`
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-6 rounded-lg border border-cyan-300/10 bg-cyan-400/5 p-4 text-xs leading-relaxed text-slate-400">
          Overlays update in real-time as you scrub the projection timeline. Feeds sync with high-res IMD datasets.
        </div>
      </Card>

      {showSelector && (
        <RegionSelectorModal
          districts={allDistricts}
          features={features}
          onSelect={(feature) => setSelected(feature)}
          onClose={() => setShowSelector(false)}
        />
      )}
    </div>
  );
}
