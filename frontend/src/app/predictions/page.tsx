"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Droplets, Flame, Sun, TrendingUp } from "lucide-react";
import { api } from "@/lib/api";
import type { District, Prediction } from "@/lib/types";

const hazardTypes = [
  { key: "flood" as const, label: "Flood", icon: Droplets, color: "cyan" },
  { key: "drought" as const, label: "Drought", icon: AlertTriangle, color: "amber" },
  { key: "heatwave" as const, label: "Heatwave", icon: Flame, color: "rose" }
];

function ProbabilityGauge({ value, color }: { value: number; color: string }) {
  const pct = Math.round(value * 100);
  const circumference = 2 * Math.PI * 42;
  const offset = circumference * (1 - value);
  const strokeColor = color === "cyan" ? "#06b6d4" : color === "amber" ? "#f59e0b" : "#f43f5e";

  return (
    <div className="relative w-48 h-48 flex items-center justify-center mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="42" fill="transparent" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
        <circle
          cx="50" cy="50" r="42"
          fill="transparent"
          stroke={strokeColor}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
          style={{ filter: `drop-shadow(0 0 8px ${strokeColor}80)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-black text-white">{pct}%</span>
        <span className={`text-[10px] uppercase tracking-widest font-bold ${
          pct >= 70 ? "text-rose-400" : pct >= 40 ? "text-amber-400" : "text-emerald-400"
        }`}>
          {pct >= 70 ? "High Risk" : pct >= 40 ? "Moderate" : "Low Risk"}
        </span>
      </div>
    </div>
  );
}

export default function PredictionsPage() {
  const [districts, setDistricts] = useState<District[]>([]);
  const [districtId, setDistrictId] = useState<number | undefined>(undefined);
  const [predictions, setPredictions] = useState<Record<string, Prediction>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.districts()
      .then((data) => {
        setDistricts(data);
        if (data.length > 0) {
          setDistrictId(data[0].id);
        }
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (districtId === undefined) return;
    setLoading(true);
    Promise.all(
      hazardTypes.map((h) => api.predict(h.key, districtId).then((p) => [h.key, p] as const))
    ).then((results) => {
      const map: Record<string, Prediction> = {};
      for (const [key, pred] of results) map[key] = pred;
      setPredictions(map);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [districtId]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-md border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-200 mb-4">
            <TrendingUp className="w-4 h-4" />
            AI Prediction Engine
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white">Hazard Predictions</h1>
          <p className="mt-2 text-slate-400 max-w-2xl">
            Multi-hazard probability forecasts powered by RandomForest, XGBoost, and scikit-learn pipelines for district-level risk assessment.
          </p>
        </div>
        <div className="w-full max-w-xs">
          <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 block">Target District</label>
          <select
            value={districtId || ""}
            onChange={(e) => setDistrictId(Number(e.target.value))}
            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-cyan-400/50 transition-all text-sm"
          >
            {districts.map((d) => (
              <option key={d.id} value={d.id}>{d.name}, {d.state_name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Prediction Cards */}
      {loading ? (
        <div className="text-center py-20 text-slate-500">Loading predictions...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {hazardTypes.map((hazard) => {
            const pred = predictions[hazard.key];
            if (!pred) return null;
            const Icon = hazard.icon;

            return (
              <div key={hazard.key} className="glass-card rounded-2xl overflow-hidden">
                <div className={`p-6 border-b border-white/5 flex items-center gap-3`}>
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${
                    hazard.color === "cyan" ? "bg-cyan-400/10 text-cyan-400 border-cyan-400/20" :
                    hazard.color === "amber" ? "bg-amber-400/10 text-amber-400 border-amber-400/20" :
                    "bg-rose-400/10 text-rose-400 border-rose-400/20"
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{hazard.label} Prediction</h3>
                    <p className="text-xs text-slate-500">{pred.model_name} {pred.model_version}</p>
                  </div>
                </div>

                <div className="p-6">
                  <ProbabilityGauge value={pred.probability} color={hazard.color} />

                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-slate-900/40 border border-white/5">
                      <span className="text-[10px] text-slate-500 uppercase">Risk Zone</span>
                      <p className={`text-sm font-bold ${
                        pred.risk_zone === "High" ? "text-rose-400" :
                        pred.risk_zone === "Moderate" ? "text-amber-400" : "text-emerald-400"
                      }`}>{pred.risk_zone}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-900/40 border border-white/5">
                      <span className="text-[10px] text-slate-500 uppercase">Valid For</span>
                      <p className="text-sm font-bold text-white">{pred.valid_for}</p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-lg border border-cyan-300/10 bg-cyan-400/5 p-4">
                    <p className="text-xs text-slate-300 leading-relaxed">{pred.explanation}</p>
                  </div>

                  {/* Input parameters */}
                  <div className="mt-4 space-y-2">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Input Parameters</p>
                    {Object.entries(pred.inputs).filter(([k]) => k !== "district_id").map(([key, val]) => (
                      <div key={key} className="flex justify-between text-xs py-1.5 border-b border-white/5">
                        <span className="text-slate-400">{key.replace(/_/g, " ")}</span>
                        <span className="text-white font-mono">{val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
