"use client";

import React from "react";
import { useClimate } from "@/store/useClimateStore";
import { Calendar } from "lucide-react";

export function TimelineSlider() {
  const { activeYear, setActiveYear } = useClimate();
  const years = [2010, 2015, 2020, 2025, 2030, 2040, 2050];

  return (
    <div className="mx-auto mt-6 w-full max-w-4xl rounded-2xl border border-white/[0.08] bg-background/75 p-5 shadow-xl shadow-black/40 backdrop-blur-md">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded bg-emerald-400/10 text-brand-emerald">
            <Calendar className="h-4 w-4" />
          </span>
          <div>
            <h4 className="text-sm font-semibold text-white">Climate Digital Twin Timeline</h4>
            <p className="text-xs text-muted-foreground">Scrub years to simulate future climate trends & risk scenarios.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded bg-emerald-400/10 px-3 py-1 text-xs font-medium text-mint border border-white/[0.08] animate-pulse">
          Active Scenario Mode: {activeYear} AD
        </div>
      </div>

      <div className="relative mt-8 px-4">
        {/* Track Line */}
        <div className="absolute left-4 right-4 top-1/2 h-1.5 -translate-y-1/2 rounded bg-surface-elevated" />
        <div
          className="absolute left-4 top-1/2 h-1.5 -translate-y-1/2 rounded bg-emerald-400 shadow-[0_0_10px_rgba(6,182,212,0.5)] transition-all duration-300"
          style={{
            width: `${((years.indexOf(activeYear)) / (years.length - 1)) * 100}%`
          }}
        />

        {/* Input Range */}
        <input
          type="range"
          min={0}
          max={years.length - 1}
          value={years.indexOf(activeYear)}
          onChange={(e) => setActiveYear(years[Number(e.target.value)])}
          className="relative z-10 h-6 w-full cursor-pointer opacity-0"
        />

        {/* Year Markers */}
        <div className="relative -mt-6 flex justify-between pointer-events-none">
          {years.map((y) => {
            const active = y === activeYear;
            return (
              <div key={y} className="flex flex-col items-center">
                <div
                  className={`h-4 w-4 rounded-full border-2 transition-all duration-300 ${
                    active
                      ? "border-emerald-400 bg-background scale-125 shadow-[0_0_8px_#10B981]"
                      : "border-slate-600 bg-surface-elevated"
                  }`}
                />
                <span
                  className={`mt-2 text-xs font-semibold transition-colors duration-300 ${
                    active ? "text-brand-emerald font-bold" : "text-muted-foreground"
                  }`}
                >
                  {y}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
