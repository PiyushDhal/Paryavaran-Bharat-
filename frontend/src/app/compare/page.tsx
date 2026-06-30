"use client";

import { useEffect, useState, useMemo } from "react";
import { BarChart, Bar, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, ArrowLeftRight, Check, Droplets, Flame, HelpCircle, Layers3 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import type { District, RiskScore } from "@/lib/types";
import { riskColor } from "@/lib/utils";
import { useClimate } from "@/store/useClimateStore";
import { WorkflowRecommendations } from "@/components/climate/WorkflowRecommendations";

export default function ComparePage() {
  const { activeYear, selectedDistrictId, setSelectedDistrictId } = useClimate();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [districts, setDistricts] = useState<District[]>([]);
  const [districtIdA, setDistrictIdA] = useState<number | undefined>(undefined);
  const [districtIdB, setDistrictIdB] = useState<number | undefined>(undefined);
  const [year, setYear] = useState<number>(2026);

  // Sync year state with activeYear from context
  useEffect(() => {
    setYear(activeYear);
  }, [activeYear]);

  // Sync selectedDistrictId from global context to districtIdA
  useEffect(() => {
    if (selectedDistrictId && selectedDistrictId !== districtIdA) {
      setDistrictIdA(selectedDistrictId);
    }
  }, [selectedDistrictId]);

  // Sync districtIdA back to selectedDistrictId
  useEffect(() => {
    if (districtIdA && selectedDistrictId !== districtIdA) {
      setSelectedDistrictId(districtIdA);
    }
  }, [districtIdA]);

  const [riskA, setRiskA] = useState<RiskScore | null>(null);
  const [riskB, setRiskB] = useState<RiskScore | null>(null);
  const [trendsA, setTrendsA] = useState<Array<Record<string, number | string>>>([]);
  const [trendsB, setTrendsB] = useState<Array<Record<string, number | string>>>([]);

  useEffect(() => {
    api.districts()
      .then((data) => {
        setDistricts(data);
        let dA: number | undefined = undefined;
        let dB: number | undefined = undefined;
        if (typeof window !== "undefined") {
          const params = new URLSearchParams(window.location.search);
          const paramA = params.get("districtA");
          const paramB = params.get("districtB");
          if (paramA) dA = Number(paramA);
          if (paramB) dB = Number(paramB);
        }
        
        if (data.length > 0) {
          const matchedA = dA && data.some(d => d.id === dA) ? dA : (selectedDistrictId || data[0].id);
          const matchedB = dB && data.some(d => d.id === dB) ? dB : (data[1] ? data[1].id : data[0].id);
          setDistrictIdA(matchedA);
          setDistrictIdB(matchedB);
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (districtIdA === undefined) return;
    api.risk(districtIdA).then(setRiskA).catch(() => undefined);
    api.riskTrends(districtIdA).then(setTrendsA).catch(() => undefined);
  }, [districtIdA]);

  useEffect(() => {
    if (districtIdB === undefined) return;
    api.risk(districtIdB).then(setRiskB).catch(() => undefined);
    api.riskTrends(districtIdB).then(setTrendsB).catch(() => undefined);
  }, [districtIdB]);

  const districtA = useMemo(() => {
    return districts.find((d) => d.id === districtIdA);
  }, [districts, districtIdA]);

  const districtB = useMemo(() => {
    return districts.find((d) => d.id === districtIdB);
  }, [districts, districtIdB]);

  const rankingA = useMemo(() => {
    if (!riskA) return null;
    const matchedTrend = trendsA.find((t) => typeof t.date === "string" && t.date.startsWith(year.toString()));
    if (matchedTrend) {
      return {
        flood_risk: Number(matchedTrend.flood),
        drought_risk: Number(matchedTrend.drought),
        heatwave_risk: Number(matchedTrend.heatwave),
        water_stress_risk: Number(matchedTrend.water_stress),
        composite_risk: Number(matchedTrend.composite),
      };
    }
    return {
      flood_risk: riskA.flood_risk,
      drought_risk: riskA.drought_risk,
      heatwave_risk: riskA.heatwave_risk,
      water_stress_risk: riskA.water_stress_risk,
      composite_risk: riskA.composite_risk,
    };
  }, [riskA, trendsA, year]);

  const rankingB = useMemo(() => {
    if (!riskB) return null;
    const matchedTrend = trendsB.find((t) => typeof t.date === "string" && t.date.startsWith(year.toString()));
    if (matchedTrend) {
      return {
        flood_risk: Number(matchedTrend.flood),
        drought_risk: Number(matchedTrend.drought),
        heatwave_risk: Number(matchedTrend.heatwave),
        water_stress_risk: Number(matchedTrend.water_stress),
        composite_risk: Number(matchedTrend.composite),
      };
    }
    return {
      flood_risk: riskB.flood_risk,
      drought_risk: riskB.drought_risk,
      heatwave_risk: riskB.heatwave_risk,
      water_stress_risk: riskB.water_stress_risk,
      composite_risk: riskB.composite_risk,
    };
  }, [riskB, trendsB, year]);

  const chartData = useMemo(() => {
    if (!districtA || !districtB || !rankingA || !rankingB) return [];
    return [
      { name: "Flood Risk", [districtA.name]: rankingA.flood_risk, [districtB.name]: rankingB.flood_risk },
      { name: "Drought Risk", [districtA.name]: rankingA.drought_risk, [districtB.name]: rankingB.drought_risk },
      { name: "Heatwave Risk", [districtA.name]: rankingA.heatwave_risk, [districtB.name]: rankingB.heatwave_risk },
      { name: "Water Stress", [districtA.name]: rankingA.water_stress_risk, [districtB.name]: rankingB.water_stress_risk },
      { name: "Composite Risk", [districtA.name]: rankingA.composite_risk, [districtB.name]: rankingB.composite_risk }
    ];
  }, [districtA, districtB, rankingA, rankingB]);

  const comparisonAdvisory = useMemo(() => {
    if (!districtA || !districtB || !rankingA || !rankingB) return [];
    const lines = [];
    if (Math.abs(rankingA.composite_risk - rankingB.composite_risk) < 10) {
      lines.push(`Both ${districtA.name} and ${districtB.name} display similar composite risk profiles (${rankingA.composite_risk} vs ${rankingB.composite_risk}), though their underlying hazard drivers differ.`);
    } else {
      const riskier = rankingA.composite_risk > rankingB.composite_risk ? districtA.name : districtB.name;
      const safer = rankingA.composite_risk > rankingB.composite_risk ? districtB.name : districtA.name;
      lines.push(`${riskier} presents a significantly elevated composite climate threat compared to ${safer} (+${Math.abs(rankingA.composite_risk - rankingB.composite_risk)} points).`);
    }

    if (rankingA.flood_risk > 70 && rankingB.flood_risk < 40) {
      lines.push(`Hydrological alert: ${districtA.name} has severe flood risk (${rankingA.flood_risk}/100) driven by high monsoon precipitation, whereas ${districtB.name} is relatively protected.`);
    } else if (rankingB.flood_risk > 70 && rankingA.flood_risk < 40) {
      lines.push(`Hydrological alert: ${districtB.name} has severe flood risk (${rankingB.flood_risk}/100) driven by high monsoon precipitation, whereas ${districtA.name} is relatively protected.`);
    }

    if (rankingA.drought_risk > 70 && rankingB.drought_risk < 40) {
      lines.push(`Aridity threat: ${districtA.name} reports critical drought vulnerability (${rankingA.drought_risk}/100) driven by soil moisture depletion, unlike ${districtB.name}.`);
    } else if (rankingB.drought_risk > 70 && rankingA.drought_risk < 40) {
      lines.push(`Aridity threat: ${districtB.name} reports critical drought vulnerability (${rankingB.drought_risk}/100) driven by soil moisture depletion, unlike ${districtA.name}.`);
    }

    return lines;
  }, [rankingA, rankingB, districtA, districtB]);

  if (!districtA || !districtB || !rankingA || !rankingB) {
    return <div className="text-center py-20 text-muted-foreground">Loading comparison datasets...</div>;
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <Badge>Climate Intelligence Toolkit</Badge>
          <h1 className="mt-3 text-3xl font-semibold text-white font-sans tracking-tight">Cross-District Risk Comparison</h1>
          <p className="mt-2 max-w-3xl text-sm text-secondary-foreground">
            Compare two district risk matrices side-by-side to understand relative vulnerabilities, exposures, and policy requirements.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-surface/50 border border-slate-700 rounded-lg p-2">
          <span className="text-xs text-muted-foreground font-semibold px-2 uppercase">Scenario Year</span>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="bg-background border border-slate-700 rounded px-2.5 py-1 text-xs text-emerald-200 focus:outline-none"
          >
            {[2010, 2015, 2020, 2026, 2030, 2040, 2050].map((y) => (
              <option key={y} value={y}>{y} AD</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* District Selectors */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Layers3 className="h-5 w-5 text-brand-blue" />
              Select Primary District (A)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <select
              value={districtIdA}
              onChange={(e) => setDistrictIdA(Number(e.target.value))}
              className="w-full bg-background/70 border border-slate-800 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-emerald-400"
            >
              {districts.map((d) => (
                <option key={d.id} value={d.id} disabled={d.id === districtIdB}>
                  {d.name}, {d.state_name}
                </option>
              ))}
            </select>
            
            <div className="mt-5 grid grid-cols-2 gap-4 text-sm text-secondary-foreground">
              <div className="p-3.5 rounded-lg bg-surface/30 border border-white/5">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">Population</span>
                <p className="mt-1 font-bold text-white font-mono">{districtA.population.toLocaleString()}</p>
              </div>
              <div className="p-3.5 rounded-lg bg-surface/30 border border-white/5">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">Area Sq KM</span>
                <p className="mt-1 font-bold text-white font-mono">{districtA.area_sq_km.toLocaleString()} km²</p>
              </div>
              <div className="p-3.5 rounded-lg bg-surface/30 border border-white/5 col-span-2">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">Geospatial Coordinates</span>
                <p className="mt-1 font-bold text-white font-mono text-xs">{districtA.centroid_lat.toFixed(4)}° N, {districtA.centroid_lon.toFixed(4)}° E</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Layers3 className="h-5 w-5 text-brand-blue" />
              Select Comparison District (B)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <select
              value={districtIdB}
              onChange={(e) => setDistrictIdB(Number(e.target.value))}
              className="w-full bg-background/70 border border-slate-800 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-emerald-400"
            >
              {districts.map((d) => (
                <option key={d.id} value={d.id} disabled={d.id === districtIdA}>
                  {d.name}, {d.state_name}
                </option>
              ))}
            </select>

            <div className="mt-5 grid grid-cols-2 gap-4 text-sm text-secondary-foreground">
              <div className="p-3.5 rounded-lg bg-surface/30 border border-white/5">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">Population</span>
                <p className="mt-1 font-bold text-white font-mono">{districtB.population.toLocaleString()}</p>
              </div>
              <div className="p-3.5 rounded-lg bg-surface/30 border border-white/5">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">Area Sq KM</span>
                <p className="mt-1 font-bold text-white font-mono">{districtB.area_sq_km.toLocaleString()} km²</p>
              </div>
              <div className="p-3.5 rounded-lg bg-surface/30 border border-white/5 col-span-2">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">Geospatial Coordinates</span>
                <p className="mt-1 font-bold text-white font-mono text-xs">{districtB.centroid_lat.toFixed(4)}° N, {districtB.centroid_lon.toFixed(4)}° E</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
        {/* Recharts Comparison Bar Chart */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Comparative Vulnerability Profiles ({year} Projections)</CardTitle>
            <CardDescription>Side-by-side risk parameter scorecards mapped from spatial models.</CardDescription>
          </CardHeader>
          <CardContent>
            {!mounted ? (
              <div className="h-[320px] w-full animate-pulse bg-slate-800/40 rounded-xl border border-white/[0.04]" />
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(148,163,184,0.08)" vertical={false} />
                  <XAxis dataKey="name" stroke="#C0C8D4" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#C0C8D4" tick={{ fontSize: 11 }} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      background: "#07111f",
                      border: "1px solid rgba(103,232,249,0.25)",
                      borderRadius: 8,
                      color: "#e0f2fe"
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <Bar dataKey={districtA.name} fill="#4DA8DA" radius={[4, 4, 0, 0]} />
                  <Bar dataKey={districtB.name} fill="#22C55E" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* AI Comparative Insights */}
        <Card className="glass-card flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5 text-brand-titanium" />
              AI Comparison Insights
            </CardTitle>
            <CardDescription>Automated risk assessment matrix analysis.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 space-y-4">
            <div className="space-y-3">
              {comparisonAdvisory.map((item, index) => (
                <div key={index} className="flex gap-2.5 rounded-lg border border-white/[0.08] bg-brand-blue/10 p-3.5 text-xs leading-relaxed text-secondary-foreground">
                  <span className="mt-0.5 shrink-0 text-brand-blue">⚡</span>
                  <p>{item}</p>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-brand-blue/20 bg-brand-blue/10 p-4 text-xs leading-relaxed text-muted-foreground flex gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-brand-blue mt-0.5" />
              <p>
                Policy Advisory: Local disaster coordination centers should tailor intervention funding based on these discrepancies (e.g. coastal pumping arrays for {districtA.name} versus dryland canal management for {districtB.name}).
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="no-print mt-4">
        <WorkflowRecommendations currentPage="analytics" />
      </div>
    </div>
  );
}
