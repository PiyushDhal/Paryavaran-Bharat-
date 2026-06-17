"use client";

import React, { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import type { ClimateAlert } from "@/lib/types";
import { AlertTriangle, BellRing, ShieldAlert, Send, MapPin, Clock } from "lucide-react";

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<ClimateAlert[]>([]);

  useEffect(() => {
    api.alerts().then(setAlerts).catch(() => undefined);
  }, []);

  const getSeverityStyle = (severity: string) => {
    switch (severity.toUpperCase()) {
      case "CRITICAL":
        return "border-rose-500/30 bg-rose-500/10 text-rose-300";
      case "HIGH":
        return "border-amber-500/30 bg-amber-500/10 text-amber-300";
      case "MEDIUM":
        return "border-cyan-500/30 bg-cyan-400/10 text-cyan-200";
      default:
        return "border-emerald-500/30 bg-emerald-400/10 text-emerald-200";
    }
  };

  return (
    <div className="grid gap-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <Badge>Mission Command Alerts</Badge>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal text-white">Emergency Alerts Desk</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-300">
            Real-time critical hazard notifications and action dispatches for emergency operations centers.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded bg-cyan-400/10 px-3 py-1.5 text-xs text-cyan-200 border border-cyan-400/20">
          <BellRing className="h-4 w-4 text-cyan-400" /> Dispatch System Active
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        {/* Alerts List */}
        <div className="grid gap-4">
          {alerts.map((alert) => (
            <Card key={alert.id} className="relative overflow-hidden hover:border-cyan-400/30 transition duration-300">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${getSeverityStyle(alert.severity)}`}>
                      {alert.severity}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">Type: {alert.alert_type}</span>
                  </div>
                  <AlertTriangle className={`h-5 w-5 ${alert.severity === "CRITICAL" ? "text-rose-400" : "text-amber-400"}`} />
                </div>
                <h3 className="text-lg font-semibold text-white mt-3">{alert.title}</h3>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4 text-xs text-slate-400 mb-3">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-cyan-400" /> {alert.district}, {alert.state}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-cyan-400" /> {alert.issued_at}
                  </span>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed mb-4">
                  {alert.message}
                </p>
                <div className="flex gap-2">
                  <button className="flex items-center gap-1.5 rounded bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-semibold px-4 py-2 text-xs transition duration-200">
                    <Send className="h-3.5 w-3.5" /> Dispatch Response Team
                  </button>
                  <button className="rounded border border-slate-700 bg-slate-900/50 hover:bg-slate-800 text-white px-4 py-2 text-xs transition duration-200">
                    Acknowledge & Mute
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Distribution & Actions */}
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Hazard Exposure Breakdown</CardTitle>
              <CardDescription>Regional alert metrics categorized by severity layers.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="flex items-center justify-between p-3 rounded bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm">
                <span className="font-semibold">Critical Active Alerts</span>
                <span className="font-bold text-lg">1</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm">
                <span className="font-semibold">High Active Alerts</span>
                <span className="font-bold text-lg">2</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-200 text-sm">
                <span className="font-semibold">Moderate Active Alerts</span>
                <span className="font-bold text-lg">0</span>
              </div>
            </CardContent>
          </Card>

          <Card className="scanline relative">
            <CardHeader>
              <CardTitle>Operations Standard Guidelines</CardTitle>
              <CardDescription>Emergency workflow protocol for active warning centers.</CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-slate-400 leading-relaxed grid gap-3">
              <p>
                <strong className="text-white block mb-1">1. Level CRITICAL Warnings</strong>
                Evacuation procedures and emergency services must be mobilized within 3 hours. Local broadcast systems active.
              </p>
              <p>
                <strong className="text-white block mb-1">2. Level HIGH Warnings</strong>
                EOC managers must prepare mitigation strategies and alert local regional commands for quick deployment.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
