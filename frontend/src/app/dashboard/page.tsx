"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, BarChart3, CloudRain, Droplets, Flame, Gauge, RadioTower } from "lucide-react";

import { DigitalTwinMap } from "@/components/climate/DigitalTwinMap";
import { MetricCard } from "@/components/climate/MetricCard";
import { RankingBarChart, TrendAreaChart } from "@/components/climate/Charts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TimelineSlider } from "@/components/climate/TimelineSlider";
import { useClimate } from "@/store/useClimateStore";
import { generateAnalytics, generateRankings, MOCK_ALERTS } from "@/lib/mock/engine";
import type { Analytics, ClimateAlert, Ranking } from "@/lib/types";

export default function DashboardPage() {
  const { activeYear } = useClimate();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [alerts, setAlerts] = useState<ClimateAlert[]>([]);

  useEffect(() => {
    // Dynamically generate based on global active timeline year
    setAnalytics(generateAnalytics(activeYear));
    setRankings(generateRankings(activeYear).slice(0, 8));
    setAlerts(MOCK_ALERTS);
  }, [activeYear]);

  const summary = analytics?.summary;
  const chartData = analytics?.national_trends ?? [];

  return (
    <div className="grid gap-5">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <Badge>National command dashboard</Badge>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal text-white">Climate Operations Overview</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-300">
            Live mock feeds, district vulnerability rankings, disaster forecast summaries, and command actions for AD {activeYear}.
          </p>
        </div>
        <div className="rounded-md border border-emerald-300/25 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-100 flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
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
        />
        <MetricCard
          title="Rainfall"
          value={`${summary?.avg_rainfall_mm ?? "--"} mm`}
          detail="Observed district mean"
          icon={CloudRain}
          tone="cyan"
        />
        <MetricCard
          title="Reservoir Status"
          value={`${summary?.avg_reservoir_level_pct ?? "--"}%`}
          detail="India-WRIS mock aggregate"
          icon={Droplets}
          tone="emerald"
        />
        <MetricCard
          title="Air Quality"
          value={`${summary?.avg_aqi ?? "--"} AQI`}
          detail="CPCB mock average"
          icon={RadioTower}
          tone="amber"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
        <Card>
          <CardHeader>
            <CardTitle>Digital Twin Snapshot</CardTitle>
            <CardDescription>Animated climate overlays with selectable district intelligence.</CardDescription>
          </CardHeader>
          <CardContent>
            <DigitalTwinMap compact />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Real-time Alerts</CardTitle>
            <CardDescription>District warnings for emergency operation centers.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 max-h-[420px] overflow-y-auto pr-1">
            {alerts.map((alert) => (
              <div key={alert.id} className="rounded-md border border-cyan-300/15 bg-white/[0.03] p-4 hover:border-cyan-400/30 transition">
                <div className="flex items-center justify-between gap-3">
                  <Badge tone={alert.severity}>{alert.severity}</Badge>
                  <AlertTriangle className="h-4 w-4 text-amber-200" />
                </div>
                <h3 className="mt-3 text-sm font-semibold text-white">{alert.title}</h3>
                <p className="mt-1 text-xs text-cyan-100">
                  {alert.district}, {alert.state}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-300">{alert.message}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Rainfall Trend</CardTitle>
            <CardDescription>National district average, latest 36 observations.</CardDescription>
          </CardHeader>
          <CardContent>
            <TrendAreaChart data={chartData} dataKey="rainfall_mm" color="#38bdf8" unit=" mm" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Vulnerability Leaderboard</CardTitle>
            <CardDescription>District-wise composite climate risk ranking.</CardDescription>
          </CardHeader>
          <CardContent>
            <RankingBarChart data={rankings.map((row) => ({ district: row.district_name, risk: row.composite_risk }))} />
          </CardContent>
        </Card>
      </div>

      {/* Embedded Floating Timeline Control */}
      <TimelineSlider />
    </div>
  );
}
