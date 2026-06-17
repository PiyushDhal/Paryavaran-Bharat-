"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Filter, Flame, Radio, ShieldAlert, Waves } from "lucide-react";
import { api } from "@/lib/api";
import type { ClimateAlert } from "@/lib/types";

const severityConfig: Record<string, { border: string; bg: string; badge: string; text: string }> = {
  CRITICAL: { border: "border-rose-500/20", bg: "bg-rose-500/5", badge: "bg-rose-500", text: "text-rose-400" },
  HIGH: { border: "border-amber-500/20", bg: "bg-amber-500/5", badge: "bg-amber-500", text: "text-amber-400" },
  MEDIUM: { border: "border-cyan-500/20", bg: "bg-cyan-500/5", badge: "bg-cyan-500", text: "text-cyan-400" },
  LOW: { border: "border-emerald-500/20", bg: "bg-emerald-500/5", badge: "bg-emerald-500", text: "text-emerald-400" }
};

const typeIcons: Record<string, typeof Waves> = {
  Flood: Waves,
  Heatwave: Flame,
  Drought: AlertTriangle
};

const metaData: Record<number, { vulnerability: string; peak: string; population: string }> = {
  1: { vulnerability: "High (92/100)", peak: "+1.2m Elevation", population: "245,000" },
  2: { vulnerability: "High (88/100)", peak: "48.2°C Peak", population: "180,000" },
  3: { vulnerability: "Critical (95/100)", peak: "65% Deficit", population: "310,000" },
  4: { vulnerability: "Extreme (96/100)", peak: "3.5m Surge", population: "420,000" },
  5: { vulnerability: "Moderate (72/100)", peak: "46°C Peak", population: "95,000" }
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<ClimateAlert[]>([]);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    api.alerts().then(setAlerts).catch(() => undefined);
  }, []);

  const filtered = filter === "all" ? alerts : filter === "critical" ? alerts.filter((a) => a.severity === "CRITICAL") : alerts.filter((a) => a.alert_type === filter);

  const criticalCount = alerts.filter((a) => a.severity === "CRITICAL").length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-sm font-medium text-rose-300 backdrop-blur-sm mb-4">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            {criticalCount} Critical Alerts Active
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-white">Climate Alert Command</h1>
          <p className="mt-4 text-slate-400 max-w-2xl text-lg">
            Centralized monitoring and early warning dispatch for national climate hazards. Prioritized by severity and district vulnerability.
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setFilter("all")} className={`glass-card px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${filter === "all" ? "bg-cyan-400/10 text-cyan-300 border-cyan-400/20" : "hover:bg-slate-800"}`}>
            <Filter className="w-4 h-4 text-cyan-400" />
            All Hazards
          </button>
          <button onClick={() => setFilter("critical")} className={`glass-card px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${filter === "critical" ? "bg-rose-500/10 text-rose-300 border-rose-500/20" : "text-rose-300 hover:bg-slate-800"}`}>
            <AlertTriangle className="w-4 h-4" />
            Critical Only
          </button>
        </div>
      </header>

      {/* Alert cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {filtered.map((alert) => {
            const sev = severityConfig[alert.severity] || severityConfig.MEDIUM;
            const Icon = typeIcons[alert.alert_type] || AlertTriangle;
            const meta = metaData[alert.id] || metaData[1];

            return (
              <div key={alert.id} className={`glass-card rounded-2xl overflow-hidden ${sev.border} relative group`}>
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${sev.badge}`} />
                <div className="p-6">
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-lg ${sev.bg} flex items-center justify-center ${sev.text} border ${sev.border}`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div>
                        <span className={`text-xs uppercase tracking-widest ${sev.text} font-bold`}>{alert.alert_type}</span>
                        <h3 className="text-xl font-bold text-white">{alert.title}</h3>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full ${sev.bg} ${sev.text} text-xs font-bold border ${sev.border}`}>
                        {alert.severity}
                      </span>
                      <span className="text-slate-500 text-xs">{alert.issued_at}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="p-3 rounded-xl bg-slate-900/40 border border-white/5">
                      <span className="text-[10px] text-slate-500 uppercase tracking-tight">District</span>
                      <p className="text-sm font-semibold text-white">{alert.district}, {alert.state}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900/40 border border-white/5">
                      <span className="text-[10px] text-slate-500 uppercase tracking-tight">Vulnerability</span>
                      <p className={`text-sm font-semibold ${sev.text}`}>{meta.vulnerability}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900/40 border border-white/5">
                      <span className="text-[10px] text-slate-500 uppercase tracking-tight">Expected Peak</span>
                      <p className="text-sm font-semibold text-white">{meta.peak}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900/40 border border-white/5">
                      <span className="text-[10px] text-slate-500 uppercase tracking-tight">Population at Risk</span>
                      <p className="text-sm font-semibold text-white">{meta.population}</p>
                    </div>
                  </div>

                  <p className="text-slate-400 text-sm leading-relaxed mb-6">{alert.message}</p>

                  <div className="flex gap-3">
                    <button className={`flex-1 ${sev.badge} hover:opacity-90 text-slate-950 font-bold py-3 rounded-lg transition-all text-sm flex items-center justify-center gap-2`}>
                      <Radio className="w-4 h-4" />
                      Dispatch Alert
                    </button>
                    <button className="px-6 py-3 rounded-lg border border-slate-700 hover:bg-slate-800 transition-all text-sm font-medium text-white">
                      Open Map
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Sidebar — Hazard breakdown */}
        <div className="space-y-6">
          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-6">Hazard Breakdown</h3>
            {["Flood", "Heatwave", "Drought"].map((type) => {
              const count = alerts.filter((a) => a.alert_type === type).length;
              const Icon = typeIcons[type] || AlertTriangle;
              return (
                <button
                  key={type}
                  onClick={() => setFilter(filter === type ? "all" : type)}
                  className={`w-full flex items-center justify-between p-4 rounded-xl mb-3 transition-all border ${
                    filter === type ? "bg-cyan-400/10 border-cyan-400/20 text-cyan-300" : "bg-white/[0.02] border-white/5 text-slate-300 hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{type}</span>
                  </div>
                  <span className="text-xs font-bold">{count}</span>
                </button>
              );
            })}
          </div>

          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Operations Guidelines</h3>
            <div className="space-y-3 text-sm text-slate-400">
              <p>• CRITICAL alerts require immediate response team activation</p>
              <p>• HIGH alerts should be escalated within 30 minutes</p>
              <p>• MEDIUM alerts require monitoring with 4-hour review cycle</p>
              <p>• All dispatched alerts are logged for audit compliance</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
