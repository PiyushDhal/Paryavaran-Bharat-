"use client";

import { useEffect, useState, useMemo } from "react";
import { AlertTriangle, CalendarRange, Clock, CloudRain, Flame, History, Play } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import type { District, ClimateObservation } from "@/lib/types";
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
  alert: string;
  icon: any;
};

export default function TimelinePage() {
  const { selectedDistrictId, setSelectedDistrictId } = useClimate();
  const [districts, setDistricts] = useState<District[]>([]);
  const [districtId, setDistrictId] = useState<number>(selectedDistrictId || 0);
  const [activeEventIndex, setActiveEventIndex] = useState<number>(3); // 2026 selected by default (index 3 of [2010, 2015, 2020, 2026, 2030, 2040, 2050])
  const [timelineEvents, setTimelineEvents] = useState<any[]>([
    { year: 2010, label: "Loading...", type: "historical", description: "", avgTemp: "27.8°C", avgRain: "980mm", riskScore: 54, alert: "" },
    { year: 2015, label: "Loading...", type: "historical", description: "", avgTemp: "27.8°C", avgRain: "980mm", riskScore: 54, alert: "" },
    { year: 2020, label: "Loading...", type: "historical", description: "", avgTemp: "27.8°C", avgRain: "980mm", riskScore: 54, alert: "" },
    { year: 2026, label: "Loading...", type: "current", description: "", avgTemp: "27.8°C", avgRain: "980mm", riskScore: 54, alert: "" },
    { year: 2030, label: "Loading...", type: "predicted", description: "", avgTemp: "27.8°C", avgRain: "980mm", riskScore: 54, alert: "" },
    { year: 2040, label: "Loading...", type: "predicted", description: "", avgTemp: "27.8°C", avgRain: "980mm", riskScore: 54, alert: "" },
    { year: 2050, label: "Loading...", type: "predicted", description: "", avgTemp: "27.8°C", avgRain: "980mm", riskScore: 54, alert: "" },
  ]);

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

  // Sync global selectedDistrictId changes down to local state
  useEffect(() => {
    if (selectedDistrictId && selectedDistrictId !== districtId) {
      setDistrictId(selectedDistrictId);
    }
  }, [selectedDistrictId]);

  // Sync local districtId changes back to global context
  useEffect(() => {
    if (districtId && selectedDistrictId !== districtId) {
      setSelectedDistrictId(districtId);
    }
  }, [districtId]);

  useEffect(() => {
    if (!districtId) return;
    api.timeline(districtId)
      .then((data) => {
        setTimelineEvents(data);
      })
      .catch(() => undefined);
  }, [districtId]);

  const timelineData = useMemo(() => {
    return timelineEvents.map((ev) => {
      let icon = Clock;
      if (ev.year === 2020) icon = CloudRain;
      else if (ev.year === 2030) icon = Flame;
      else if (ev.year === 2040) icon = CloudRain;
      else if (ev.year === 2050) icon = Flame;

      if (ev.riskScore >= 75) {
        icon = AlertTriangle;
      }

      return {
        ...ev,
        icon,
      };
    });
  }, [timelineEvents]);

  const district = districts.find((d) => d.id === districtId);
  const activeEvent = timelineData[activeEventIndex] || {
    year: 2026,
    label: "Baseline Transition Year",
    type: "current",
    description: "Stabilized monsoon indicators with localized temperature rises.",
    avgTemp: "27.8°C",
    avgRain: "980mm",
    riskScore: 54,
    alert: "Standard monitoring procedures active",
    icon: Clock,
  };

  if (!district) {
    return <div className="text-center py-20 text-muted-foreground">Loading districts data...</div>;
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <Badge>Climate Projection Timeline</Badge>
          <h1 className="mt-3 text-3xl font-semibold text-white font-orbitron tracking-[0.12em] uppercase">Climate Evolution Timeline</h1>
          <p className="mt-2 max-w-3xl text-sm text-secondary-foreground">
            Trace the transition of district hazard vulnerabilities from historical observation logs (2018) through future deep-forcing projections (2050).
          </p>
        </div>
        <div className="w-full max-w-xs">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Select District</label>
          <select
            value={districtId}
            onChange={(e) => setDistrictId(Number(e.target.value))}
            className="w-full bg-surface/50 border border-slate-700 rounded-lg py-2.5 px-4 text-white focus:outline-none focus:border-white/[0.08] transition-all text-sm"
          >
            {districts.map((d) => (
              <option key={d.id} value={d.id}>{d.name}, {d.state_name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        {/* Interactive Timeline Track */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Historical vs Projected Evolution</CardTitle>
            <CardDescription>Click on any milestone year to load regional dataset breakdowns.</CardDescription>
          </CardHeader>
          <CardContent className="relative pl-8 md:pl-20 py-5">
            {/* Vertical Track Line */}
            <div className="absolute left-[39px] md:left-[59px] top-6 bottom-6 w-0.5 bg-surface-elevated" />

            <div className="space-y-8 relative">
              {timelineData.map((ev, index) => {
                const Icon = ev.icon;
                const isSelected = index === activeEventIndex;
                const isHist = ev.type === "historical";
                const isPred = ev.type === "predicted";

                // Year indicator classes
                const yearStyle = isHist
                  ? "border-slate-500 bg-surface text-muted-foreground"
                  : isPred
                  ? "border-emerald-400 bg-brand-blue/10 text-brand-titanium shadow-[0_0_8px_#4DA8DA80]"
                  : "border-emerald-400 bg-brand-blue/10 text-brand-titanium shadow-[0_0_8px_#34d39980]";

                return (
                  <div
                    key={ev.year}
                    onClick={() => setActiveEventIndex(index)}
                    className={`flex items-start gap-4 md:gap-6 cursor-pointer group transition-all duration-300 ${
                      isSelected ? "translate-x-1" : "hover:translate-x-0.5"
                    }`}
                  >
                    {/* Year badge */}
                    <div className={`relative z-10 w-14 h-14 md:w-16 md:h-16 shrink-0 rounded-full border-2 flex flex-col items-center justify-center transition-all ${yearStyle} ${
                      isSelected ? "scale-110" : "scale-100 opacity-60 group-hover:opacity-100"
                    }`}>
                      <span className="text-xs font-black font-sans leading-none">{ev.year}</span>
                      <span className="text-[7px] uppercase tracking-wider font-semibold font-sans mt-1">
                        {ev.type === "current" ? "NOW" : ev.type}
                      </span>
                    </div>

                    {/* Description card snippet */}
                    <div className={`flex-1 rounded-2xl border p-4 transition-all duration-300 ${
                      isSelected
                        ? "border-white/[0.08] bg-brand-blue/10 shadow-glow"
                        : "border-white/[0.08] bg-white/[0.01] hover:border-white/[0.08] hover:bg-white/[0.03]"
                    }`}>
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <h3 className={`font-bold text-sm md:text-base ${
                          isSelected ? "text-white" : "text-secondary-foreground"
                        }`}>{ev.label}</h3>
                        <Badge tone={ev.type === "predicted" ? "critical" : ev.type === "current" ? "moderate" : "default"}>
                          Risk: {ev.riskScore}/100
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed truncate md:whitespace-normal md:line-clamp-2">
                        {ev.description}
                      </p>
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
            <CardDescription>Synthesized climate parameters.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6 flex-1">
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/5 bg-surface/40 p-4">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Meteorological Baseline</span>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <span className="text-[10px] text-muted-foreground block font-sans">Avg Temp Anomaly</span>
                    <p className="text-lg font-black text-white font-mono">{activeEvent.avgTemp}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block font-sans">Annual Rainfall</span>
                    <p className="text-lg font-black text-white font-mono">{activeEvent.avgRain}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/5 bg-surface/40 p-4">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Composite Risk Vector</span>
                <div className="flex items-center gap-3 mt-2">
                  <span className={`text-4xl font-black font-mono ${riskColor(activeEvent.riskScore)}`}>
                    {activeEvent.riskScore}
                  </span>
                  <div>
                    <span className="text-[10px] text-muted-foreground block font-sans">Attribution Band</span>
                    <Badge tone={activeEvent.riskScore >= 75 ? "critical" : activeEvent.riskScore >= 50 ? "high" : "moderate"}>
                      {activeEvent.riskScore >= 75 ? "CRITICAL HAZARD" : activeEvent.riskScore >= 50 ? "MONITOR CLOSELY" : "SAFE ZONE"}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-white/[0.08] bg-brand-blue/10 p-4 text-xs leading-relaxed text-emerald-200 flex gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-brand-blue" />
              <div>
                <span className="font-bold block uppercase tracking-wider text-[9px] text-brand-titanium">Hazard Warning</span>
                <p className="mt-1">{activeEvent.alert} for district {district.name}.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <WorkflowRecommendations currentPage="timeline" />

    </div>
  );
}
