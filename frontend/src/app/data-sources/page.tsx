import React from 'react';
import { Layers3, ExternalLink, Activity, CloudRain, Wind, ThermometerSun, AlertTriangle, Droplet } from 'lucide-react';

const sources = [
  {
    id: "imd",
    name: "India Meteorological Department (IMD)",
    organization: "Ministry of Earth Sciences",
    category: "Weather & Climate",
    variables: ["Rainfall", "Temperature", "Humidity", "Wind", "Weather Forecasts", "Heatwave Indicators"],
    coverage: "Pan-India (Gridded & Station)",
    lastUpdated: "Near Real-time",
    updateFrequency: "Hourly / Daily",
    status: "Operational",
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
    coverage: "Pan-India (High Resolution)",
    lastUpdated: "Last 24 Hours",
    updateFrequency: "Daily / Multi-day Revisit",
    status: "Operational",
    description: "Responsible for remote sensing satellite data acquisition and processing, aerial remote sensing and decision support for disaster management.",
    icon: Layers3,
    color: "amber"
  },
  {
    id: "cpcb",
    name: "Central Pollution Control Board (CPCB)",
    organization: "Ministry of Environment, Forest and Climate Change",
    category: "Environmental Quality",
    variables: ["AQI", "PM2.5", "PM10", "NO₂", "SO₂", "O₃"],
    coverage: "Major Cities & Industrial Hubs",
    lastUpdated: "Near Real-time",
    updateFrequency: "Hourly",
    status: "Operational",
    description: "Statutory organization coordinating the activities of State Pollution Control Boards. Provides continuous air quality observation feeds.",
    icon: Wind,
    color: "rose"
  },
  {
    id: "cwc",
    name: "Central Water Commission (CWC)",
    organization: "Ministry of Jal Shakti",
    category: "Hydrology",
    variables: ["River Levels", "Flood Monitoring", "Water Level Alerts"],
    coverage: "Major River Basins",
    lastUpdated: "Last 6 Hours",
    updateFrequency: "Hourly / Daily",
    status: "Operational",
    description: "Premier technical organization functioning in the field of water resources, providing critical flood forecasting models.",
    icon: AlertTriangle,
    color: "blue"
  },
  {
    id: "wris",
    name: "India-WRIS",
    organization: "Ministry of Jal Shakti",
    category: "Water Resources",
    variables: ["Reservoir Levels", "Basin Information", "Water Availability", "Reservoir Capacity"],
    coverage: "National Reservoirs",
    lastUpdated: "Last 24 Hours",
    updateFrequency: "Daily",
    status: "Operational",
    description: "Water Resources Information System providing a 'Single Window' solution for all water resources data and information.",
    icon: Droplet,
    color: "emerald"
  }
];

export default function DataSourcesPage() {
  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white sm:text-4xl font-orbitron tracking-[0.12em] uppercase">Data Provenance</h1>
          <p className="mt-2 text-muted-foreground">Official Government integration endpoints powering the Bharat Climate Twin.</p>
        </div>
        <div className="flex items-center gap-2 rounded-md bg-brand-blue/10 border border-white/[0.08] px-4 py-2">
          <div className="h-2 w-2 rounded-full bg-brand-blue animate-pulse"></div>
          <span className="text-sm font-medium text-brand-titanium">Ingestion Pipeline Active</span>
        </div>
      </div>

      <div className="grid gap-6">
        {sources.map((source) => {
          const Icon = source.icon;
          return (
            <div key={source.id} className="overflow-hidden rounded-2xl border border-slate-800 bg-surface/50 p-6 backdrop-blur-xl shadow-glow">
              <div className="flex flex-col md:flex-row gap-6 md:items-start">
                <div className={`grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-${source.color}-400/30 bg-${source.color}-400/10 text-${source.color}-300`}>
                  <Icon className="h-8 w-8" />
                </div>
                
                <div className="flex-1 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        {source.name}
                        <span className={`inline-flex items-center rounded-full border border-${source.color}-400/20 bg-${source.color}-400/10 px-2.5 py-0.5 text-xs font-semibold text-${source.color}-300`}>
                          {source.category}
                        </span>
                      </h2>
                      <p className="text-sm text-muted-foreground mt-1">{source.organization}</p>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-brand-titanium">
                      <Activity className="h-4 w-4" />
                      {source.status}
                    </div>
                  </div>

                  <p className="text-secondary-foreground leading-relaxed text-sm">
                    {source.description}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-slate-800">
                    <div>
                      <span className="block text-xs text-muted-foreground uppercase font-semibold mb-1">Coverage</span>
                      <span className="text-sm text-slate-200">{source.coverage}</span>
                    </div>
                    <div>
                      <span className="block text-xs text-muted-foreground uppercase font-semibold mb-1">Last Updated</span>
                      <span className="text-sm text-slate-200">{source.lastUpdated}</span>
                    </div>
                    <div>
                      <span className="block text-xs text-muted-foreground uppercase font-semibold mb-1">Update Frequency</span>
                      <span className="text-sm text-slate-200">{source.updateFrequency}</span>
                    </div>
                  </div>

                  <div>
                    <span className="block text-xs text-muted-foreground uppercase font-semibold mb-2">Variables Ingested</span>
                    <div className="flex flex-wrap gap-2">
                      {source.variables.map((v) => (
                        <span key={v} className="inline-flex rounded-md border border-slate-700 bg-surface-elevated/50 px-2 py-1 text-xs text-secondary-foreground">
                          {v}
                        </span>
                      ))}
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
