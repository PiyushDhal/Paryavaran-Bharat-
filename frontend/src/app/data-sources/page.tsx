"use client";

import React, { useState, useEffect } from 'react';
import { Layers3, Activity, CloudRain, Wind, AlertTriangle, Droplet, ShieldAlert, Sparkles, CheckCircle } from 'lucide-react';
import { api } from '@/lib/api';

const staticSources = [
  {
    id: "imd",
    name: "India Meteorological Department (IMD)",
    organization: "Ministry of Earth Sciences",
    category: "Weather & Climate",
    variables: ["Rainfall", "Temperature", "Humidity", "Wind", "Weather Forecasts", "Heatwave Indicators", "Cyclones"],
    description: "Primary agency for meteorological observations, weather forecasting and seismology. Provides foundational gridded datasets for all atmospheric risk indicators.",
    icon: CloudRain,
    color: "emerald"
  },
  {
    id: "nrsc",
    name: "National Remote Sensing Centre (NRSC)",
    organization: "Indian Space Research Organisation (ISRO)",
    category: "Geospatial & Satellite Intelligence",
    variables: ["Satellite Imagery Metadata", "NDVI", "Land Surface Temperature", "Land Use", "Vegetation Health", "Water Body Monitoring"],
    description: "Responsible for remote sensing satellite data acquisition and processing, aerial remote sensing and decision support for disaster management.",
    icon: Layers3,
    color: "amber"
  },
  {
    id: "mosdac",
    name: "MOSDAC (ISRO)",
    organization: "Space Applications Centre (SAC), ISRO",
    category: "Satellite Observations",
    variables: ["INSAT", "Oceansat", "Atmospheric Products", "Cyclone Tracks"],
    description: "Meteorological and Oceanographic Satellite Data Archival Centre. Serves as ISRO's repository for weather data products and INSAT missions.",
    icon: ShieldAlert,
    color: "cyan"
  },
  {
    id: "cpcb",
    name: "Central Pollution Control Board (CPCB)",
    organization: "Ministry of Environment, Forest and Climate Change",
    category: "Environmental Quality",
    variables: ["AQI", "PM2.5", "PM10", "NO₂", "SO₂", "O₃"],
    description: "Statutory organization coordinating the activities of State Pollution Control Boards. Provides continuous air quality observation feeds.",
    icon: Wind,
    color: "rose"
  },
  {
    id: "cwc",
    name: "Central Water Commission (CWC)",
    organization: "Ministry of Jal Shakti",
    category: "Hydrology",
    variables: ["River Levels", "Flood Monitoring", "Water Level Alerts", "River Status"],
    description: "Premier technical organization functioning in the field of water resources, providing critical flood forecasting models.",
    icon: AlertTriangle,
    color: "blue"
  },
  {
    id: "wris",
    name: "India-WRIS",
    organization: "Ministry of Jal Shakti",
    category: "Water Resources",
    variables: ["Reservoir Levels", "Basin Information", "Water Availability", "Reservoir Capacity", "Hydrology Indicators"],
    description: "Water Resources Information System providing a 'Single Window' solution for all water resources data and information.",
    icon: Droplet,
    color: "emerald"
  }
];

export default function DataSourcesPage() {
  const [dynamicData, setDynamicData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStatus() {
      try {
        const status = await api.dataSourcesStatus();
        setDynamicData(status);
      } catch (err) {
        console.error("Failed to load data sources status:", err);
      } finally {
        setLoading(false);
      }
    }
    loadStatus();
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 text-slate-100">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div>
          <h1 className="text-3xl font-bold text-white sm:text-4xl font-orbitron tracking-[0.12em] uppercase flex items-center gap-2">
            <Activity className="h-8 w-8 text-brand-blue animate-pulse" />
            Data Provenance Registry
          </h1>
          <p className="mt-2 text-xs text-muted-foreground max-w-2xl">
            Official government integration endpoints power Paryavaran Bharat. Live telemetry sync rates, coverage bounds, and validation metrics are checked hourly.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-brand-blue/15 border border-brand-blue/30 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-cyan-400">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span>Provenance Engine: Active</span>
        </div>
      </div>

      <div className="grid gap-6">
        {staticSources.map((source) => {
          const Icon = source.icon;
          const liveInfo = dynamicData?.[source.id] || {
            status: "Connecting",
            lastSync: "Pending",
            updateFrequency: "Determining...",
            coverage: "Querying Database...",
            health: "--",
            availability: "--",
            dataQuality: "Evaluating",
            freshnessScore: 0
          };

          return (
            <div key={source.id} className="overflow-hidden rounded-2xl border border-white/[0.08] bg-slate-950/40 p-6 backdrop-blur-xl hover:border-cyan-500/20 transition-all duration-350">
              <div className="flex flex-col lg:flex-row gap-6 lg:items-start">
                {/* Visual Indicator Block */}
                <div className="flex items-center gap-4 lg:flex-col lg:items-center">
                  <div className="grid h-14 w-14 place-items-center rounded-2xl border border-white/[0.08] bg-slate-900/60 text-cyan-400">
                    <Icon className="h-7 w-7" />
                  </div>
                  <div className="flex flex-col lg:items-center font-mono text-[9px] uppercase tracking-wider mt-1">
                    <span className="text-slate-500">Quality Rating</span>
                    <span className="text-emerald-400 font-bold mt-0.5">{liveInfo.dataQuality}</span>
                  </div>
                </div>
                
                {/* Content Block */}
                <div className="flex-1 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-white/[0.04] pb-3">
                    <div>
                      <h2 className="text-lg font-bold text-white flex flex-wrap items-center gap-2 font-orbitron">
                        {source.name}
                        <span className="inline-flex items-center rounded-full border border-white/[0.08] bg-slate-900/40 px-2 py-0.5 text-[9px] font-mono font-medium text-slate-400">
                          {source.category}
                        </span>
                      </h2>
                      <p className="text-xs text-muted-foreground mt-0.5">{source.organization}</p>
                    </div>
                    <div className="flex items-center gap-1.5 font-mono text-[10px] bg-slate-950/80 px-2.5 py-1 rounded-lg border border-white/[0.04]">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span className="text-slate-300 font-bold uppercase">{liveInfo.status}</span>
                    </div>
                  </div>

                  <p className="text-slate-300 leading-relaxed text-xs">
                    {source.description}
                  </p>

                  {/* Dynamic Metrics Row */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t border-white/[0.04] text-[11px] font-mono">
                    <div>
                      <span className="block text-[9px] text-slate-500 uppercase tracking-widest mb-1">Spatial Coverage</span>
                      <span className="text-slate-200 font-medium">{liveInfo.coverage}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-slate-500 uppercase tracking-widest mb-1">Last Synced</span>
                      <span className="text-slate-200 font-medium">
                        {liveInfo.lastSync !== "Pending" && liveInfo.lastSync !== "Loading..." ? new Date(liveInfo.lastSync).toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", day: "numeric", month: "short" }) : "Loading..."}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-slate-500 uppercase tracking-widest mb-1">Update Cadence</span>
                      <span className="text-slate-200 font-medium">{liveInfo.updateFrequency}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-slate-500 uppercase tracking-widest mb-1">Telemetry Health</span>
                      <span className="text-emerald-400 font-bold">{liveInfo.health} Valid</span>
                    </div>
                  </div>

                  {/* Ingested variables tags */}
                  <div className="space-y-1.5">
                    <span className="block text-[8.5px] uppercase font-bold text-slate-500 tracking-widest">Active Variables Ingestion</span>
                    <div className="flex flex-wrap gap-1.5">
                      {source.variables.map((v) => (
                        <span key={v} className="inline-flex rounded-md border border-white/[0.04] bg-slate-950/40 px-2 py-0.75 text-[10px] text-slate-400 font-mono">
                          {v}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Score Guages */}
                <div className="w-full lg:w-[150px] border-t lg:border-t-0 lg:border-l border-white/[0.06] pt-4 lg:pt-0 lg:pl-6 flex lg:flex-col justify-around lg:justify-start gap-4">
                  <div className="text-center">
                    <span className="block text-[8px] text-slate-500 uppercase tracking-widest font-mono mb-1">Freshness</span>
                    <div className="inline-flex items-center justify-center relative h-14 w-14 rounded-full border-2 border-brand-blue/30 bg-brand-blue/5">
                      <span className="text-xs font-bold font-mono text-cyan-400">{liveInfo.freshnessScore}%</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <span className="block text-[8px] text-slate-500 uppercase tracking-widest font-mono mb-1">Availability</span>
                    <div className="inline-flex items-center justify-center relative h-14 w-14 rounded-full border-2 border-emerald-500/30 bg-emerald-950/10">
                      <span className="text-xs font-bold font-mono text-emerald-400">{liveInfo.availability}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
