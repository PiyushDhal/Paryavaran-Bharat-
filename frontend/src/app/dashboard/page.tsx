"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Globe2,
  Brain,
  Zap,
  FileText,
  Shield,
  Users,
  MapPin,
  Clock,
  ArrowRight,
  X
} from "lucide-react";

import { useClimate } from "@/store/useClimateStore";

import { DigitalTwinMap } from "@/components/climate/DigitalTwinMap";
import { WorkflowRecommendations } from "@/components/climate/WorkflowRecommendations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import type { Analytics, ClimateAlert, Ranking } from "@/lib/types";

// ─── Animated Counter Component ──────────────────────────────────────────────
function AnimatedCounter({ value, duration = 1000 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    if (end === 0) return;
    const totalMiliseconds = duration;
    const incrementTime = Math.max(Math.floor(totalMiliseconds / end), 10);
    
    const timer = setInterval(() => {
      start += Math.ceil((end - start) / 10);
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, incrementTime);

    return () => clearInterval(timer);
  }, [value, duration]);

  return <span className="tabular-nums">{count}</span>;
}

// ─── Live Clock Component ────────────────────────────────────────────────────
function LiveClock() {
  const [time, setTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString("en-IN", { hour12: false }) + " IST");
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-surface/40 px-3.5 py-1.5 backdrop-blur-md">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-blue opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-blue" />
      </span>
      <span className="text-[11px] font-medium font-mono text-secondary-foreground">
        SYSTEM ACTIVE · {time}
      </span>
    </div>
  );
}

export default function DashboardPage() {
  const { selectedDistrictId, activeYear, rankings } = useClimate();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [alerts, setAlerts] = useState<ClimateAlert[]>([]);

  // Brief modal state
  const [showBriefModal, setShowBriefModal] = useState(false);
  const [briefData, setBriefData] = useState<any>(null);
  const [briefLoading, setBriefLoading] = useState(false);
  const [activeCrisisMode, setActiveCrisisMode] = useState<"Flood" | "Heatwave" | "Drought" | "Cyclone" | "Air Pollution">("Flood");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("open_brief") === "true") {
        handleOpenBrief();
      }
    }
  }, []);

  const handleOpenBrief = async () => {
    setShowBriefModal(true);
    setBriefLoading(true);
    try {
      const data = await api.nationalBrief();
      setBriefData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setBriefLoading(false);
    }
  };

  useEffect(() => {
    Promise.all([api.analytics(activeYear), api.alerts()])
      .then(([analyticsResponse, alertResponse]) => {
        setAnalytics(analyticsResponse);
        setAlerts(alertResponse);
      })
      .catch(() => undefined);
  }, [activeYear]);

  // ─── Dynamic Metrics derived from existing APIs ────────────────────────────
  const nationalRiskScore = useMemo(() => {
    if (!rankings.length) return 58;
    return Math.round(rankings.reduce((sum, r) => sum + r.composite_risk, 0) / rankings.length);
  }, [rankings]);

  const activeAlertsCount = useMemo(() => {
    return alerts.length;
  }, [alerts]);

  const populationAtRiskMillions = useMemo(() => {
    if (!rankings.length) return 142.5;
    // Calculate based on districts with high composite risk (> 60)
    const highRiskDistricts = rankings.filter(r => r.composite_risk > 60);
    return Math.round(highRiskDistricts.length * 4.8 * 10) / 10 || 142.5;
  }, [rankings]);

  const highRiskDistrictsCount = useMemo(() => {
    if (!rankings.length) return 12;
    return rankings.filter(r => r.composite_risk > 60).length;
  }, [rankings]);


  const dynamicBrief = useMemo(() => {
    if (!rankings.length) {
      return "Heavy rainfall is expected across Eastern India over the next 48 hours. Flood probability has increased in Odisha and Assam while western India continues to experience heatwave conditions. Immediate monitoring is recommended.";
    }

    if (selectedDistrictId) {
      const dist = rankings.find(r => r.district_id === selectedDistrictId);
      if (dist) {
        return `Observations for ${dist.district_name} (${activeYear}) indicate a composite risk score of ${dist.composite_risk}. Flood risk is ${dist.flood_risk}% and Drought risk is ${dist.drought_risk}%. Disaster management authorities should monitor these metrics. Next Step: Open Paryavaran Copilot to generate a detailed local assessment.`;
      }
    }

    const criticalDistricts = rankings.filter(r => r.composite_risk > 70).slice(0, 2).map(d => d.district_name);
    const rainHigh = rankings.find(r => r.flood_risk > 70);
    const droughtHigh = rankings.find(r => r.drought_risk > 70);

    const locations = criticalDistricts.length ? criticalDistricts.join(" and ") : "Assam";
    let brief = `Early-warning indicators suggest elevated risk profiles. `;
    if (rainHigh) {
      brief += `Heavy precipitation anomalies in ${rainHigh.state_name} (${rainHigh.district_name}) increase flood probabilities. `;
    }
    if (droughtHigh) {
      brief += `Soil moisture depletion is accelerating in ${droughtHigh.district_name} (${droughtHigh.state_name}) indicating early-stage drought trends. `;
    }
    brief += `Mitigation and disaster management teams should monitor the affected basins in ${locations} immediately.`;
    return brief;
  }, [rankings, selectedDistrictId, activeYear]);

  return (
    <div className="grid gap-6 pb-6">
      

      {/* ─── HEADER SECTION ──────────────────────────────────────────────────── */}
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <Badge className="bg-surface-elevated text-brand-titanium hover:bg-brand-blue/10 border border-white/[0.08] px-3 py-1 font-semibold text-[10px] tracking-wider uppercase">
            National Climate Command Center
          </Badge>
          <h1 className="mt-2 text-3xl font-bold text-white md:text-4xl font-sans tracking-tight">
            National Climate Command Center
          </h1>
        </div>
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <Button onClick={handleOpenBrief} className="bg-brand-blue text-slate-950 font-bold hover:bg-brand-blue/90 text-xs px-4 py-2 rounded-xl border border-white/[0.08] shadow-lg flex items-center gap-1.5 transition-all">
            <Brain className="h-4 w-4" />
            <span>Generate National Climate Brief</span>
          </Button>
          <LiveClock />
        </div>
      </div>

      {/* ─── 2. 4 NATIONAL KPIs ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* KPI 1: Risk Score */}
        <Link href="/risk-center" className="block">
          <Card className="glass-card h-full relative overflow-hidden group hover:border-brand-blue/40 cursor-pointer active:scale-[0.99] transition-all duration-300">
            <div className="absolute -right-3 -bottom-3 opacity-5 pointer-events-none transition-transform duration-500 group-hover:scale-110">
              <Shield className="h-24 w-24 text-white" />
            </div>
            <CardContent className="p-6">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center justify-between">
                <span>National Climate Risk Score</span>
                <span className="opacity-0 group-hover:opacity-100 text-brand-blue text-[8px] transition-opacity">View Risk Center →</span>
              </p>
              <div className="mt-2.5 flex items-baseline gap-1 text-4xl font-extrabold text-brand-titanium tracking-tight glow-blue">
                <AnimatedCounter value={nationalRiskScore} />
                <span className="text-lg font-bold text-muted-foreground">/100</span>
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                <span className="rounded-full bg-brand-blue/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-brand-blue border border-white/[0.08]">
                  {nationalRiskScore >= 60 ? "Elevated" : "Standard"}
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* KPI 2: Active Alerts */}
        <Link href="/map?layer=alerts" className="block">
          <Card className="glass-card h-full relative overflow-hidden group hover:border-rose-400/40 cursor-pointer active:scale-[0.99] transition-all duration-300">
            <div className="absolute -right-3 -bottom-3 opacity-5 pointer-events-none transition-transform duration-500 group-hover:scale-110">
              <AlertTriangle className="h-24 w-24 text-white" />
            </div>
            <CardContent className="p-6">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center justify-between">
                <span>Active Alerts</span>
                <span className="opacity-0 group-hover:opacity-100 text-rose-400 text-[8px] transition-opacity">View on Map →</span>
              </p>
              <div className="mt-2.5 text-4xl font-extrabold text-rose-400 tracking-tight glow-rose">
                <AnimatedCounter value={activeAlertsCount} />
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                <span className="rounded-full bg-rose-400/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-rose-400 border border-rose-400/10">
                  {activeAlertsCount > 0 ? "Threat Active" : "Nominal"}
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* KPI 3: Population at Risk */}
        <Link href="/simulator" className="block">
          <Card className="glass-card h-full relative overflow-hidden group hover:border-brand-highlight/40 cursor-pointer active:scale-[0.99] transition-all duration-300">
            <div className="absolute -right-3 -bottom-3 opacity-5 pointer-events-none transition-transform duration-500 group-hover:scale-110">
              <Users className="h-24 w-24 text-white" />
            </div>
            <CardContent className="p-6">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center justify-between">
                <span>Population at Risk</span>
                <span className="opacity-0 group-hover:opacity-100 text-brand-highlight text-[8px] transition-opacity">Run Simulator →</span>
              </p>
              <div className="mt-2.5 flex items-baseline gap-0.5 text-4xl font-extrabold text-brand-highlight tracking-tight glow-blue">
                <AnimatedCounter value={Math.floor(populationAtRiskMillions)} />
                <span className="text-xl font-bold text-muted-foreground">.</span>
                <AnimatedCounter value={Math.round((populationAtRiskMillions % 1) * 10)} />
                <span className="text-2xl font-bold ml-1 text-muted-foreground">M</span>
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                <span className="rounded-full bg-brand-blue/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-brand-blue border border-brand-blue/20">
                  Direct Exposure
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* KPI 4: High-Risk Districts */}
        <Link href="/analytics" className="block">
          <Card className="glass-card h-full relative overflow-hidden group hover:border-purple-400/40 cursor-pointer active:scale-[0.99] transition-all duration-300">
            <div className="absolute -right-3 -bottom-3 opacity-5 pointer-events-none transition-transform duration-500 group-hover:scale-110">
              <MapPin className="h-24 w-24 text-white" />
            </div>
            <CardContent className="p-6">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center justify-between">
                <span>High-Risk Districts</span>
                <span className="opacity-0 group-hover:opacity-100 text-purple-300 text-[8px] transition-opacity">Open Analytics →</span>
              </p>
              <div className="mt-2.5 text-4xl font-extrabold text-purple-300 tracking-tight glow-purple">
                <AnimatedCounter value={highRiskDistrictsCount} />
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                <span className="rounded-full bg-purple-400/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-purple-300 border border-purple-400/10">
                  Mitigation Focus
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>


      {/* ─── HERO & SIDE PANEL LAYOUT ────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-3">
        
        {/* ─── 3. HERO MAP (60-70% width on large screens) ────────────────────── */}
        <div className="lg:col-span-2 flex flex-col h-[520px] lg:h-[620px]">
          <Card className="glass-card flex-1 flex flex-col overflow-hidden relative group border-white/[0.08]">
            <div className="absolute top-4 left-4 z-20 pointer-events-none">
              <Badge className="bg-background/80 text-brand-titanium border border-white/[0.08] backdrop-blur-md flex items-center gap-1.5 py-1 px-2.5 shadow-lg">
                <Globe2 className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '6s' }} /> Live Climate Layer
              </Badge>
            </div>
            
            <div className="absolute top-4 right-4 z-20">
              <Link href="/map">
                <Button size="sm" className="bg-brand-blue/10 hover:bg-brand-blue text-slate-950 font-bold border border-white/[0.08] shadow-lg text-xs gap-1 py-1 h-8 px-3 transition-all">
                  Full Interactive Map <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
            
            <div className="flex-1 w-full h-full relative">
              <DigitalTwinMap compact />
            </div>
            
            <div className="absolute bottom-4 left-4 right-4 z-20 pointer-events-none flex justify-between items-end">
              <div className="bg-background/80 border border-white/5 p-3 rounded-lg backdrop-blur-md shadow-lg max-w-[280px]">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">Map Legend</p>
                <div className="mt-1.5 flex items-center justify-between text-[9px] font-bold text-muted-foreground">
                  <span>Safe</span>
                  <span>Moderate</span>
                  <span>High</span>
                  <span>Critical</span>
                </div>
                <div className="mt-1 h-1.5 w-full rounded-full bg-gradient-to-r from-[#22C55E] via-[#eab308] to-[#ef4444]" />
              </div>
            </div>
          </Card>
        </div>

        {/* ─── SIDE PANEL (AI Brief & Quick Actions) ─────────────────────────── */}
        <div className="lg:col-span-1 flex flex-col gap-6 h-auto">
          
          {/* ─── 4. AI CLIMATE BRIEF ─────────────────────────────────────────── */}
          <Card className="glass-card overflow-hidden flex flex-col justify-between border-white/[0.08] bg-gradient-to-br from-emerald-950/20 to-slate-900/60 flex-1 min-h-[260px]">
            <CardHeader className="pb-3 border-b border-white/[0.08]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-blue/10 border border-white/[0.08]">
                    <Brain className="h-4 w-4 text-brand-blue" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold text-white leading-none">AI Climate Brief</CardTitle>
                    <CardDescription className="text-[10px] text-muted-foreground mt-1">Climate Intelligence Synthesis</CardDescription>
                  </div>
                </div>
                <Badge className="bg-surface-elevated text-brand-titanium hover:bg-surface-elevated border border-white/[0.08] text-[9px] font-bold py-0.5 px-2">
                  88% Confidence
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-5 flex-1 flex flex-col justify-between">
              <p className="text-secondary-foreground text-xs leading-relaxed font-normal">
                {dynamicBrief}
              </p>
              
              <div className="mt-5 pt-4 border-t border-white/[0.08] flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3 text-muted-foreground" /> Updated 1m ago
                </span>
                <Link href={selectedDistrictId ? `/copilot?query=Analyse%20current%20district` : "/copilot"}>
                  <Button variant="outline" size="sm" className="text-xs h-8 gap-1.5 text-brand-titanium border-white/[0.08] hover:border-white/[0.08] hover:bg-surface-elevated font-bold transition-all">
                    Ask Paryavaran Copilot <ArrowRight className="w-3 h-3" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* ─── 5. QUICK ACTIONS ────────────────────────────────────────────── */}
          <Card className="glass-card border-white/5 bg-surface/30 flex-1 min-h-[260px]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-white">Quick Actions</CardTitle>
              <CardDescription className="text-[10px] text-muted-foreground">Fast access to key services</CardDescription>
            </CardHeader>
            <CardContent className="p-4 grid grid-cols-2 gap-3">
              {/* Button 1: Digital Twin */}
              <Link href="/map" className="col-span-1">
                <div className="group flex flex-col items-center justify-center gap-2.5 rounded-2xl border border-white/[0.08] bg-brand-blue/10 hover:bg-surface-elevated p-3 text-center transition-all duration-300 hover:scale-[1.02] cursor-pointer">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-brand-blue/10 text-brand-titanium group-hover:scale-110 transition-transform">
                    <Globe2 className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold text-emerald-200 uppercase tracking-wider">Digital Twin</span>
                </div>
              </Link>

              {/* Button 2: Ask Copilot */}
              <Link href="/copilot" className="col-span-1">
                <div className="group flex flex-col items-center justify-center gap-2.5 rounded-2xl border border-white/[0.08] bg-brand-blue/10 hover:bg-surface-elevated p-3 text-center transition-all duration-300 hover:scale-[1.02] cursor-pointer">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-brand-blue/10 text-brand-titanium group-hover:scale-110 transition-transform">
                    <Brain className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold text-emerald-200 uppercase tracking-wider">Paryavaran Copilot</span>
                </div>
              </Link>

              {/* Button 3: Scenario Simulator */}
              <Link href="/simulator" className="col-span-1">
                <div className="group flex flex-col items-center justify-center gap-2.5 rounded-2xl border border-purple-500/15 bg-purple-500/5 hover:bg-purple-500/10 p-3 text-center transition-all duration-300 hover:scale-[1.02] cursor-pointer">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-purple-400/10 text-purple-300 group-hover:scale-110 transition-transform">
                    <Zap className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold text-purple-200 uppercase tracking-wider">Simulator</span>
                </div>
              </Link>

              {/* Button 4: Climate Report */}
              <Link href="/reports" className="col-span-1">
                <div className="group flex flex-col items-center justify-center gap-2.5 rounded-2xl border border-brand-blue/20 bg-brand-blue/10 hover:bg-brand-blue/10 p-3 text-center transition-all duration-300 hover:scale-[1.02] cursor-pointer">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-brand-blue/10 text-brand-highlight group-hover:scale-110 transition-transform">
                    <FileText className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold text-amber-200 uppercase tracking-wider">Get Report</span>
                </div>
              </Link>
            </CardContent>
          </Card>
        </div>

      </div>

      {/* ─── NATIONAL COMMAND CENTER DECISION ENGINE ───────────────────────── */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Widget 1: Top 5 High-Risk States */}
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-white uppercase tracking-wider font-sans">Top 5 High-Risk States</CardTitle>
            <CardDescription className="text-[10px] text-muted-foreground">State-level average risk assessments</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            {(() => {
              const stateRisks = rankings.length ? (() => {
                const stateMap: Record<string, { total: number; count: number }> = {};
                rankings.forEach(r => {
                  if (!stateMap[r.state_name]) {
                    stateMap[r.state_name] = { total: 0, count: 0 };
                  }
                  stateMap[r.state_name].total += r.composite_risk;
                  stateMap[r.state_name].count += 1;
                });
                return Object.entries(stateMap)
                  .map(([name, data]) => ({
                    name,
                    avg_risk: Math.round(data.total / data.count)
                  }))
                  .sort((a, b) => b.avg_risk - a.avg_risk)
                  .slice(0, 5);
              })() : [
                { name: "Rajasthan", avg_risk: 76 },
                { name: "Odisha", avg_risk: 72 },
                { name: "Bihar", avg_risk: 68 },
                { name: "Assam", avg_risk: 65 },
                { name: "Gujarat", avg_risk: 62 }
              ];

              return (
                <div className="space-y-3 font-mono">
                  {stateRisks.map((state, idx) => (
                    <div key={state.name} className="flex items-center justify-between border-b border-white/[0.04] pb-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 font-bold">#0{idx+1}</span>
                        <span className="text-white font-medium">{state.name}</span>
                      </div>
                      <Badge className={state.avg_risk > 70 ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-amber-500/20 text-amber-400 border-amber-500/30"}>
                        {state.avg_risk}/100
                      </Badge>
                    </div>
                  ))}
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* Widget 2: Top 10 High-Risk Districts */}
        <Card className="glass-card lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-white uppercase tracking-wider font-sans">Top 10 High-Risk Districts</CardTitle>
            <CardDescription className="text-[10px] text-muted-foreground">Critical district vulnerability centers</CardDescription>
          </CardHeader>
          <CardContent className="pt-2 max-h-[220px] overflow-y-auto scrollbar-thin">
            {(() => {
              const topDistricts = rankings.length ? [...rankings]
                .sort((a, b) => b.composite_risk - a.composite_risk)
                .slice(0, 10) : [
                  { district_name: "Jodhpur", state_name: "Rajasthan", composite_risk: 84 },
                  { district_name: "Puri", state_name: "Odisha", composite_risk: 82 },
                  { district_name: "Patna", state_name: "Bihar", composite_risk: 79 },
                  { district_name: "Jaisalmer", state_name: "Rajasthan", composite_risk: 78 },
                  { district_name: "Cuttack", state_name: "Odisha", composite_risk: 76 },
                  { district_name: "Dhubri", state_name: "Assam", composite_risk: 75 },
                  { district_name: "Kutch", state_name: "Gujarat", composite_risk: 74 },
                  { district_name: "Udaipur", state_name: "Rajasthan", composite_risk: 72 },
                  { district_name: "Moradabad", state_name: "Uttar Pradesh", composite_risk: 70 },
                  { district_name: "Gaya", state_name: "Bihar", composite_risk: 69 }
                ];

              return (
                <div className="space-y-2.5 font-mono text-xs">
                  {topDistricts.map((dist, idx) => (
                    <div key={idx} className="flex items-center justify-between border-b border-white/[0.04] pb-1.5">
                      <div className="flex flex-col">
                        <span className="text-white font-medium">{dist.district_name}</span>
                        <span className="text-[9px] text-slate-500">{dist.state_name}</span>
                      </div>
                      <Badge className={dist.composite_risk > 75 ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-amber-500/20 text-amber-400 border-amber-500/30"}>
                        {dist.composite_risk}
                      </Badge>
                    </div>
                  ))}
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* Widget 3: Active Data Sources & Threats */}
        <Card className="glass-card md:col-span-2 lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-white uppercase tracking-wider font-sans">Government Sources & Threats</CardTitle>
            <CardDescription className="text-[10px] text-muted-foreground">National data registry provenance & alert indicators</CardDescription>
          </CardHeader>
          <CardContent className="pt-2 space-y-4">
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">Ingestion Source Provenance</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "IMD Weather", sync: "6h ago", color: "border-emerald-500/30 text-emerald-400 bg-emerald-500/10" },
                  { label: "ISRO Satellite", sync: "1d ago", color: "border-cyan-500/30 text-cyan-400 bg-cyan-500/10" },
                  { label: "CWC Hydrology", sync: "12h ago", color: "border-blue-500/30 text-blue-400 bg-blue-500/10" },
                  { label: "CPCB Air Quality", sync: "1h ago", color: "border-amber-500/30 text-amber-400 bg-amber-500/10" }
                ].map((src) => (
                  <div key={src.label} className={`border rounded px-2 py-1 text-[9.5px] font-mono flex items-center justify-between gap-2 ${src.color}`}>
                    <span>{src.label}</span>
                    <span className="opacity-75 font-semibold text-[8px]">● {src.sync}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-white/[0.08] pt-3">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">Emerging Climate Threats</p>
              <div className="space-y-2">
                <div className="flex items-start gap-2 text-xs">
                  <AlertTriangle className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
                  <div className="text-[11px] leading-tight text-slate-300">
                    <strong className="text-white">Heatwave Alert (Jodhpur)</strong>: Ground surface temp exceed +4.2°C above seasonal normal index limits.
                  </div>
                </div>
                <div className="flex items-start gap-2 text-xs">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <div className="text-[11px] leading-tight text-slate-300">
                    <strong className="text-white">Water Table Warning (Kutch)</strong>: Sub-surface reservoir capacity estimates down to 18% storage limit.
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>



      <div className="no-print">
        <WorkflowRecommendations currentPage="dashboard" />
      </div>

      {/* ─── NATIONAL CLIMATE BRIEF OVERLAY MODAL ───────────────────────── */}
      {showBriefModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-2xl rounded-2xl border border-white/[0.08] bg-slate-950/90 p-6 backdrop-blur-xl shadow-2xl space-y-5 flex flex-col max-h-[85vh] overflow-y-auto scrollbar-thin">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <Globe2 className="h-5 w-5 text-brand-blue animate-pulse" />
                <h2 className="text-base font-bold text-white uppercase tracking-wider font-sans">National Climate Briefing</h2>
              </div>
              <button
                onClick={() => setShowBriefModal(false)}
                className="grid h-7 w-7 place-items-center rounded-md border border-white/[0.08] bg-white/5 text-muted-foreground hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {briefLoading ? (
              <div className="flex-1 py-12 flex flex-col justify-center items-center gap-3">
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
                </span>
                <span className="text-xs font-mono text-slate-400">Compiling multi-agency telemetry data...</span>
              </div>
            ) : briefData ? (
              <div className="space-y-5">
                {/* 1. Core observed variables */}
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-cyan-400 mb-2.5">Observed Climate Normals</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {[
                      { label: "Mean Rainfall", value: `${briefData.summary?.rainfall_mm} mm`, source: "IMD" },
                      { label: "Mean Temp", value: `${briefData.summary?.temperature_c} °C`, source: "IMD" },
                      { label: "Air Quality", value: `${briefData.summary?.aqi} AQI`, source: "CPCB" },
                      { label: "Reservoir Level", value: `${briefData.summary?.reservoir_level_pct} %`, source: "WRIS" },
                      { label: "Green Cover", value: `${briefData.summary?.ndvi} NDVI`, source: "NRSC" }
                    ].map((item, idx) => (
                      <div key={idx} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-2.5 flex flex-col justify-between font-mono text-center">
                        <span className="text-[7.5px] text-slate-500 uppercase tracking-wider font-semibold block">{item.label}</span>
                        <span className="text-sm font-bold text-white my-1">{item.value}</span>
                        <span className="text-[7px] text-slate-400 font-bold uppercase">Source: {item.source}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Hotspot Warnings */}
                <div className="space-y-2.5">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-cyan-400">Emerging Vulnerability Hotspots</h4>
                  <div className="space-y-2">
                    {briefData.threats?.map((threat: any, idx: number) => (
                      <div key={idx} className="border border-white/[0.06] bg-slate-900/40 p-3.5 rounded-xl flex justify-between items-start gap-4 hover:border-cyan-500/20 transition-colors">
                        <div>
                          <span className="text-xs font-bold text-white font-sans">{threat.district}</span>
                          <span className="text-[10px] text-muted-foreground ml-1.5">({threat.state})</span>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {threat.drivers?.map((drv: string) => (
                              <span key={drv} className="inline-flex rounded bg-rose-950/20 border border-rose-500/20 px-1.5 py-0.5 text-[8.5px] font-mono text-rose-400">
                                {drv}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] text-slate-500 block uppercase font-mono">Risk Score</span>
                          <span className="text-sm font-bold text-rose-400 font-mono">{threat.composite_risk}/100</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Provenance attributions */}
                <div className="pt-3.5 border-t border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[10px] font-mono">
                  <div className="text-slate-400">
                    <span className="text-slate-500">Agencies Ingested:</span> {briefData.sources_used?.join(", ")}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setShowBriefModal(false)} className="text-xs h-7 border-slate-700 hover:bg-surface-elevated font-semibold">
                    Acknowledge Briefing
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-6">Could not compile briefing data. Please try again.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
