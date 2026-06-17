"use client";

import { useEffect, useState, useMemo } from "react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import { Check, Leaf, ShieldAlert, Sparkles, Wind } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MOCK_DISTRICTS, generateRankings, generateHistory } from "@/lib/mock/engine";
import { riskColor } from "@/lib/utils";

export default function SustainabilityPage() {
  const [districtId, setDistrictId] = useState<number>(101);
  const [year, setYear] = useState<number>(2025);

  const district = MOCK_DISTRICTS.find((d) => d.id === districtId) || MOCK_DISTRICTS[0];
  const rankings = useMemo(() => generateRankings(year), [year]);
  const ranking = rankings.find((r) => r.district_id === districtId) || rankings[0];

  // Derive vegetation, air, water variables from the mock history
  const historyData = useMemo(() => generateHistory(districtId, year), [districtId, year]);

  const metrics = useMemo(() => {
    const avgNdvi = historyData.reduce((acc, obs) => acc + (obs.ndvi ?? 0.5), 0) / historyData.length;
    const avgAqi = historyData.reduce((acc, obs) => acc + (obs.aqi ?? 100), 0) / historyData.length;
    const avgReservoir = historyData.reduce((acc, obs) => acc + (obs.reservoir_level_pct ?? 50), 0) / historyData.length;

    // Convert variables to 0-100 indicators where higher is better (sustainable)
    const ndviScore = Math.round(avgNdvi * 100);
    const aqiScore = Math.max(0, Math.min(100, Math.round(100 - (avgAqi - 50) * 0.4)));
    const reservoirScore = Math.round(avgReservoir);
    const safetyScore = Math.round(100 - ranking.composite_risk); // Safety is inverted risk
    const soilScore = Math.max(10, Math.min(100, Math.round(100 - ranking.drought_risk * 0.8)));

    const compositeIndex = Math.round(ndviScore * 0.25 + aqiScore * 0.2 + reservoirScore * 0.2 + safetyScore * 0.2 + soilScore * 0.15);

    return {
      ndvi: avgNdvi.toFixed(2),
      aqi: Math.round(avgAqi),
      reservoir: Math.round(avgReservoir),
      ndviScore,
      aqiScore,
      reservoirScore,
      safetyScore,
      soilScore,
      compositeIndex
    };
  }, [historyData, ranking]);

  const radarData = [
    { subject: "Forest Cover", value: metrics.ndviScore, fullMark: 100 },
    { subject: "Air Quality", value: metrics.aqiScore, fullMark: 100 },
    { subject: "Water Storage", value: metrics.reservoirScore, fullMark: 100 },
    { subject: "Soil Health", value: metrics.soilScore, fullMark: 100 },
    { subject: "Climate Safety", value: metrics.safetyScore, fullMark: 100 }
  ];

  const sustainabilityAdvisories = useMemo(() => {
    const tips = [];
    if (metrics.compositeIndex < 50) {
      tips.push("Critical Action: Launch emergency afforestation grid setup (e.g. Miyawaki mini-forest layouts) to boost local carbon absorption and arrest soil erosion.");
    } else {
      tips.push("Conservation Mode: Sustain carbon credit programs and enforce green corridor expansions near city limits.");
    }

    if (metrics.reservoirScore < 45) {
      tips.push("Hydrological Relief: Mandate industrial micro-irrigation upgrades and deploy block-level water recycle loops.");
    } else {
      tips.push("Hydrological Safety: Manage reservoir headroom controls during monsoon peak runoff to prevent flash discharges.");
    }

    if (metrics.aqiScore < 50) {
      tips.push("Air Clean Directive: Install clean-air scrubbers in proximity to commercial hubs and incentivize transition to electric municipal transport.");
    }

    return tips;
  }, [metrics]);

  return (
    <div className="grid gap-5">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <Badge>Environmental Benchmarks</Badge>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal text-white">Sustainability Index</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-300">
            Monitor a calculated composite index evaluating forest density, air protection, reservoir capacity, and systemic climate risks.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <select
            value={districtId}
            onChange={(e) => setDistrictId(Number(e.target.value))}
            className="bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 text-white focus:outline-none text-xs"
          >
            {MOCK_DISTRICTS.map((d) => (
              <option key={d.id} value={d.id}>{d.name}, {d.state_name}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 text-white focus:outline-none text-xs"
          >
            {[2020, 2025, 2030, 2040, 2050].map((y) => (
              <option key={y} value={y}>{y} AD</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        {/* Gauge Card */}
        <Card className="glass-card flex flex-col justify-between items-center text-center p-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-white">Index Benchmark</CardTitle>
            <CardDescription>Composite Sustainability Score</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 w-full flex flex-col items-center">
            {/* Index Ring Gauge */}
            <div className="relative w-44 h-44 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                <circle
                  cx="60" cy="60" r="50"
                  fill="transparent"
                  stroke={metrics.compositeIndex >= 70 ? "#10b981" : metrics.compositeIndex >= 50 ? "#06b6d4" : "#f59e0b"}
                  strokeWidth="8"
                  strokeDasharray={2 * Math.PI * 50}
                  strokeDashoffset={2 * Math.PI * 50 * (1 - metrics.compositeIndex / 100)}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                  style={{ filter: `drop-shadow(0 0 6px ${metrics.compositeIndex >= 70 ? "#10b981" : "#06b6d4"}aa)` }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-black text-white">{metrics.compositeIndex}</span>
                <span className="text-[9px] uppercase tracking-widest font-extrabold text-slate-400 mt-1">Sustainability</span>
              </div>
            </div>

            {/* Scorecard metrics */}
            <div className="grid grid-cols-2 gap-3 w-full text-left text-xs text-slate-300">
              <div className="p-3 rounded-lg bg-slate-900/40 border border-white/5">
                <span className="text-[9px] text-slate-500 font-bold block uppercase">Forest Index</span>
                <p className="mt-1 font-bold text-white font-mono">{metrics.ndvi} NDVI</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-900/40 border border-white/5">
                <span className="text-[9px] text-slate-500 font-bold block uppercase">Air Protection</span>
                <p className="mt-1 font-bold text-white font-mono">{metrics.aqi} AQI</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-900/40 border border-white/5">
                <span className="text-[9px] text-slate-500 font-bold block uppercase">Water Reserves</span>
                <p className="mt-1 font-bold text-white font-mono">{metrics.reservoir}% Level</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-900/40 border border-white/5">
                <span className="text-[9px] text-slate-500 font-bold block uppercase">Safety Buffer</span>
                <p className="mt-1 font-bold text-white font-mono">{metrics.safetyScore}/100</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Radar Chart Card */}
        <Card className="glass-card flex flex-col justify-between">
          <CardHeader>
            <CardTitle>5-Pillar Sustainability Balance</CardTitle>
            <CardDescription>Radar map showing balance across ecological and safety indices.</CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-6 items-center">
            {/* Recharts Radar Chart */}
            <div className="w-full h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                  <PolarGrid stroke="rgba(148,163,184,0.15)" />
                  <PolarAngleAxis dataKey="subject" stroke="#94a3b8" tick={{ fontSize: 10 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 8 }} />
                  <Radar name="Index" dataKey="value" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Policy Recommendations */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4" />
                Policy Recommendations
              </h4>
              <div className="space-y-2.5">
                {sustainabilityAdvisories.map((tip, index) => (
                  <div key={index} className="flex gap-2 p-3 rounded-lg border border-emerald-500/15 bg-emerald-400/5 text-xs text-slate-300 leading-relaxed">
                    <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400 mt-0.5" />
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
