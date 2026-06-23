"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { 
  CloudRain, 
  Droplets, 
  Flame, 
  RadioTower, 
  Leaf, 
  ShieldAlert, 
  Sparkles, 
  Wind, 
  CalendarRange, 
  ArrowUpRight, 
  Download, 
  TrendingUp, 
  Check, 
  AlertTriangle,
  Globe,
  RefreshCw,
  Printer,
  ChevronRight,
  Database,
  CheckCircle,
  XCircle,
  HelpCircle
} from "lucide-react";
import { 
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  CartesianGrid,
  Legend
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { useClimate } from "@/store/useClimateStore";
import type { District, State, Ranking } from "@/lib/types";

// Skeleton Loader Component
function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded bg-slate-800/60 border border-slate-700/30 ${className}`} />
  );
}

// Ingestion Pipeline static details (Government Data Sources)
const GOVERNMENT_SOURCES = [
  {
    id: "imd",
    name: "India Meteorological Department (IMD)",
    agency: "MoES",
    dataset: "Gridded Weather Data (Temperature & Rainfall Anomaly)",
    syncFrequency: "Daily at 06:00 IST",
    lastSync: "Today, 06:00 AM",
    status: "online"
  },
  {
    id: "nrsc",
    name: "National Remote Sensing Centre (NRSC)",
    agency: "ISRO",
    dataset: "Vegetation Index (NDVI) & Land Surface Moisture",
    syncFrequency: "Weekly composite",
    lastSync: "Yesterday, 18:30 PM",
    status: "online"
  },
  {
    id: "cpcb",
    name: "Central Pollution Control Board (CPCB)",
    agency: "MoEFCC",
    dataset: "Continuous Ambient Air Quality (AQI Grid)",
    syncFrequency: "Hourly (Real-time feed)",
    lastSync: "5 mins ago",
    status: "online"
  },
  {
    id: "cwc",
    name: "Central Water Commission (CWC)",
    agency: "Jal Shakti",
    dataset: "River Discharge & Level Alerts",
    syncFrequency: "Hourly updates",
    lastSync: "15 mins ago",
    status: "online"
  },
  {
    id: "wris",
    name: "India-WRIS",
    agency: "Jal Shakti",
    dataset: "National Reservoir Level & Capacity Tracking",
    syncFrequency: "Daily at 20:00 IST",
    lastSync: "Yesterday, 20:00 PM",
    status: "online"
  }
];

export default function ClimateIntelligenceCenter() {
  const climateContext = useClimate();

  // Basic lists
  const [states, setStates] = useState<State[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  
  // Async status lists
  const [allRankings, setAllRankings] = useState<Ranking[]>([]);
  const [analyticsData, setAnalyticsData] = useState<any>(null);

  // Filters
  const [stateId, setStateId] = useState<number | "">("");
  const [selectedDistId, setSelectedDistId] = useState<number | "">("");
  const [year, setYear] = useState<number>(2026);
  const [climateZone, setClimateZone] = useState<string>("");
  const [riskCategory, setRiskCategory] = useState<string>("");

  // Loading & Error States
  const [loadingMetadata, setLoadingMetadata] = useState(true);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [loadingRankings, setLoadingRankings] = useState(true);

  const [errorMetrics, setErrorMetrics] = useState(false);
  const [errorRankings, setErrorRankings] = useState(false);

  // Sync year state with activeYear from context
  useEffect(() => {
    if (climateContext?.activeYear) {
      setYear(climateContext.activeYear);
    }
  }, [climateContext?.activeYear]);

  // Sync filters to global context for AI chat/copilot awareness
  useEffect(() => {
    if (climateContext?.setAnalyticsFilters) {
      climateContext.setAnalyticsFilters({
        stateId,
        districtId: selectedDistId,
        climateZone,
        riskCategory
      });
    }
  }, [stateId, selectedDistId, climateZone, riskCategory, climateContext?.setAnalyticsFilters]);

  // 1. Load basic filter lists (non-blocking)
  useEffect(() => {
    setLoadingMetadata(true);
    Promise.all([
      api.states().catch(() => []),
      api.districts().catch(() => [])
    ]).then(([statesData, districtsData]) => {
      setStates(statesData);
      setDistricts(districtsData);
      setLoadingMetadata(false);
    });
  }, []);

  // Sync stateId from global selected district when page loads if possible
  useEffect(() => {
    if (districts.length > 0 && climateContext?.selectedDistrictId) {
      const dist = districts.find((d) => d.id === climateContext.selectedDistrictId);
      if (dist) {
        setStateId(dist.state_id);
        setSelectedDistId(dist.id);
      }
    }
  }, [districts, climateContext?.selectedDistrictId]);

  // 2. Fetch main metrics asynchronously
  useEffect(() => {
    setLoadingMetrics(true);
    setErrorMetrics(false);
    api.analyticsMetrics({
      year,
      state_id: stateId || undefined,
      district_id: selectedDistId || undefined,
      climate_zone: climateZone || undefined,
      risk_category: riskCategory || undefined
    })
    .then((data) => {
      setAnalyticsData(data);
      setLoadingMetrics(false);
    })
    .catch((err) => {
      console.error("[INTELLIGENCE ERROR] Failed to fetch analytics metrics", err);
      setErrorMetrics(true);
      setLoadingMetrics(false);
    });
  }, [year, stateId, selectedDistId, climateZone, riskCategory]);

  // 3. Fetch rankings asynchronously
  useEffect(() => {
    setLoadingRankings(true);
    setErrorRankings(false);
    api.rankings(1000, year)
    .then((data) => {
      setAllRankings(data);
      setLoadingRankings(false);
    })
    .catch((err) => {
      console.error("[INTELLIGENCE ERROR] Failed to fetch rankings", err);
      setErrorRankings(true);
      setLoadingRankings(false);
    });
  }, [year]);

  // Filter districts based on currently selected state & metadata
  const filteredDistricts = useMemo(() => {
    return districts.filter((d) => {
      if (stateId && d.state_id !== stateId) return false;
      return true;
    });
  }, [districts, stateId]);

  const monthlyData = useMemo(() => {
    return analyticsData?.monthlyData || [];
  }, [analyticsData]);

  const metrics = useMemo(() => {
    return analyticsData?.metrics || {
      avgTemp: 27.8,
      avgRain: 980,
      avgAqi: 80,
      avgReservoir: 50,
      avgNdvi: 0.5,
      avgSoil: 30,
      compositeIndex: 50,
      avgRisk: 50,
      avgFlood: 50,
      avgDrought: 50,
      avgHeat: 50,
      avgWater: 50
    };
  }, [analyticsData]);

  const aiInsights = useMemo(() => {
    return analyticsData?.aiInsights || {
      summary: "Gathering regional indicators. AI brief compilation active...",
      positives: ["Initial setup operational"],
      negatives: ["Historical comparison pending"],
      recommendations: ["Ensure all filters are configured properly for targeted local intelligence."]
    };
  }, [analyticsData]);

  // Calculations for Top 5 States
  const topStates = useMemo(() => {
    if (allRankings.length === 0) return [];
    // Group risk by state
    const stateMap: Record<string, { totalRisk: number; count: number }> = {};
    allRankings.forEach(r => {
      if (!stateMap[r.state_name]) {
        stateMap[r.state_name] = { totalRisk: 0, count: 0 };
      }
      stateMap[r.state_name].totalRisk += r.composite_risk;
      stateMap[r.state_name].count += 1;
    });
    return Object.entries(stateMap)
      .map(([name, val]) => ({
        name,
        avgRisk: Math.round(val.totalRisk / val.count)
      }))
      .sort((a, b) => b.avgRisk - a.avgRisk)
      .slice(0, 5);
  }, [allRankings]);

  // Calculations for Top 10 Districts
  const topDistricts = useMemo(() => {
    if (allRankings.length === 0) return [];
    let list = allRankings;
    if (stateId) {
      const stateObj = states.find(s => s.id === stateId);
      if (stateObj) {
        list = list.filter(r => r.state_name === stateObj.name);
      }
    }
    return [...list]
      .sort((a, b) => b.composite_risk - a.composite_risk)
      .slice(0, 10);
  }, [allRankings, stateId, states]);

  // Calculated high-risk district count (composite risk > 60)
  const highRiskDistrictCount = useMemo(() => {
    let list = allRankings;
    if (stateId) {
      const stateObj = states.find(s => s.id === stateId);
      if (stateObj) {
        list = list.filter(r => r.state_name === stateObj.name);
      }
    }
    return list.filter(r => r.composite_risk > 60).length;
  }, [allRankings, stateId, states]);

  // Emerging Threats Generator
  const emergingThreats = useMemo(() => {
    const threats: string[] = [];
    if (metrics.avgTemp > 35) {
      threats.push("Critical ambient thermal heat dome; risk of agricultural crop canopy damage.");
    }
    if (metrics.avgAqi > 120) {
      threats.push("Severe post-harvest dust inversion and air stagnation; immediate particulate controls needed.");
    }
    if (metrics.avgReservoir < 40) {
      threats.push("Extreme surface reservoir storage deficit; aquifer drawdown thresholds active.");
    }
    if (metrics.avgRain < 300 && year > 2030) {
      threats.push("Projected severe rainfall deficit due to shifting monsoon corridors.");
    }
    if (threats.length === 0) {
      threats.push("No immediate red-alert thermal or water stress anomalies detected.");
      threats.push("Monitor pre-monsoon vegetative canopy decline patterns in semi-arid zones.");
    }
    return threats;
  }, [metrics, year]);

  const handleExportCSV = () => {
    if (monthlyData.length === 0) return;
    let csv = "Date,Temperature (C),Rainfall (mm),AQI,Reservoir level (%),Soil Moisture (%),NDVI\n";
    monthlyData.forEach((obs: any) => {
      csv += `${obs.observed_on},${obs.temperature_c},${obs.rainfall_mm},${obs.aqi},${obs.reservoir_level_pct},${obs.soil_moisture_pct},${obs.ndvi}\n`;
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.setAttribute("href", url);
    a.setAttribute("download", `BCT_Climate_Intelligence_Data_${year}.csv`);
    a.click();
  };

  const handleExportPDF = () => {
    window.print();
  };

  return (
    <div className="grid gap-6">
      
      {/* ─── TITLE & TOP CONTROLS ───────────────────────────────────────── */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
        <div>
          <Badge className="border-white/[0.08] bg-brand-blue/10 text-brand-titanium mb-2">ISRO Bharat Antariksh Hackathon</Badge>
          <h1 className="text-3xl font-semibold text-white font-orbitron tracking-[0.12em] uppercase">Climate Intelligence Center</h1>
          <p className="mt-1 text-sm text-secondary-foreground">
            Multi-agency decision-support console for state-level climatic anomalies, risk models, and resource monitoring.
          </p>
        </div>

        {/* State Intelligence Panel (Filters) */}
        <div className="flex flex-wrap gap-2.5 bg-surface/60 border border-white/[0.08] p-2 rounded-2xl backdrop-blur-md">
          <div className="flex flex-col gap-1">
            <span className="text-[7.5px] font-bold text-muted-foreground uppercase tracking-wider">Target State</span>
            <select
              value={stateId}
              onChange={(e) => {
                setStateId(e.target.value === "" ? "" : Number(e.target.value));
                setSelectedDistId("");
              }}
              className="bg-background border border-white/[0.08] rounded-lg py-1 px-2 text-white focus:outline-none text-xs w-40 cursor-pointer"
            >
              <option value="">All India (National)</option>
              {states.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[7.5px] font-bold text-muted-foreground uppercase tracking-wider">Target District</span>
            <select
              value={selectedDistId}
              onChange={(e) => setSelectedDistId(e.target.value === "" ? "" : Number(e.target.value))}
              disabled={!stateId}
              className="bg-background border border-white/[0.08] rounded-lg py-1 px-2 text-white focus:outline-none text-xs w-40 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <option value="">All Districts</option>
              {filteredDistricts.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[7.5px] font-bold text-muted-foreground uppercase tracking-wider">Projection Year</span>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="bg-background border border-white/[0.08] rounded-lg py-1 px-2 text-white focus:outline-none text-xs cursor-pointer"
            >
              {[2020, 2026, 2030, 2040, 2050].map((y) => (
                <option key={y} value={y}>{y} AD</option>
              ))}
            </select>
          </div>

          <div className="flex items-end gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportCSV}
              className="border-white/[0.08] bg-background hover:bg-surface hover:text-brand-titanium text-secondary-foreground text-xs h-7 px-2.5"
            >
              <Download className="h-3 w-3" />
              <span>CSV</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportPDF}
              className="border-white/[0.08] bg-background hover:bg-surface hover:text-brand-titanium text-secondary-foreground text-xs h-7 px-2.5"
            >
              <Printer className="h-3 w-3" />
              <span>PDF</span>
            </Button>
          </div>
        </div>
      </div>

      <hr className="border-white/[0.08]" />

      {/* ─── SECTION 1: NATIONAL / STATE CLIMATE OVERVIEW (KPIs) ────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        
        {/* Temperature */}
        <Card className="glass-card bg-background/50 border-white/[0.08] p-4 flex flex-col justify-between min-h-[105px]">
          <div>
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Temperature</span>
              <Flame className="h-3.5 w-3.5 text-rose-400" />
            </div>
            {loadingMetrics ? (
              <Skeleton className="h-8 w-20 mt-2" />
            ) : errorMetrics ? (
              <p className="mt-2 text-xs text-rose-400">Error</p>
            ) : (
              <p className="mt-2 text-2xl font-bold text-rose-400 font-mono">{metrics.avgTemp}°C</p>
            )}
          </div>
          <span className="text-[9px] text-muted-foreground">Mean Ambient Index</span>
        </Card>

        {/* Rainfall Anomaly */}
        <Card className="glass-card bg-background/50 border-white/[0.08] p-4 flex flex-col justify-between min-h-[105px]">
          <div>
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Rainfall</span>
              <CloudRain className="h-3.5 w-3.5 text-brand-blue" />
            </div>
            {loadingMetrics ? (
              <Skeleton className="h-8 w-20 mt-2" />
            ) : errorMetrics ? (
              <p className="mt-2 text-xs text-rose-400">Error</p>
            ) : (
              <p className="mt-2 text-2xl font-bold text-brand-titanium font-mono">{metrics.avgRain} mm</p>
            )}
          </div>
          <span className="text-[9px] text-muted-foreground">Annual Accumulation</span>
        </Card>

        {/* AQI */}
        <Card className="glass-card bg-background/50 border-white/[0.08] p-4 flex flex-col justify-between min-h-[105px]">
          <div>
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">AQI</span>
              <Wind className="h-3.5 w-3.5 text-orange-400" />
            </div>
            {loadingMetrics ? (
              <Skeleton className="h-8 w-20 mt-2" />
            ) : errorMetrics ? (
              <p className="mt-2 text-xs text-rose-400">Error</p>
            ) : (
              <p className={`mt-2 text-2xl font-bold font-mono ${metrics.avgAqi > 100 ? "text-amber-400" : "text-emerald-400"}`}>
                {metrics.avgAqi}
              </p>
            )}
          </div>
          <span className="text-[9px] text-muted-foreground">CPCB Gridded Index</span>
        </Card>

        {/* Water Stress */}
        <Card className="glass-card bg-background/50 border-white/[0.08] p-4 flex flex-col justify-between min-h-[105px]">
          <div>
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Water Stress</span>
              <Droplets className="h-3.5 w-3.5 text-sky-400" />
            </div>
            {loadingMetrics ? (
              <Skeleton className="h-8 w-20 mt-2" />
            ) : errorMetrics ? (
              <p className="mt-2 text-xs text-rose-400">Error</p>
            ) : (
              <p className="mt-2 text-2xl font-bold text-sky-400 font-mono">{metrics.avgWater}%</p>
            )}
          </div>
          <span className="text-[9px] text-muted-foreground">Hydrological Drawdown</span>
        </Card>

        {/* NDVI */}
        <Card className="glass-card bg-background/50 border-white/[0.08] p-4 flex flex-col justify-between min-h-[105px]">
          <div>
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">NDVI Cover</span>
              <Leaf className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            {loadingMetrics ? (
              <Skeleton className="h-8 w-20 mt-2" />
            ) : errorMetrics ? (
              <p className="mt-2 text-xs text-rose-400">Error</p>
            ) : (
              <p className="mt-2 text-2xl font-bold text-emerald-400 font-mono">{metrics.avgNdvi}</p>
            )}
          </div>
          <span className="text-[9px] text-muted-foreground">ISRO Satellite Greenery</span>
        </Card>

        {/* High-Risk District Count */}
        <Card className="glass-card bg-background/50 border-white/[0.08] p-4 flex flex-col justify-between min-h-[105px]">
          <div>
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Vulnerable Blocks</span>
              <ShieldAlert className="h-3.5 w-3.5 text-red-500" />
            </div>
            {loadingRankings ? (
              <Skeleton className="h-8 w-20 mt-2" />
            ) : errorRankings ? (
              <p className="mt-2 text-xs text-rose-400">Unavailable</p>
            ) : (
              <p className="mt-2 text-2xl font-bold text-red-500 font-mono">{highRiskDistrictCount}</p>
            )}
          </div>
          <span className="text-[9px] text-muted-foreground">Districts Risk Score &gt; 60</span>
        </Card>

      </div>

      {/* ─── SECTION 2 & 3: AI BRIEF & RISK MATRIX ──────────────────────── */}
      <div className="grid gap-6 xl:grid-cols-2">
        
        {/* AI Climate Brief */}
        <Card className="glass-card flex flex-col justify-between border-white/[0.08]">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-base flex items-center gap-1.5 font-orbitron tracking-wide">
              <Sparkles className="h-4.5 w-4.5 text-cyan-400" />
              Cognitive Climate Summary & Intelligence Brief
            </CardTitle>
            <CardDescription>AI-generated national and regional ecological synopsis.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            {loadingMetrics ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/5" />
              </div>
            ) : errorMetrics ? (
              <p className="text-xs text-slate-400 italic">Could not compile AI brief due to metrics API failure.</p>
            ) : (
              <div className="text-xs text-secondary-foreground leading-relaxed italic bg-cyan-950/20 border border-cyan-500/10 p-4 rounded-xl">
                "{aiInsights.summary}"
              </div>
            )}

            <div className="flex justify-end mt-4">
              <Link href={`/copilot?query=${encodeURIComponent(`Give me a detailed climate summary of ${stateId ? states.find(s => s.id === stateId)?.name : 'India'} in ${year}`)}`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs gap-1.5 border-brand-blue/30 text-brand-titanium bg-brand-blue/5 hover:bg-brand-blue/15 hover:border-brand-blue font-bold"
                >
                  <Sparkles className="h-3.5 w-3.5 text-cyan-400" /> Consult AI Copilot
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* National / State Risk Matrix */}
        <Card className="glass-card border-white/[0.08]">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-base font-orbitron tracking-wide">Climatic Hazard Risk Matrix</CardTitle>
            <CardDescription>Sectoral vulnerability levels calculated from satellite models and weather stations.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 grid-cols-2 md:grid-cols-3 pt-2">
            {[
              { label: "Flood Risk", val: metrics.avgFlood, color: "text-blue-400" },
              { label: "Drought Risk", val: metrics.avgDrought, color: "text-amber-400" },
              { label: "Heatwave Risk", val: metrics.avgHeat, color: "text-rose-500" },
              { label: "Air Quality Risk", val: metrics.avgAqi > 100 ? 75 : 35, color: "text-orange-400" },
              { label: "Water Stress", val: metrics.avgWater, color: "text-sky-400" },
              { label: "Crop Sowing Decline", val: Math.round(100 - metrics.avgNdvi * 100), color: "text-emerald-400" }
            ].map((r, i) => (
              <div key={i} className="rounded-xl border border-white/[0.05] bg-white/[0.01] p-3 flex flex-col justify-between">
                <span className="text-[10px] text-muted-foreground font-semibold block">{r.label}</span>
                {loadingMetrics ? (
                  <Skeleton className="h-6 w-12 mt-2" />
                ) : errorMetrics ? (
                  <span className="text-xs text-rose-400 mt-2">N/A</span>
                ) : (
                  <div className="mt-2">
                    <p className={`text-lg font-bold font-mono ${r.color}`}>{r.val}%</p>
                    <div className="h-1 bg-slate-800 rounded-full mt-1.5 overflow-hidden">
                      <div className="h-full bg-current" style={{ width: `${r.val}%`, color: r.color.replace("text-", "#") }} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

      </div>

      {/* ─── SECTION 4: INTERACTIVE TREND CHARTS ─────────────────────────── */}
      <Card className="glass-card border-white/[0.08]">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-base font-orbitron tracking-wide">Historical Timeline & Climate Trends</CardTitle>
          <CardDescription>Monthly observation composites for key indicators. Click "Explain with AI" on any parameter to generate analysis.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-4">
          
          <div className="grid gap-6 md:grid-cols-2">
            
            {/* Chart 1: Temperature & Rainfall */}
            <div className="space-y-2 border border-white/[0.04] bg-white/[0.01] p-4 rounded-2xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider">Temperature & Precipitation</span>
                <Link href={`/copilot?query=${encodeURIComponent("Analyze the correlation between temperature rises and precipitation deficits in the monthly analytics charts")}`}>
                  <Button size="sm" variant="ghost" className="h-7 text-[10px] uppercase text-cyan-400 hover:text-white flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> Explain with AI
                  </Button>
                </Link>
              </div>
            <div className="h-52 w-full">
              {loadingMetrics ? (
                <Skeleton className="h-full w-full" />
              ) : errorMetrics ? (
                <div className="flex h-full items-center justify-center text-xs text-slate-400">Trends data currently unavailable</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={monthlyData}>
                      <defs>
                        <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f87171" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#f87171" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" stroke="#C0C8D4" fontSize={8} />
                      <YAxis stroke="#C0C8D4" fontSize={8} />
                      <Tooltip contentStyle={{ backgroundColor: "#020617", border: "1px solid rgba(6,182,212,0.2)", fontSize: 10 }} />
                      <Legend wrapperStyle={{ fontSize: 9 }} />
                      <Area type="monotone" dataKey="temperature_c" stroke="#f87171" fillOpacity={1} fill="url(#colorTemp)" name="Temp (°C)" />
                      <Area type="monotone" dataKey="rainfall_mm" stroke="#38bdf8" fillOpacity={0.1} name="Rain (mm)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Chart 2: AQI & Reservoir Level */}
            <div className="space-y-2 border border-white/[0.04] bg-white/[0.01] p-4 rounded-2xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider">Air Quality & Reservoir Storage</span>
                <Link href={`/copilot?query=${encodeURIComponent("Examine how reservoir levels and seasonal winds correlate with gridded AQI readings in the analytics trends")}`}>
                  <Button size="sm" variant="ghost" className="h-7 text-[10px] uppercase text-cyan-400 hover:text-white flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> Explain with AI
                  </Button>
                </Link>
              </div>
            <div className="h-52 w-full">
              {loadingMetrics ? (
                <Skeleton className="h-full w-full" />
              ) : errorMetrics ? (
                <div className="flex h-full items-center justify-center text-xs text-slate-400">Trends data currently unavailable</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                      <XAxis dataKey="date" stroke="#C0C8D4" fontSize={8} />
                      <YAxis stroke="#C0C8D4" fontSize={8} />
                      <Tooltip contentStyle={{ backgroundColor: "#020617", border: "1px solid rgba(6,182,212,0.2)", fontSize: 10 }} />
                      <Legend wrapperStyle={{ fontSize: 9 }} />
                      <Line type="monotone" dataKey="aqi" stroke="#f59e0b" strokeWidth={2} name="AQI Index" />
                      <Line type="monotone" dataKey="reservoir_level_pct" stroke="#10b981" strokeWidth={2} name="Reservoirs (%)" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

          </div>

        </CardContent>
      </Card>

      {/* ─── SECTION 6: DECISION SUPPORT ────────────────────────────────── */}
      <div className="grid gap-6 xl:grid-cols-3">
        
        {/* Hotspots Panel */}
        <Card className="glass-card border-white/[0.08] xl:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-base font-orbitron tracking-wide">Vulnerability Watchlist</CardTitle>
            <CardDescription>Districts and States displaying elevated multi-hazard composite risk scores.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div>
              <span className="text-[10px] font-bold text-brand-blue uppercase tracking-wider block mb-2">Top 5 High-Risk States</span>
              {loadingRankings ? (
                <div className="space-y-1.5">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                </div>
              ) : errorRankings ? (
                <p className="text-xs text-rose-400">States data unavailable</p>
              ) : (
                <div className="space-y-1.5">
                  {topStates.map((state, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-white/[0.02] border border-white/[0.08] rounded-lg p-2 text-xs">
                      <span className="font-semibold text-white">{state.name}</span>
                      <span className="font-mono text-rose-400 font-bold bg-rose-950/20 px-1.5 py-0.5 rounded">{state.avgRisk}/100</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <span className="text-[10px] font-bold text-brand-blue uppercase tracking-wider block mb-2">Top 10 High-Risk Districts</span>
              {loadingRankings ? (
                <div className="space-y-1.5">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                </div>
              ) : errorRankings ? (
                <p className="text-xs text-rose-400">Districts data unavailable</p>
              ) : (
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {topDistricts.map((d, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-white/[0.02] border border-white/[0.08] rounded-lg p-2 text-xs">
                      <div className="leading-tight">
                        <span className="font-semibold text-white block">{d.district_name}</span>
                        <span className="text-[9px] text-muted-foreground">{d.state_name}</span>
                      </div>
                      <span className="font-mono text-red-500 font-bold bg-red-950/20 px-1.5 py-0.5 rounded">{d.composite_risk}/100</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Action Directives & Threat Assessment */}
        <Card className="glass-card border-white/[0.08] xl:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-base font-orbitron tracking-wide">Strategic Actions & Threat Matrix</CardTitle>
            <CardDescription>Government operational guidelines based on real-time environmental factors.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            
            {/* Emerging Threats */}
            <div>
              <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider block mb-2">Active Environmental Threat Assessment</span>
              <div className="space-y-2">
                {emergingThreats.map((threat, idx) => (
                  <div key={idx} className="flex gap-2 p-2.5 rounded-lg border border-red-500/10 bg-red-950/10 text-xs text-slate-300 leading-relaxed">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                    <span>{threat}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Directives */}
            <div>
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-2">Recommended Operational Mitigations</span>
              <div className="space-y-2">
                {loadingMetrics ? (
                  <div className="space-y-1.5">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : (
                  aiInsights.recommendations.map((rec: string, idx: number) => (
                    <div key={idx} className="flex gap-2.5 p-2.5 rounded-lg border border-white/[0.08] bg-white/[0.01] text-xs text-slate-300 leading-normal">
                      <Check className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                      <span>{rec}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

          </CardContent>
        </Card>

      </div>

      {/* ─── SECTION 7: GOVERNMENT DATA SOURCES REGISTRY ────────────────── */}
      <Card className="glass-card border-white/[0.08]">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-base flex items-center gap-1.5 font-orbitron tracking-wide">
            <Database className="h-5 w-5 text-brand-blue" />
            Federal Environmental Ingestion Registry
          </CardTitle>
          <CardDescription>Official government integration endpoint states, synchronization frequency, and dataset availability matrix.</CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/[0.08] text-muted-foreground">
                  <th className="py-2.5 px-3 font-semibold">Data Feed Source</th>
                  <th className="py-2.5 px-3 font-semibold">Federal Agency</th>
                  <th className="py-2.5 px-3 font-semibold">Assigned Climate Indicators</th>
                  <th className="py-2.5 px-3 font-semibold">Update Cycle</th>
                  <th className="py-2.5 px-3 font-semibold">Last Ingest Sync</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {GOVERNMENT_SOURCES.map((source) => (
                  <tr key={source.id} className="hover:bg-white/[0.01] transition-colors">
                    <td className="py-3 px-3 font-bold text-white whitespace-nowrap">{source.name}</td>
                    <td className="py-3 px-3 text-secondary-foreground">{source.agency}</td>
                    <td className="py-3 px-3 text-muted-foreground whitespace-pre-wrap max-w-xs">{source.dataset}</td>
                    <td className="py-3 px-3 text-secondary-foreground">{source.syncFrequency}</td>
                    <td className="py-3 px-3 text-secondary-foreground font-mono text-[11px]">{source.lastSync}</td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-950/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                        <CheckCircle className="h-3 w-3" />
                        <span>Connected</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
