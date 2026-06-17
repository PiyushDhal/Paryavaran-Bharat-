"use client";

import { useState } from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, BookOpen, Check, ShieldAlert, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RiskGauge } from "@/components/climate/RiskGauge";
import { MOCK_DISTRICTS } from "@/lib/mock/engine";

type StorySlide = {
  id: number;
  title: string;
  year: number;
  districtName: string;
  districtId: number;
  narrative: string;
  compositeRisk: number;
  hazards: { label: string; val: number }[];
  actionLabel: string;
  advisoryText: string;
};

const slides: StorySlide[] = [
  {
    id: 1,
    title: "Scenario Alpha: Arid Drought Crisis",
    year: 2030,
    districtName: "Kutch, Gujarat",
    districtId: 501,
    narrative: "Under intermediate SSP2-4.5 carbon forcing, monsoon arrival in western drylands is delayed by 18 days. Upstream soil moisture registers a critical 12% saturation. Local reservoir levels have plummeted to 18% of aggregate capacity, threatening agricultural yields across 14 talukas.",
    compositeRisk: 78,
    hazards: [
      { label: "Drought", val: 88 },
      { label: "Water Stress", val: 85 },
      { label: "Heatwave", val: 72 },
      { label: "Flood", val: 15 }
    ],
    actionLabel: "Enforce Water Allocation",
    advisoryText: "Drought emergency protocol active. Diverting canal volume to minor irrigation pools; distributing crop subsidies."
  },
  {
    id: 2,
    title: "Scenario Beta: Hydrological Storm Surge",
    year: 2040,
    districtName: "Dibrugarh, Assam",
    districtId: 202,
    narrative: "SSP5-8.5 high-emission pathways project severe atmospheric moisture anomalies. Upstream catchments record 320mm of rainfall in 72 hours. The Brahmaputra hydrological model forecasts a discharge rate surge of +2.4m above danger baselines, threatening local embankment failures.",
    compositeRisk: 84,
    hazards: [
      { label: "Flood", val: 92 },
      { label: "Water Stress", val: 32 },
      { label: "Heatwave", val: 40 },
      { label: "Drought", val: 12 }
    ],
    actionLabel: "Mobilize Disaster Relief",
    advisoryText: "Flood alert dispatched. Pre-positioning flood mitigation assets and NDRF teams near Brahmaputra lowland blocks."
  },
  {
    id: 3,
    title: "Scenario Gamma: Summer Heat Dome",
    year: 2050,
    districtName: "Jodhpur, Rajasthan",
    districtId: 302,
    narrative: "Global warming models estimate a shift of +2.8°C above normal summer temperature envelopes. Local high-pressure heat domes trap radiating heat. Peak temperatures are projected to breach 48.2°C for 12 consecutive days, triggering electrical load margins and heat strokes.",
    compositeRisk: 88,
    hazards: [
      { label: "Heatwave", val: 96 },
      { label: "Water Stress", val: 88 },
      { label: "Drought", val: 82 },
      { label: "Flood", val: 10 }
    ],
    actionLabel: "Activate Power Grid Buffers",
    advisoryText: "Extreme heat warning active. Declaring mandatory outdoor shift caps; powering municipal emergency cooling centers."
  }
];

export default function StoryPage() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [advisorySent, setAdvisorySent] = useState(false);

  const slide = slides[activeSlide];

  function handleNext() {
    setAdvisorySent(false);
    setActiveSlide((prev) => (prev + 1) % slides.length);
  }

  function handlePrev() {
    setAdvisorySent(false);
    setActiveSlide((prev) => (prev - 1 + slides.length) % slides.length);
  }

  function dispatchAdvisory() {
    setAdvisorySent(true);
    setTimeout(() => {
      setAdvisorySent(false);
    }, 4000);
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <Badge>Interactive Storytelling</Badge>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal text-white">Climate Threat Scenarios</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-300">
            Guide your team through preset, forecast-mode crisis pathways to test systemic responses and emergency decision timelines.
          </p>
        </div>
      </div>

      {/* Slide Navigation Progress indicators */}
      <div className="flex justify-center items-center gap-3 bg-slate-900/40 border border-slate-800 rounded-lg p-3">
        {slides.map((s, index) => (
          <button
            key={s.id}
            onClick={() => { setActiveSlide(index); setAdvisorySent(false); }}
            className={`h-2.5 rounded-full transition-all duration-300 ${
              index === activeSlide ? "w-10 bg-cyan-400" : "w-2.5 bg-slate-700 hover:bg-slate-500"
            }`}
            title={s.title}
          />
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
        {/* Narrative Panel */}
        <Card className="glass-card flex flex-col justify-between scanline scan-beam">
          <CardHeader>
            <div className="flex items-center gap-2 text-cyan-300">
              <BookOpen className="h-5 w-5 animate-pulse" />
              <CardTitle>{slide.title}</CardTitle>
            </div>
            <CardDescription>Target Horizon: {slide.year} AD | Focus: {slide.districtName}</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between gap-6 pt-2">
            <div className="space-y-5">
              <p className="text-slate-200 text-sm leading-7 font-serif border-l-2 border-cyan-400 pl-4 py-2 bg-cyan-500/5 rounded-r">
                {slide.narrative}
              </p>

              <div className="rounded-xl border border-white/5 bg-slate-950/40 p-4">
                <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Localized Hazard Metrics</span>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-xs">
                  {slide.hazards.map((h) => (
                    <div key={h.label} className="p-3 bg-slate-900/50 border border-slate-800 rounded-lg">
                      <span className="text-slate-400 font-sans block">{h.label}</span>
                      <span className="text-base font-black text-white font-mono mt-1 block">{h.val}/100</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Slide Player buttons */}
            <div className="flex justify-between items-center gap-4 mt-4 border-t border-slate-800 pt-5">
              <Button onClick={handlePrev} variant="outline" className="border-slate-700 text-white hover:bg-slate-800">
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Previous Scenario
              </Button>
              <Button onClick={handleNext} className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold">
                Next Scenario
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Command Panel */}
        <Card className="glass-card flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-rose-400" />
              Scenario Control Desk
            </CardTitle>
            <CardDescription>Simulated dispatch console.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between gap-6">
            <div className="flex flex-col items-center py-4 bg-slate-950/30 rounded-xl border border-white/5">
              <RiskGauge value={slide.compositeRisk} label="Scenario Composite Risk" />
            </div>

            <div className="space-y-4">
              {advisorySent ? (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-400/10 p-4 text-xs leading-relaxed text-emerald-200 flex gap-2 animate-fade-in-up">
                  <Check className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                  <div>
                    <span className="font-bold uppercase tracking-wider text-[9px] text-emerald-300 block">Command Dispatched</span>
                    <p className="mt-1">{slide.advisoryText}</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-cyan-500/20 bg-cyan-400/5 p-4 text-xs leading-relaxed text-slate-400 flex gap-2">
                  <Sparkles className="h-4 w-4 shrink-0 text-cyan-400 mt-0.5" />
                  <p>
                    Operational Task: Execute early intervention protocols using the console below to decrease projected sector stress scores.
                  </p>
                </div>
              )}

              <Button
                onClick={dispatchAdvisory}
                disabled={advisorySent}
                className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold h-12 text-sm uppercase tracking-wider"
              >
                {slide.actionLabel}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
