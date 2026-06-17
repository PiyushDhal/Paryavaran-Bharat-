"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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

// ── Floating Particles Canvas ──────────────────────────────────
function FloatingParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let w = 0;
    let h = 0;

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      r: number;
      alpha: number;
      pulseSpeed: number;
      pulsePhase: number;
    }

    const particles: Particle[] = [];

    const resize = () => {
      w = canvas.width = canvas.offsetWidth;
      h = canvas.height = canvas.offsetHeight;
    };

    const init = () => {
      resize();
      particles.length = 0;
      const count = Math.min(Math.floor((w * h) / 12000), 120);
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.35,
          vy: (Math.random() - 0.5) * 0.25,
          r: Math.random() * 1.8 + 0.5,
          alpha: Math.random() * 0.5 + 0.1,
          pulseSpeed: Math.random() * 0.002 + 0.001,
          pulsePhase: Math.random() * Math.PI * 2
        });
      }
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;

        const pulse = Math.sin(t * p.pulseSpeed + p.pulsePhase) * 0.3 + 0.7;
        const alpha = p.alpha * pulse;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(34, 211, 238, ${alpha})`;
        ctx.fill();
      });

      // Draw connection lines between nearby particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            const lineAlpha = (1 - dist / 100) * 0.08;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(34, 211, 238, ${lineAlpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      animId = requestAnimationFrame(draw);
    };

    init();
    animId = requestAnimationFrame(draw);
    window.addEventListener("resize", init);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", init);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-[3]"
      style={{ opacity: 0.7 }}
    />
  );
}

// ── Scanning Radar Sweep Overlay ────────────────────────────────
function RadarSweep() {
  return (
    <div className="absolute inset-0 pointer-events-none z-[4] overflow-hidden">
      {/* Horizontal scan line */}
      <div
        className="absolute left-0 right-0 h-[1px]"
        style={{
          background: "linear-gradient(to right, transparent, rgba(34, 211, 238, 0.4), transparent)",
          animation: "scanLineV 8s linear infinite"
        }}
      />
      {/* Radial pulse from center-right (India location) */}
      <div
        className="absolute"
        style={{
          top: "35%",
          right: "25%",
          width: "300px",
          height: "300px",
          borderRadius: "50%",
          border: "1px solid rgba(34, 211, 238, 0.15)",
          animation: "radarPulse 4s ease-out infinite"
        }}
      />
      <div
        className="absolute"
        style={{
          top: "35%",
          right: "25%",
          width: "300px",
          height: "300px",
          borderRadius: "50%",
          border: "1px solid rgba(34, 211, 238, 0.12)",
          animation: "radarPulse 4s ease-out 1.3s infinite"
        }}
      />
      <div
        className="absolute"
        style={{
          top: "35%",
          right: "25%",
          width: "300px",
          height: "300px",
          borderRadius: "50%",
          border: "1px solid rgba(34, 211, 238, 0.08)",
          animation: "radarPulse 4s ease-out 2.6s infinite"
        }}
      />
    </div>
  );
}

// ── Pulsing Data Nodes Overlay ──────────────────────────────────
function DataNodes() {
  const nodes = [
    { label: "IMD Delhi", top: "28%", left: "52%", delay: "0s" },
    { label: "NRSC Hyderabad", top: "48%", left: "50%", delay: "0.5s" },
    { label: "ISRO Bengaluru", top: "58%", left: "48%", delay: "1s" },
    { label: "IMD Mumbai", top: "44%", left: "42%", delay: "1.5s" },
    { label: "IMD Guwahati", top: "32%", left: "62%", delay: "2s" },
  ];

  return (
    <div className="absolute inset-0 pointer-events-none z-[5] hidden lg:block">
      {nodes.map((node) => (
        <div
          key={node.label}
          className="absolute flex items-center gap-1.5"
          style={{ top: node.top, left: node.left }}
        >
          {/* Pulsing ring */}
          <span className="relative flex h-3 w-3">
            <span
              className="absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"
              style={{ animation: `ping 2s cubic-bezier(0, 0, 0.2, 1) ${node.delay} infinite` }}
            />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500 shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
          </span>
          <span
            className="text-[9px] font-mono text-cyan-300/70 tracking-wider whitespace-nowrap bg-slate-950/50 px-1 py-0.5 rounded backdrop-blur-sm"
            style={{ animationDelay: node.delay }}
          >
            {node.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Interactive 3D Tilt Card Component ──────────────────────────
function TiltCard({ icon: Icon, title, detail, index }: { icon: any; title: string; detail: string; index: number }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [shine, setShine] = useState({ x: 50, y: 50 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    const mouseX = e.clientX - rect.left - width / 2;
    const mouseY = e.clientY - rect.top - height / 2;

    const rX = -(mouseY / (height / 2)) * 12;
    const rY = (mouseX / (width / 2)) * 12;

    setTilt({ x: rX, y: rY });

    const sX = ((e.clientX - rect.left) / width) * 100;
    const sY = ((e.clientY - rect.top) / height) * 100;
    setShine({ x: sX, y: sY });
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
    setIsHovered(false);
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`glass-card p-6 rounded-xl hover:border-cyan-400/40 transition-colors group animate-fade-in-up stagger-${index + 1} perspective-1000 relative overflow-hidden`}
      style={{
        transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale3d(${isHovered ? 1.03 : 1}, ${isHovered ? 1.03 : 1}, 1)`,
        transition: isHovered ? "transform 0.05s ease-out, border-color 0.3s ease" : "transform 0.5s ease-out, border-color 0.3s ease",
        transformStyle: "preserve-3d"
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-350 z-0"
        style={{
          background: `radial-gradient(circle at ${shine.x}% ${shine.y}%, rgba(34, 211, 238, 0.15) 0%, transparent 60%)`
        }}
      />

      <div className="relative z-10" style={{ transform: "translateZ(30px)" }}>
        <div className="w-12 h-12 rounded-lg bg-cyan-400/10 flex items-center justify-center text-cyan-400 border border-cyan-400/20 group-hover:bg-cyan-400/20 group-hover:border-cyan-400/40 group-hover:text-cyan-300 transition-all duration-300 shadow-glow" style={{ transform: "translateZ(15px)" }}>
          <Icon className="w-6 h-6" />
        </div>
        <h3 className="mt-6 text-lg font-semibold text-white group-hover:text-cyan-100 transition-colors" style={{ transform: "translateZ(20px)" }}>{title}</h3>
        <p className="mt-3 text-sm text-slate-400 leading-relaxed group-hover:text-slate-300 transition-colors" style={{ transform: "translateZ(10px)" }}>{detail}</p>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [bgOffset, setBgOffset] = useState({ x: 0, y: 0 });

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!heroRef.current) return;
    const { clientX, clientY } = e;
    const { left, top, width, height } = heroRef.current.getBoundingClientRect();

    const x = (clientX - left) / width - 0.5;
    const y = (clientY - top) / height - 0.5;

    setMousePos({ x, y });
    setBgOffset({ x: x * 30, y: y * 20 });
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setMousePos({ x: 0, y: 0 });
    setBgOffset({ x: 0, y: 0 });
    setIsHovered(false);
  }, []);

  // Slow automatic drift for background when not hovering
  const [autoDrift, setAutoDrift] = useState({ x: 0, y: 0 });
  useEffect(() => {
    let t = 0;
    const interval = setInterval(() => {
      if (!isHovered) {
        t += 0.015;
        setAutoDrift({
          x: Math.sin(t) * 8,
          y: Math.cos(t * 0.7) * 5
        });
      }
    }, 50);
    return () => clearInterval(interval);
  }, [isHovered]);

  const effectiveOffset = isHovered ? bgOffset : autoDrift;

  return (
    <main className="min-h-screen relative overflow-hidden bg-[#020617]">
      {/* ── Hero Section ──────────────────────────────────────── */}
      <section
        ref={heroRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative min-h-[92vh] flex items-center overflow-hidden"
      >
        {/* Cinematic Earth Background — full bleed with parallax */}
        <div
          className="absolute inset-[-40px] select-none pointer-events-none z-[1]"
          style={{
            transform: `translate3d(${effectiveOffset.x}px, ${effectiveOffset.y}px, 0) scale(1.08)`,
            transition: isHovered ? "transform 0.12s ease-out" : "transform 2s ease-out"
          }}
        >
          <Image
            src="/earth-india-hero.png"
            alt="Satellite view of India from space"
            fill
            className="object-cover object-center"
            priority
            quality={95}
          />
        </div>

        {/* Gradient overlays for text readability */}
        <div className="absolute inset-0 z-[2]" style={{
          background: "linear-gradient(to right, rgba(2, 6, 23, 0.92) 0%, rgba(2, 6, 23, 0.75) 35%, rgba(2, 6, 23, 0.3) 55%, rgba(2, 6, 23, 0.05) 75%)"
        }} />
        <div className="absolute inset-0 z-[2]" style={{
          background: "linear-gradient(to top, rgba(2, 6, 23, 0.95) 0%, rgba(2, 6, 23, 0.3) 25%, transparent 50%)"
        }} />
        <div className="absolute inset-0 z-[2]" style={{
          background: "linear-gradient(to bottom, rgba(2, 6, 23, 0.7) 0%, transparent 20%)"
        }} />

        {/* Floating particles */}
        <FloatingParticles />

        {/* Radar sweep animation */}
        <RadarSweep />

        {/* Data node pings on India */}
        <DataNodes />

        {/* Telemetry Digital Stream Overlay */}
        <div
          className="absolute right-6 bottom-20 max-w-xs p-4 rounded-lg border border-cyan-400/10 bg-slate-950/75 backdrop-blur-md font-mono text-[11px] text-cyan-300/80 hidden xl:block z-10 leading-relaxed shadow-glow"
          style={{
            transform: `translate3d(${mousePos.x * 12}px, ${mousePos.y * 12}px, 0)`,
            transition: isHovered ? "transform 0.08s ease-out" : "transform 0.9s ease-out"
          }}
        >
          <div className="flex items-center justify-between border-b border-cyan-400/20 pb-1.5 mb-2 font-bold text-cyan-300">
            <span>TELEMETRY STREAM</span>
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>
          <div className="space-y-1">
            <div>&gt; INSAT-3DR: GRID_SYNCED</div>
            <div>&gt; IMD RAIN: OBS_INIT_0.25d</div>
            <div>&gt; SOIL_MOIST: SENSOR_98%</div>
            <div>&gt; HYDRO_LVL: 2026_SIM_LOAD</div>
            <div className="text-emerald-400 animate-pulse">&gt; STATUS: SCANNING_OK</div>
          </div>
        </div>

        {/* Main hero content */}
        <div className="relative z-10 container mx-auto px-6 lg:px-16 pt-24 pb-36 lg:pb-48 w-full">
          <div className="max-w-2xl">
            <div
              className="space-y-6 lg:space-y-8 animate-fade-in-up"
              style={{
                transform: `translate3d(${mousePos.x * -12}px, ${mousePos.y * -12}px, 0)`,
                transition: isHovered ? "transform 0.08s ease-out" : "transform 0.9s ease-out"
              }}
            >
              <div
                className="inline-flex items-center gap-2 rounded-md border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5 text-sm font-medium text-cyan-300 backdrop-blur-sm shadow-glow"
                style={{
                  transform: `translate3d(${mousePos.x * -18}px, ${mousePos.y * -18}px, 0)`,
                  transition: isHovered ? "transform 0.08s ease-out" : "transform 0.9s ease-out"
                }}
              >
                <ShieldAlert className="w-4 h-4 text-cyan-400 animate-pulse" />
                Government-tech climate command layer
              </div>

              <h1 className="text-6xl lg:text-8xl font-bold tracking-tight text-white leading-none" style={{ textShadow: "0 0 60px rgba(2, 6, 23, 0.8)" }}>
                Bharat Climate<br />Twin
              </h1>

              <p className="text-xl text-slate-300 leading-relaxed max-w-xl" style={{ textShadow: "0 0 30px rgba(2, 6, 23, 0.9)" }}>
                An AI-powered digital twin of India&apos;s climate system for prediction, simulation, and visualization of flood, drought, heat, water, air, and crop risks.
              </p>

              <div
                className="pt-4 flex flex-wrap gap-4"
                style={{
                  transform: `translate3d(${mousePos.x * -8}px, ${mousePos.y * -8}px, 0)`,
                  transition: isHovered ? "transform 0.08s ease-out" : "transform 0.9s ease-out"
                }}
              >
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600 hover:scale-105 text-slate-950 font-semibold px-8 py-4 rounded-lg transition-all shadow-[0_0_25px_rgba(6,182,212,0.35)]"
                >
                  Open Command Center
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Capability Cards ──────────────────────────────────── */}
      <section className="relative z-20 mt-12 lg:-mt-20 container mx-auto px-6 lg:px-16 mb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {capabilities.map((cap, i) => (
            <TiltCard
              key={cap.title}
              icon={cap.icon}
              title={cap.title}
              detail={cap.detail}
              index={i}
            />
          ))}
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
