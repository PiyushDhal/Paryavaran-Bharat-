"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, Cpu, HelpCircle, Layers, LineChart, Shield, Sliders } from "lucide-react";

export default function ArchitecturePage() {
  const steps = [
    {
      id: "step-1",
      title: "Problem Definition",
      desc: "Pilot region selection & key climate variable identification (rainfall & temperature).",
      icon: HelpCircle,
      color: "border-cyan-400/30 bg-cyan-400/10 text-cyan-200"
    },
    {
      id: "step-2",
      title: "Data Collection",
      desc: "Multi-source ingestion of IMD gridded observations & INSAT-3D Land Surface Temperature products.",
      icon: Database,
      color: "border-cyan-400/30 bg-cyan-400/10 text-cyan-200"
    },
    {
      id: "step-3",
      title: "Data Processing",
      desc: "Pre-processing, spatial interpolation, grid alignment, and sequence normalization.",
      icon: Sliders,
      color: "border-cyan-400/30 bg-cyan-400/10 text-cyan-200"
    },
    {
      id: "step-4",
      title: "Model Development",
      desc: "Training LSTM, Transformers, and CNN-LSTM hybrids using PyTorch and TensorFlow.",
      icon: Cpu,
      color: "border-indigo-400/30 bg-indigo-400/10 text-indigo-200"
    },
    {
      id: "step-5",
      title: "Digital Twin Simulator",
      desc: "Dynamic virtual emulation of atmospheric and hydrological ground truths.",
      icon: Layers,
      color: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
    },
    {
      id: "step-6",
      title: "Validation",
      desc: "Rigorous cross-validation against physical ground stations (RMSE, R² scores).",
      icon: Shield,
      color: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
    },
    {
      id: "step-7",
      title: "Visualization",
      desc: "Interactive GIS map overlay and multi-hazard Command Center feeds.",
      icon: LineChart,
      color: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
    }
  ];

  return (
    <div className="grid gap-6">
      <div>
        <Badge>ISRO Aligned Framework</Badge>
        <h1 className="mt-3 text-3xl font-semibold tracking-normal text-white">AI Model & Pipeline Architecture</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-300">
          Schematic representation of the data-to-prediction-to-action engine powering Bharat Climate Twin.
        </p>
      </div>

      {/* Schematic Pipeline Section */}
      <Card className="scanline relative overflow-hidden">
        <CardHeader>
          <CardTitle>End-to-End Climate Digital Twin Pipeline</CardTitle>
          <CardDescription>
            Streamlined workflow from data collection to real-time climate twin visualization and scenario simulations.
          </CardDescription>
        </CardHeader>
        <CardContent className="py-8">
          <div className="relative flex flex-col items-center gap-8 lg:flex-row lg:justify-between lg:gap-2">
            {/* Visual connector line for desktop */}
            <div className="absolute left-6 right-6 top-1/2 hidden h-0.5 -translate-y-1/2 bg-gradient-to-r from-cyan-500/50 via-indigo-500/50 to-emerald-500/50 lg:block z-0" />

            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={step.id} className="relative z-10 flex flex-col items-center max-w-[180px] text-center">
                  <div className={`grid h-12 w-12 place-items-center rounded-lg border-2 ${step.color} shadow-lg transition-transform hover:scale-110 duration-300`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-white">{step.title}</h3>
                  <p className="mt-1 text-xs text-slate-400 leading-relaxed line-clamp-3">{step.desc}</p>
                  {index < steps.length - 1 && (
                    <div className="mt-4 h-6 w-0.5 bg-cyan-400/30 lg:hidden" />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Tech Stack Details */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>AI Forecaster Core Spec</CardTitle>
            <CardDescription>Deep learning network architectures trained on IMD datasets.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="rounded-md border border-cyan-300/15 bg-white/[0.03] p-4">
              <h4 className="font-semibold text-white">1. Temporal Modeling: LSTM Engine</h4>
              <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                Uses stacked Long Short-Term Memory (LSTM) cells to capture long-term seasonal dependencies and antecedent precipitation indices, essential for drought progression forecasts.
              </p>
            </div>
            <div className="rounded-md border border-cyan-300/15 bg-white/[0.03] p-4">
              <h4 className="font-semibold text-white">2. Spatial Modeling: CNN Feature Extractor</h4>
              <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                Applies convolution filters over gridded satellite inputs (INSAT-3D LST) to learn multi-scale spatial temperature gradients and thermal inertia anomalies.
              </p>
            </div>
            <div className="rounded-md border border-cyan-300/15 bg-white/[0.03] p-4">
              <h4 className="font-semibold text-white">3. Spatio-Temporal Hybrid (ConvLSTM)</h4>
              <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                Combines 2D convolutions with sequential feedback to forecast high-resolution precipitation fields over the next 48-72 hours with exceptional geographical fidelity.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Indigenous Technical Assets</CardTitle>
            <CardDescription>Alignment with ISRO, MOSDAC, and Bhuvan data infrastructures.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="rounded-lg border border-cyan-400/20 bg-cyan-400/5 p-4">
              <h4 className="font-semibold text-cyan-200">MOSDAC Product: 3RIMG_L2B_LST</h4>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                INSAT Land Surface Temperature is mapped onto ground station gridded grids via bi-linear scaling to maintain absolute spatial consistency.
              </p>
            </div>
            <div className="rounded-lg border border-cyan-400/20 bg-cyan-400/5 p-4">
              <h4 className="font-semibold text-cyan-200">IMD Gridded Rainfall (0.25° x 0.25°)</h4>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Our main target label for predictive evaluation. Historical records since 1901 are utilized to train regional precipitation anomaly coefficients.
              </p>
            </div>
            <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/5 p-4">
              <h4 className="font-semibold text-emerald-200">AI Framework Portability</h4>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                The pipeline exports to standardized ONNX formats, ensuring seamless portability to centralized command centers or on-premises servers.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
