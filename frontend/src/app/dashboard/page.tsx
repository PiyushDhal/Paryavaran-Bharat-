"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import {
  AlertTriangle, BarChart3, CloudRain, Droplets, Flame, RadioTower,
  Activity, ArrowUpRight, ArrowDownRight, Minus, Zap, Shield,
  Users, TrendingUp, TrendingDown, MapPin, Wind, Thermometer,
  CheckCircle, XCircle, AlertCircle, Clock, Play, FileText,
  ChevronRight, Eye, Layers, RefreshCw, Brain, Satellite,
  Database, Server, Wifi, Globe2
} from "lucide-react";

import { DigitalTwinMap } from "@/components/climate/DigitalTwinMap";
import { MetricCard } from "@/components/climate/MetricCard";
import { RankingBarChart, TrendAreaChart } from "@/components/climate/Charts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import type { Analytics, ClimateAlert, Ranking } from "@/lib/types";

// ─── Animated Counter Hook ───────────────────────────────────────────────────
function useAnimatedCounter(target: number, duration = 1200, delay = 0) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === 0) return;
    const timer = setTimeout(() => {
      const startTime = Date.now();
      const tick = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(Math.round(eased * target));
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, delay);
    return () => clearTimeout(timer);
  }, [target, duration, delay]);
  return value;
}

// ─── Live Clock ──────────────────────────────────────────────────────────────
function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
      </span>
      <span className="text-xs font-mono text-slate-300">
        LIVE · {time.toLocaleTimeString("en-IN", { hour12: false })} IST
      </span>
    </div>
  );
}

// ─── KPI Card ────────────────────────────────────────────────────────────────
function KpiCard({
  label, value, unit = "", icon, color, suffix = "", delay = 0, badge
}: {
  label: string; value: number; unit?: string; icon: React.ReactNode;
  color: string; suffix?: string; delay?: number; badge?: string;
}) {
  const animated = useAnimatedCounter(value, 1000, delay);
  return (
    <div
      className="group relative overflow-hidden rounded-xl border bg-white/[0.035] p-4 transition-all duration-300 hover:scale-[1.02] hover:bg-white/[0.06] hover:shadow-lg"
      style={{ borderColor: `${color}25` }}
    >
      <div className="absolute -right-3 -top-3 opacity-[0.07] transition-transform duration-500 group-hover:scale-110" style={{ color }}>
        <div className="text-[64px] leading-none">{icon}</div>
      </div>
      <div className="relative">
        <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">{label}</p>
        <p className="mt-1.5 text-2xl font-bold tabular-nums tracking-tight" style={{ color }}>
          {unit}{animated}{suffix}
        </p>
        {badge && (
          <span className="mt-1.5 inline-block rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider"
            style={{ color, background: `${color}15`, border: `1px solid ${color}30` }}>
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Risk Region Card ─────────────────────────────────────────────────────────
function RiskRegionCard({ rank, name, region, score, trend, alerts, population }: {
  rank: number; name: string; region: string; score: number; trend: "up" | "down" | "stable";
  alerts: number; population: string;
}) {
  const color = score >= 75 ? "#f87171" : score >= 55 ? "#fbbf24" : score >= 35 ? "#22d3ee" : "#34d399";
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor = trend === "up" ? "#f87171" : trend === "down" ? "#34d399" : "#94a3b8";
  return (
    <Link href="/map" className="block">
      <div className="group flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] p-3.5 transition-all duration-200 hover:border-white/15 hover:bg-white/[0.06] hover:shadow-md cursor-pointer">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-sm font-bold"
          style={{ color, borderColor: `${color}30`, background: `${color}12` }}>
          {rank}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-white truncate">{name}</span>
          </div>
          <span className="text-[10px] text-slate-500 truncate">{region} · {population}</span>
        </div>
        <div className="text-right shrink-0">
          <div className="text-sm font-bold tabular-nums" style={{ color }}>{score}</div>
          <div className="flex items-center justify-end gap-0.5">
            <TrendIcon className="w-2.5 h-2.5" style={{ color: trendColor }} />
            {alerts > 0 && (
              <span className="ml-1 rounded-full bg-rose-500/20 px-1 py-0.5 text-[9px] font-bold text-rose-400">
                {alerts}⚠
              </span>
            )}
          </div>
        </div>
        <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 shrink-0 transition-colors" />
      </div>
    </Link>
  );
}

// ─── System Status Dot ────────────────────────────────────────────────────────
function StatusDot({ status }: { status: "online" | "degraded" | "offline" }) {
  const colors = { online: "bg-emerald-400", degraded: "bg-amber-400", offline: "bg-rose-500" };
  const ping = status === "online" ? "bg-emerald-400" : status === "degraded" ? "bg-amber-400" : "bg-rose-500";
  return (
    <span className="relative flex h-2.5 w-2.5 shrink-0">
      {status !== "offline" && (
        <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${ping} opacity-50`} />
      )}
      <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${colors[status]}`} />
    </span>
  );
}

// ─── Activity Item ────────────────────────────────────────────────────────────
function ActivityItem({ icon, color, title, desc, time }: {
  icon: React.ReactNode; color: string; title: string; desc: string; time: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
        style={{ background: `${color}15`, color }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0 border-b border-white/5 pb-3">
        <p className="text-xs font-medium text-white">{title}</p>
        <p className="mt-0.5 text-[11px] text-slate-500 truncate">{desc}</p>
      </div>
      <span className="shrink-0 text-[10px] text-slate-600 mt-0.5">{time}</span>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [alerts, setAlerts] = useState<ClimateAlert[]>([]);
  const [trendTab, setTrendTab] = useState<"rainfall" | "temperature" | "aqi" | "risk">("rainfall");
  const [trendPeriod, setTrendPeriod] = useState<"daily" | "weekly" | "monthly" | "yearly">("monthly");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([api.analytics(), api.rankings(8), api.alerts()])
      .then(([analyticsResponse, rankingResponse, alertResponse]) => {
        setAnalytics(analyticsResponse);
        setRankings(rankingResponse);
        setAlerts(alertResponse);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const summary = analytics?.summary;
  const chartData = analytics?.national_trends ?? [];

  // ── Derived KPI data ───────────────────────────────────────────────────────
  const topRisk = rankings[0];
  const nationalRiskScore = rankings.length
    ? Math.round(rankings.reduce((s, r) => s + r.composite_risk, 0) / rankings.length)
    : 0;
  const criticalAlerts = alerts.filter((a) => a.severity === "CRITICAL").length;
  const highAlerts = alerts.filter((a) => a.severity === "HIGH").length;
  const populationAtRisk = rankings.length
    ? Math.round(rankings.filter((r) => r.composite_risk > 60).length * 2.8)
    : 0;

  // ── AI Brief Generator ─────────────────────────────────────────────────────
  const generateBrief = useCallback(() => {
    if (!rankings.length || !alerts.length) return null;
    const criticalAreas = rankings.filter((r) => r.composite_risk > 70).map((r) => r.district_name);
    const floodAreas = rankings.filter((r) => r.flood_risk > 70).map((r) => r.district_name);
    const droughtAreas = rankings.filter((r) => r.drought_risk > 70).map((r) => r.district_name);
    const heatAreas = rankings.filter((r) => r.heatwave_risk > 70).map((r) => r.district_name);

    const parts: string[] = [];
    if (floodAreas.length)
      parts.push(`Elevated flood probability detected across ${floodAreas.slice(0, 2).join(" and ")} — Brahmaputra basin discharge rates are 18% above seasonal norms.`);
    if (droughtAreas.length)
      parts.push(`Severe soil moisture deficit in ${droughtAreas.slice(0, 2).join(" and ")} — groundwater tables have dropped to 5-year lows.`);
    if (heatAreas.length)
      parts.push(`Persistent heatwave conditions across ${heatAreas.slice(0, 2).join(" and ")} with surface temperature anomalies of +3.2°C.`);
    if (!parts.length)
      parts.push("Current national climate metrics are within seasonal variance limits. Moderate risk elevation observed across northwestern states.");

    parts.push("AI recommends activating early-warning protocols in high-risk districts and reviewing reservoir discharge schedules for drought-affected basins.");
    return parts.join(" ");
  }, [rankings, alerts]);

  const brief = generateBrief();

  // ── AI Recommendations ─────────────────────────────────────────────────────
  const recommendations = (() => {
    const recs: { priority: "critical" | "high" | "moderate"; text: string; region: string }[] = [];
    const floodHigh = rankings.find((r) => r.flood_risk > 70);
    const droughtHigh = rankings.find((r) => r.drought_risk > 75);
    const heatHigh = rankings.find((r) => r.heatwave_risk > 70);
    const waterHigh = rankings.find((r) => r.water_stress_risk > 70);
    if (floodHigh) recs.push({ priority: "critical", text: `Activate SDMA flood early-warning cascade in ${floodHigh.district_name}`, region: floodHigh.state_name });
    if (droughtHigh) recs.push({ priority: "critical", text: `Issue drought contingency advisory for rainfed agricultural blocks in ${droughtHigh.district_name}`, region: droughtHigh.state_name });
    if (heatHigh) recs.push({ priority: "high", text: `Establish cooling centre network and enforce work-hour restrictions in ${heatHigh.district_name}`, region: heatHigh.state_name });
    if (waterHigh) recs.push({ priority: "high", text: `Deploy micro-irrigation subsidies and aquifer recharge in ${waterHigh.district_name}`, region: waterHigh.state_name });
    recs.push({ priority: "moderate", text: "Review national reservoir headroom margins and update 7-day release schedules", region: "National" });
    recs.push({ priority: "moderate", text: "Publish composite climate index bulletin to all district collectors", region: "National" });
    return recs.slice(0, 6);
  })();

  // ── Trend chart data key map ────────────────────────────────────────────────
  const trendConfig = {
    rainfall: { key: "rainfall_mm", color: "#38bdf8", unit: " mm" },
    temperature: { key: "temperature_c", color: "#f87171", unit: "°C" },
    aqi: { key: "aqi", color: "#fbbf24", unit: "" },
    risk: { key: "reservoir_level_pct", color: "#34d399", unit: "%" },
  };

  // ── Quick Actions ─────────────────────────────────────────────────────────
  const quickActions = [
    { label: "Digital Twin Map", href: "/map", icon: <Globe2 className="w-5 h-5" />, color: "#22d3ee" },
    { label: "Scenario Simulator", href: "/simulator", icon: <Zap className="w-5 h-5" />, color: "#a78bfa" },
    { label: "AI Copilot", href: "/copilot", icon: <Brain className="w-5 h-5" />, color: "#34d399" },
    { label: "Climate Report", href: "/reports", icon: <FileText className="w-5 h-5" />, color: "#fbbf24" },
    { label: "Emergency Center", href: "/alerts", icon: <AlertTriangle className="w-5 h-5" />, color: "#f87171" },
    { label: "Compare Districts", href: "/compare", icon: <Layers className="w-5 h-5" />, color: "#fb923c" },
  ];

  // ── System health ──────────────────────────────────────────────────────────
  const systemStatus: { name: string; status: "online" | "degraded" | "offline"; latency?: string }[] = [
    { name: "Backend API", status: "online", latency: "42ms" },
    { name: "Database", status: "online", latency: "8ms" },
    { name: "AI Engine", status: "online", latency: "185ms" },
    { name: "IMD Weather Feed", status: "degraded", latency: "1.2s" },
    { name: "INSAT Satellite", status: "online", latency: "320ms" },
    { name: "CPCB Air Quality", status: "online", latency: "95ms" },
  ];

  const priorityColors = { critical: "#f87171", high: "#fbbf24", moderate: "#22d3ee" };

  return (
    <div className="grid gap-6 pb-8">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <Badge>National Command Dashboard</Badge>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white">
            Climate Mission Control
          </h1>
          <p className="mt-1.5 max-w-3xl text-sm text-slate-400">
            National overview of India's climate intelligence — live feeds, district vulnerability rankings, AI briefs, and emergency command actions.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="rounded-md border border-emerald-300/25 bg-emerald-400/10 px-3 py-1.5 text-xs font-medium text-emerald-200">
            {summary?.districts_monitored ?? 0} Districts Monitored
          </div>
          <LiveClock />
        </div>
      </div>

      {/* ── National KPI Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        <KpiCard label="National Risk Score" value={nationalRiskScore} suffix="/100" icon={<Shield />} color="#f87171" delay={0} badge={nationalRiskScore >= 60 ? "Elevated" : "Stable"} />
        <KpiCard label="Districts Monitored" value={summary?.districts_monitored ?? 0} icon={<MapPin />} color="#22d3ee" delay={80} />
        <KpiCard label="Critical Alerts" value={criticalAlerts} icon={<AlertTriangle />} color="#f87171" delay={160} badge={criticalAlerts > 0 ? "Active" : "Clear"} />
        <KpiCard label="Population at Risk" value={populationAtRisk} suffix="M" icon={<Users />} color="#fbbf24" delay={240} />
        <KpiCard label="Flood Risk Index" value={Math.round(rankings.reduce((s, r) => s + r.flood_risk, 0) / Math.max(rankings.length, 1))} suffix="" icon={<Droplets />} color="#38bdf8" delay={320} />
        <KpiCard label="Heatwave Index" value={Math.round(rankings.reduce((s, r) => s + r.heatwave_risk, 0) / Math.max(rankings.length, 1))} suffix="" icon={<Flame />} color="#fb923c" delay={400} />
        <KpiCard label="Water Stress" value={Math.round(rankings.reduce((s, r) => s + r.water_stress_risk, 0) / Math.max(rankings.length, 1))} suffix="" icon={<CloudRain />} color="#a78bfa" delay={480} />
        <KpiCard label="AI Confidence" value={88} suffix="%" icon={<Zap />} color="#34d399" delay={560} badge="High" />
        <KpiCard label="Avg Temp (°C)" value={Math.round((summary?.avg_temperature_c ?? 30) * 10) / 10} icon={<Thermometer />} color="#f87171" delay={640} />
      </div>

      {/* ── EXISTING MetricCards (preserved) ───────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="National Temperature"
          value={`${summary?.avg_temperature_c ?? "--"} °C`}
          detail="Latest monthly average"
          icon={Flame}
          tone="red"
          delta={{ value: "+1.2°C vs avg", isPositive: false }}
        />
        <MetricCard
          title="Rainfall"
          value={`${summary?.avg_rainfall_mm ?? "--"} mm`}
          detail="Observed district mean"
          icon={CloudRain}
          tone="cyan"
          delta={{ value: "92% of normal", isPositive: true }}
        />
        <MetricCard
          title="Reservoir Status"
          value={`${summary?.avg_reservoir_level_pct ?? "--"}%`}
          detail="India-WRIS mock aggregate"
          icon={Droplets}
          tone="emerald"
          delta={{ value: "-8% drawdown", isPositive: false }}
        />
        <MetricCard
          title="Air Quality"
          value={`${summary?.avg_aqi ?? "--"} AQI`}
          detail="CPCB mock average"
          icon={RadioTower}
          tone="amber"
          delta={{ value: "+15 AQI rise", isPositive: false }}
        />
      </div>

      {/* ── AI Daily Brief ──────────────────────────────────────────────────── */}
      {brief && (
        <div className="relative overflow-hidden rounded-2xl border border-cyan-400/20 bg-gradient-to-r from-cyan-950/60 via-slate-900/80 to-purple-950/60 p-5 backdrop-blur-md">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-purple-500/5 pointer-events-none" />
          <div className="relative flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-400/10">
              <Brain className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold uppercase tracking-widest text-cyan-400">AI Daily Climate Brief</span>
                <span className="rounded-full bg-cyan-400/15 px-2 py-0.5 text-[10px] font-medium text-cyan-300">
                  Confidence 88% · Updated now
                </span>
              </div>
              <p className="text-sm leading-relaxed text-slate-200">{brief}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Map + Alerts (EXISTING, preserved + enhanced) ──────────────────── */}
      <div className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Digital Twin Snapshot</CardTitle>
                <CardDescription>Animated climate overlays with selectable district intelligence.</CardDescription>
              </div>
              <Link href="/map">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  <Eye className="w-3.5 h-3.5" /> Full Map
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <DigitalTwinMap compact />
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle>Live Emergency Feed</CardTitle>
            <CardDescription>Real-time district warnings for emergency operation centers.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 max-h-[520px] overflow-y-auto pr-1">
            {alerts.map((alert) => {
              const severityTone =
                alert.severity === "CRITICAL" ? "critical" :
                alert.severity === "HIGH" ? "high" :
                alert.severity === "MEDIUM" ? "moderate" : "low";
              const borderColors = {
                CRITICAL: "border-rose-500/20 bg-rose-500/5",
                HIGH: "border-amber-500/20 bg-amber-500/5",
                MEDIUM: "border-cyan-500/20 bg-cyan-500/5",
                LOW: "border-emerald-500/20 bg-emerald-400/5"
              };
              const cardStyle = borderColors[alert.severity as keyof typeof borderColors] || "border-cyan-300/15 bg-white/[0.03]";
              const typeIcons: Record<string, string> = { Flood: "🌊", Heatwave: "🌡️", Drought: "☀️", Cyclone: "🌀" };
              return (
                <div key={alert.id} className={`rounded-xl border p-4 transition-all hover:bg-white/[0.06] ${cardStyle}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{typeIcons[alert.alert_type] ?? "⚠️"}</span>
                      <Badge tone={severityTone as any}>{alert.severity}</Badge>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">{alert.issued_at}</span>
                  </div>
                  <h3 className="mt-2.5 text-sm font-semibold text-white">{alert.title}</h3>
                  <p className="mt-0.5 text-xs text-cyan-200/70">{alert.district}, {alert.state}</p>
                  <p className="mt-1.5 text-xs leading-5 text-slate-300">{alert.message}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* ── Top High-Risk Regions ───────────────────────────────────────────── */}
      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Top High-Risk Districts</CardTitle>
                <CardDescription>Ranked by composite climate vulnerability index.</CardDescription>
              </div>
              <Link href="/map"><Button variant="outline" size="sm" className="text-xs gap-1"><MapPin className="w-3 h-3" />Open Map</Button></Link>
            </div>
          </CardHeader>
          <CardContent className="grid gap-2">
            {rankings.slice(0, 6).map((r, i) => (
              <RiskRegionCard
                key={r.district_id}
                rank={i + 1}
                name={r.district_name}
                region={r.state_name}
                score={r.composite_risk}
                trend={r.trend === "Increasing" ? "up" : r.trend === "Decreasing" ? "down" : "stable"}
                alerts={r.flood_risk > 70 || r.heatwave_risk > 70 ? 1 : 0}
                population={r.flood_risk > 60 ? "3.2M exposed" : "1.1M monitored"}
              />
            ))}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle>AI Recommendations</CardTitle>
            <CardDescription>Urgency-prioritized interventions from Climate AI Engine.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {recommendations.map((rec, i) => (
              <div key={i} className="flex items-start gap-3 rounded-xl border border-white/6 bg-white/4 p-3 transition-all hover:bg-white/[0.07]">
                <span
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                  style={{ background: `${priorityColors[rec.priority]}20`, color: priorityColors[rec.priority] }}>
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-xs text-slate-200 leading-relaxed">{rec.text}</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider"
                      style={{ color: priorityColors[rec.priority], background: `${priorityColors[rec.priority]}15` }}>
                      {rec.priority}
                    </span>
                    <span className="text-[10px] text-slate-600">{rec.region}</span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* ── Climate Trend Analytics ─────────────────────────────────────────── */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Climate Trend Analytics</CardTitle>
              <CardDescription>National district average across all monitored parameters.</CardDescription>
            </div>
            <div className="flex gap-2 flex-wrap">
              {/* Metric tabs */}
              <div className="flex gap-1 rounded-lg border border-white/8 bg-white/4 p-1">
                {(["rainfall", "temperature", "aqi", "risk"] as const).map((t) => (
                  <button key={t} onClick={() => setTrendTab(t)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-all ${trendTab === t ? "bg-cyan-400/20 text-cyan-300" : "text-slate-400 hover:text-slate-200"}`}>
                    {t === "risk" ? "Reservoir" : t}
                  </button>
                ))}
              </div>
              {/* Period tabs */}
              <div className="flex gap-1 rounded-lg border border-white/8 bg-white/4 p-1">
                {(["daily", "weekly", "monthly", "yearly"] as const).map((p) => (
                  <button key={p} onClick={() => setTrendPeriod(p)}
                    className={`rounded-md px-2 py-1 text-[10px] font-medium capitalize transition-all ${trendPeriod === p ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"}`}>
                    {p.charAt(0).toUpperCase() + p.slice(1, p === "monthly" ? 2 : 1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <TrendAreaChart
            data={chartData}
            dataKey={trendConfig[trendTab].key}
            color={trendConfig[trendTab].color}
            unit={trendConfig[trendTab].unit}
          />
        </CardContent>
      </Card>

      {/* ── Existing Vulnerability Leaderboard (preserved) ──────────────────── */}
      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Rainfall Trend</CardTitle>
            <CardDescription>National district average, latest 36 observations.</CardDescription>
          </CardHeader>
          <CardContent>
            <TrendAreaChart data={chartData} dataKey="rainfall_mm" color="#38bdf8" unit=" mm" />
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Vulnerability Leaderboard</CardTitle>
            <CardDescription>District-wise composite climate risk ranking.</CardDescription>
          </CardHeader>
          <CardContent>
            <RankingBarChart data={rankings.map((row) => ({ district: row.district_name, risk: row.composite_risk }))} />
          </CardContent>
        </Card>
      </div>

      {/* ── Quick Action Center + Recent Activity ───────────────────────────── */}
      <div className="grid gap-5 xl:grid-cols-[1fr_0.8fr]">
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle>Quick Action Center</CardTitle>
            <CardDescription>One-click navigation to key platform features.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {quickActions.map((action) => (
                <Link key={action.href} href={action.href}>
                  <div className="group flex flex-col items-center gap-2.5 rounded-xl border border-white/8 bg-white/[0.03] p-4 text-center transition-all duration-200 hover:scale-[1.03] hover:bg-white/[0.07] hover:shadow-lg cursor-pointer"
                    style={{ borderColor: `${action.color}20` }}>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110"
                      style={{ background: `${action.color}15`, color: action.color }}>
                      {action.icon}
                    </div>
                    <span className="text-xs font-medium text-slate-300 group-hover:text-white transition-colors">{action.label}</span>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest system and user events.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-0">
              <ActivityItem icon={<Activity className="w-3.5 h-3.5" />} color="#22d3ee" title="Simulation Run" desc="Extreme Flood preset · Dhubri, Assam · Risk 91" time="2m ago" />
              <ActivityItem icon={<FileText className="w-3.5 h-3.5" />} color="#a78bfa" title="Report Generated" desc="District Risk Summary · Jaisalmer, Rajasthan" time="18m ago" />
              <ActivityItem icon={<Brain className="w-3.5 h-3.5" />} color="#34d399" title="Copilot Query" desc="'What is the flood risk in Assam next week?'" time="34m ago" />
              <ActivityItem icon={<AlertTriangle className="w-3.5 h-3.5" />} color="#f87171" title="Critical Alert Issued" desc="Brahmaputra Flash Flood Warning · Dhubri" time="2h ago" />
              <ActivityItem icon={<RefreshCw className="w-3.5 h-3.5" />} color="#fbbf24" title="Climate Data Refreshed" desc="IMD Gridded Rainfall · 726 districts updated" time="4h ago" />
              <ActivityItem icon={<Satellite className="w-3.5 h-3.5" />} color="#38bdf8" title="Satellite Pass Completed" desc="INSAT-3DR NDVI composite · 99.2% coverage" time="6h ago" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Weather Snapshot + System Health ────────────────────────────────── */}
      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle>National Weather Snapshot</CardTitle>
            <CardDescription>Today's aggregated national climate indicators.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                { label: "Avg Temperature", value: `${summary?.avg_temperature_c ?? "--"}°C`, icon: <Thermometer className="w-4 h-4" />, color: "#f87171" },
                { label: "Avg Rainfall", value: `${summary?.avg_rainfall_mm ?? "--"} mm`, icon: <CloudRain className="w-4 h-4" />, color: "#38bdf8" },
                { label: "Avg AQI", value: `${summary?.avg_aqi ?? "--"}`, icon: <RadioTower className="w-4 h-4" />, color: "#fbbf24" },
                { label: "Reservoir Level", value: `${summary?.avg_reservoir_level_pct ?? "--"}%`, icon: <Droplets className="w-4 h-4" />, color: "#34d399" },
                { label: "Wind Speed", value: "18 km/h", icon: <Wind className="w-4 h-4" />, color: "#a78bfa" },
                { label: "Humidity", value: "64%", icon: <Activity className="w-4 h-4" />, color: "#22d3ee" },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-white/8 bg-white/[0.03] p-3.5 transition-all hover:bg-white/[0.06]"
                  style={{ borderColor: `${item.color}20` }}>
                  <div className="flex items-center gap-1.5 mb-1.5" style={{ color: item.color }}>
                    {item.icon}
                    <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: item.color }}>{item.label}</span>
                  </div>
                  <div className="text-xl font-bold text-white">{item.value}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Server className="w-4 h-4 text-cyan-400" />
              System Health
            </CardTitle>
            <CardDescription>Platform service status and latency.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {systemStatus.map((s) => (
                <div key={s.name} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 transition-all hover:bg-white/4">
                  <div className="flex items-center gap-2.5">
                    <StatusDot status={s.status} />
                    <span className="text-xs font-medium text-slate-300">{s.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.latency && <span className="text-[10px] font-mono text-slate-500">{s.latency}</span>}
                    <span className={`text-[10px] font-semibold uppercase ${s.status === "online" ? "text-emerald-400" : s.status === "degraded" ? "text-amber-400" : "text-rose-400"}`}>
                      {s.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-400/15 bg-emerald-400/5 px-3 py-2">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-[11px] text-emerald-300">5/6 services operational · Last checked now</span>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
