"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, BarChart3, CloudRain, Droplets, Flame, Gauge, RadioTower } from "lucide-react";

import { DigitalTwinMap } from "@/components/climate/DigitalTwinMap";
import { MetricCard } from "@/components/climate/MetricCard";
import { RankingBarChart, TrendAreaChart } from "@/components/climate/Charts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import type { Analytics, ClimateAlert, Ranking } from "@/lib/types";

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [alerts, setAlerts] = useState<ClimateAlert[]>([]);

  useEffect(() => {
    Promise.all([api.analytics(), api.rankings(8), api.alerts()])
      .then(([analyticsResponse, rankingResponse, alertResponse]) => {
        setAnalytics(analyticsResponse);
        setRankings(rankingResponse);
        setAlerts(alertResponse);
      })
      .catch(() => undefined);
  }, []);

  const summary = analytics?.summary;
  const chartData = analytics?.national_trends ?? [];

  return (
    <div className="grid gap-5">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <Badge>National command dashboard</Badge>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal text-white">Climate Operations Overview</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-300">
            Live mock feeds, district vulnerability rankings, disaster forecast summaries, and command actions.
          </p>
        </div>
        <div className="rounded-md border border-emerald-300/25 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-100">
          {summary?.districts_monitored ?? 0} districts monitored
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="National Temperature"
          value={`${summary?.avg_temperature_c ?? "--"} C`}
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

      <div className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Digital Twin Snapshot</CardTitle>
            <CardDescription>Animated climate overlays with selectable district intelligence.</CardDescription>
          </CardHeader>
          <CardContent>
            <DigitalTwinMap compact />
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Real-time Alerts</CardTitle>
            <CardDescription>District warnings for emergency operation centers.</CardDescription>
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

              return (
                <div key={alert.id} className={`rounded-md border p-4 transition-all hover:bg-white/[0.06] ${cardStyle}`}>
                  <div className="flex items-center justify-between gap-3">
                    <Badge tone={severityTone}>{alert.severity}</Badge>
                    <AlertTriangle className={`h-4 w-4 ${
                      alert.severity === "CRITICAL" ? "text-rose-400" :
                      alert.severity === "HIGH" ? "text-amber-400" : "text-cyan-400"
                    }`} />
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-white">{alert.title}</h3>
                  <p className="mt-1 text-xs text-cyan-200/70">
                    {alert.district}, {alert.state}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-slate-300">{alert.message}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

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
    </div>
  );
}
