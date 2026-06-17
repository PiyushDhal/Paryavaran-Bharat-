"use client";

import { useEffect, useState } from "react";
import { BarChart3, CloudRain, Droplets, Flame, RadioTower } from "lucide-react";

import { TrendAreaChart } from "@/components/climate/Charts";
import { MetricCard } from "@/components/climate/MetricCard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import type { Analytics } from "@/lib/types";

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);

  useEffect(() => {
    api.analytics().then(setAnalytics).catch(() => undefined);
  }, []);

  const data = analytics?.national_trends ?? [];
  const summary = analytics?.summary;

  return (
    <div className="grid gap-5">
      <div>
        <Badge>Climate Analytics Dashboard</Badge>
        <h1 className="mt-3 text-3xl font-semibold tracking-normal text-white">National Climate Analytics</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-300">
          Trends for temperature, rainfall, reservoir storage, air quality, and disaster forecast readiness.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Temperature"
          value={`${summary?.avg_temperature_c ?? "--"} C`}
          detail="Latest average"
          icon={Flame}
          tone="red"
          delta={{ value: "+0.4°C normal", isPositive: false }}
        />
        <MetricCard
          title="Rainfall"
          value={`${summary?.avg_rainfall_mm ?? "--"} mm`}
          detail="Latest average"
          icon={CloudRain}
          tone="cyan"
          delta={{ value: "98% expected", isPositive: true }}
        />
        <MetricCard
          title="Reservoir"
          value={`${summary?.avg_reservoir_level_pct ?? "--"}%`}
          detail="Storage status"
          icon={Droplets}
          tone="emerald"
          delta={{ value: "+2.1% storage", isPositive: true }}
        />
        <MetricCard
          title="AQI"
          value={`${summary?.avg_aqi ?? "--"}`}
          detail="Air quality index"
          icon={RadioTower}
          tone="amber"
          delta={{ value: "-4 AQI drop", isPositive: true }}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>National Temperature Trends</CardTitle>
            <CardDescription>Monthly district average, latest 36 points.</CardDescription>
          </CardHeader>
          <CardContent>
            <TrendAreaChart data={data} dataKey="temperature_c" color="#f87171" unit=" C" />
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Rainfall Trends</CardTitle>
            <CardDescription>IMD-style precipitation aggregate.</CardDescription>
          </CardHeader>
          <CardContent>
            <TrendAreaChart data={data} dataKey="rainfall_mm" color="#38bdf8" unit=" mm" />
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Reservoir Status</CardTitle>
            <CardDescription>India-WRIS compatible storage feed.</CardDescription>
          </CardHeader>
          <CardContent>
            <TrendAreaChart data={data} dataKey="reservoir_level_pct" color="#34d399" unit="%" />
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Air Quality Index</CardTitle>
            <CardDescription>CPCB-style district AQI aggregate.</CardDescription>
          </CardHeader>
          <CardContent>
            <TrendAreaChart data={data} dataKey="aqi" color="#fbbf24" />
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Disaster Forecast Summary</CardTitle>
          <CardDescription>Model facades prepared for XGBoost, Random Forest, and scikit-learn pipelines.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {[
            ["Flood Forecast", "Rainfall, river levels, soil saturation, and reservoir headroom", "RandomForestFlood-v1", "cyan"],
            ["Drought Forecast", "Rainfall deficit, heat anomaly, vegetation condition", "XGBoostDrought-v1", "amber"],
            ["Heatwave Forecast", "Temperature trend and humidity stress", "SklearnHeatAlert-v1", "red"]
          ].map(([title, detail, model, color]) => {
            const colors = {
              cyan: "border-cyan-500/20 bg-cyan-400/10 text-cyan-400",
              amber: "border-amber-500/20 bg-amber-400/10 text-amber-400",
              red: "border-rose-500/20 bg-rose-400/10 text-rose-400"
            };
            const col = colors[color as keyof typeof colors] || colors.cyan;

            return (
              <div key={title} className={`rounded-xl border border-cyan-300/15 bg-white/[0.02] p-5 hover:border-cyan-300/30 transition-all hover:bg-white/[0.04]`}>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${col}`}>
                  <BarChart3 className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-white">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{detail}</p>
                <Badge className="mt-4" tone={color === "red" ? "critical" : color === "amber" ? "high" : "moderate"}>
                  {model}
                </Badge>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
