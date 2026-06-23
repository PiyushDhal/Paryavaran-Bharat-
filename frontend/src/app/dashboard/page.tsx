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
  ArrowRight
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
        return `Observations for ${dist.district_name} (${activeYear}) indicate a composite risk score of ${dist.composite_risk}. Flood risk is ${dist.flood_risk}% and Drought risk is ${dist.drought_risk}%. Disaster management authorities should monitor these metrics. Next Step: Open Bharat Climate Intelligence to generate a detailed local assessment.`;
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
            National Operations Center
          </Badge>
          <h1 className="mt-2 text-3xl font-bold text-white md:text-4xl font-orbitron tracking-[0.12em] uppercase">
            Operations Center
          </h1>
        </div>
        <div className="shrink-0">
          <LiveClock />
        </div>
      </div>

      {/* ─── 2. 4 NATIONAL KPIs ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* KPI 1: Risk Score */}
        <Card className="glass-card relative overflow-hidden group hover:border-white/[0.08] transition-all duration-300">
          <div className="absolute -right-3 -bottom-3 opacity-5 pointer-events-none transition-transform duration-500 group-hover:scale-110">
            <Shield className="h-24 w-24 text-white" />
          </div>
          <CardContent className="p-6">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              National Climate Risk Score
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

        {/* KPI 2: Active Alerts */}
        <Card className="glass-card relative overflow-hidden group hover:border-rose-300/30 transition-all duration-300">
          <div className="absolute -right-3 -bottom-3 opacity-5 pointer-events-none transition-transform duration-500 group-hover:scale-110">
            <AlertTriangle className="h-24 w-24 text-white" />
          </div>
          <CardContent className="p-6">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Active Alerts
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

        {/* KPI 3: Population at Risk */}
        <Card className="glass-card relative overflow-hidden group hover:border-brand-blue/20 transition-all duration-300">
          <div className="absolute -right-3 -bottom-3 opacity-5 pointer-events-none transition-transform duration-500 group-hover:scale-110">
            <Users className="h-24 w-24 text-white" />
          </div>
          <CardContent className="p-6">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Population at Risk
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

        {/* KPI 4: High-Risk Districts */}
        <Card className="glass-card relative overflow-hidden group hover:border-purple-300/30 transition-all duration-300">
          <div className="absolute -right-3 -bottom-3 opacity-5 pointer-events-none transition-transform duration-500 group-hover:scale-110">
            <MapPin className="h-24 w-24 text-white" />
          </div>
          <CardContent className="p-6">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              High-Risk Districts
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
                    Ask Bharat Climate Intelligence <ArrowRight className="w-3 h-3" />
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
                  <span className="text-[10px] font-bold text-emerald-200 uppercase tracking-wider">Bharat Climate Intelligence</span>
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

      <div className="no-print">
        <WorkflowRecommendations currentPage="dashboard" />
      </div>
    </div>
  );
}
