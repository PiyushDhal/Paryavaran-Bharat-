"use client";

import { useState, useEffect } from "react";
import { Play, RotateCcw, Download } from "lucide-react";

import { DistrictSelector } from "@/components/climate/DistrictSelector";
import { RiskGauge } from "@/components/climate/RiskGauge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useClimate } from "@/store/useClimateStore";
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
  const { activeYear } = useClimate();
  const [districtId, setDistrictId] = useState<number>(101); // Default to Mumbai
  const [scenario, setScenario] = useState({
    rainfall_delta_pct: -20,
    temperature_delta_c: 2,
    reservoir_delta_pct: -30,
    planning_horizon_years: 5
  });
  const [result, setResult] = useState<Result | null>(null);

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

  // Auto-run simulation on state changes to provide instant visual feedback!
  useEffect(() => {
    run();
  }, [districtId, scenario]);

  return (
    <div className="grid gap-5">
      <div>
        <Badge>Climate Scenario Simulator</Badge>
        <h1 className="mt-3 text-3xl font-semibold tracking-normal text-white">Future Conditions Lab</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-300">
          Adjust rainfall, temperature, and reservoir capacity to recalculate water availability, crop stress,
          drought, heatwave, and composite climate risk for AD {activeYear}.
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Scenario Inputs</CardTitle>
            <CardDescription>Sliders model plausible policy and climate stress conditions.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="grid gap-2">
              <Label>District Focus</Label>
              <DistrictSelector value={districtId} onChange={(val) => setDistrictId(val || 101)} />
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
                  <span className="text-cyan-100 font-semibold">
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
                  className="h-2 w-full accent-cyan-300 cursor-pointer"
                />
              </div>
            ))}
            <div className="flex flex-col gap-3 sm:flex-row mt-4">
              <Button onClick={run} className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-semibold">
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

        <Card className="scanline relative">
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle>Projected Impact</CardTitle>
              <CardDescription>Scenario output updates the risk overlay contract used by the map.</CardDescription>
            </div>
            {result && (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => window.print()}>
                <Download className="h-4 w-4" /> Export Report
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
              <div className="flex justify-center items-center h-full">
                <RiskGauge value={result?.composite_risk ?? 0} label="Projected Composite Risk" />
              </div>
              <div className="grid gap-3">
                {[
                  ["Water availability", result?.water_availability],
                  ["Crop stress", result?.crop_stress],
                  ["Drought risk", result?.drought_risk],
                  ["Heatwave risk", result?.heatwave_risk],
                  ["Flood risk", result?.flood_risk],
                  ["Water stress risk", result?.water_stress_risk]
                ].map(([label, value]) => (
                  <div key={label as string} className="rounded-md border border-cyan-300/15 bg-white/[0.03] p-3">
                    <div className="mb-2 flex justify-between text-sm">
                      <span className="text-slate-300">{label as string}</span>
                      <span className="font-semibold text-white">{value ?? "--"}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-cyan-300 transition-all duration-300" style={{ width: `${value ?? 0}%` }} />
                    </div>
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
