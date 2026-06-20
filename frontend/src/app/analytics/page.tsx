"use client";

import { useEffect, useState, useMemo } from "react";
import { 
  BarChart3, 
  CloudRain, 
  Droplets, 
  Flame, 
  RadioTower, 
  Leaf, 
  ShieldAlert, 
  Sparkles, 
  Wind, 
  Scale, 
  CalendarRange, 
  History, 
  FileText, 
  Activity, 
  Layers3, 
  Compass, 
  Users, 
  ArrowUpRight, 
  Download, 
  TrendingUp, 
  Check, 
  AlertTriangle,
  Globe,
  Plus,
  RefreshCw,
  Printer,
  ChevronRight,
  TrendingDown
} from "lucide-react";
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Legend,
  LineChart,
  Line
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { useClimate } from "@/store/useClimateStore";
import type { ClimateObservation, Ranking, District, State } from "@/lib/types";

// ─── District Metadata Classifications ────────────────────────────────
const DISTRICT_METADATA: Record<number, { climateZone: string; riskCategory: string }> = {
  101: { climateZone: "Tropical", riskCategory: "Flood Prone" },
  102: { climateZone: "Semi-Arid", riskCategory: "Water Stressed" },
  103: { climateZone: "Semi-Arid", riskCategory: "Safe" },
  201: { climateZone: "Humid", riskCategory: "Flood Prone" },
  202: { climateZone: "Humid", riskCategory: "Flood Prone" },
  203: { climateZone: "Humid", riskCategory: "Flood Prone" },
  301: { climateZone: "Semi-Arid", riskCategory: "Heatwave Prone" },
  302: { climateZone: "Semi-Arid", riskCategory: "Heatwave Prone" },
  303: { climateZone: "Arid", riskCategory: "Drought Prone" },
  401: { climateZone: "Tropical", riskCategory: "Flood Prone" },
  402: { climateZone: "Tropical", riskCategory: "Water Stressed" },
  501: { climateZone: "Arid", riskCategory: "Drought Prone" },
  502: { climateZone: "Tropical", riskCategory: "Safe" },
  601: { climateZone: "Tropical", riskCategory: "Water Stressed" },
  701: { climateZone: "Humid", riskCategory: "Flood Prone" },
  702: { climateZone: "Humid", riskCategory: "Flood Prone" }
};

export default function AnalyticsPage() {
  const climateContext = useClimate();

  const [districts, setDistricts] = useState<District[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [allRankings, setAllRankings] = useState<Ranking[]>([]);
  const [allHistories, setAllHistories] = useState<Record<number, ClimateObservation[]>>({});

  // ─── Filter States ──────────────────────────────────────────────────
  const [stateId, setStateId] = useState<number | "">("");
  const [selectedDistId, setSelectedDistId] = useState<number | "">("");
  const [year, setYear] = useState<number>(2025);
  const [climateZone, setClimateZone] = useState<string>("");
  const [riskCategory, setRiskCategory] = useState<string>("");

  // Sync year state with activeYear from context
  useEffect(() => {
    if (climateContext?.activeYear) {
      setYear(climateContext.activeYear);
    }
  }, [climateContext?.activeYear]);

  // ─── Workspace Tabs ────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<
    "overview" | "trends" | "risk" | "sustainability" | "water" | "air" | "agriculture" | "ai" | "compare"
  >("overview");

  // ─── District Comparison States ────────────────────────────────────
  const [compDistA, setCompDistA] = useState<number>(101);
  const [compDistB, setCompDistB] = useState<number>(303);

  // ─── Sustainability Workspace Extensions ─────────────────────────
  const [susSubTab, setSusSubTab] = useState<"scorecard" | "simulator" | "leaderboard" | "geogrid">("scorecard");

  // Policy Simulator variables (rates as percentage)
  const [reforestRate, setReforestRate] = useState<number>(15);
  const [evShare, setEvShare] = useState<number>(20);
  const [renewablesShare, setRenewablesShare] = useState<number>(30);
  const [recycleRate, setRecycleRate] = useState<number>(25);

  // Leaderboard sorting and searching parameters
  const [rankSearchText, setRankSearchText] = useState<string>("");
  const [rankSortKey, setRankSortKey] = useState<"name" | "score" | "forest" | "water" | "aqi" | "resilience">("score");
  const [rankSortOrder, setRankSortOrder] = useState<"asc" | "desc">("desc");

  // ─── Sustainability API States ────────────────────────────────────
  const [analyticsData, setAnalyticsData] = useState<{
    monthlyData: any[];
    metrics: any;
    aiInsights: any;
  } | null>(null);
  const [simulatedData, setSimulatedData] = useState<any[]>([]);

  // Load datasets from backend API on mount
  useEffect(() => {
    Promise.all([
      api.states(),
      api.districts(),
      api.rankings(1000, year)
    ]).then(([statesData, districtsData, rankingsData]) => {
      setStates(statesData);
      setDistricts(districtsData);
      setAllRankings(rankingsData);

      const historyPromises = districtsData.map(d =>
        api.history(d.id, year).then(h => [d.id, h] as const)
      );
      Promise.all(historyPromises).then(results => {
        const historyMap: Record<number, ClimateObservation[]> = {};
        for (const [id, obs] of results) {
          historyMap[id] = obs;
        }
        setAllHistories(historyMap);
      }).catch(() => undefined);
    }).catch(() => undefined);
  }, [year]);

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

  // Fetch sustainability analytics metrics from backend
  useEffect(() => {
    api.analyticsMetrics({
      year,
      state_id: stateId || undefined,
      district_id: selectedDistId || undefined,
      climate_zone: climateZone || undefined,
      risk_category: riskCategory || undefined
    })
    .then((data) => {
      setAnalyticsData(data);
    })
    .catch(() => undefined);
  }, [year, stateId, selectedDistId, climateZone, riskCategory]);

  // Fetch simulated projections from backend
  useEffect(() => {
    const activeMetrics = analyticsData?.metrics;
    if (!activeMetrics) return;
    api.simulateSustainability({
      forest_health: activeMetrics.forestHealth,
      air_quality_score: activeMetrics.airQualityScore,
      water_sustainability: activeMetrics.waterSustainability,
      avg_soil: activeMetrics.avgSoil,
      climate_resilience: activeMetrics.climateResilience,
      reforest_rate: reforestRate,
      ev_share: evShare,
      renewables_share: renewablesShare,
      recycle_rate: recycleRate
    })
    .then((data) => {
      setSimulatedData(data);
    })
    .catch(() => undefined);
  }, [analyticsData?.metrics, reforestRate, evShare, renewablesShare, recycleRate]);

  // Filter districts based on current select states
  const filteredDistricts = useMemo(() => {
    return districts.filter((d) => {
      if (stateId && d.state_id !== stateId) return false;
      const meta = DISTRICT_METADATA[d.id] || { climateZone: "Tropical", riskCategory: "Safe" };
      if (climateZone && meta.climateZone !== climateZone) return false;
      if (riskCategory && meta.riskCategory !== riskCategory) return false;
      return true;
    });
  }, [districts, stateId, climateZone, riskCategory]);

  // Aggregate monthly observations for the filtered scope from backend
  const monthlyData = useMemo(() => {
    return analyticsData?.monthlyData || [];
  }, [analyticsData]);

  // Compute indices from backend
  const metrics = useMemo(() => {
    return analyticsData?.metrics || null;
  }, [analyticsData]);

  // Generate AI Insights from backend
  const aiInsights = useMemo(() => {
    return analyticsData?.aiInsights || null;
  }, [analyticsData]);

  // Compute District Rankings based on current year and filters
  const rankingsList = useMemo(() => {
    const list = districts.map(d => {
      const histories = allHistories[d.id] || [];
      if (histories.length === 0) return null;
      const avgNdvi = histories.reduce((a, obs) => a + (obs.ndvi ?? 0.5), 0) / histories.length;
      const avgAqi = histories.reduce((a, obs) => a + obs.aqi, 0) / histories.length;
      const avgReservoir = histories.reduce((a, obs) => a + (obs.reservoir_level_pct ?? 50), 0) / histories.length;
      const avgSoil = histories.reduce((a, obs) => a + obs.soil_moisture_pct, 0) / histories.length;

      const r = allRankings.find(x => x.district_id === d.id) || { composite_risk: 50, drought_risk: 50 };

      const ndviScore = Math.round(avgNdvi * 100);
      const aqiScore = Math.max(0, Math.min(100, Math.round(100 - (avgAqi - 50) * 0.4)));
      const reservoirScore = Math.round(avgReservoir);
      const safetyScore = Math.round(100 - r.composite_risk);
      const soilScore = Math.max(10, Math.min(100, Math.round(100 - r.drought_risk * 0.8)));

      const compositeScore = Math.round(ndviScore * 0.25 + aqiScore * 0.2 + reservoirScore * 0.2 + safetyScore * 0.2 + soilScore * 0.15);
      return {
        id: d.id,
        name: d.name,
        state: d.state_name || "",
        score: compositeScore,
        water: reservoirScore,
        aqi: Math.round(avgAqi),
        forest: ndviScore,
        carbon: Math.max(10, Math.min(95, Math.round(100 - (ndviScore * 0.6 + (100 - aqiScore) * 0.4)))),
        resilience: safetyScore,
        risk: r.composite_risk
      };
    }).filter(Boolean) as Array<{ id: number; name: string; state: string; score: number; water: number; aqi: number; forest: number; carbon: number; resilience: number; risk: number }>;
    return list;
  }, [districts, allHistories, allRankings]);

  // Export functions
  const handleExportCSV = () => {
    if (monthlyData.length === 0) return;
    let csv = "Date,Temperature (C),Rainfall (mm),AQI,Reservoir level (%),Soil Moisture (%)\n";
    monthlyData.forEach(obs => {
      csv += `${obs.observed_on},${obs.temperature_c},${obs.rainfall_mm},${obs.aqi},${obs.reservoir_level_pct},${obs.soil_moisture_pct}\n`;
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.setAttribute("href", url);
    a.setAttribute("download", `BCT_Climate_Sustainability_Data_${year}.csv`);
    a.click();
  };

  const handleExportPDF = () => {
    window.print();
  };

  // Set the map active layer in global state when selected in analytics
  const triggerMapUpdate = (layerKey: string) => {
    if (climateContext) {
      climateContext.setActiveLayer(layerKey);
    }
  };

  // Dynamic calculations for Comparison Tab
  const compMetrics = useMemo(() => {
    if (districts.length === 0) return null;
    const fetchMetrics = (dId: number) => {
      const histories = allHistories[dId] || [];
      const avgNdvi = histories.length > 0 ? histories.reduce((a, obs) => a + (obs.ndvi ?? 0.5), 0) / histories.length : 0.5;
      const avgAqi = histories.length > 0 ? histories.reduce((a, obs) => a + obs.aqi, 0) / histories.length : 100;
      const avgReservoir = histories.length > 0 ? histories.reduce((a, obs) => a + (obs.reservoir_level_pct ?? 50), 0) / histories.length : 50;
      const avgSoil = histories.length > 0 ? histories.reduce((a, obs) => a + obs.soil_moisture_pct, 0) / histories.length : 30;
      const r = allRankings.find(x => x.district_id === dId) || { composite_risk: 50, drought_risk: 50 };

      const ndviScore = Math.round(avgNdvi * 100);
      const aqiScore = Math.max(0, Math.min(100, Math.round(100 - (avgAqi - 50) * 0.4)));
      const reservoirScore = Math.round(avgReservoir);
      const safetyScore = Math.round(100 - r.composite_risk);
      const soilScore = Math.max(10, Math.min(100, Math.round(100 - r.drought_risk * 0.8)));

      const compositeScore = Math.round(ndviScore * 0.25 + aqiScore * 0.2 + reservoirScore * 0.2 + safetyScore * 0.2 + soilScore * 0.15);
      return {
        score: compositeScore,
        water: reservoirScore,
        aqi: Math.round(avgAqi),
        forest: ndviScore,
        carbon: Math.max(10, Math.min(95, Math.round(100 - (ndviScore * 0.6 + (100 - aqiScore) * 0.4)))),
        resilience: safetyScore,
        envHealth: Math.round(ndviScore * 0.4 + aqiScore * 0.3 + soilScore * 0.3),
        renewable: Math.min(100, Math.max(10, Math.round(safetyScore * 0.7 + reservoirScore * 0.3)))
      };
    };

    const distA = districts.find(d => d.id === compDistA) || districts[0];
    const distB = districts.find(d => d.id === compDistB) || districts[1];

    const dataA = fetchMetrics(distA.id);
    const dataB = fetchMetrics(distB.id);

    return { distA, distB, dataA, dataB };
  }, [districts, allHistories, allRankings, compDistA, compDistB]);

  // ─── Sustainability Dynamic Leaderboard ───────────────────────────
  const leaderboardList = useMemo(() => {
    const list = filteredDistricts.map(d => {
      const histories = allHistories[d.id] || [];
      const avgNdvi = histories.length > 0 ? histories.reduce((a, obs) => a + (obs.ndvi ?? 0.5), 0) / histories.length : 0.5;
      const avgAqi = histories.length > 0 ? histories.reduce((a, obs) => a + obs.aqi, 0) / histories.length : 100;
      const avgReservoir = histories.length > 0 ? histories.reduce((a, obs) => a + (obs.reservoir_level_pct ?? 50), 0) / histories.length : 50;
      const avgSoil = histories.length > 0 ? histories.reduce((a, obs) => a + obs.soil_moisture_pct, 0) / histories.length : 30;
      const r = allRankings.find(x => x.district_id === d.id) || { composite_risk: 50 };

      const forest = Math.round(avgNdvi * 100);
      const aqi = Math.max(0, Math.min(100, Math.round(100 - (avgAqi - 50) * 0.4)));
      const water = Math.round(avgReservoir);
      const resilience = Math.round(100 - r.composite_risk);
      const soil = Math.round(avgSoil);

      const score = Math.round(forest * 0.25 + aqi * 0.2 + water * 0.2 + resilience * 0.2 + soil * 0.15);

      return {
        id: d.id,
        name: d.name,
        state: d.state_name || "",
        score,
        forest,
        water,
        aqi,
        resilience,
        soil
      };
    });

    const searched = list.filter(item =>
      item.name.toLowerCase().includes(rankSearchText.toLowerCase()) ||
      item.state.toLowerCase().includes(rankSearchText.toLowerCase())
    );

    return searched.sort((a, b) => {
      let fieldA: any = a[rankSortKey];
      let fieldB: any = b[rankSortKey];

      if (typeof fieldA === "string") {
        return rankSortOrder === "asc"
          ? fieldA.localeCompare(fieldB)
          : fieldB.localeCompare(fieldA);
      } else {
        return rankSortOrder === "asc"
          ? fieldA - fieldB
          : fieldB - fieldA;
      }
    });
  }, [filteredDistricts, allHistories, allRankings, rankSearchText, rankSortKey, rankSortOrder]);


  if (states.length === 0 || districts.length === 0 || allRankings.length === 0 || Object.keys(allHistories).length === 0 || !analyticsData || !metrics) {
    return <div className="text-center py-20 text-muted-foreground">Loading analytics datasets...</div>;
  }

  if (!metrics) return null;

  return (
    <div className="grid gap-5">
      {/* ─── Page Header & Title ───────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <Badge className="border-white/[0.08] bg-brand-amber/10 text-brand-steel">Climate Intelligence Workspace</Badge>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal text-white">National Climate & Sustainability Analytics</h1>
          <p className="mt-2 max-w-3xl text-sm text-secondary-foreground">
            Unified Climate Trends, Risk Models, Sustainability Indexes, and Cognitive Recommendations workspace.
          </p>
        </div>

        {/* ─── Global Filters Bar ────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-2.5 bg-surface/60 border border-white/[0.08] p-2 rounded-2xl backdrop-blur-md">
          <div className="flex flex-col gap-1">
            <span className="text-[7.5px] font-bold text-muted-foreground uppercase tracking-wider">State</span>
            <select
              value={stateId}
              onChange={(e) => {
                setStateId(e.target.value === "" ? "" : Number(e.target.value));
                setSelectedDistId("");
              }}
              className="bg-background border border-white/[0.08] rounded-lg py-1 px-2.5 text-white focus:outline-none text-xs w-36 cursor-pointer"
            >
              <option value="">All States</option>
              {states.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[7.5px] font-bold text-muted-foreground uppercase tracking-wider">District</span>
            <select
              value={selectedDistId}
              onChange={(e) => setSelectedDistId(e.target.value === "" ? "" : Number(e.target.value))}
              className="bg-background border border-white/[0.08] rounded-lg py-1 px-2.5 text-white focus:outline-none text-xs w-36 cursor-pointer"
            >
              <option value="">All Districts</option>
              {filteredDistricts.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[7.5px] font-bold text-muted-foreground uppercase tracking-wider">Timeline</span>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="bg-background border border-white/[0.08] rounded-lg py-1 px-2.5 text-white focus:outline-none text-xs cursor-pointer"
            >
              {[2020, 2025, 2030, 2040, 2050].map((y) => (
                <option key={y} value={y}>{y} AD</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[7.5px] font-bold text-muted-foreground uppercase tracking-wider">Zone</span>
            <select
              value={climateZone}
              onChange={(e) => {
                setClimateZone(e.target.value);
                setSelectedDistId("");
              }}
              className="bg-background border border-white/[0.08] rounded-lg py-1 px-2.5 text-white focus:outline-none text-xs cursor-pointer"
            >
              <option value="">All Zones</option>
              {["Tropical", "Semi-Arid", "Arid", "Humid"].map((z) => (
                <option key={z} value={z}>{z}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[7.5px] font-bold text-muted-foreground uppercase tracking-wider">Climatic Risk</span>
            <select
              value={riskCategory}
              onChange={(e) => {
                setRiskCategory(e.target.value);
                setSelectedDistId("");
              }}
              className="bg-background border border-white/[0.08] rounded-lg py-1 px-2.5 text-white focus:outline-none text-xs cursor-pointer"
            >
              <option value="">All Categories</option>
              {["Flood Prone", "Drought Prone", "Heatwave Prone", "Water Stressed", "Safe"].map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ─── Export & Print Floating Actions ─────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-2.5">
        <div className="flex gap-1.5 overflow-x-auto select-none no-scrollbar">
          {[
            { id: "overview", label: "Overview", icon: Layers3 },
            { id: "trends", label: "Climate Trends", icon: TrendingUp },
            { id: "risk", label: "Risk Analytics", icon: Activity },
            { id: "sustainability", label: "Sustainability", icon: Leaf },
            { id: "water", label: "Water Resources", icon: Droplets },
            { id: "air", label: "Air Quality", icon: Wind },
            { id: "agriculture", label: "Agriculture", icon: Compass },
            { id: "ai", label: "AI Insights", icon: Sparkles },
            { id: "compare", label: "District Compare", icon: Scale }
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  active 
                    ? "bg-brand-amber text-slate-950 shadow-[0_0_12px_#F59E0B50]" 
                    : "text-muted-foreground hover:text-slate-200 hover:bg-surface/60"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleExportCSV}
            className="border-white/[0.08] bg-background hover:bg-surface hover:text-brand-steel text-secondary-foreground text-xs gap-1.5 h-8"
          >
            <Download className="h-3.5 w-3.5" />
            <span>CSV</span>
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleExportPDF}
            className="border-white/[0.08] bg-background hover:bg-surface hover:text-brand-steel text-secondary-foreground text-xs gap-1.5 h-8"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print PDF</span>
          </Button>
        </div>
      </div>

      {/* ─── TAB CONTENT: OVERVIEW ──────────────────────────────────────── */}
      {activeTab === "overview" && (
        <div className="space-y-5">
          {/* Summary Scorecards Grid */}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <Card className="glass-card bg-background/50 p-4 flex flex-col justify-between h-[104px]">
              <div>
                <span className="text-[8.5px] font-bold text-muted-foreground uppercase tracking-widest block">Temperature</span>
                <p className="mt-2 text-2xl font-bold text-rose-400 font-mono">{metrics.avgTemp}°C</p>
              </div>
              <span className="text-[9px] text-muted-foreground">Monthly Avg Range</span>
            </Card>

            <Card className="glass-card bg-background/50 p-4 flex flex-col justify-between h-[104px]">
              <div>
                <span className="text-[8.5px] font-bold text-muted-foreground uppercase tracking-widest block">Precipitation</span>
                <p className="mt-2 text-2xl font-bold text-brand-steel font-mono">{metrics.avgRain} mm</p>
              </div>
              <span className="text-[9px] text-muted-foreground">Monsoon Aggregate</span>
            </Card>

            <Card className="glass-card bg-background/50 p-4 flex flex-col justify-between h-[104px]">
              <div>
                <span className="text-[8.5px] font-bold text-muted-foreground uppercase tracking-widest block">Reservoir Status</span>
                <p className="mt-2 text-2xl font-bold text-brand-amber font-mono">{metrics.avgReservoir}%</p>
              </div>
              <span className="text-[9px] text-muted-foreground">Total Capacity Level</span>
            </Card>

            <Card className="glass-card bg-background/50 p-4 flex flex-col justify-between h-[104px]">
              <div>
                <span className="text-[8.5px] font-bold text-muted-foreground uppercase tracking-widest block">Air Quality</span>
                <p className="mt-2 text-2xl font-bold text-amber-400 font-mono">{metrics.avgAqi} AQI</p>
              </div>
              <span className="text-[9px] text-muted-foreground">CPCB Gridded Index</span>
            </Card>

            <Card className="glass-card border-white/[0.08] bg-brand-amber/10 p-4 flex flex-col justify-between h-[104px] cursor-pointer hover:border-white/[0.08] transition" onClick={() => setActiveTab("sustainability")}>
              <div>
                <div className="flex justify-between items-center">
                  <span className="text-[8.5px] font-bold text-brand-amber uppercase tracking-widest block">Sustainability Index</span>
                  <Leaf className="h-3.5 w-3.5 text-brand-amber" />
                </div>
                <p className="mt-2 text-2xl font-bold text-white font-mono">{metrics.compositeIndex}/100</p>
              </div>
              <span className="text-[9px] text-brand-steel font-medium flex items-center gap-0.5">
                Explore Ecologics <ChevronRight className="h-3 w-3" />
              </span>
            </Card>
          </div>

          {/* Quick Trends & Map highlights */}
          <div className="grid gap-5 xl:grid-cols-2">
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-white text-base">Scope Climate Trends Overview</CardTitle>
                  <CardDescription>Monthly aggregates for target parameters.</CardDescription>
                </div>
                <Button size="sm" variant="ghost" className="text-brand-steel hover:text-white" onClick={() => setActiveTab("trends")}>
                  Full Charts
                </Button>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height={230}>
                  <AreaChart data={monthlyData}>
                    <defs>
                      <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f87171" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#f87171" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={9} />
                    <YAxis stroke="#94a3b8" fontSize={9} />
                    <Tooltip contentStyle={{ backgroundColor: "#020617", border: "1px solid rgba(6,182,212,0.2)" }} />
                    <Area type="monotone" dataKey="temperature_c" stroke="#f87171" fillOpacity={1} fill="url(#colorTemp)" name="Temperature (C)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* AI Insights Quick block */}
            <Card className="glass-card flex flex-col justify-between p-5 space-y-4">
              <div className="space-y-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-brand-steel flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4" />
                  Cognitive Analysis Summary
                </h3>
                <p className="text-xs text-secondary-foreground leading-relaxed italic">
                  "{aiInsights?.summary}"
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-white/[0.08] pt-3 text-[10.5px]">
                <div>
                  <span className="font-bold text-brand-amber block mb-1">✓ Positives</span>
                  <div className="space-y-0.5">
                    {aiInsights?.positives.slice(0, 2).map((p: string, i: number) => (
                      <p key={i} className="text-secondary-foreground">• {p}</p>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="font-bold text-amber-500 block mb-1">⚠ Critical Factors</span>
                  <div className="space-y-0.5">
                    {aiInsights?.negatives.slice(0, 2).map((n: string, i: number) => (
                      <p key={i} className="text-secondary-foreground">• {n}</p>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ─── TAB CONTENT: CLIMATE TRENDS ────────────────────────────────── */}
      {activeTab === "trends" && (
        <div className="grid gap-5 xl:grid-cols-2">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-white text-base">Temperature Profile Anomaly</CardTitle>
              <CardDescription>Average monthly gridded readings.</CardDescription>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height={230}>
                <AreaChart data={monthlyData}>
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={9} />
                  <YAxis stroke="#94a3b8" fontSize={9} />
                  <Tooltip contentStyle={{ backgroundColor: "#020617", border: "1px solid rgba(6,182,212,0.2)" }} />
                  <Area type="monotone" dataKey="temperature_c" stroke="#f87171" fill="rgba(248,113,113,0.15)" name="Temperature (C)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-white text-base">Precipitation Accumulation Index</CardTitle>
              <CardDescription>Monsoon distributions and run-offs.</CardDescription>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height={230}>
                <AreaChart data={monthlyData}>
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={9} />
                  <YAxis stroke="#94a3b8" fontSize={9} />
                  <Tooltip contentStyle={{ backgroundColor: "#020617", border: "1px solid rgba(6,182,212,0.2)" }} />
                  <Area type="monotone" dataKey="rainfall_mm" stroke="#38bdf8" fill="rgba(56,189,248,0.15)" name="Rainfall (mm)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── TAB CONTENT: RISK ANALYTICS ────────────────────────────────── */}
      {activeTab === "risk" && (
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-5">
            {[
              { label: "Composite Risk Index", val: metrics.avgRisk, color: "text-rose-400" },
              { label: "Flood Inundation Risk", val: metrics.avgFlood, color: "text-brand-amber" },
              { label: "Extreme Heatwaves Risk", val: metrics.avgHeat, color: "text-red-400" },
              { label: "Agricultural Drought Risk", val: metrics.avgDrought, color: "text-amber-400" },
              { label: "Hydrologic Water Stress", val: metrics.avgWater, color: "text-brand-steel" }
            ].map((r, i) => (
              <Card key={i} className="glass-card bg-background/50 p-4">
                <span className="text-[8.5px] font-bold text-muted-foreground uppercase block">{r.label}</span>
                <p className={`mt-2 text-2xl font-bold font-mono ${r.color}`}>{r.val}%</p>
                <div className="h-1 bg-surface-elevated rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-current" style={{ width: `${r.val}%`, color: r.color.replace("text-", "#") }} />
                </div>
              </Card>
            ))}
          </div>

          <Card className="glass-card p-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-brand-steel mb-4">ML Predictor Facades</h3>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                ["Flood Forecast Model", "Predicts localized river flood thresholds and flash discharge anomalies.", "RandomForestFlood-v1.2", "emerald"],
                ["Drought Severity Model", "Evaluates soil moisture dry index and crop NDVI conditions.", "XGBoostDrought-v2.0", "amber"],
                ["Heatwave Warning Model", "Fuzzy-logic index based on ambient temperature and relative humidity grids.", "SklearnHeatAlert-v1.1", "red"]
              ].map(([title, desc, model, col]) => (
                <div key={title} className="rounded-2xl border border-white/[0.08] bg-white/[0.01] p-4 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-white text-xs">{title}</h4>
                    <p className="text-[11px] text-muted-foreground mt-1">{desc}</p>
                  </div>
                  <Badge className="mt-4 self-start font-mono text-[9px] uppercase border-white/[0.08] bg-brand-amber/10 text-brand-steel">
                    {model}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ─── TAB CONTENT: SUSTAINABILITY (MERGED SECTION) ────────────────── */}
      {activeTab === "sustainability" && (
        <div className="space-y-5">
          {/* ─── Sustainability Sub-Navigation ────────────────────────────── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: "scorecard", label: "Executive Scorecard", icon: BarChart3 },
                { id: "simulator", label: "Policy Simulator & Forecast", icon: Sparkles },
                { id: "leaderboard", label: "District Leaderboard", icon: Activity },
              ].map((sub) => {
                const Icon = sub.icon;
                const active = susSubTab === sub.id;
                return (
                  <button
                    key={sub.id}
                    onClick={() => setSusSubTab(sub.id as any)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${
                      active
                        ? "bg-surface-elevated text-brand-steel border-white/[0.08] shadow-[0_0_8px_rgba(6,182,212,0.15)]"
                        : "text-muted-foreground hover:text-slate-200 hover:bg-surface/40 border-transparent"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{sub.label}</span>
                  </button>
                );
              })}
            </div>
            
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Overall Sustainability Index:</span>
              <Badge className="bg-surface-elevated text-brand-amber border border-white/[0.08] font-mono font-bold text-xs py-0.5 px-2">
                {metrics.compositeIndex}/100
              </Badge>
            </div>
          </div>

          {/* ─── SUB TAB 1: EXECUTIVE SCORECARD ───────────────────────────── */}
          {susSubTab === "scorecard" && (
            <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
              {/* Radial Score Gauge Card */}
              <Card className="glass-card p-6 flex flex-col justify-between items-center text-center">
                <CardHeader className="pb-2 p-0">
                  <CardTitle className="text-white text-base">Composite Index Score</CardTitle>
                  <CardDescription>Overall Ecological Balance & Resource Security</CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-6 w-full flex flex-col items-center mt-4 p-0">
                  {/* Gauge */}
                  <div className="relative w-44 h-44 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r="50" fill="transparent" stroke="rgba(255,255,255,0.03)" strokeWidth="8" />
                      <circle
                        cx="60"
                        cy="60"
                        r="50"
                        fill="transparent"
                        stroke={metrics.compositeIndex >= 70 ? "#10b981" : metrics.compositeIndex >= 50 ? "#F59E0B" : "#f59e0b"}
                        strokeWidth="8"
                        strokeDasharray={2 * Math.PI * 50}
                        strokeDashoffset={2 * Math.PI * 50 * (1 - metrics.compositeIndex / 100)}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                        style={{ filter: `drop-shadow(0 0 6px ${metrics.compositeIndex >= 70 ? "#10b981" : "#F59E0B"}70)` }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-4xl font-extrabold text-white tracking-tighter">{metrics.compositeIndex}</span>
                      <span className="text-[8px] uppercase tracking-widest font-extrabold text-muted-foreground mt-1">Sustainability Score</span>
                    </div>
                  </div>

                  {/* Pillars cards */}
                  <div className="grid grid-cols-2 gap-2.5 w-full text-left text-[10.5px]">
                    {[
                      { label: "Environmental Health", score: `${metrics.envHealthScore}/100`, key: "environmental_health", color: "hover:border-white/[0.08]" },
                      { label: "Water Sustainability", score: `${metrics.waterSustainability}%`, key: "water_resources", color: "hover:border-white/[0.08]" },
                      { label: "Forest Cover (NDVI)", score: `${metrics.forestHealth}%`, key: "green_cover", color: "hover:border-green-500/25" },
                      { label: "Resilience Score", score: `${metrics.climateResilience}%`, key: "climate_resilience", color: "hover:border-rose-500/25" }
                    ].map((item) => (
                      <div
                        key={item.key}
                        onClick={() => triggerMapUpdate(item.key)}
                        className={`p-3 rounded-2xl bg-surface/40 border border-white/5 cursor-pointer transition ${item.color} active:scale-95`}
                      >
                        <span className="text-[7.5px] text-muted-foreground font-bold block uppercase tracking-wider">{item.label}</span>
                        <p className="mt-1 font-bold text-white font-mono text-sm">{item.score}</p>
                        <span className="text-[8px] text-brand-amber/80 mt-1 block">Click to view map layer</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Radar Chart & Directives */}
              <Card className="glass-card p-5 flex flex-col justify-between">
                <CardHeader className="p-0 pb-3">
                  <CardTitle className="text-white text-base">5-Pillar Sustainability Radar</CardTitle>
                  <CardDescription>Multi-dimensional analysis relative to safety boundaries.</CardDescription>
                </CardHeader>
                
                <CardContent className="grid md:grid-cols-2 gap-6 items-center p-0 mt-2">
                  <div className="w-full h-56 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height={220}>
                      <RadarChart cx="50%" cy="50%" outerRadius="75%" data={[
                        { subject: "Forest Cover", value: metrics.forestHealth, fullMark: 100 },
                        { subject: "Air Quality", value: metrics.airQualityScore, fullMark: 100 },
                        { subject: "Water Storage", value: metrics.waterSustainability, fullMark: 100 },
                        { subject: "Soil Health", value: metrics.avgSoil, fullMark: 100 },
                        { subject: "Climate Safety", value: metrics.climateResilience, fullMark: 100 }
                      ]}>
                        <PolarGrid stroke="rgba(148,163,184,0.1)" />
                        <PolarAngleAxis dataKey="subject" stroke="#94a3b8" tick={{ fontSize: 9 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 8 }} />
                        <Radar name="Index" dataKey="value" stroke="#10b981" fill="#10b981" fillOpacity={0.25} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Policy Directives */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-brand-amber flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" />
                      Enterprise Directives
                    </h4>
                    <div className="space-y-2">
                      {aiInsights?.recommendations.slice(0, 3).map((tip: string, idx: number) => (
                        <div key={idx} className="flex gap-2 p-2.5 rounded-lg border border-white/[0.08] bg-brand-amber/10 text-[11px] text-secondary-foreground leading-normal">
                          <Check className="h-3.5 w-3.5 shrink-0 text-brand-amber mt-0.5" />
                          <span>{tip}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ─── SUB TAB 2: POLICY SIMULATOR & FORECAST ──────────────────── */}
          {susSubTab === "simulator" && (
            <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
              {/* Slider Panel */}
              <Card className="glass-card p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-white text-base">Carbon & Ecology Budget Simulator</CardTitle>
                    <CardDescription>Simulate target carbon neutral levers in real-time.</CardDescription>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-[10px] uppercase text-brand-steel hover:bg-surface px-2 h-7"
                    onClick={() => {
                      setReforestRate(15);
                      setEvShare(20);
                      setRenewablesShare(30);
                      setRecycleRate(25);
                    }}
                  >
                    Reset Defaults
                  </Button>
                </div>

                <div className="space-y-4 pt-2">
                  {/* Afforestation Slider */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-secondary-foreground">Forest Canopy/Afforestation Expansion</span>
                      <span className="text-brand-amber font-mono font-bold">+{reforestRate}% yr</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={reforestRate}
                      onChange={(e) => setReforestRate(Number(e.target.value))}
                      className="w-full accent-emerald-400 bg-surface rounded-lg cursor-pointer h-1.5"
                    />
                    <p className="text-[9.5px] text-muted-foreground">Increases canopy NDVI levels and improves baseline soil moisture retention.</p>
                  </div>

                  {/* EV Adoption Slider */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-secondary-foreground">E-Mobility & Public Transit Grid Share</span>
                      <span className="text-brand-steel font-mono font-bold">{evShare}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={evShare}
                      onChange={(e) => setEvShare(Number(e.target.value))}
                      className="w-full accent-emerald-400 bg-surface rounded-lg cursor-pointer h-1.5"
                    />
                    <p className="text-[9.5px] text-muted-foreground">Direct abatement of vehicular particulates and volatile carbon emissions.</p>
                  </div>

                  {/* Renewable Share Slider */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-secondary-foreground">Renewable Energy Share (Solar & Wind)</span>
                      <span className="text-amber-400 font-mono font-bold">{renewablesShare}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={renewablesShare}
                      onChange={(e) => setRenewablesShare(Number(e.target.value))}
                      className="w-full accent-amber-400 bg-surface rounded-lg cursor-pointer h-1.5"
                    />
                    <p className="text-[9.5px] text-muted-foreground">Reduces industrial coal burning emissions, improving CPCB Air Quality Index.</p>
                  </div>

                  {/* Water Recycling Slider */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-secondary-foreground">Hydrologic Recycling & Basin Recovery</span>
                      <span className="text-brand-steel font-mono font-bold">{recycleRate}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={recycleRate}
                      onChange={(e) => setRecycleRate(Number(e.target.value))}
                      className="w-full accent-mint bg-surface rounded-lg cursor-pointer h-1.5"
                    />
                    <p className="text-[9.5px] text-muted-foreground">Preserves localized surface reservoir capacities, hedging drought anomalies.</p>
                  </div>
                </div>
              </Card>

              {/* Simulation Result Chart */}
              <Card className="glass-card p-5 flex flex-col justify-between">
                <div>
                  <CardTitle className="text-white text-base">Simulated Path vs Baseline Projection (to 2050)</CardTitle>
                  <CardDescription>Decisions affect the composite index growth path relative to standard degradation models.</CardDescription>
                </div>
                
                <CardContent className="h-64 mt-4 p-0">
                  <ResponsiveContainer width="100%" height={230}>
                    <LineChart data={simulatedData}>
                      <XAxis dataKey="year" stroke="#94a3b8" fontSize={9} />
                      <YAxis domain={[10, 100]} stroke="#94a3b8" fontSize={9} />
                      <Tooltip contentStyle={{ backgroundColor: "#020617", border: "1px solid rgba(6,182,212,0.2)" }} />
                      <Legend wrapperStyle={{ fontSize: 9 }} />
                      <Line type="monotone" dataKey="Baseline" stroke="#f87171" strokeWidth={2.5} strokeDasharray="5 5" name="Baseline (No Action)" />
                      <Line type="monotone" dataKey="Simulated Path" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} name="Simulated Path (Proposed)" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ─── SUB TAB 3: DISTRICT LEADERBOARD GRID ────────────────────── */}
          {susSubTab === "leaderboard" && (
            <Card className="glass-card p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-white/5">
                <div>
                  <CardTitle className="text-white text-base">District Sustainability Leaderboard</CardTitle>
                  <CardDescription>Detailed grid of districts, sortable by sustainability sub-pillars.</CardDescription>
                </div>
                
                {/* Search Bar */}
                <input
                  type="text"
                  placeholder="Search district..."
                  value={rankSearchText}
                  onChange={(e) => setRankSearchText(e.target.value)}
                  className="bg-background border border-white/[0.08] rounded-lg py-1.5 px-3 text-white focus:outline-none text-xs w-56 placeholder:text-muted-foreground"
                />
              </div>

              <div className="overflow-x-auto mt-4 max-h-[360px] overflow-y-auto pr-1">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/[0.08] text-muted-foreground">
                      {[
                        { label: "District Name", sortKey: "name" },
                        { label: "State", sortKey: "state" },
                        { label: "Composite Index", sortKey: "score" },
                        { label: "Forest NDVI", sortKey: "forest" },
                        { label: "Water Status", sortKey: "water" },
                        { label: "Clean Air Index", sortKey: "aqi" },
                        { label: "Climate Resilience", sortKey: "resilience" }
                      ].map((h) => (
                        <th
                          key={h.sortKey}
                          onClick={() => {
                            if (rankSortKey === h.sortKey) {
                              setRankSortOrder(rankSortOrder === "asc" ? "desc" : "asc");
                            } else {
                              setRankSortKey(h.sortKey as any);
                              setRankSortOrder("desc");
                            }
                          }}
                          className="py-2.5 px-2 font-semibold hover:text-white cursor-pointer select-none whitespace-nowrap"
                        >
                          <div className="flex items-center gap-1">
                            <span>{h.label}</span>
                            <span className="text-[10px] text-brand-amber">
                              {rankSortKey === h.sortKey ? (rankSortOrder === "asc" ? "▲" : "▼") : ""}
                            </span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  
                  <tbody className="divide-y divide-white/5">
                    {leaderboardList.map((item) => {
                      const isSelected = selectedDistId === item.id;
                      return (
                        <tr
                          key={item.id}
                          onClick={() => setSelectedDistId(item.id)}
                          className={`hover:bg-surface/40 cursor-pointer transition ${
                            isSelected ? "bg-brand-amber/10 border-l-2 border-l-emerald-400" : ""
                          }`}
                        >
                          <td className="py-3 px-2 font-bold text-white whitespace-nowrap">{item.name}</td>
                          <td className="py-3 px-2 text-secondary-foreground">{item.state}</td>
                          
                          {/* Composite Index score bar */}
                          <td className="py-3 px-2 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] ${
                              item.score >= 70
                                ? "bg-surface-elevated text-brand-amber border border-white/[0.08]"
                                : item.score >= 50
                                ? "bg-surface-elevated text-brand-steel border border-white/[0.08]"
                                : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            }`}>
                              {item.score}/100
                            </span>
                          </td>
                          
                          <td className="py-3 px-2 text-secondary-foreground font-mono">{item.forest}%</td>
                          <td className="py-3 px-2 text-secondary-foreground font-mono">{item.water}%</td>
                          <td className="py-3 px-2 text-secondary-foreground font-mono">{item.aqi}/100</td>
                          <td className="py-3 px-2 text-secondary-foreground font-mono">{item.resilience}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ─── TAB CONTENT: WATER RESOURCES ────────────────────────────────── */}
      {activeTab === "water" && (
        <div className="grid gap-5 xl:grid-cols-2">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-white text-base">Reservoir Storage Status</CardTitle>
              <CardDescription>Hydrological reserves trend over 12 months.</CardDescription>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height={230}>
                <AreaChart data={monthlyData}>
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={9} />
                  <YAxis stroke="#94a3b8" fontSize={9} />
                  <Tooltip contentStyle={{ backgroundColor: "#020617", border: "1px solid rgba(6,182,212,0.2)" }} />
                  <Area type="monotone" dataKey="reservoir_level_pct" stroke="#10b981" fill="rgba(16,185,129,0.15)" name="Reservoir (%)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="glass-card p-5 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-brand-steel mb-2">Water Stress Index</h3>
              <p className="text-[11px] text-muted-foreground">Evaluates monthly groundwater draft and surface reservoir levels.</p>
              <div className="mt-4 space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-secondary-foreground">Water Stress Risk Level</span>
                    <span className="text-brand-steel font-bold font-mono">{metrics.waterStress}%</span>
                  </div>
                  <div className="h-2 bg-surface-elevated rounded-full overflow-hidden">
                    <div className="h-full bg-brand-amber" style={{ width: `${metrics.waterStress}%` }} />
                  </div>
                </div>
                <div className="text-[11px] text-secondary-foreground leading-normal space-y-2 bg-white/[0.01] p-3 rounded-lg border border-white/[0.08]">
                  <p className="font-semibold text-brand-steel">Recommended Basin Interventions:</p>
                  <p>• Mandate drip-irrigation retrofits in agricultural blocks.</p>
                  <p>• Construct localized check-dams to capture monsoon peak run-offs.</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ─── TAB CONTENT: AIR QUALITY ────────────────────────────────────── */}
      {activeTab === "air" && (
        <div className="grid gap-5 xl:grid-cols-2">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-white text-base">CPCB Gridded AQI Trend</CardTitle>
              <CardDescription>Air Quality Index variance over 12 months.</CardDescription>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height={230}>
                <AreaChart data={monthlyData}>
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={9} />
                  <YAxis stroke="#94a3b8" fontSize={9} />
                  <Tooltip contentStyle={{ backgroundColor: "#020617", border: "1px solid rgba(6,182,212,0.2)" }} />
                  <Area type="monotone" dataKey="aqi" stroke="#f59e0b" fill="rgba(245,158,11,0.15)" name="AQI" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="glass-card p-5 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-brand-steel mb-2">Air Protection Score</h3>
              <p className="text-[11px] text-muted-foreground">Computed safety score where higher is cleaner.</p>
              <div className="mt-4 space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-secondary-foreground">Clean Air Index</span>
                    <span className="text-brand-amber font-bold font-mono">{metrics.airQualityScore}/100</span>
                  </div>
                  <div className="h-2 bg-surface-elevated rounded-full overflow-hidden">
                    <div className="h-full bg-brand-amber" style={{ width: `${metrics.airQualityScore}%` }} />
                  </div>
                </div>
                <div className="text-[11px] text-secondary-foreground leading-normal space-y-2 bg-white/[0.01] p-3 rounded-lg border border-white/[0.08]">
                  <p className="font-semibold text-brand-amber">Direct Clean Air Policies:</p>
                  <p>• Establish strict buffer plantation shields around commercial grids.</p>
                  <p>• Monitor real-time particulate emission grids for block-level compliance.</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ─── TAB CONTENT: AGRICULTURE ────────────────────────────────────── */}
      {activeTab === "agriculture" && (
        <div className="grid gap-5 xl:grid-cols-2">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-white text-base">Forest Canopy (NDVI) Density</CardTitle>
              <CardDescription>NDVI condition values over 12 months.</CardDescription>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height={230}>
                <AreaChart data={monthlyData}>
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={9} />
                  <YAxis stroke="#94a3b8" fontSize={9} />
                  <Tooltip contentStyle={{ backgroundColor: "#020617", border: "1px solid rgba(6,182,212,0.2)" }} />
                  <Area type="monotone" dataKey="ndvi" stroke="#10b981" fill="rgba(16,185,129,0.15)" name="NDVI Index" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="glass-card p-5 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-brand-steel mb-2">Soil Health & Vegetation</h3>
              <p className="text-[11px] text-muted-foreground">Calculated composite soil moisture indexes.</p>
              <div className="mt-4 space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-secondary-foreground">Soil Moisture Score</span>
                    <span className="text-amber-400 font-bold font-mono">{metrics.avgSoil}%</span>
                  </div>
                  <div className="h-2 bg-surface-elevated rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400" style={{ width: `${metrics.avgSoil}%` }} />
                  </div>
                </div>
                <div className="text-[11px] text-secondary-foreground leading-normal space-y-2 bg-white/[0.01] p-3 rounded-lg border border-white/[0.08]">
                  <p className="font-semibold text-amber-400">Soil Quality Recommendations:</p>
                  <p>• Deploy moisture retention mulch overlays in arable zones.</p>
                  <p>• Avoid nutrient drafts by regulating crop rotation schedules.</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ─── TAB CONTENT: AI INSIGHTS ────────────────────────────────────── */}
      {activeTab === "ai" && (
        <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <Card className="glass-card p-5 space-y-5">
            <div className="space-y-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-brand-steel flex items-center gap-1.5">
                <Sparkles className="h-4.5 w-4.5" />
                Unified Ecological AI Explanation
              </h3>
              <p className="text-xs text-secondary-foreground leading-relaxed italic bg-background/40 p-3.5 rounded-2xl border border-white/[0.08]">
                "{aiInsights?.summary}"
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-white/[0.08] pt-4 text-xs">
              <div className="space-y-2">
                <span className="font-bold text-brand-amber block uppercase tracking-wider text-[10px]">Positive Indicators</span>
                <div className="space-y-1.5">
                  {aiInsights?.positives.map((p: string, i: number) => (
                    <div key={i} className="flex gap-1.5 text-secondary-foreground leading-normal">
                      <span className="text-brand-amber font-bold">•</span>
                      <span>{p}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <span className="font-bold text-amber-500 block uppercase tracking-wider text-[10px]">Negative Indicators</span>
                <div className="space-y-1.5">
                  {aiInsights?.negatives.map((n: string, i: number) => (
                    <div key={i} className="flex gap-1.5 text-secondary-foreground leading-normal">
                      <span className="text-amber-500 font-bold">•</span>
                      <span>{n}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* Dynamic Rankings Widget */}
          <Card className="glass-card p-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-brand-steel mb-4 flex items-center gap-1.5">
              <History className="h-4.5 w-4.5" />
              Dynamic Sustainability Rankings
            </h3>
            <div className="space-y-2.5">
              {rankingsList.slice(0, 5).map((r, i) => (
                <div key={r.id} className="flex justify-between items-center bg-white/[0.02] border border-white/[0.08] rounded-lg p-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold font-mono text-brand-amber w-4 text-right">#{i + 1}</span>
                    <div className="leading-tight">
                      <p className="font-bold text-white">{r.name}</p>
                      <p className="text-[10px] text-muted-foreground">{r.state}</p>
                    </div>
                  </div>
                  <span className="font-bold font-mono text-brand-amber bg-surface-elevated px-1.5 py-0.5 rounded text-[10.5px]">
                    {r.score} pts
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ─── TAB CONTENT: DISTRICT COMPARE ──────────────────────────────── */}
      {activeTab === "compare" && compMetrics && (
        <div className="space-y-5">
          {/* Comparison Selector Dropdowns */}
          <div className="grid gap-4 md:grid-cols-2 bg-surface/40 border border-white/[0.08] p-4 rounded-2xl backdrop-blur-md">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Select Location A</label>
              <select
                value={compDistA}
                onChange={(e) => setCompDistA(Number(e.target.value))}
                className="bg-background border border-white/[0.08] rounded-lg py-2 px-3 text-white focus:outline-none text-xs w-full cursor-pointer"
              >
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}, {d.state_name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Select Location B</label>
              <select
                value={compDistB}
                onChange={(e) => setCompDistB(Number(e.target.value))}
                className="bg-background border border-white/[0.08] rounded-lg py-2 px-3 text-white focus:outline-none text-xs w-full cursor-pointer"
              >
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}, {d.state_name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Comparison Cards side-by-side */}
          <div className="grid gap-5 md:grid-cols-2">
            {/* Location A */}
            <Card className="glass-card p-5 border-white/[0.08] bg-background/20">
              <Badge className="border-white/[0.08] bg-brand-amber/10 text-brand-steel">Location A</Badge>
              <h3 className="text-lg font-bold text-white mt-1.5">{compMetrics.distA.name}</h3>
              <p className="text-xs text-muted-foreground">{compMetrics.distA.state_name}</p>
              
              <div className="mt-4 space-y-3">
                {[
                  { label: "Sustainability Score", val: compMetrics.dataA.score, max: 100, color: "bg-brand-amber" },
                  { label: "Water Availability", val: compMetrics.dataA.water, max: 100, color: "bg-brand-amber" },
                  { label: "Air Quality (Score)", val: 100 - Math.min(100, Math.max(0, Math.round((compMetrics.dataA.aqi - 50) * 0.4))), max: 100, color: "bg-amber-400" },
                  { label: "Forest Cover", val: compMetrics.dataA.forest, max: 100, color: "bg-green-400" },
                  { label: "Carbon Impact", val: compMetrics.dataA.carbon, max: 100, color: "bg-rose-400" },
                  { label: "Climate Resilience", val: compMetrics.dataA.resilience, max: 100, color: "bg-indigo-400" }
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="text-white font-mono font-semibold">{item.val}</span>
                    </div>
                    <div className="h-1.5 bg-surface-elevated rounded-full overflow-hidden">
                      <div className={`h-full ${item.color}`} style={{ width: `${item.val}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Location B */}
            <Card className="glass-card p-5 border-white/[0.08] bg-background/20">
              <Badge className="border-white/[0.08] bg-brand-amber/10 text-brand-steel">Location B</Badge>
              <h3 className="text-lg font-bold text-white mt-1.5">{compMetrics.distB.name}</h3>
              <p className="text-xs text-muted-foreground">{compMetrics.distB.state_name}</p>
              
              <div className="mt-4 space-y-3">
                {[
                  { label: "Sustainability Score", val: compMetrics.dataB.score, max: 100, color: "bg-brand-amber" },
                  { label: "Water Availability", val: compMetrics.dataB.water, max: 100, color: "bg-brand-amber" },
                  { label: "Air Quality (Score)", val: 100 - Math.min(100, Math.max(0, Math.round((compMetrics.dataB.aqi - 50) * 0.4))), max: 100, color: "bg-amber-400" },
                  { label: "Forest Cover", val: compMetrics.dataB.forest, max: 100, color: "bg-green-400" },
                  { label: "Carbon Impact", val: compMetrics.dataB.carbon, max: 100, color: "bg-rose-400" },
                  { label: "Climate Resilience", val: compMetrics.dataB.resilience, max: 100, color: "bg-indigo-400" }
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="text-white font-mono font-semibold">{item.val}</span>
                    </div>
                    <div className="h-1.5 bg-surface-elevated rounded-full overflow-hidden">
                      <div className={`h-full ${item.color}`} style={{ width: `${item.val}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* AI Comparison Summary */}
          <Card className="glass-card p-4 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-brand-steel flex items-center gap-1.5">
              <Sparkles className="h-4 w-4" />
              AI Cognitive Side-by-Side Comparison
            </h4>
            <p className="text-xs text-secondary-foreground leading-relaxed italic bg-surface/30 p-3 rounded-lg border border-white/[0.08]">
              Comparative analysis evaluates {compMetrics.distA.name} ({compMetrics.dataA.score} pts) against {compMetrics.distB.name} ({compMetrics.dataB.score} pts). {
                compMetrics.dataA.score > compMetrics.dataB.score 
                  ? `${compMetrics.distA.name} holds a distinct edge in ecological safety indexes, primarily driven by stronger forest canopy conditions (+${compMetrics.dataA.forest - compMetrics.dataB.forest}% NDVI score).` 
                  : `${compMetrics.distB.name} leads in adaptation indicators, backed by healthier local reservoir capacities (+${compMetrics.dataB.water - compMetrics.dataA.water}% storage).`
              } Local planners should prioritize carbon reduction grids in {compMetrics.dataA.carbon > compMetrics.dataB.carbon ? compMetrics.distA.name : compMetrics.distB.name}.
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}
