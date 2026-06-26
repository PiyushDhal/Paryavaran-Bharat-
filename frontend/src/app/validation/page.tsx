"use client";

import { BarChartBig, Binary, CloudRain, RefreshCw, ShieldCheck, Thermometer, TrendingUp } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const rainfallActual = [12, 19, 45, 60, 110, 320, 410, 380, 240, 95, 20, 10];
const rainfallPred = [10, 22, 48, 55, 120, 310, 395, 390, 250, 90, 25, 12];
const tempActual = [28, 32, 36, 41, 44, 42, 38, 36, 35, 33, 30, 28];
const tempPred = [27.5, 32.2, 35.8, 40.5, 43.8, 41.5, 38.2, 36.5, 34.8, 33.2, 29.8, 27.8];

const rainfallData = months.map((m, i) => ({ date: m, actual: rainfallActual[i], predicted: rainfallPred[i] }));
const tempData = months.map((m, i) => ({ date: m, actual: tempActual[i], predicted: tempPred[i] }));

const scoreCards = [
  { label: "Overall Accuracy", value: "94.2%", delta: "+0.8%", deltaColor: "text-brand-blue", progress: 94.2 },
  { label: "Total Samples", value: "12,840", sub: "Validated observations (2020-2024)" },
  { label: "Training Drift", value: "0.12", badge: "STABLE", badgeColor: "bg-brand-blue/10 text-brand-blue border-white/[0.08]", sub: "Kullback–Leibler divergence score" },
  { label: "Model Latency", value: "240ms", sub: "Inference time per district profile" }
];

const models = [
  { name: "LSTM-Transformer (Rainfall)", badge: "ACTIVE", badgeColor: "bg-surface-elevated text-brand-blue border-white/[0.08]", rmse: "4.12", mae: "2.84", r2: "0.92", r2Color: "text-brand-blue" },
  { name: "CNN-LSTM (Temperature)", badge: "Production", badgeColor: "bg-slate-700 text-muted-foreground border-slate-600", rmse: "0.85", mae: "0.62", r2: "0.96", r2Color: "text-brand-blue" },
  { name: "Baseline Random Forest", badge: "Comparison", badgeColor: "bg-surface-elevated text-muted-foreground border-slate-700", rmse: "6.24", mae: "4.15", r2: "0.78", r2Color: "text-white", opacity: true }
];

const trainingMeta = [
  { label: "Epochs", value: "1,500" },
  { label: "Validation Split", value: "20.0%" },
  { label: "Learning Rate", value: "0.0001" },
  { label: "Optimizer", value: "AdamW" },
  { label: "Dataset Version", value: "v4.2.0-PROD" }
];

const tooltipStyle = { background: "#07111f", border: "1px solid rgba(103,232,249,0.25)", borderRadius: 8, color: "#e0f2fe" };

export default function ValidationPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/[0.08] bg-surface-elevated text-brand-blue text-xs font-semibold tracking-wider uppercase mb-4">
          <ShieldCheck className="w-3.5 h-3.5" />
          Production Validation Layer v1.0.4
        </div>
        <h1 className="text-4xl lg:text-5xl font-bold text-white flex flex-wrap items-center gap-4 font-sans tracking-tight">
          Model Performance & Validation
          <span className="text-sm font-normal text-muted-foreground bg-surface-elevated/50 px-3 py-1 rounded border border-slate-700">Pilot Region: Kutch, Gujarat</span>
        </h1>
        <p className="mt-4 text-muted-foreground max-w-2xl leading-relaxed">
          Continuous verification of AI forecasting accuracy against ground-truth IMD gridded datasets and satellite observations.
        </p>
      </div>

      {/* Score Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {scoreCards.map((card) => (
          <div key={card.label} className="glass-card p-6 rounded-2xl flex flex-col gap-1">
            <span className="text-muted-foreground text-xs font-medium uppercase tracking-widest">{card.label}</span>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-white">{card.value}</span>
              {card.delta && (
                <span className={`${card.deltaColor} text-xs font-medium mb-1.5 flex items-center gap-0.5`}>
                  <TrendingUp className="w-3 h-3" /> {card.delta}
                </span>
              )}
              {card.badge && (
                <span className={`${card.badgeColor} px-2 py-0.5 rounded text-[10px] font-bold border mb-1.5`}>
                  {card.badge}
                </span>
              )}
            </div>
            {card.sub && <p className="text-xs text-muted-foreground mt-2">{card.sub}</p>}
            {card.progress && (
              <div className="w-full bg-surface-elevated h-1.5 rounded-full mt-4 overflow-hidden">
                <div className="bg-brand-blue h-full rounded-full" style={{ width: `${card.progress}%` }} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Charts + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 flex flex-col gap-8">
          {/* Rainfall Chart */}
          <div className="glass-card rounded-2xl p-8 scanline scan-beam">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <CloudRain className="w-5 h-5 text-brand-blue" />
                  Rainfall: Actual vs Predicted
                </h3>
                <p className="text-sm text-muted-foreground mt-1">IMD Gridded (0.25° x 0.25°) vs LSTM-Transformer Hybrid</p>
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <span className="w-3 h-3 rounded-full bg-brand-blue shadow-[0_0_8px_rgba(6,182,212,0.5)]" /> Actual
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <span className="w-3 h-3 rounded-full border border-slate-500 border-dashed" /> Predicted
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={360}>
              <AreaChart data={rainfallData}>
                <defs>
                  <linearGradient id="rain-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4DA8DA" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#4DA8DA" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(148,163,184,0.08)" vertical={false} />
                <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="actual" stroke="#4DA8DA" fill="url(#rain-grad)" strokeWidth={3} />
                <Line type="monotone" dataKey="predicted" stroke="rgba(148,163,184,0.5)" strokeDasharray="5 5" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Temperature Chart */}
          <div className="glass-card rounded-2xl p-8">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Thermometer className="w-5 h-5 text-rose-400" />
                  Temperature: Actual vs Predicted
                </h3>
                <p className="text-sm text-muted-foreground mt-1">Daily Max/Min Observations vs CNN-LSTM Fusion</p>
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <span className="w-3 h-3 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" /> Actual
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <span className="w-3 h-3 rounded-full bg-rose-400/30 border border-rose-400/50" /> Predicted
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={360}>
              <LineChart data={tempData}>
                <CartesianGrid stroke="rgba(148,163,184,0.08)" vertical={false} />
                <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="actual" stroke="#f43f5e" strokeWidth={3} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="predicted" stroke="rgba(251,113,133,0.4)" strokeWidth={2} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 flex flex-col gap-8">
          {/* Performance Metrics */}
          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <BarChartBig className="w-5 h-5 text-brand-blue" />
              Performance Metrics
            </h3>
            <div className="space-y-6">
              {models.map((model, i) => (
                <div key={model.name}>
                  {i > 0 && <div className="h-px bg-surface-elevated mb-6" />}
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-sm font-semibold text-secondary-foreground">{model.name}</span>
                    <span className={`text-[10px] ${model.badgeColor} px-2 py-0.5 rounded border uppercase`}>{model.badge}</span>
                  </div>
                  <div className={`grid grid-cols-3 gap-3 ${model.opacity ? "opacity-60" : ""}`}>
                    {[
                      { label: "RMSE", value: model.rmse },
                      { label: "MAE", value: model.mae },
                      { label: "R²", value: model.r2, color: model.r2Color }
                    ].map((m) => (
                      <div key={m.label} className="bg-surface/50 border border-slate-800 p-3 rounded-lg text-center">
                        <div className="text-[10px] text-muted-foreground font-bold uppercase mb-1">{m.label}</div>
                        <div className={`text-sm font-bold ${m.color || "text-white"}`}>{m.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Training Metadata */}
          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <Binary className="w-5 h-5 text-brand-blue" />
              Training Metadata
            </h3>
            <div className="space-y-4">
              {trainingMeta.map((item) => (
                <div key={item.label} className="flex justify-between text-sm py-2 border-b border-slate-800">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="text-white font-mono">{item.value}</span>
                </div>
              ))}
            </div>
            <button className="w-full mt-6 bg-surface-elevated hover:bg-slate-700 text-white text-xs font-bold py-3 rounded-lg border border-slate-700 transition-all uppercase tracking-widest flex items-center justify-center gap-2">
              <RefreshCw className="w-3.5 h-3.5" />
              Retrain Model
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
