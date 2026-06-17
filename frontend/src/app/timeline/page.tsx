"use client";

import { useState } from "react";
import { AlertTriangle, CalendarRange, Clock, CloudRain, Flame, History, Play } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MOCK_DISTRICTS } from "@/lib/mock/engine";
import { riskColor } from "@/lib/utils";

type TimelineEvent = {
  year: number;
  label: string;
  type: "historical" | "current" | "predicted";
  description: string;
  avgTemp: string;
  avgRain: string;
  riskScore: number;
  alert: string;
  icon: typeof CloudRain;
};

const timelineData: TimelineEvent[] = [
  {
    year: 2018,
    label: "Historical Drought Spell",
    type: "historical",
    description: "Localized delayed monsoon onset of 16 days. Reservoir storage capacity plummeted to an all-time low of 14% across the block.",
    avgTemp: "28.5°C",
    avgRain: "680mm",
    riskScore: 78,
    alert: "Severe agricultural aridity and crop loss reports",
    icon: AlertTriangle
  },
  {
    year: 2021,
    label: "Extreme Coastal Precipitation",
    type: "historical",
    description: "Unprecedented short-duration high-intensity downpours (+140mm in 24 hours), causing severe runoff and river overflow anomalies.",
    avgTemp: "27.1°C",
    avgRain: "1240mm",
    riskScore: 82,
    alert: "Municipal drainage surge warnings",
    icon: CloudRain
  },
  {
    year: 2025,
    label: "Baseline Transition Year",
    type: "current",
    description: "Stabilized monsoon indicators with localized temperature rises. Current ground telemetry aligns with long-term climate baselines.",
    avgTemp: "27.8°C",
    avgRain: "980mm",
    riskScore: 54,
    alert: "Standard monitoring procedures active",
    icon: Clock
  },
  {
    year: 2030,
    label: "SSP2-4.5 Intermediate Projections",
    type: "predicted",
    description: "Projected carbon forcing triggers temperature rise of +0.8°C. Sub-surface moisture depletion accelerates dryland aridity risks.",
    avgTemp: "28.6°C",
    avgRain: "940mm",
    riskScore: 68,
    alert: "Moderate drought warnings and heat index surges",
    icon: Flame
  },
  {
    year: 2040,
    label: "SSP5-8.5 High-Forcing Anomalies",
    type: "predicted",
    description: "Intense spatiotemporal precipitation volatility. Runoff indices are projected to rise by 22%, increasing flash flood exposure.",
    avgTemp: "29.2°C",
    avgRain: "1120mm",
    riskScore: 79,
    alert: "Severe upstream river overflow alerts",
    icon: CloudRain
  },
  {
    year: 2050,
    label: "Thermal Heat Dome Scenario",
    type: "predicted",
    description: "Extreme heat dome frequency increases. Summer max temperatures projected to remain above 45°C for extended 12-day durations.",
    avgTemp: "30.4°C",
    avgRain: "890mm",
    riskScore: 88,
    alert: "Critical heatwave and municipal power grid load warnings",
    icon: Flame
  }
];

export default function TimelinePage() {
  const [districtId, setDistrictId] = useState<number>(101);
  const [activeEventIndex, setActiveEventIndex] = useState<number>(2); // 2025 selected by default

  const district = MOCK_DISTRICTS.find((d) => d.id === districtId) || MOCK_DISTRICTS[0];
  const activeEvent = timelineData[activeEventIndex];

  return (
    <div className="grid gap-5">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <Badge>Climate Projection Timeline</Badge>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal text-white">Climate Evolution Timeline</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-300">
            Trace the transition of district hazard vulnerabilities from historical observation logs (2018) through future deep-forcing projections (2050).
          </p>
        </div>
        <div className="w-full max-w-xs">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Select District</label>
          <select
            value={districtId}
            onChange={(e) => setDistrictId(Number(e.target.value))}
            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2.5 px-4 text-white focus:outline-none focus:border-cyan-400/50 transition-all text-sm"
          >
            {MOCK_DISTRICTS.map((d) => (
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
            <div className="absolute left-[39px] md:left-[59px] top-6 bottom-6 w-0.5 bg-slate-800" />

            <div className="space-y-8 relative">
              {timelineData.map((ev, index) => {
                const Icon = ev.icon;
                const isSelected = index === activeEventIndex;
                const isHist = ev.type === "historical";
                const isPred = ev.type === "predicted";

                // Year indicator classes
                const yearStyle = isHist
                  ? "border-slate-500 bg-slate-900 text-slate-400"
                  : isPred
                  ? "border-cyan-400 bg-cyan-950/20 text-cyan-300 shadow-[0_0_8px_#22d3ee80]"
                  : "border-emerald-400 bg-emerald-950/20 text-emerald-300 shadow-[0_0_8px_#34d39980]";

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
                    <div className={`flex-1 rounded-xl border p-4 transition-all duration-300 ${
                      isSelected
                        ? "border-cyan-400/30 bg-cyan-400/5 shadow-glow"
                        : "border-cyan-300/10 bg-white/[0.01] hover:border-cyan-300/20 hover:bg-white/[0.03]"
                    }`}>
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <h3 className={`font-bold text-sm md:text-base ${
                          isSelected ? "text-white" : "text-slate-300"
                        }`}>{ev.label}</h3>
                        <Badge tone={ev.type === "predicted" ? "critical" : ev.type === "current" ? "moderate" : "default"}>
                          Risk: {ev.riskScore}/100
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed truncate md:whitespace-normal md:line-clamp-2">
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
          <CardHeader className="border-b border-cyan-300/10 pb-4">
            <div className="flex items-center gap-2 text-cyan-300">
              <CalendarRange className="h-5 w-5 animate-pulse" />
              <CardTitle>Milestone: {activeEvent.year}</CardTitle>
            </div>
            <CardDescription>Synthesized telemetry parameters.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6 flex-1">
            <div className="space-y-4">
              <div className="rounded-xl border border-white/5 bg-slate-900/40 p-4">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Meteorological Baseline</span>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">Avg Temp Anomaly</span>
                    <p className="text-lg font-black text-white font-mono">{activeEvent.avgTemp}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">Annual Rainfall</span>
                    <p className="text-lg font-black text-white font-mono">{activeEvent.avgRain}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-white/5 bg-slate-900/40 p-4">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Composite Risk Vector</span>
                <div className="flex items-center gap-3 mt-2">
                  <span className={`text-4xl font-black font-mono ${riskColor(activeEvent.riskScore)}`}>
                    {activeEvent.riskScore}
                  </span>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">Attribution Band</span>
                    <Badge tone={activeEvent.riskScore >= 75 ? "critical" : activeEvent.riskScore >= 50 ? "high" : "moderate"}>
                      {activeEvent.riskScore >= 75 ? "CRITICAL HAZARD" : activeEvent.riskScore >= 50 ? "MONITOR CLOSELY" : "SAFE ZONE"}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-cyan-500/20 bg-cyan-400/5 p-4 text-xs leading-relaxed text-cyan-200 flex gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-cyan-400" />
              <div>
                <span className="font-bold block uppercase tracking-wider text-[9px] text-cyan-300">Hazard Warning</span>
                <p className="mt-1">{activeEvent.alert} for district {district.name}.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
