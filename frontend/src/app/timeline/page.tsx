"use client";

import { useEffect, useState, useMemo } from "react";
import {
  AlertTriangle, CalendarRange, Clock, CloudRain, Flame,
  History, ThermometerSun, Droplets, BarChart3, Database,
  ArrowUp, ArrowDown, Minus, TrendingUp
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import type { District } from "@/lib/types";
import { riskColor } from "@/lib/utils";
import { WorkflowRecommendations } from "@/components/climate/WorkflowRecommendations";
import { useClimate } from "@/store/useClimateStore";

type TimelineEvent = {
  year: number;
  label: string;
  type: "historical" | "current" | "predicted";
  description: string;
  avgTemp: string;
  avgRain: string;
  riskScore: number;
  riskBand?: string;
  alert: string;
  scenario?: string;
  tempDelta?: string;
  dataSource?: string;
  icon?: any;
};

const YEAR_COLORS = {
  historical: {
    badge: "border-slate-400 bg-slate-900/60 text-slate-300",
    card: "border-slate-700/50 bg-slate-900/30 hover:border-slate-600/60",
    selectedCard: "border-slate-400/50 bg-slate-800/40 shadow-[0_0_20px_rgba(148,163,184,0.1)]",
    dot: "bg-slate-400",
    label: "PAST",
  },
  current: {
    badge: "border-emerald-400 bg-emerald-900/30 text-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.3)]",
    card: "border-emerald-600/40 bg-emerald-950/20 hover:border-emerald-500/50",
    selectedCard: "border-emerald-400/60 bg-emerald-950/30 shadow-[0_0_25px_rgba(52,211,153,0.15)]",
    dot: "bg-emerald-400 animate-pulse",
    label: "NOW",
  },
  predicted: {
    badge: "border-amber-400/70 bg-amber-900/20 text-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.2)]",
    card: "border-amber-700/30 bg-amber-950/10 hover:border-amber-600/40",
    selectedCard: "border-amber-400/50 bg-amber-950/20 shadow-[0_0_20px_rgba(251,191,36,0.1)]",
    dot: "bg-amber-400",
    label: "PROJ.",
  },
};

export default function TimelinePage() {
  const { selectedDistrictId, setSelectedDistrictId, selectedStateId, activeYear, setActiveYear, timelineStep, setTimelineStep } = useClimate();
  const [districts, setDistricts] = useState<District[]>([]);
  const [districtId, setDistrictId] = useState<number>(selectedDistrictId || 0);
  const [activeEventIndex, setActiveEventIndex] = useState<number>(3);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([
    { year: 2010, label: "Loading...", type: "historical", description: "", avgTemp: "--", avgRain: "--", riskScore: 0, alert: "" },
    { year: 2015, label: "Loading...", type: "historical", description: "", avgTemp: "--", avgRain: "--", riskScore: 0, alert: "" },
    { year: 2020, label: "Loading...", type: "historical", description: "", avgTemp: "--", avgRain: "--", riskScore: 0, alert: "" },
    { year: 2026, label: "Loading...", type: "current", description: "", avgTemp: "--", avgRain: "--", riskScore: 0, alert: "" },
    { year: 2030, label: "Loading...", type: "predicted", description: "", avgTemp: "--", avgRain: "--", riskScore: 0, alert: "" },
    { year: 2040, label: "Loading...", type: "predicted", description: "", avgTemp: "--", avgRain: "--", riskScore: 0, alert: "" },
    { year: 2050, label: "Loading...", type: "predicted", description: "", avgTemp: "--", avgRain: "--", riskScore: 0, alert: "" },
  ]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.districts()
      .then((data) => {
        setDistricts(data);
        if (data.length > 0) {
          if (selectedDistrictId) {
            setDistrictId(selectedDistrictId);
          } else {
            setDistrictId(data[0].id);
          }
        }
      })
      .catch(() => undefined);
  }, []);

  // Sync global selectedDistrictId and selectedStateId changes down to local state
  useEffect(() => {
    if (selectedDistrictId) {
      if (selectedDistrictId !== districtId) {
        setDistrictId(selectedDistrictId);
      }
    } else if (selectedStateId && districts.length > 0) {
      const items = districts.filter(d => d.state_id === Number(selectedStateId));
      if (items.length > 0) {
        const currentInState = items.some(item => item.id === districtId);
        if (!currentInState) {
          const defaultId = items[0].id;
          setDistrictId(defaultId);
          setSelectedDistrictId(defaultId);
        }
      }
    }
  }, [selectedDistrictId, selectedStateId, districts]);

  // Sync local districtId changes back to global context
  useEffect(() => {
    if (districtId && selectedDistrictId !== districtId) {
      setSelectedDistrictId(districtId);
    }
  }, [districtId]);

  // Sync global activeYear to local activeEventIndex
  useEffect(() => {
    if (timelineEvents.length > 0) {
      const idx = timelineEvents.findIndex((ev) => ev.year === activeYear);
      if (idx !== -1 && idx !== activeEventIndex) {
        setActiveEventIndex(idx);
      }
    }
  }, [activeYear, timelineEvents]);

  const handleSelectEventIndex = (index: number) => {
    setActiveEventIndex(index);
    const selectedYear = timelineEvents[index]?.year;
    if (selectedYear && selectedYear !== activeYear) {
      setActiveYear(selectedYear);
      if (selectedYear === 2030) {
        setTimelineStep("2030");
      } else if (selectedYear === 2026) {
        setTimelineStep("today");
      }
    }
  };

  useEffect(() => {
    if (!districtId) return;
    setLoading(true);
    api.timeline(districtId)
      .then((data) => {
        setTimelineEvents(data);
        // Auto-select 2026 (current) on load
        const currentIdx = data.findIndex((ev: TimelineEvent) => ev.type === "current");
        if (currentIdx !== -1) setActiveEventIndex(currentIdx);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [districtId]);

  const filteredDistrictsList = useMemo(() => {
    if (!selectedStateId) return districts;
    return districts.filter((d) => d.state_id === Number(selectedStateId));
  }, [districts, selectedStateId]);

  const district = districts.find((d) => d.id === districtId);
  const activeEvent = timelineEvents[activeEventIndex] || timelineEvents[3];

  const getRiskLabel = (score: number) => {
    if (score >= 75) return "CRITICAL HAZARD";
    if (score >= 55) return "HIGH RISK";
    if (score >= 35) return "MODERATE";
    return "SAFE ZONE";
  };

  const getRiskTone = (score: number) => {
    if (score >= 75) return "critical";
    if (score >= 55) return "high";
    return "moderate";
  };

  const getTempIcon = (delta?: string) => {
    if (!delta || delta === "Observed baseline") return <Minus className="h-3 w-3 text-slate-400" />;
    if (delta.startsWith("+")) return <ArrowUp className="h-3 w-3 text-red-400" />;
    if (delta.startsWith("-")) return <ArrowDown className="h-3 w-3 text-blue-400" />;
    return <Minus className="h-3 w-3 text-slate-400" />;
  };

  if (!district) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <Clock className="h-8 w-8 mx-auto mb-3 animate-pulse opacity-40" />
        Loading district data...
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <Badge>Paryavaran Projection Timeline</Badge>
          <h1 className="mt-3 text-3xl font-semibold text-white font-sans tracking-tight">
            Paryavaran Evolution Timeline
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-secondary-foreground">
            Trace district climate evolution from historical baselines (2010) through IPCC SSP2-4.5 future projections (2050).
            Historical values are reconstructed from baseline deltas; future values use IPCC AR6 forcing scenarios.
          </p>
        </div>
        <div className="w-full max-w-xs">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Select District</label>
          <select
            value={districtId}
            onChange={(e) => setDistrictId(Number(e.target.value))}
            className="w-full bg-surface/50 border border-slate-700 rounded-lg py-2.5 px-4 text-white focus:outline-none focus:border-white/[0.08] transition-all text-sm"
          >
            {filteredDistrictsList.map((d) => (
              <option key={d.id} value={d.id}>{d.name}, {d.state_name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-slate-400" /> Historical (Reconstructed)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> Present (IMD/ISRO Observed)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-400" /> Projected (IPCC SSP2-4.5)
        </span>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        {/* Interactive Timeline Track */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Historical vs Projected Evolution</CardTitle>
            <CardDescription>
              Click any milestone year to load climate parameters. Values for non-2026 years are
              synthesized using real 2026 baseline data + IPCC AR6 climate delta offsets.
            </CardDescription>
          </CardHeader>
          <CardContent className="relative pl-8 md:pl-20 py-5">
            {/* Vertical Track Line */}
            <div className="absolute left-[39px] md:left-[59px] top-6 bottom-6 w-0.5 bg-surface-elevated" />

            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm rounded-xl z-10">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <TrendingUp className="h-4 w-4 animate-pulse text-brand-blue" />
                  Computing climate timeline...
                </div>
              </div>
            )}

            <div className="space-y-5 relative">
              {timelineEvents.map((ev, index) => {
                const isSelected = index === activeEventIndex;
                const colors = YEAR_COLORS[ev.type as keyof typeof YEAR_COLORS] || YEAR_COLORS.historical;

                return (
                  <div
                    key={ev.year}
                    onClick={() => handleSelectEventIndex(index)}
                    className={`flex items-start gap-4 md:gap-6 cursor-pointer group transition-all duration-300 ${
                      isSelected ? "translate-x-1" : "hover:translate-x-0.5"
                    }`}
                  >
                    {/* Year badge */}
                    <div className={`relative z-10 w-14 h-14 md:w-16 md:h-16 shrink-0 rounded-full border-2 flex flex-col items-center justify-center transition-all ${colors.badge} ${
                      isSelected ? "scale-110" : "scale-100 opacity-60 group-hover:opacity-100"
                    }`}>
                      <span className="text-xs font-black font-sans leading-none">{ev.year}</span>
                      <span className="text-[7px] uppercase tracking-wider font-semibold font-sans mt-1">
                        {colors.label}
                      </span>
                    </div>

                    {/* Description card */}
                    <div className={`flex-1 rounded-2xl border p-4 transition-all duration-300 ${
                      isSelected ? colors.selectedCard : colors.card
                    }`}>
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <h3 className={`font-bold text-sm md:text-base ${
                          isSelected ? "text-white" : "text-secondary-foreground"
                        }`}>{ev.label}</h3>
                        <div className="flex items-center gap-2">
                          {ev.tempDelta && ev.tempDelta !== "Observed baseline" && (
                            <span className={`text-[10px] font-mono flex items-center gap-0.5 ${
                              ev.tempDelta.startsWith("+") ? "text-red-400" : "text-blue-400"
                            }`}>
                              {getTempIcon(ev.tempDelta)}
                              {ev.tempDelta.split(" ")[0]}
                            </span>
                          )}
                          <Badge tone={getRiskTone(ev.riskScore) as any}>
                            Risk: {ev.riskScore}/100
                          </Badge>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 md:line-clamp-3">
                        {ev.description}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-3">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <ThermometerSun className="h-3 w-3 text-orange-400" />
                          {ev.avgTemp}
                        </span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Droplets className="h-3 w-3 text-blue-400" />
                          {ev.avgRain}
                        </span>
                        {ev.dataSource && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Database className="h-3 w-3 text-slate-400" />
                            {ev.dataSource}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Selected Year Detail Panel */}
        <Card className="glass-card flex flex-col justify-between scanline">
          <CardHeader className="border-b border-white/[0.08] pb-4">
            <div className="flex items-center gap-2 text-brand-titanium">
              <CalendarRange className="h-5 w-5 animate-pulse" />
              <CardTitle>Milestone: {activeEvent.year}</CardTitle>
            </div>
            <CardDescription>
              {activeEvent.type === "current"
                ? "IMD/ISRO Observed Data — Present Baseline"
                : activeEvent.type === "historical"
                ? "Reconstructed Historical Model"
                : "IPCC AR6 SSP2-4.5 Projection"}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-5 space-y-4 flex-1">

            {/* Label + Scenario Tag */}
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-bold text-white leading-snug">{activeEvent.label}</p>
              {activeEvent.dataSource && (
                <span className="text-[9px] uppercase tracking-wider bg-slate-800 border border-slate-700 text-slate-300 rounded px-2 py-0.5 shrink-0">
                  {activeEvent.dataSource}
                </span>
              )}
            </div>

            {/* Temp + Rain block */}
            <div className="rounded-2xl border border-white/5 bg-surface/40 p-4">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold block mb-3">Meteorological Baseline</span>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-muted-foreground block font-sans flex items-center gap-1">
                    <ThermometerSun className="h-3 w-3 text-orange-400" />
                    Mean Temperature
                  </span>
                  <p className="text-2xl font-black text-white font-mono mt-1">{activeEvent.avgTemp}</p>
                  {activeEvent.tempDelta && (
                    <p className={`text-[10px] font-mono mt-0.5 flex items-center gap-0.5 ${
                      activeEvent.tempDelta.startsWith("+") ? "text-red-400" : 
                      activeEvent.tempDelta.startsWith("-") ? "text-blue-400" : "text-slate-400"
                    }`}>
                      {getTempIcon(activeEvent.tempDelta)}
                      {activeEvent.tempDelta}
                    </p>
                  )}
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block font-sans flex items-center gap-1">
                    <Droplets className="h-3 w-3 text-blue-400" />
                    Annual Rainfall
                  </span>
                  <p className="text-2xl font-black text-white font-mono mt-1">{activeEvent.avgRain}</p>
                </div>
              </div>
            </div>

            {/* Risk Score Block */}
            <div className="rounded-2xl border border-white/5 bg-surface/40 p-4">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold block mb-3">Composite Risk Vector</span>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <span className={`text-5xl font-black font-mono ${riskColor(activeEvent.riskScore)}`}>
                    {activeEvent.riskScore}
                  </span>
                  <span className="text-slate-500 text-base font-mono">/100</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block font-sans">Attribution Band</span>
                  <Badge tone={getRiskTone(activeEvent.riskScore) as any} className="mt-1">
                    {getRiskLabel(activeEvent.riskScore)}
                  </Badge>
                </div>
              </div>

              {/* Risk bar */}
              <div className="mt-3 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    activeEvent.riskScore >= 75 ? "bg-red-500" :
                    activeEvent.riskScore >= 55 ? "bg-amber-500" :
                    activeEvent.riskScore >= 35 ? "bg-yellow-400" : "bg-emerald-400"
                  }`}
                  style={{ width: `${activeEvent.riskScore}%` }}
                />
              </div>
            </div>

            {/* Description */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <p className="text-xs text-slate-300 leading-relaxed">{activeEvent.description}</p>
            </div>

            {/* Alert */}
            <div className={`rounded-lg border p-4 text-xs leading-relaxed flex gap-2 ${
              activeEvent.type === "predicted"
                ? "border-amber-500/30 bg-amber-950/10 text-amber-200"
                : activeEvent.type === "current"
                ? "border-emerald-500/30 bg-emerald-950/10 text-emerald-200"
                : "border-slate-600/30 bg-slate-900/20 text-slate-300"
            }`}>
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block uppercase tracking-wider text-[9px] opacity-70">
                  {activeEvent.type === "predicted" ? "Projection Advisory" : 
                   activeEvent.type === "current" ? "Live Status" : "Historical Record"}
                </span>
                <p className="mt-1">{activeEvent.alert}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <WorkflowRecommendations currentPage="timeline" />
    </div>
  );
}
