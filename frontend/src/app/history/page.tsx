"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";

import { TrendAreaChart } from "@/components/climate/Charts";
import { DistrictSelector } from "@/components/climate/DistrictSelector";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import type { ClimateObservation } from "@/lib/types";

export default function HistoryPage() {
  const [districtId, setDistrictId] = useState<number>();
  const [year, setYear] = useState<number | undefined>();
  const [history, setHistory] = useState<ClimateObservation[]>([]);
  const years = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 8 }, (_, index) => current - index);
  }, []);

  useEffect(() => {
    if (!districtId) return;
    api.history(districtId, year).then(setHistory).catch(() => undefined);
  }, [districtId, year]);

  const chartData = history.map((row) => ({
    date: row.observed_on,
    rainfall_mm: row.rainfall_mm,
    temperature_c: row.temperature_c,
    ndvi: row.ndvi ?? 0,
    water: row.reservoir_level_pct ?? 0
  }));

  return (
    <div className="grid gap-5">
      <div>
        <Badge>Historical Climate Explorer</Badge>
        <h1 className="mt-3 text-3xl font-semibold tracking-normal text-white">State and District Climate History</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-300">
          Select a district and year to inspect rainfall, temperature, vegetation, and water availability changes.
        </p>
      </div>

      <Card className="glass-card">
        <CardContent className="grid gap-4 p-5 md:grid-cols-[1fr_220px]">
          <div className="grid gap-2">
            <Label>District</Label>
            <DistrictSelector value={districtId} onChange={setDistrictId} />
          </div>
          <div className="grid gap-2">
            <Label>Year</Label>
            <select
              value={year ?? ""}
              onChange={(event) => setYear(event.target.value ? Number(event.target.value) : undefined)}
              className="h-10 rounded-md border border-input bg-slate-950/70 px-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-400"
            >
              <option value="">All years</option>
              {years.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Rainfall History</CardTitle>
            <CardDescription>Monthly precipitation observations.</CardDescription>
          </CardHeader>
          <CardContent>
            <TrendAreaChart data={chartData} dataKey="rainfall_mm" color="#38bdf8" unit=" mm" />
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Temperature History</CardTitle>
            <CardDescription>District mean temperature.</CardDescription>
          </CardHeader>
          <CardContent>
            <TrendAreaChart data={chartData} dataKey="temperature_c" color="#f87171" unit=" C" />
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Vegetation Changes</CardTitle>
            <CardDescription>NDVI trend from satellite mock feed.</CardDescription>
          </CardHeader>
          <CardContent>
            <TrendAreaChart data={chartData} dataKey="ndvi" color="#34d399" />
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Water Availability</CardTitle>
            <CardDescription>Reservoir level proxy.</CardDescription>
          </CardHeader>
          <CardContent>
            <TrendAreaChart data={chartData} dataKey="water" color="#22d3ee" unit="%" />
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-cyan-200" />
            Observation Table
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="text-left text-slate-400">
              <tr className="border-b border-cyan-300/15">
                <th className="py-3">Date</th>
                <th>Rainfall</th>
                <th>Temperature</th>
                <th>NDVI</th>
                <th>Soil Moisture</th>
                <th>Reservoir</th>
                <th>AQI</th>
              </tr>
            </thead>
            <tbody>
              {history.map((row) => (
                <tr key={row.observed_on} className="border-b border-cyan-300/10">
                  <td className="py-3 text-white">{row.observed_on}</td>
                  <td>{row.rainfall_mm} mm</td>
                  <td>{row.temperature_c} C</td>
                  <td>{row.ndvi}</td>
                  <td>{row.soil_moisture_pct}%</td>
                  <td>{row.reservoir_level_pct}%</td>
                  <td>{row.aqi}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
