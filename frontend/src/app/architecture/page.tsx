"use client";

import { BrainCircuit, Cpu, Database, Globe, Layers, Radio, Satellite, Target } from "lucide-react";

const pipelineSteps = [
  { icon: Target, title: "Problem Definition", desc: "Pilot Region & Variable Selection", color: "emerald" },
  { icon: Database, title: "Data Collection", desc: "IMD Gridded & INSAT Products", color: "emerald" },
  { icon: Layers, title: "Data Processing", desc: "Feature Engineering & QC", color: "emerald" },
  { icon: BrainCircuit, title: "Model Development", desc: "Training (LSTM/Transformer)", color: "emerald" }
];

const pipelineSteps2 = [
  { icon: Globe, title: "Deployment", desc: "FastAPI + PostGIS Infrastructure", color: "emerald" },
  { icon: Radio, title: "Monitoring", desc: "Continuous drift & retraining", color: "emerald" },
  { icon: Satellite, title: "Validation", desc: "IMD Ground Truth Comparison", color: "emerald" }
];

const models = [
  {
    name: "LSTM-Transformer Hybrid",
    type: "Rainfall Forecasting",
    desc: "Sequential deep-learning architecture processing temporal climate sequences with attention mechanisms for multi-district rainfall prediction.",
    specs: ["Input: 36-month sliding window", "Output: 7-day district forecast", "Accuracy: 94.2% (R² = 0.92)"],
    badge: "Primary",
    color: "emerald"
  },
  {
    name: "CNN-LSTM Fusion",
    type: "Temperature Anomaly",
    desc: "Convolutional feature extraction from satellite imagery fused with sequential temperature series for heatwave detection.",
    specs: ["Input: INSAT LST + IMD Tmax", "Output: 3-day anomaly forecast", "Accuracy: 96.1% (R² = 0.96)"],
    badge: "Production",
    color: "rose"
  },
  {
    name: "ConvLSTM Risk Engine",
    type: "Multi-Hazard Composite",
    desc: "Spatiotemporal convolutions across district risk layers producing composite vulnerability indices for command dashboards.",
    specs: ["Input: All climate feeds", "Output: District risk scores (0-100)", "Update: Real-time / hourly"],
    badge: "Core",
    color: "emerald"
  }
];

const techAssets = [
  { name: "MOSDAC / ISRO", desc: "Satellite data gateway for INSAT-3D/3DR observations, cloud products, and derived LST feeds." },
  { name: "IMD Gridded Datasets", desc: "High-resolution 0.25° rainfall and 1° temperature products for training and validation." },
  { name: "ONNX Runtime", desc: "Cross-platform model serving layer for deployment-agnostic inference at district scale." },
  { name: "PostGIS + TimescaleDB", desc: "Geospatial-temporal database for district boundaries, risk indices, and observation time-series." }
];

export default function ArchitecturePage() {
  return (
    <div className="space-y-16">
      {/* Header */}
      <div className="max-w-4xl space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-emerald-400 backdrop-blur-md">
          <Cpu className="w-4 h-4" />
          Core AI Architecture
        </div>
        <h1 className="text-5xl lg:text-7xl font-bold tracking-tight text-white leading-tight">
          Climate Digital Twin <span className="text-emerald-400">Workflow</span>
        </h1>
        <p className="text-xl text-slate-400 max-w-2xl leading-relaxed">
          The end-to-end technical pipeline integrating multi-source national observation datasets into a predictive &ldquo;What-If&rdquo; climate simulation engine.
        </p>
      </div>

      {/* Pipeline Steps Row 1 */}
      <div className="relative py-12">
        {/* Animated Connecting Line */}
        <div className="absolute inset-0 pointer-events-none hidden md:block">
          <svg className="w-full h-full" fill="none">
            {/* Row 1 horizontal connector */}
            <path
              d="M 120, 100 L 980, 100"
              stroke="rgba(16, 185, 129, 0.12)"
              strokeWidth="3"
            />
            <path
              d="M 120, 100 L 980, 100"
              stroke="#10B981"
              strokeWidth="3"
              className="flow-line"
            />
            {/* Loop connecting Row 1 to Row 2 */}
            <path
              d="M 980, 100 C 1100, 100 1100, 240 980, 240"
              stroke="rgba(16, 185, 129, 0.12)"
              strokeWidth="3"
            />
            <path
              d="M 980, 100 C 1100, 100 1100, 240 980, 240"
              stroke="#10B981"
              strokeWidth="3"
              className="flow-line"
            />
            {/* Row 2 horizontal connector */}
            <path
              d="M 980, 240 L 120, 240"
              stroke="rgba(16, 185, 129, 0.12)"
              strokeWidth="3"
            />
            <path
              d="M 980, 240 L 120, 240"
              stroke="#10B981"
              strokeWidth="3"
              className="flow-line"
            />
          </svg>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative z-10 mb-16">
          {pipelineSteps.map((step) => {
            const Icon = step.icon;
            const isEmerald = step.color === "emerald";
            return (
              <div
                key={step.title}
                className={`glass-panel p-8 rounded-2xl text-center space-y-4 step-node ${
                  isEmerald ? "border-emerald-400/20 shadow-[0_0_40px_rgba(34,197,94,0.15)]" : "shadow-glow"
                }`}
              >
                <div className={`w-14 h-14 mx-auto rounded-xl flex items-center justify-center border ${
                  isEmerald
                    ? "bg-emerald-400/20 text-emerald-400 border-emerald-400/40"
                    : "bg-emerald-400/20 text-emerald-400 border-emerald-400/40"
                }`}>
                  <Icon className="w-7 h-7" />
                </div>
                <div>
                  <h3 className={`font-bold text-lg ${isEmerald ? "text-emerald-400" : "text-white"}`}>{step.title}</h3>
                  <p className="text-xs text-slate-400 mt-2">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pipeline Steps Row 2 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
          {pipelineSteps2.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="glass-panel p-8 rounded-2xl text-center space-y-4 step-node shadow-glow">
                <div className="w-14 h-14 mx-auto rounded-xl bg-emerald-400/20 flex items-center justify-center text-emerald-400 border border-emerald-400/40">
                  <Icon className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">{step.title}</h3>
                  <p className="text-xs text-slate-400 mt-2">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Forecaster Models */}
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">AI Forecaster Specifications</h2>
        <p className="text-slate-400 mb-8">Core model architectures powering district-level climate predictions.</p>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {models.map((model) => (
            <div key={model.name} className={`glass-card rounded-2xl p-6 hover:border-${model.color}-400/30 transition-all`}>
              <div className="flex items-center justify-between mb-4">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                  model.color === "emerald" ? "bg-emerald-400/10 text-emerald-400 border-emerald-400/20" :
                  model.color === "rose" ? "bg-rose-400/10 text-rose-400 border-rose-400/20" :
                  "bg-emerald-400/10 text-emerald-400 border-emerald-400/20"
                }`}>
                  {model.badge}
                </span>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">{model.type}</span>
              </div>
              <h3 className="text-lg font-bold text-white mb-3">{model.name}</h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-6">{model.desc}</p>
              <div className="space-y-2">
                {model.specs.map((spec) => (
                  <div key={spec} className="text-xs text-slate-300 bg-white/[0.03] border border-white/5 rounded-md px-3 py-2">
                    {spec}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Indigenous Technical Assets */}
      <div className="glass-card rounded-2xl p-8">
        <h2 className="text-2xl font-bold text-white mb-2">Indigenous Technical Assets</h2>
        <p className="text-slate-400 mb-8 text-sm">National data providers and deployment infrastructure.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {techAssets.map((asset) => (
            <div key={asset.name} className="p-5 rounded-xl bg-[#1F2937]/40 border border-white/5 hover:border-emerald-400/20 transition-all">
              <h4 className="text-sm font-bold text-white mb-2">{asset.name}</h4>
              <p className="text-xs text-slate-400 leading-relaxed">{asset.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
