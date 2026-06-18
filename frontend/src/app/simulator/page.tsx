"use client";

import { useState, useEffect } from "react";
import { Play, RotateCcw } from "lucide-react";

import { DistrictSelector } from "@/components/climate/DistrictSelector";
import { RiskGauge } from "@/components/climate/RiskGauge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";

type Result = {
  water_availability?: number;
  crop_stress?: number;
  drought_risk?: number;
  heatwave_risk?: number;
  flood_risk?: number;
  water_stress_risk?: number;
  composite_risk?: number;
};

export default function SimulatorPage() {
  const [districtId, setDistrictId] = useState<number>();
  const [scenario, setScenario] = useState({
    rainfall_delta_pct: -20,
    temperature_delta_c: 2,
    reservoir_delta_pct: -30,
    planning_horizon_years: 5
  });
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const dId = params.get("district_id");
      const rain = params.get("rainfall");
      const temp = params.get("temp");
      const res = params.get("reservoir");
      
      if (dId) setDistrictId(Number(dId));
      setScenario((prev) => ({
        ...prev,
        rainfall_delta_pct: rain ? Number(rain) : prev.rainfall_delta_pct,
        temperature_delta_c: temp ? Number(temp) : prev.temperature_delta_c,
        reservoir_delta_pct: res ? Number(res) : prev.reservoir_delta_pct
      }));
    }
  }, []);

  async function run() {
    const response = await api.simulate({ district_id: districtId, ...scenario });
    setResult(response.results as Result);
  }

  function reset() {
    setScenario({
      rainfall_delta_pct: 0,
      temperature_delta_c: 0,
      reservoir_delta_pct: 0,
      planning_horizon_years: 5
    });
    setResult(null);
  }

  return (
    <div className="grid gap-5">
      <div>
        <Badge>Climate Scenario Simulator</Badge>
        <h1 className="mt-3 text-3xl font-semibold tracking-normal text-white">Future Conditions Lab</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-300">
          Adjust rainfall, temperature, and reservoir capacity to recalculate water availability, crop stress,
          drought, heatwave, and composite climate risk.
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Scenario Inputs</CardTitle>
            <CardDescription>Sliders model plausible policy and climate stress conditions.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="grid gap-2">
              <Label>District</Label>
              <DistrictSelector value={districtId} onChange={setDistrictId} />
            </div>
            {[
              ["rainfall_delta_pct", "Rainfall change", -60, 60, "%"],
              ["temperature_delta_c", "Temperature rise", -3, 6, " C"],
              ["reservoir_delta_pct", "Reservoir capacity change", -70, 40, "%"],
              ["planning_horizon_years", "Planning horizon", 1, 30, " years"]
            ].map(([key, label, min, max, unit]) => (
              <div key={key as string} className="grid gap-2">
                <div className="flex justify-between text-sm">
                  <Label>{label as string}</Label>
                  <span className="text-cyan-100">
                    {scenario[key as keyof typeof scenario]}
                    {unit as string}
                  </span>
                </div>
                <input
                  type="range"
                  min={min as number}
                  max={max as number}
                  value={scenario[key as keyof typeof scenario]}
                  onChange={(event) =>
                    setScenario({ ...scenario, [key as string]: Number(event.target.value) })
                  }
                  className="h-2 w-full accent-cyan-300"
                />
              </div>
            ))}
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button onClick={run} className="flex-1">
                <Play className="h-4 w-4" />
                Run Simulation
              </Button>
              <Button onClick={reset} variant="outline">
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card scanline">
          <CardHeader>
            <CardTitle>Projected Impact</CardTitle>
            <CardDescription>Scenario output updates the risk overlay contract used by the map.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
              <RiskGauge value={result?.composite_risk ?? 0} label="Projected Composite Risk" />
              <div className="grid gap-3">
                {[
                  ["Water availability", result?.water_availability],
                  ["Crop stress", result?.crop_stress],
                  ["Drought risk", result?.drought_risk],
                  ["Heatwave risk", result?.heatwave_risk],
                  ["Flood risk", result?.flood_risk],
                  ["Water stress risk", result?.water_stress_risk]
                ].map(([label, value]) => {
                  const percent = Number(value ?? 0);
                  const colors = {
                    low: "#34d399",
                    moderate: "#22d3ee",
                    high: "#fbbf24",
                    critical: "#f87171"
                  };
                  const fill = percent >= 75 ? colors.critical : percent >= 50 ? colors.high : percent >= 35 ? colors.moderate : colors.low;
                  
                  return (
                    <div key={label as string} className="rounded-xl border border-cyan-300/15 bg-slate-900/30 p-3.5 hover:border-cyan-300/30 transition-colors">
                      <div className="mb-2 flex justify-between text-sm">
                        <span className="text-slate-300 font-medium">{label as string}</span>
                        <span className="font-mono font-bold text-white">{value ?? "--"}</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-white/10 border border-white/5">
                        <div 
                          className="h-full rounded-full transition-all duration-500" 
                          style={{ 
                            width: `${percent}%`,
                            backgroundColor: fill,
                            boxShadow: `0 0 8px ${fill}bf`
                          }} 
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
