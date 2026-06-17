"use client";

import Link from "next/link";
import Image from "next/image";
import {
  Activity,
  ArrowRight,
  BarChart3,
  ChevronRight,
  CloudRain,
  Database,
  Droplets,
  Gauge,
  Map,
  Satellite,
  ShieldAlert,
  ShieldCheck,
  Thermometer,
  Zap
} from "lucide-react";

const capabilities = [
  {
    icon: Satellite,
    title: "Satellite + Weather Fusion",
    detail: "Multi-source ingestion from INSAT, NRSC, Bhuvan, and IMD for high-resolution ground truth."
  },
  {
    icon: Gauge,
    title: "District Risk Engine",
    detail: "Dynamic vulnerability scoring from 0-100 for flood, drought, heatwave, and water-stress."
  },
  {
    icon: Activity,
    title: "Scenario Simulator",
    detail: "Stress-test climate variables to predict multi-sector outcomes and infrastructure resilience."
  },
  {
    icon: Zap,
    title: "AI Climate Copilot",
    detail: "Conversational intelligence for operational command, generating instant reports and maps."
  }
];

const datasets = [
  { icon: CloudRain, title: "IMD Gridded Rainfall", resolution: "0.25° × 0.25°", desc: "High-resolution rainfall observations used for climate analysis and drought monitoring." },
  { icon: Thermometer, title: "IMD Maximum Temperature", resolution: "1° × 1°", desc: "Daily maximum temperature dataset supporting heatwave and climate trend analysis." },
  { icon: Satellite, title: "INSAT Land Surface Temp", resolution: "Satellite Product", desc: "Surface temperature observations derived from INSAT Earth observation missions." }
];

const pipeline = ["IMD Rainfall", "IMD Temperature", "INSAT Products", "AI Forecast Engine", "Climate Twin"];

const riskCards = [
  { icon: Droplets, title: "Flood Risk", desc: "Brahmaputra, coastal, and urban drainage exposure monitoring and early warning." },
  { icon: BarChart3, title: "Drought Watch", desc: "Rainfall deficit, vegetation health, and reservoir drawdown analytics for food security." },
  { icon: ShieldCheck, title: "Action Layer", desc: "District rankings, localized alerts, and role-based access for response operations." }
];

const stats = [
  { value: "748", label: "Districts Monitored" },
  { value: "36", label: "States & UTs" },
  { value: "10+", label: "Data Sources" },
  { value: "24/7", label: "Real-time Feeds" }
];

export default function LandingPage() {
  return (
    <main className="min-h-screen relative overflow-hidden" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(34, 211, 238, 0.05) 1px, transparent 0)", backgroundSize: "24px 24px" }}>
      {/* ── Hero Section ──────────────────────────────────────── */}
      <section className="relative min-h-[92vh] flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/images/bharat-climate-hero.png"
            alt="Satellite view of India"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 hero-gradient-overlay" />
          <div className="absolute inset-0 hero-bottom-gradient" />
        </div>

        <div className="relative z-10 container mx-auto px-6 lg:px-16 pt-24 pb-32 lg:pb-40">
          <div className="max-w-3xl animate-fade-in-up">
            <div className="inline-flex items-center gap-2 rounded-md border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5 text-sm font-medium text-cyan-200 backdrop-blur-sm">
              <ShieldAlert className="w-4 h-4" />
              Government-tech climate command layer
            </div>

            <h1 className="mt-8 text-6xl lg:text-8xl font-bold tracking-tight text-white">
              Bharat Climate Twin
            </h1>

            <p className="mt-8 text-xl text-slate-300 leading-relaxed max-w-2xl">
              An AI-powered digital twin of India&apos;s climate system for prediction, simulation, and visualization of flood, drought, heat, water, air, and crop risks.
            </p>

            <div className="mt-12 flex flex-wrap gap-4">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-semibold px-8 py-4 rounded-lg transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)]"
              >
                Open Command Center
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Capability Cards ──────────────────────────────────── */}
      <section className="relative z-20 -mt-20 container mx-auto px-6 lg:px-16 mb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {capabilities.map((cap, i) => {
            const Icon = cap.icon;
            return (
              <div
                key={cap.title}
                className={`glass-card p-6 rounded-xl hover:border-cyan-400/40 transition-colors group animate-fade-in-up stagger-${i + 1}`}
              >
                <div className="w-12 h-12 rounded-lg bg-cyan-400/10 flex items-center justify-center text-cyan-400 border border-cyan-400/20 group-hover:bg-cyan-400/20 transition-all">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="mt-6 text-lg font-semibold text-white">{cap.title}</h3>
                <p className="mt-3 text-sm text-slate-400 leading-relaxed">{cap.detail}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Stats Counter ─────────────────────────────────────── */}
      <section className="container mx-auto px-6 lg:px-16 mb-24">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center p-8 rounded-2xl border border-cyan-400/10 bg-slate-950/30">
              <p className="text-4xl lg:text-5xl font-bold text-cyan-400 glow-cyan">{stat.value}</p>
              <p className="mt-2 text-sm text-slate-400 font-medium">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── National Climate Datasets ─────────────────────────── */}
      <section className="container mx-auto px-6 lg:px-16 py-24">
        <div className="max-w-4xl mb-16">
          <div className="inline-flex items-center gap-2 rounded-md border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-sm font-medium text-cyan-400">
            <Database className="w-4 h-4" />
            National Climate Datasets
          </div>
          <h2 className="mt-6 text-4xl lg:text-5xl font-bold text-white">Powered by India&apos;s Climate Data Infrastructure</h2>
          <p className="mt-6 text-lg text-slate-400 max-w-2xl">
            Bharat Climate Twin integrates meteorological observations, satellite products, and national climate datasets to power AI-driven forecasting and risk assessment.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {datasets.map((ds) => {
            const Icon = ds.icon;
            return (
              <div key={ds.title} className="glass-card p-6 rounded-xl">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 rounded-lg bg-cyan-400/10 flex items-center justify-center text-cyan-400 border border-cyan-400/20">
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="px-2 py-1 rounded bg-emerald-400/10 text-emerald-400 text-xs font-medium border border-emerald-400/20">
                    {ds.resolution}
                  </span>
                </div>
                <h4 className="text-white font-semibold">{ds.title}</h4>
                <p className="mt-3 text-sm text-slate-400 leading-relaxed">{ds.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Pipeline visualization */}
        <div className="mt-12 glass-card p-8 rounded-2xl bg-slate-950/20">
          <h3 className="text-xl font-semibold text-white mb-8">Climate Data Fusion Pipeline</h3>
          <div className="flex flex-wrap items-center gap-4">
            {pipeline.map((step, i) => (
              <div key={step} className="flex items-center gap-4">
                <div className={`px-4 py-2 rounded-lg border text-sm ${
                  i === pipeline.length - 1
                    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300 font-semibold"
                    : "border-cyan-400/20 bg-cyan-400/5 text-cyan-200"
                }`}>
                  {step}
                </div>
                {i < pipeline.length - 1 && <ChevronRight className="w-4 h-4 text-slate-600" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Risk / Action Cards ────────────────────────────────── */}
      <section className="container mx-auto px-6 lg:px-16 pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {riskCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.title} className="p-8 rounded-2xl border border-cyan-400/10 bg-slate-950/30 flex flex-col gap-4 hover:border-cyan-400/25 transition-colors">
                <Icon className="w-8 h-8 text-emerald-300" />
                <h4 className="text-xl font-bold text-white">{card.title}</h4>
                <p className="text-slate-400 text-sm">{card.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer className="border-t border-cyan-400/10 bg-slate-950/80 backdrop-blur-md">
        <div className="container mx-auto px-6 lg:px-16 py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="grid h-10 w-10 place-items-center rounded-md bg-cyan-400/10 border border-cyan-400/20">
                  <Satellite className="h-5 w-5 text-cyan-400" />
                </div>
                <span className="text-lg font-bold text-white">Bharat Climate Twin</span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed max-w-md">
                AI-powered digital twin of India&apos;s climate system. Built for national resilience with indigenous data sources from IMD, ISRO, NRSC, India-WRIS, and CPCB.
              </p>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Platform</h4>
              <div className="grid gap-2">
                {["Dashboard", "Digital Twin Map", "Risk Center", "Simulator", "AI Copilot"].map((item) => (
                  <Link key={item} href={`/${item.toLowerCase().replace(/\s+/g, "-")}`} className="text-sm text-slate-400 hover:text-cyan-300 transition-colors">
                    {item}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Data Sources</h4>
              <div className="grid gap-2 text-sm text-slate-400">
                <span>IMD Gridded Datasets</span>
                <span>INSAT / MOSDAC</span>
                <span>Bhuvan / NRSC</span>
                <span>India-WRIS</span>
                <span>CPCB Air Quality</span>
              </div>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-white/5 text-center text-xs text-slate-500">
            © 2025 Bharat Climate Twin. Government-tech climate resilience platform.
          </div>
        </div>
      </footer>
    </main>
  );
}
