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
import { MOCK_STATES, MOCK_DISTRICTS, generateRankings, generateHistory } from "@/lib/mock/engine";
import { useClimate } from "@/store/useClimateStore";
import type { ClimateObservation, Ranking, District } from "@/lib/types";

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
  
  // ─── Filter States ──────────────────────────────────────────────────
  const [stateId, setStateId] = useState<number | "">("");
  const [selectedDistId, setSelectedDistId] = useState<number | "">("");
  const [year, setYear] = useState<number>(2025);
  const [climateZone, setClimateZone] = useState<string>("");
  const [riskCategory, setRiskCategory] = useState<string>("");
  
  // ─── Workspace Tabs ────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<
    "overview" | "trends" | "risk" | "sustainability" | "water" | "air" | "agriculture" | "ai" | "compare"
  >("overview");

  // ─── District Comparison States ────────────────────────────────────
  const [compDistA, setCompDistA] = useState<number>(101);
  const [compDistB, setCompDistB] = useState<number>(303);

  // Sync stateId from global selected district when page loads if possible
  useEffect(() => {
    if (climateContext?.selectedDistrictId) {
      const dist = MOCK_DISTRICTS.find((d) => d.id === climateContext.selectedDistrictId);
      if (dist) {
        setStateId(dist.state_id);
        setSelectedDistId(dist.id);
      }
    }
  }, []);

  // Filter districts based on current select states
  const filteredDistricts = useMemo(() => {
    return MOCK_DISTRICTS.filter((d) => {
      if (stateId && d.state_id !== stateId) return false;
      const meta = DISTRICT_METADATA[d.id] || { climateZone: "Tropical", riskCategory: "Safe" };
      if (climateZone && meta.climateZone !== climateZone) return false;
      if (riskCategory && meta.riskCategory !== riskCategory) return false;
      return true;
    });
  }, [stateId, climateZone, riskCategory]);

  // Aggregate monthly observations for the filtered scope
  const monthlyData = useMemo(() => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    const rawData = (() => {
      if (filteredDistricts.length === 0) return [];
      
      if (selectedDistId) {
        const matched = filteredDistricts.find(d => d.id === selectedDistId);
        if (matched) return generateHistory(selectedDistId, year);
      }
      
      // Otherwise aggregate across all matched districts
      const aggregated: ClimateObservation[] = [];
      const histories = filteredDistricts.map(d => generateHistory(d.id, year));
      const count = histories.length;
      
      for (let m = 0; m < 12; m++) {
        let rain = 0, temp = 0, aqi = 0, reservoir = 0, ndvi = 0, soil = 0;
        histories.forEach(h => {
          const obs = h[m];
          rain += obs.rainfall_mm;
          temp += obs.temperature_c;
          aqi += obs.aqi;
          reservoir += obs.reservoir_level_pct ?? 50;
          ndvi += obs.ndvi ?? 0.5;
          soil += obs.soil_moisture_pct;
        });
        aggregated.push({
          observed_on: histories[0][m].observed_on,
          rainfall_mm: Math.round(rain / count),
          rainfall_deficit_pct: 0,
          temperature_c: Math.round((temp / count) * 10) / 10,
          humidity_pct: 0,
          river_level_m: 0,
          soil_moisture_pct: Math.round(soil / count),
          aqi: Math.round(aqi / count),
          ndvi: Math.round((ndvi / count) * 100) / 100,
          reservoir_level_pct: Math.round(reservoir / count)
        });
      }
      return aggregated;
    })();

    return rawData.map(obs => {
      const parts = obs.observed_on.split("-");
      const monthIdx = parts[1] ? parseInt(parts[1], 10) - 1 : 0;
      return {
        ...obs,
        date: monthNames[monthIdx] || parts[1] || ""
      };
    });
  }, [filteredDistricts, selectedDistId, year]);

  // Compute indices dynamically
  const metrics = useMemo(() => {
    if (monthlyData.length === 0) return null;
    
    const avgTemp = monthlyData.reduce((acc, obs) => acc + obs.temperature_c, 0) / monthlyData.length;
    const avgRain = monthlyData.reduce((acc, obs) => acc + obs.rainfall_mm, 0) / monthlyData.length;
    const avgAqi = monthlyData.reduce((acc, obs) => acc + obs.aqi, 0) / monthlyData.length;
    const avgReservoir = monthlyData.reduce((acc, obs) => acc + (obs.reservoir_level_pct ?? 50), 0) / monthlyData.length;
    const avgNdvi = monthlyData.reduce((acc, obs) => acc + (obs.ndvi ?? 0.5), 0) / monthlyData.length;
    const avgSoil = monthlyData.reduce((acc, obs) => acc + obs.soil_moisture_pct, 0) / monthlyData.length;

    let avgRisk = 50, avgFlood = 50, avgDrought = 50, avgHeat = 50, avgWater = 50;
    const currentRankings = generateRankings(year);
    const activeRankings = currentRankings.filter(r => filteredDistricts.some(fd => fd.id === r.district_id));
    if (activeRankings.length > 0) {
      avgRisk = activeRankings.reduce((acc, r) => acc + r.composite_risk, 0) / activeRankings.length;
      avgFlood = activeRankings.reduce((acc, r) => acc + r.flood_risk, 0) / activeRankings.length;
      avgDrought = activeRankings.reduce((acc, r) => acc + r.drought_risk, 0) / activeRankings.length;
      avgHeat = activeRankings.reduce((acc, r) => acc + r.heatwave_risk, 0) / activeRankings.length;
      avgWater = activeRankings.reduce((acc, r) => acc + r.water_stress_risk, 0) / activeRankings.length;
    }

    const ndviScore = Math.round(avgNdvi * 100);
    const aqiScore = Math.max(0, Math.min(100, Math.round(100 - (avgAqi - 50) * 0.4)));
    const reservoirScore = Math.round(avgReservoir);
    const safetyScore = Math.round(100 - avgRisk);
    const soilScore = Math.max(10, Math.min(100, Math.round(100 - avgDrought * 0.8)));

    const compositeIndex = Math.round(ndviScore * 0.25 + aqiScore * 0.2 + reservoirScore * 0.2 + safetyScore * 0.2 + soilScore * 0.15);
    const envHealthScore = Math.round(ndviScore * 0.4 + aqiScore * 0.3 + soilScore * 0.3);
    const waterSustainability = reservoirScore;
    const forestHealth = ndviScore;
    const biodiversity = Math.min(100, Math.max(15, Math.round(ndviScore * 1.1 - (100 - safetyScore) * 0.1)));
    const carbonImpact = Math.max(10, Math.min(95, Math.round(100 - (ndviScore * 0.6 + (100 - aqiScore) * 0.4))));
    const renewableEnergy = Math.min(100, Math.max(10, Math.round(safetyScore * 0.7 + reservoirScore * 0.3)));
    const climateResilience = safetyScore;
    const greenInfrastructure = Math.round((ndviScore + reservoirScore) / 2);

    return {
      avgTemp: Math.round(avgTemp * 10) / 10,
      avgRain: Math.round(avgRain),
      avgAqi: Math.round(avgAqi),
      avgReservoir: Math.round(avgReservoir),
      avgNdvi: Math.round(avgNdvi * 100) / 100,
      avgSoil: Math.round(avgSoil),
      compositeIndex,
      envHealthScore,
      waterSustainability,
      forestHealth,
      biodiversity,
      airQualityScore: aqiScore,
      carbonImpact,
      renewableEnergy,
      climateResilience,
      waterStress: Math.round(avgWater),
      greenInfrastructure,
      avgRisk: Math.round(avgRisk),
      avgFlood: Math.round(avgFlood),
      avgDrought: Math.round(avgDrought),
      avgHeat: Math.round(avgHeat),
      avgWater: Math.round(avgWater)
    };
  }, [monthlyData, filteredDistricts, year]);

  // Generate dynamic AI Insights & Explanations
  const aiInsights = useMemo(() => {
    if (!metrics) return null;
    const name = selectedDistId 
      ? MOCK_DISTRICTS.find(d => d.id === selectedDistId)?.name 
      : stateId 
      ? MOCK_STATES.find(s => s.id === stateId)?.name 
      : "National aggregate";

    let summary = `Sustainability indicators for ${name} in ${year} AD are evaluated at a composite index score of ${metrics.compositeIndex}/100. `;
    let drivers = ["Thermal variations pushing grid adaptations", "Hydrological storage conditions", "Vegetative carbon capture variance"];
    let positives = ["Baseline air quality index within targets", "Safe boundaries for reservoir headroom"];
    let negatives = ["Rising convective heat waves during pre-monsoon", "Depleting ground moisture indicators"];
    let recommendations = [
      "Launch extensive Miyawaki mini-forest grids near high-density blocks to optimize carbon capture.",
      "Deploy localized block-level rainwater harvesting basins to arrest hydrological depletion.",
      "Incentivize grid-connected solar power transitions to reduce industrial carbon loads.",
      "Restrict groundwater drafts in semi-arid zones to safeguard aquifer pressures."
    ];

    if (metrics.compositeIndex < 55) {
      summary += "The ecosystem shows high vulnerability due to a combination of high climatic hazard risk and low ecological adaptation buffer. Urgent structural adjustments are advised.";
      drivers = ["Prolonged dry soil index profiles", "High urban thermal heatwaves", "Low surface water reserve levels"];
      negatives = ["Critical groundwater drawdowns", "Severe vegetative thermal stress (depleted NDVI)"];
      recommendations.unshift("Establish absolute municipal water-rationing protocols and clean-air corridors.");
    } else if (metrics.compositeIndex >= 72) {
      summary += "The ecosystem shows strong climate resilience and excellent environmental resource management, maintaining rich ecological buffers against seasonal climatic hazards.";
      positives = ["High canopy carbon density (elevated NDVI)", "Stable river run-off profiles", "Optimum aquifer replenishment"];
      recommendations.push("Establish local green bonds to finance community-level biodiversity sanctuaries.");
    } else {
      summary += "The ecosystem is currently stable, showing moderate resilience against seasonal climatic hazards. Focus should remain on maintaining vegetation shields.";
    }

    return { summary, drivers, positives, negatives, recommendations };
  }, [metrics, selectedDistId, stateId, year]);

  // Compute District Rankings based on current year and filters
  const rankingsList = useMemo(() => {
    const list = MOCK_DISTRICTS.map(d => {
      const histories = generateHistory(d.id, year);
      const avgNdvi = histories.reduce((a, obs) => a + (obs.ndvi ?? 0.5), 0) / histories.length;
      const avgAqi = histories.reduce((a, obs) => a + obs.aqi, 0) / histories.length;
      const avgReservoir = histories.reduce((a, obs) => a + (obs.reservoir_level_pct ?? 50), 0) / histories.length;
      const avgSoil = histories.reduce((a, obs) => a + obs.soil_moisture_pct, 0) / histories.length;

      const currentRankings = generateRankings(year);
      const r = currentRankings.find(x => x.district_id === d.id) || { composite_risk: 50, drought_risk: 50 };
      
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
    });
    return list;
  }, [year]);

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
    const fetchMetrics = (dId: number) => {
      const histories = generateHistory(dId, year);
      const avgNdvi = histories.reduce((a, obs) => a + (obs.ndvi ?? 0.5), 0) / histories.length;
      const avgAqi = histories.reduce((a, obs) => a + obs.aqi, 0) / histories.length;
      const avgReservoir = histories.reduce((a, obs) => a + (obs.reservoir_level_pct ?? 50), 0) / histories.length;
      const avgSoil = histories.reduce((a, obs) => a + obs.soil_moisture_pct, 0) / histories.length;
      const r = generateRankings(year).find(x => x.district_id === dId) || { composite_risk: 50, drought_risk: 50 };

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

    const distA = MOCK_DISTRICTS.find(d => d.id === compDistA) || MOCK_DISTRICTS[0];
    const distB = MOCK_DISTRICTS.find(d => d.id === compDistB) || MOCK_DISTRICTS[1];

    const dataA = fetchMetrics(distA.id);
    const dataB = fetchMetrics(distB.id);

    return { distA, distB, dataA, dataB };
  }, [compDistA, compDistB, year]);

  if (!metrics) return null;

  return (
    <div className="grid gap-5">
      {/* ─── Page Header & Title ───────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <Badge className="border-cyan-500/20 bg-cyan-400/10 text-cyan-300">Climate Intelligence Workspace</Badge>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal text-white">National Climate & Sustainability Analytics</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-300">
            Unified Climate Trends, Risk Models, Sustainability Indexes, and Cognitive Recommendations workspace.
          </p>
        </div>

        {/* ─── Global Filters Bar ────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-2.5 bg-slate-900/60 border border-cyan-500/10 p-2 rounded-xl backdrop-blur-md">
          <div className="flex flex-col gap-1">
            <span className="text-[7.5px] font-bold text-slate-500 uppercase tracking-wider">State</span>
            <select
              value={stateId}
              onChange={(e) => {
                setStateId(e.target.value === "" ? "" : Number(e.target.value));
                setSelectedDistId("");
              }}
              className="bg-slate-950 border border-cyan-500/15 rounded-lg py-1 px-2.5 text-white focus:outline-none text-xs w-36 cursor-pointer"
            >
              <option value="">All States</option>
              {MOCK_STATES.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[7.5px] font-bold text-slate-500 uppercase tracking-wider">District</span>
            <select
              value={selectedDistId}
              onChange={(e) => setSelectedDistId(e.target.value === "" ? "" : Number(e.target.value))}
              className="bg-slate-950 border border-cyan-500/15 rounded-lg py-1 px-2.5 text-white focus:outline-none text-xs w-36 cursor-pointer"
            >
              <option value="">All Districts</option>
              {filteredDistricts.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[7.5px] font-bold text-slate-500 uppercase tracking-wider">Timeline</span>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="bg-slate-950 border border-cyan-500/15 rounded-lg py-1 px-2.5 text-white focus:outline-none text-xs cursor-pointer"
            >
              {[2020, 2025, 2030, 2040, 2050].map((y) => (
                <option key={y} value={y}>{y} AD</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[7.5px] font-bold text-slate-500 uppercase tracking-wider">Zone</span>
            <select
              value={climateZone}
              onChange={(e) => {
                setClimateZone(e.target.value);
                setSelectedDistId("");
              }}
              className="bg-slate-950 border border-cyan-500/15 rounded-lg py-1 px-2.5 text-white focus:outline-none text-xs cursor-pointer"
            >
              <option value="">All Zones</option>
              {["Tropical", "Semi-Arid", "Arid", "Humid"].map((z) => (
                <option key={z} value={z}>{z}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[7.5px] font-bold text-slate-500 uppercase tracking-wider">Climatic Risk</span>
            <select
              value={riskCategory}
              onChange={(e) => {
                setRiskCategory(e.target.value);
                setSelectedDistId("");
              }}
              className="bg-slate-950 border border-cyan-500/15 rounded-lg py-1 px-2.5 text-white focus:outline-none text-xs cursor-pointer"
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
      <div className="flex items-center justify-between border-b border-cyan-500/10 pb-2.5">
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
                    ? "bg-cyan-500 text-slate-950 shadow-[0_0_12px_#06b6d450]" 
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
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
            className="border-cyan-500/25 bg-slate-950 hover:bg-slate-900 hover:text-cyan-300 text-slate-300 text-xs gap-1.5 h-8"
          >
            <Download className="h-3.5 w-3.5" />
            <span>CSV</span>
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleExportPDF}
            className="border-cyan-500/25 bg-slate-950 hover:bg-slate-900 hover:text-cyan-300 text-slate-300 text-xs gap-1.5 h-8"
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
            <Card className="glass-card bg-slate-950/50 p-4 flex flex-col justify-between h-[104px]">
              <div>
                <span className="text-[8.5px] font-bold text-slate-500 uppercase tracking-widest block">Temperature</span>
                <p className="mt-2 text-2xl font-bold text-rose-400 font-mono">{metrics.avgTemp}°C</p>
              </div>
              <span className="text-[9px] text-slate-400">Monthly Avg Range</span>
            </Card>

            <Card className="glass-card bg-slate-950/50 p-4 flex flex-col justify-between h-[104px]">
              <div>
                <span className="text-[8.5px] font-bold text-slate-500 uppercase tracking-widest block">Precipitation</span>
                <p className="mt-2 text-2xl font-bold text-cyan-300 font-mono">{metrics.avgRain} mm</p>
              </div>
              <span className="text-[9px] text-slate-400">Monsoon Aggregate</span>
            </Card>

            <Card className="glass-card bg-slate-950/50 p-4 flex flex-col justify-between h-[104px]">
              <div>
                <span className="text-[8.5px] font-bold text-slate-500 uppercase tracking-widest block">Reservoir Status</span>
                <p className="mt-2 text-2xl font-bold text-emerald-400 font-mono">{metrics.avgReservoir}%</p>
              </div>
              <span className="text-[9px] text-slate-400">Total Capacity Level</span>
            </Card>

            <Card className="glass-card bg-slate-950/50 p-4 flex flex-col justify-between h-[104px]">
              <div>
                <span className="text-[8.5px] font-bold text-slate-500 uppercase tracking-widest block">Air Quality</span>
                <p className="mt-2 text-2xl font-bold text-amber-400 font-mono">{metrics.avgAqi} AQI</p>
              </div>
              <span className="text-[9px] text-slate-400">CPCB Gridded Index</span>
            </Card>

            <Card className="glass-card border-emerald-500/20 bg-emerald-950/10 p-4 flex flex-col justify-between h-[104px] cursor-pointer hover:border-emerald-500/40 transition" onClick={() => setActiveTab("sustainability")}>
              <div>
                <div className="flex justify-between items-center">
                  <span className="text-[8.5px] font-bold text-emerald-400 uppercase tracking-widest block">Sustainability Index</span>
                  <Leaf className="h-3.5 w-3.5 text-emerald-400" />
                </div>
                <p className="mt-2 text-2xl font-bold text-white font-mono">{metrics.compositeIndex}/100</p>
              </div>
              <span className="text-[9px] text-emerald-300 font-medium flex items-center gap-0.5">
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
                <Button size="sm" variant="ghost" className="text-cyan-300 hover:text-white" onClick={() => setActiveTab("trends")}>
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
                <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4" />
                  Cognitive Analysis Summary
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed italic">
                  "{aiInsights?.summary}"
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-cyan-500/10 pt-3 text-[10.5px]">
                <div>
                  <span className="font-bold text-emerald-400 block mb-1">✓ Positives</span>
                  <div className="space-y-0.5">
                    {aiInsights?.positives.slice(0, 2).map((p, i) => (
                      <p key={i} className="text-slate-300">• {p}</p>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="font-bold text-amber-500 block mb-1">⚠ Critical Factors</span>
                  <div className="space-y-0.5">
                    {aiInsights?.negatives.slice(0, 2).map((n, i) => (
                      <p key={i} className="text-slate-300">• {n}</p>
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
              { label: "Flood Inundation Risk", val: metrics.avgFlood, color: "text-cyan-400" },
              { label: "Extreme Heatwaves Risk", val: metrics.avgHeat, color: "text-red-400" },
              { label: "Agricultural Drought Risk", val: metrics.avgDrought, color: "text-amber-400" },
              { label: "Hydrologic Water Stress", val: metrics.avgWater, color: "text-sky-400" }
            ].map((r, i) => (
              <Card key={i} className="glass-card bg-slate-950/50 p-4">
                <span className="text-[8.5px] font-bold text-slate-500 uppercase block">{r.label}</span>
                <p className={`mt-2 text-2xl font-bold font-mono ${r.color}`}>{r.val}%</p>
                <div className="h-1 bg-slate-800 rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-current" style={{ width: `${r.val}%`, color: r.color.replace("text-", "#") }} />
                </div>
              </Card>
            ))}
          </div>

          <Card className="glass-card p-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-300 mb-4">ML Predictor Facades</h3>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                ["Flood Forecast Model", "Predicts localized river flood thresholds and flash discharge anomalies.", "RandomForestFlood-v1.2", "cyan"],
                ["Drought Severity Model", "Evaluates soil moisture dry index and crop NDVI conditions.", "XGBoostDrought-v2.0", "amber"],
                ["Heatwave Warning Model", "Fuzzy-logic index based on ambient temperature and relative humidity grids.", "SklearnHeatAlert-v1.1", "red"]
              ].map(([title, desc, model, col]) => (
                <div key={title} className="rounded-xl border border-cyan-500/10 bg-white/[0.01] p-4 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-white text-xs">{title}</h4>
                    <p className="text-[11px] text-slate-400 mt-1">{desc}</p>
                  </div>
                  <Badge className="mt-4 self-start font-mono text-[9px] uppercase border-cyan-500/20 bg-cyan-400/5 text-cyan-300">
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
        <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
          <Card className="glass-card p-6 flex flex-col justify-between items-center text-center">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-base">Composite Index Score</CardTitle>
              <CardDescription>Ecological Sustainability & Resource Balance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 w-full flex flex-col items-center">
              {/* Animated Ring Gauge */}
              <div className="relative w-40 h-40 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="50" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                  <circle
                    cx="60" cy="60" r="50"
                    fill="transparent"
                    stroke={metrics.compositeIndex >= 70 ? "#10b981" : metrics.compositeIndex >= 50 ? "#06b6d4" : "#f59e0b"}
                    strokeWidth="8"
                    strokeDasharray={2 * Math.PI * 50}
                    strokeDashoffset={2 * Math.PI * 50 * (1 - metrics.compositeIndex / 100)}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                    style={{ filter: `drop-shadow(0 0 6px ${metrics.compositeIndex >= 70 ? "#10b981" : "#06b6d4"}70)` }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-black text-white">{metrics.compositeIndex}</span>
                  <span className="text-[8px] uppercase tracking-widest font-extrabold text-slate-400 mt-1">Sustainability Score</span>
                </div>
              </div>

              {/* Sub-Metric Cards */}
              <div className="grid grid-cols-2 gap-2 w-full text-left text-[10px] text-slate-300">
                <div className="p-2.5 rounded-lg bg-slate-900/40 border border-white/5 cursor-pointer hover:border-emerald-500/20" onClick={() => triggerMapUpdate("environmental_health")}>
                  <span className="text-[7.5px] text-slate-500 font-bold block uppercase">Env Health</span>
                  <p className="mt-0.5 font-bold text-white font-mono">{metrics.envHealthScore}/100</p>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900/40 border border-white/5 cursor-pointer hover:border-emerald-500/20" onClick={() => triggerMapUpdate("water_resources")}>
                  <span className="text-[7.5px] text-slate-500 font-bold block uppercase">Water Status</span>
                  <p className="mt-0.5 font-bold text-white font-mono">{metrics.waterSustainability}%</p>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900/40 border border-white/5 cursor-pointer hover:border-emerald-500/20" onClick={() => triggerMapUpdate("green_cover")}>
                  <span className="text-[7.5px] text-slate-500 font-bold block uppercase">Forest Cover</span>
                  <p className="mt-0.5 font-bold text-white font-mono">{metrics.forestHealth}%</p>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900/40 border border-white/5 cursor-pointer hover:border-emerald-500/20" onClick={() => triggerMapUpdate("climate_resilience")}>
                  <span className="text-[7.5px] text-slate-500 font-bold block uppercase">Resilience Score</span>
                  <p className="mt-0.5 font-bold text-white font-mono">{metrics.climateResilience}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card p-5 flex flex-col justify-between">
            <CardHeader className="p-0 pb-3">
              <CardTitle className="text-white text-base">5-Pillar Sustainability Radar</CardTitle>
              <CardDescription>Balanced evaluation across standard index components.</CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-6 items-center p-0">
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

              {/* Policy Tips */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  Policy Directives
                </h4>
                <div className="space-y-2">
                  {aiInsights?.recommendations.slice(0, 3).map((tip, idx) => (
                    <div key={idx} className="flex gap-2 p-2.5 rounded-lg border border-emerald-500/10 bg-emerald-400/5 text-[11px] text-slate-300 leading-normal">
                      <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400 mt-0.5" />
                      <span>{tip}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
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
              <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-300 mb-2">Water Stress Index</h3>
              <p className="text-[11px] text-slate-400">Evaluates monthly groundwater draft and surface reservoir levels.</p>
              <div className="mt-4 space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">Water Stress Risk Level</span>
                    <span className="text-cyan-300 font-bold font-mono">{metrics.waterStress}%</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-400" style={{ width: `${metrics.waterStress}%` }} />
                  </div>
                </div>
                <div className="text-[11px] text-slate-300 leading-normal space-y-2 bg-white/[0.01] p-3 rounded-lg border border-cyan-500/5">
                  <p className="font-semibold text-cyan-300">Recommended Basin Interventions:</p>
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
              <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-300 mb-2">Air Protection Score</h3>
              <p className="text-[11px] text-slate-400">Computed safety score where higher is cleaner.</p>
              <div className="mt-4 space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">Clean Air Index</span>
                    <span className="text-emerald-400 font-bold font-mono">{metrics.airQualityScore}/100</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-400" style={{ width: `${metrics.airQualityScore}%` }} />
                  </div>
                </div>
                <div className="text-[11px] text-slate-300 leading-normal space-y-2 bg-white/[0.01] p-3 rounded-lg border border-cyan-500/5">
                  <p className="font-semibold text-emerald-400">Direct Clean Air Policies:</p>
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
              <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-300 mb-2">Soil Health & Vegetation</h3>
              <p className="text-[11px] text-slate-400">Calculated composite soil moisture indexes.</p>
              <div className="mt-4 space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">Soil Moisture Score</span>
                    <span className="text-amber-400 font-bold font-mono">{metrics.avgSoil}%</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400" style={{ width: `${metrics.avgSoil}%` }} />
                  </div>
                </div>
                <div className="text-[11px] text-slate-300 leading-normal space-y-2 bg-white/[0.01] p-3 rounded-lg border border-cyan-500/5">
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
              <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                <Sparkles className="h-4.5 w-4.5" />
                Unified Ecological AI Explanation
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed italic bg-slate-950/40 p-3.5 rounded-xl border border-cyan-500/5">
                "{aiInsights?.summary}"
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-cyan-500/10 pt-4 text-xs">
              <div className="space-y-2">
                <span className="font-bold text-emerald-400 block uppercase tracking-wider text-[10px]">Positive Indicators</span>
                <div className="space-y-1.5">
                  {aiInsights?.positives.map((p, i) => (
                    <div key={i} className="flex gap-1.5 text-slate-300 leading-normal">
                      <span className="text-emerald-400 font-bold">•</span>
                      <span>{p}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <span className="font-bold text-amber-500 block uppercase tracking-wider text-[10px]">Negative Indicators</span>
                <div className="space-y-1.5">
                  {aiInsights?.negatives.map((n, i) => (
                    <div key={i} className="flex gap-1.5 text-slate-300 leading-normal">
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
            <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-300 mb-4 flex items-center gap-1.5">
              <History className="h-4.5 w-4.5" />
              Dynamic Sustainability Rankings
            </h3>
            <div className="space-y-2.5">
              {rankingsList.slice(0, 5).map((r, i) => (
                <div key={r.id} className="flex justify-between items-center bg-white/[0.02] border border-cyan-500/5 rounded-lg p-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold font-mono text-cyan-400 w-4 text-right">#{i + 1}</span>
                    <div className="leading-tight">
                      <p className="font-bold text-white">{r.name}</p>
                      <p className="text-[10px] text-slate-400">{r.state}</p>
                    </div>
                  </div>
                  <span className="font-bold font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded text-[10.5px]">
                    {r.score} pts
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ─── TAB CONTENT: DISTRICT COMPARE ──────────────────────────────── */}
      {activeTab === "compare" && (
        <div className="space-y-5">
          {/* Comparison Selector Dropdowns */}
          <div className="grid gap-4 md:grid-cols-2 bg-slate-900/40 border border-cyan-500/10 p-4 rounded-xl backdrop-blur-md">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select Location A</label>
              <select
                value={compDistA}
                onChange={(e) => setCompDistA(Number(e.target.value))}
                className="bg-slate-950 border border-cyan-500/15 rounded-lg py-2 px-3 text-white focus:outline-none text-xs w-full cursor-pointer"
              >
                {MOCK_DISTRICTS.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}, {d.state_name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select Location B</label>
              <select
                value={compDistB}
                onChange={(e) => setCompDistB(Number(e.target.value))}
                className="bg-slate-950 border border-cyan-500/15 rounded-lg py-2 px-3 text-white focus:outline-none text-xs w-full cursor-pointer"
              >
                {MOCK_DISTRICTS.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}, {d.state_name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Comparison Cards side-by-side */}
          <div className="grid gap-5 md:grid-cols-2">
            {/* Location A */}
            <Card className="glass-card p-5 border-cyan-500/15 bg-slate-950/20">
              <Badge className="border-cyan-500/20 bg-cyan-400/5 text-cyan-300">Location A</Badge>
              <h3 className="text-lg font-bold text-white mt-1.5">{compMetrics.distA.name}</h3>
              <p className="text-xs text-slate-400">{compMetrics.distA.state_name}</p>
              
              <div className="mt-4 space-y-3">
                {[
                  { label: "Sustainability Score", val: compMetrics.dataA.score, max: 100, color: "bg-emerald-400" },
                  { label: "Water Availability", val: compMetrics.dataA.water, max: 100, color: "bg-cyan-400" },
                  { label: "Air Quality (Score)", val: 100 - Math.min(100, Math.max(0, Math.round((compMetrics.dataA.aqi - 50) * 0.4))), max: 100, color: "bg-amber-400" },
                  { label: "Forest Cover", val: compMetrics.dataA.forest, max: 100, color: "bg-green-400" },
                  { label: "Carbon Impact", val: compMetrics.dataA.carbon, max: 100, color: "bg-rose-400" },
                  { label: "Climate Resilience", val: compMetrics.dataA.resilience, max: 100, color: "bg-indigo-400" }
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400">{item.label}</span>
                      <span className="text-white font-mono font-semibold">{item.val}</span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full ${item.color}`} style={{ width: `${item.val}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Location B */}
            <Card className="glass-card p-5 border-cyan-500/15 bg-slate-950/20">
              <Badge className="border-cyan-500/20 bg-cyan-400/5 text-cyan-300">Location B</Badge>
              <h3 className="text-lg font-bold text-white mt-1.5">{compMetrics.distB.name}</h3>
              <p className="text-xs text-slate-400">{compMetrics.distB.state_name}</p>
              
              <div className="mt-4 space-y-3">
                {[
                  { label: "Sustainability Score", val: compMetrics.dataB.score, max: 100, color: "bg-emerald-400" },
                  { label: "Water Availability", val: compMetrics.dataB.water, max: 100, color: "bg-cyan-400" },
                  { label: "Air Quality (Score)", val: 100 - Math.min(100, Math.max(0, Math.round((compMetrics.dataB.aqi - 50) * 0.4))), max: 100, color: "bg-amber-400" },
                  { label: "Forest Cover", val: compMetrics.dataB.forest, max: 100, color: "bg-green-400" },
                  { label: "Carbon Impact", val: compMetrics.dataB.carbon, max: 100, color: "bg-rose-400" },
                  { label: "Climate Resilience", val: compMetrics.dataB.resilience, max: 100, color: "bg-indigo-400" }
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400">{item.label}</span>
                      <span className="text-white font-mono font-semibold">{item.val}</span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full ${item.color}`} style={{ width: `${item.val}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* AI Comparison Summary */}
          <Card className="glass-card p-4 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4" />
              AI Cognitive Side-by-Side Comparison
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed italic bg-slate-900/30 p-3 rounded-lg border border-cyan-500/5">
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
