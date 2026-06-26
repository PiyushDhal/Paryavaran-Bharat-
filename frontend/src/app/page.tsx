"use client";

import { useRef, useEffect, useCallback, useState } from "react";
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
    title: "Bharat Climate Intelligence",
    detail: "Conversational intelligence for operational planning, generating instant reports and maps."
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

// ── Floating Particles Canvas (Optimized for Space Theme) ──────
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
      if (!canvas) return;
      w = canvas.width = canvas.offsetWidth;
      h = canvas.height = canvas.offsetHeight;
    };

    const init = () => {
      resize();
      particles.length = 0;
      const count = Math.min(Math.floor((w * h) / 14000), 100);
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.2,
          r: Math.random() * 1.5 + 0.5,
          alpha: Math.random() * 0.4 + 0.1,
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
        // Swapped emerald to Space Cyan-Blue
        ctx.fillStyle = `rgba(77, 168, 218, ${alpha})`;
        ctx.fill();
      });

      // Optimized connection lines (reduced max distance to 75px)
      const maxDist = 75;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < maxDist) {
            const lineAlpha = (1 - dist / maxDist) * 0.06;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            // Swapped emerald to Space Cyan-Blue
            ctx.strokeStyle = `rgba(77, 168, 218, ${lineAlpha})`;
            ctx.lineWidth = 0.4;
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

// ── Scanning Radar Sweep Overlay (Space Cyan-Blue) ─────────────
function RadarSweep() {
  return (
    <div className="absolute inset-0 pointer-events-none z-[4] overflow-hidden">
      <div
        className="absolute left-0 right-0 h-[1px]"
        style={{
          background: "linear-gradient(to right, transparent, rgba(77, 168, 218, 0.4), transparent)",
          animation: "scanLineV 8s linear infinite"
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
          border: "1px solid rgba(77, 168, 218, 0.15)",
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
          border: "1px solid rgba(77, 168, 218, 0.12)",
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
          border: "1px solid rgba(77, 168, 218, 0.08)",
          animation: "radarPulse 4s ease-out 2.6s infinite"
        }}
      />
    </div>
  );
}

// ── Pulsing Data Nodes Overlay ──────────────────────────────────
function DataNodes() {
  const nodes = [
    { label: "IMD Delhi", top: "39.65%", left: "48.24%", delay: "0s" },
    { label: "IMD Mumbai", top: "54.98%", left: "41.31%", delay: "1.5s" },
    { label: "ISRO Bengaluru", top: "66.70%", left: "48.05%", delay: "1s" },
    { label: "NRSC Hyderabad", top: "55.76%", left: "50.00%", delay: "0.5s" },
    { label: "CWC Kolkata", top: "49.12%", left: "62.30%", delay: "0.8s" },
    { label: "CPCB Chennai", top: "65.14%", left: "53.81%", delay: "1.2s" },
    { label: "IMD Guwahati", top: "43.55%", left: "69.63%", delay: "2s" },
  ];

  return (
    <div className="absolute inset-0 pointer-events-none z-[5] hidden lg:block">
      {nodes.map((node) => (
        <div
          key={node.label}
          className="absolute flex items-center gap-2 -translate-x-[8px] -translate-y-[8px]"
          style={{ top: node.top, left: node.left }}
        >
          <span className="relative flex h-4 w-4">
            <span
              className="absolute inline-flex h-full w-full rounded-full bg-brand-highlight opacity-85"
              style={{ animation: `ping 2s cubic-bezier(0, 0, 0.2, 1) ${node.delay} infinite` }}
            />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-brand-highlight shadow-[0_0_12px_#74C7EC,0_0_24px_rgba(77,168,218,0.9)] border border-white/20" />
          </span>
          <span
            className="text-[10.5px] font-bold text-white tracking-wide whitespace-nowrap bg-slate-950/95 border border-brand-blue/40 px-2 py-0.5 rounded shadow-[0_0_10px_rgba(116,199,236,0.3)] backdrop-blur-md"
          >
            {node.label}
          </span>
        </div>
      ))}
    </div>
  );
}


// ── Interactive 3D Tilt Card (Optimized using style Refs) ───────
function TiltCard({ icon: Icon, title, detail, index }: { icon: any; title: string; detail: string; index: number }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const shineRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    const shine = shineRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    const mouseX = e.clientX - rect.left - width / 2;
    const mouseY = e.clientY - rect.top - height / 2;

    const rX = -(mouseY / (height / 2)) * 10;
    const rY = (mouseX / (width / 2)) * 10;

    card.style.transform = `perspective(1000px) rotateX(${rX.toFixed(1)}deg) rotateY(${rY.toFixed(1)}deg) scale3d(1.03, 1.03, 1)`;
    card.style.transition = "transform 0.05s ease-out, border-color 0.3s ease";

    if (shine) {
      const sX = ((e.clientX - rect.left) / width) * 100;
      const sY = ((e.clientY - rect.top) / height) * 100;
      shine.style.background = `radial-gradient(circle at ${sX.toFixed(0)}% ${sY.toFixed(0)}%, rgba(77, 168, 218, 0.15) 0%, transparent 60%)`;
      shine.style.opacity = "1";
    }
  };

  const handleMouseLeave = () => {
    const card = cardRef.current;
    const shine = shineRef.current;
    if (card) {
      card.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)";
      card.style.transition = "transform 0.4s ease-out, border-color 0.3s ease";
    }
    if (shine) {
      shine.style.opacity = "0";
    }
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`glass-card p-6 rounded-2xl hover:border-white/[0.08] group animate-fade-in-up stagger-${index + 1} perspective-1000 relative overflow-hidden`}
      style={{
        transformStyle: "preserve-3d"
      }}
    >
      <div
        ref={shineRef}
        className="absolute inset-0 pointer-events-none opacity-0 transition-opacity duration-300 z-0"
      />

      <div className="relative z-10" style={{ transform: "translateZ(30px)" }}>
        <div className="w-12 h-12 rounded-lg bg-brand-blue/10 flex items-center justify-center text-brand-blue border border-white/[0.08] group-hover:bg-brand-blue/10 group-hover:border-white/[0.08] group-hover:text-brand-titanium transition-all duration-300 shadow-glow" style={{ transform: "translateZ(15px)" }}>
          <Icon className="w-6 h-6" />
        </div>
        <h3 className="mt-6 text-lg font-semibold text-white group-hover:text-emerald-100 transition-colors" style={{ transform: "translateZ(20px)" }}>{title}</h3>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed group-hover:text-secondary-foreground transition-colors" style={{ transform: "translateZ(10px)" }}>{detail}</p>
      </div>
    </div>
  );
}

// ── Main Landing Page Component with Loading Screen ────────────
export default function LandingPage() {
  const [loading, setLoading] = useState(true);
  const [loadingStep, setLoadingStep] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  const heroRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const observationRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Elegant system readiness load sequence (approx 3s)
    const steps = [
      { duration: 700 }, // PARYAVARAN BHARAT
      { duration: 600 }, // Initializing Climate Intelligence...
      { duration: 600 }, // Connecting Digital Twin...
      { duration: 600 }, // Loading Government Datasets...
      { duration: 500 }  // System Ready
    ];
    
    let currentStep = 0;
    const nextStep = () => {
      if (currentStep < steps.length - 1) {
        currentStep++;
        setLoadingStep(currentStep);
        setTimeout(nextStep, steps[currentStep].duration);
      } else {
        setFadeOut(true);
        setTimeout(() => {
          setLoading(false);
        }, 800);
      }
    };
    
    const timer = setTimeout(nextStep, steps[0].duration);
    return () => clearTimeout(timer);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!heroRef.current) return;
    const { clientX, clientY } = e;
    const { left, top, width, height } = heroRef.current.getBoundingClientRect();

    const x = (clientX - left) / width - 0.5;
    const y = (clientY - top) / height - 0.5;

    // Direct DOM styling updates to bypass React re-render cycle
    if (bgRef.current) {
      bgRef.current.style.animation = "none";
      bgRef.current.style.transform = `translate3d(${(x * 24).toFixed(1)}px, ${(y * 16).toFixed(1)}px, 0) scale(1.08)`;
      bgRef.current.style.transition = "transform 0.1s ease-out";
    }
    if (observationRef.current) {
      observationRef.current.style.transform = `translate3d(${(x * 12).toFixed(1)}px, ${(y * 12).toFixed(1)}px, 0)`;
      observationRef.current.style.transition = "transform 0.08s ease-out";
    }
    if (contentRef.current) {
      contentRef.current.style.transform = `translate3d(${(x * -10).toFixed(1)}px, ${(y * -10).toFixed(1)}px, 0)`;
      contentRef.current.style.transition = "transform 0.08s ease-out";
    }
    if (badgeRef.current) {
      badgeRef.current.style.transform = `translate3d(${(x * -15).toFixed(1)}px, ${(y * -15).toFixed(1)}px, 0)`;
      badgeRef.current.style.transition = "transform 0.08s ease-out";
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (bgRef.current) {
      bgRef.current.style.transform = "";
      bgRef.current.style.transition = "transform 1.8s ease-out";
      setTimeout(() => {
        if (bgRef.current) {
          bgRef.current.style.animation = "slowDrift 20s ease-in-out infinite";
        }
      }, 1800);
    }
    if (observationRef.current) {
      observationRef.current.style.transform = "";
      observationRef.current.style.transition = "transform 0.8s ease-out";
    }
    if (contentRef.current) {
      contentRef.current.style.transform = "";
      contentRef.current.style.transition = "transform 0.8s ease-out";
    }
    if (badgeRef.current) {
      badgeRef.current.style.transform = "";
      badgeRef.current.style.transition = "transform 0.8s ease-out";
    }
  }, []);

  return (
    <main className="min-h-screen relative overflow-hidden bg-[#020617]">
      {/* ── Space HUD Loading Screen ─────────────────────────────── */}
      {loading && (
        <div 
          className={`fixed inset-0 z-50 bg-[#020617] flex flex-col items-center justify-center transition-opacity duration-700 ${
            fadeOut ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
        >
          {/* Subtle grid lines background overlay for HUD feel */}
          <div className="absolute inset-0 bg-radar-grid bg-[size:44px_44px] opacity-10 pointer-events-none" />
          
          <div className="relative w-36 h-36 mb-10 flex items-center justify-center">
            {/* Outer rotating ring */}
            <div className="absolute inset-0 rounded-full border border-dashed border-brand-blue/30 animate-slow-orbit" />
            {/* Inner pulsing ring */}
            <div className="absolute inset-2.5 rounded-full border border-brand-highlight/20 hud-pulse-glow" />
            {/* System core icon */}
            <div className="w-14 h-14 rounded-full overflow-hidden border border-brand-blue/30 shadow-[0_0_20px_rgba(77,168,218,0.3)]">
              <Image src="/paryavaran-logo.jpg" alt="Paryavaran Bharat" width={56} height={56} className="object-cover w-full h-full" />
            </div>
          </div>

          <div className="text-center font-mono space-y-4 relative z-10 px-6">
            <h2 className="font-sans text-2xl md:text-3xl font-bold tracking-tight text-white glow-space-blue">
              Paryavaran Bharat
            </h2>
            <div className="h-6 flex items-center justify-center">
              <p className="font-sans text-brand-titanium tracking-wide text-xs md:text-sm uppercase font-semibold">
                {loadingStep === 0 && "Initializing Climate Intelligence..."}
                {loadingStep === 1 && "Connecting Digital Twin..."}
                {loadingStep === 2 && "Loading Government Datasets..."}
                {loadingStep === 3 && "Synchronizing Satellite Feeds..."}
                {loadingStep === 4 && "System Ready"}
              </p>
            </div>
            
            {/* Simulated tech system state bars */}
            <div className="w-48 h-0.5 mx-auto bg-white/5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-brand-blue transition-all duration-500 rounded-full" 
                style={{ width: `${(loadingStep + 1) * 20}%` }}
              />
            </div>
          </div>

          {/* Side HUD Observation Logs */}
          <div className="absolute bottom-8 left-8 right-8 justify-between font-mono text-[9px] text-brand-titanium/40 hidden md:flex w-[calc(100%-4rem)] select-none">
            <div className="space-y-1">
              <div>[SECURE CHANNEL] ESTABLISHED TO ISRO SYSTEM</div>
              <div>[DATASTREAM] FEED: INSAT-3DR gridded data</div>
              <div>[STATUS] SYSTEM OPERATIONAL : OK</div>
            </div>
            <div className="text-right space-y-1">
              <div>PLATFORM ADDR: PB_HUD_LND_V2</div>
              <div>RESOLUTION ACC: 0.25d x 0.25d GRID</div>
              <div>GEOLOCATION: 20.5937° N, 78.9629° E</div>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Keyframe Injection */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slowDrift {
          0% { transform: translate3d(0px, 0px, 0) scale(1.08); }
          50% { transform: translate3d(8px, 5px, 0) scale(1.08); }
          100% { transform: translate3d(0px, 0px, 0) scale(1.08); }
        }
      ` }} />

      {/* ── Hero Section ──────────────────────────────────────── */}
      <section
        ref={heroRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative min-h-[92vh] flex items-center overflow-hidden"
      >
        {/* Cinematic Earth Background — full bleed with slow CSS drift */}
        <div
          ref={bgRef}
          className="absolute inset-[-40px] select-none pointer-events-none z-[1] animate-[slowDrift_25s_ease-in-out_infinite] flex items-center justify-center"
        >
          {/* Square aspect ratio container that matches the image and maps percentages correctly */}
          <div className="relative aspect-square w-[calc(max(100vw,92vh)+80px)] h-[calc(max(100vw,92vh)+80px)]">
            <Image
              src="/earth-india-hero.png"
              alt="Satellite view of India from space"
              fill
              className="object-cover object-center"
              priority
              quality={95}
            />
            {/* Data node pings on India — placed here so they drift and scale with the background map */}
            <DataNodes />
          </div>
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

        {/* Observation Digital Stream Overlay */}
        <div
          ref={observationRef}
          className="absolute right-6 bottom-20 max-w-xs p-4 rounded-lg border border-white/[0.08] bg-background/75 backdrop-blur-md font-mono text-[11px] text-brand-titanium/80 hidden xl:block z-10 leading-relaxed shadow-glow animate-fade-in-cta"
        >
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-1.5 mb-2 font-bold text-brand-titanium">
            <span>OBSERVATION STREAM</span>
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-blue opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-blue"></span>
            </span>
          </div>
          <div className="space-y-1">
            <div>&gt; INSAT-3DR: GRID_SYNCED</div>
            <div>&gt; IMD RAIN: OBS_INIT_0.25d</div>
            <div>&gt; SOIL_MOIST: SENSOR_98%</div>
            <div>&gt; HYDRO_LVL: 2026_SIM_LOAD</div>
            <div className="text-brand-blue animate-pulse">&gt; STATUS: SCANNING_OK</div>
          </div>
        </div>

        {/* Main hero content */}
        <div className="relative z-10 container mx-auto px-6 lg:px-16 pt-24 pb-36 lg:pb-48 w-full">
          <div className="max-w-2xl">
            <div
              ref={contentRef}
              className="space-y-6 lg:space-y-8"
            >
              {/* Premium Cinematic Logo Badge */}
              <div className="flex justify-start animate-fade-in-logo">
                <div className="flex items-center gap-3 bg-surface/50 border border-white/5 pl-3 pr-4 py-2 rounded-2xl backdrop-blur-md">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-brand-blue shadow-[0_0_20px_rgba(77,168,218,0.25)] border border-white/10 overflow-hidden">
                    <Image src="/paryavaran-logo.jpg" alt="Paryavaran Bharat Logo" width={40} height={40} className="object-cover animate-spin-slow" />
                  </span>
                  <div className="font-mono text-[9px] tracking-[0.16em] text-brand-titanium uppercase leading-tight">
                    PB CORE UNIT<br/>
                    <span className="text-brand-blue font-bold">SYSTEM ACTIVE</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h1 className="font-sans text-5xl lg:text-7xl font-bold tracking-tight text-white leading-tight animate-fade-in-title glow-space-blue">
                  Paryavaran<br />Bharat
                </h1>

                {/* Subtitle & Tagline Section */}
                <div className="space-y-2 animate-fade-in-subtitle">
                  <div className="font-sans font-semibold tracking-wide text-brand-blue uppercase text-sm sm:text-base glow-titanium-blue">
                    AI Powered Climate Intelligence Platform
                  </div>
                  <div className="font-sans font-medium tracking-wide text-brand-titanium/80 uppercase text-[10px] sm:text-xs">
                    Insights • Action • Resilience
                  </div>
                </div>
              </div>

              <div
                ref={badgeRef}
                className="inline-flex items-center gap-2 rounded-md border border-white/[0.08] bg-brand-blue/10 px-3 py-1.5 text-xs font-medium text-brand-titanium backdrop-blur-sm shadow-glow animate-fade-in-subtitle"
              >
                <ShieldAlert className="w-4 h-4 text-brand-blue animate-pulse" />
                Government-tech climate monitoring layer
              </div>

              <p className="text-base text-secondary-foreground leading-relaxed max-w-xl animate-fade-in-subtitle font-sans" style={{ textShadow: "0 0 30px rgba(2, 6, 23, 0.9)" }}>
                An AI-powered digital twin of India&apos;s climate system for prediction, simulation, and visualization of flood, drought, heat, water, air, and crop risks.
              </p>

              <div className="pt-4 flex flex-wrap gap-4 animate-fade-in-cta">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 bg-brand-blue hover:bg-brand-blue/90 hover:scale-105 text-slate-950 font-semibold px-8 py-4 rounded-lg transition-all shadow-[0_0_25px_rgba(6,182,212,0.35)]"
                >
                  Open Operations Center
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
            <div key={stat.label} className="text-center p-8 rounded-2xl border border-white/[0.08] bg-background/30">
              <p className="text-4xl lg:text-5xl font-bold text-brand-blue glow-blue font-sans tracking-wider">{stat.value}</p>
              <p className="mt-2 text-sm text-muted-foreground font-medium font-sans tracking-widest uppercase">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── National Climate Datasets ─────────────────────────── */}
      <section className="container mx-auto px-6 lg:px-16 py-24">
        <div className="max-w-4xl mb-16">
          <div className="inline-flex items-center gap-2 rounded-md border border-white/[0.08] bg-brand-blue/10 px-3 py-1 text-sm font-medium text-brand-blue">
            <Database className="w-4 h-4" />
            National Climate Datasets
          </div>
          <h2 className="mt-6 text-3xl lg:text-5xl font-bold text-white font-sans tracking-tight leading-tight">Powered by India&apos;s Climate Data Infrastructure</h2>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl font-sans">
            Paryavaran Bharat integrates meteorological observations, satellite products, and national climate datasets to power AI-driven forecasting and risk assessment.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {datasets.map((ds) => {
            const Icon = ds.icon;
            return (
              <div key={ds.title} className="glass-card p-6 rounded-2xl">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 rounded-lg bg-brand-blue/10 flex items-center justify-center text-brand-blue border border-white/[0.08]">
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="px-2 py-1 rounded bg-brand-blue/10 text-brand-blue text-xs font-medium border border-white/[0.08]">
                    {ds.resolution}
                  </span>
                </div>
                <h4 className="text-white font-semibold">{ds.title}</h4>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{ds.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Pipeline visualization */}
        <div className="mt-12 glass-card p-8 rounded-2xl bg-background/20">
          <h3 className="text-lg font-semibold text-white mb-8 font-sans tracking-normal uppercase">Climate Data Fusion Pipeline</h3>
          <div className="flex flex-wrap items-center gap-4">
            {pipeline.map((step, i) => (
              <div key={step} className="flex items-center gap-4">
                <div className={`px-4 py-2 rounded-lg border text-xs font-mono tracking-wider ${
                  i === pipeline.length - 1
                    ? "border-white/[0.08] bg-brand-blue/10 text-brand-titanium font-semibold"
                    : "border-white/[0.08] bg-brand-blue/10 text-emerald-200"
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
              <div key={card.title} className="p-8 rounded-2xl border border-white/[0.08] bg-background/30 flex flex-col gap-4 hover:border-white/[0.08] transition-colors">
                <Icon className="w-8 h-8 text-brand-titanium" />
                <h4 className="text-xl font-bold text-white">{card.title}</h4>
                <p className="text-muted-foreground text-sm">{card.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.08] bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-6 lg:px-16 py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="grid h-10 w-10 place-items-center rounded-md bg-brand-blue/10 border border-white/[0.08]">
                  <Satellite className="h-5 w-5 text-brand-blue" />
                </div>
                <span className="text-lg font-bold text-white font-sans tracking-wider">Paryavaran Bharat</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-md font-sans">
                AI-powered digital twin of India&apos;s climate system. Built for national resilience with indigenous data sources from IMD, ISRO, NRSC, India-WRIS, and CPCB.
              </p>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Platform</h4>
              <div className="grid gap-2">
                {[
                  { name: "Dashboard", href: "/dashboard" },
                  { name: "Digital Twin Map", href: "/map" },
                  { name: "Risk Center", href: "/risk-center" },
                  { name: "Simulator", href: "/simulator" },
                  { name: "Paryavaran Intelligence", href: "/copilot" }
                ].map((item) => (
                  <Link key={item.name} href={item.href} className="text-sm text-muted-foreground hover:text-brand-titanium transition-colors">
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Data Sources</h4>
              <div className="grid gap-2 text-sm text-muted-foreground">
                <span>IMD Gridded Datasets</span>
                <span>INSAT / MOSDAC</span>
                <span>Bhuvan / NRSC</span>
                <span>India-WRIS</span>
                <span>CPCB Air Quality</span>
              </div>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-white/5 text-center text-xs text-muted-foreground">
            © 2026 Paryavaran Bharat. Government-tech climate resilience platform.
          </div>
        </div>
      </footer>
    </main>
  );
}
