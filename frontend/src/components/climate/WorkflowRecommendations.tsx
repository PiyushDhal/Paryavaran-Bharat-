"use client";

import React, { useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowRight, 
  Map, 
  BarChart3, 
  ShieldAlert, 
  Sparkles, 
  SlidersHorizontal, 
  CalendarRange, 
  FileText, 
  Bot,
  HelpCircle,
  TrendingUp,
  Droplets,
  Flame,
  AlertTriangle,
  Leaf
} from "lucide-react";
import { useClimate } from "@/store/useClimateStore";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface WorkflowRecommendationsProps {
  currentPage: "dashboard" | "map" | "analytics" | "risk-center" | "simulator" | "timeline" | "reports" | "copilot";
  currentMetric?: string; // e.g. "temperature", "rainfall", "aqi", "ndvi", "reservoir"
}

export function WorkflowRecommendations({ currentPage, currentMetric }: WorkflowRecommendationsProps) {
  const router = useRouter();
  const { 
    selectedDistrictId, 
    selectedStateId,
    selectedStateName,
    activeYear,
    activeLayer,
    activeRisk,
    activeSimulation,
    currentGeneratedReport,
    rankings
  } = useClimate();

  // Find district name
  const currentDistrictName = useMemo(() => {
    if (!selectedDistrictId || !rankings.length) return null;
    const match = rankings.find(r => r.district_id === selectedDistrictId);
    return match ? match.district_name : null;
  }, [selectedDistrictId, rankings]);

  const currentStateName = selectedStateName || "Selected State";

  // 1. Dynamic Smart Recommendations based on active risks or metrics
  const smartSuggestion = useMemo(() => {
    // If active layer or metric relates to rainfall/flood
    const isWaterDeficit = activeLayer === "water_resources" || activeLayer === "reservoir_level" || currentMetric === "reservoir" || activeRisk === "water_stress";
    const isFlood = activeLayer === "flood_risk" || activeLayer === "rainfall" || currentMetric === "rainfall" || activeRisk === "flood";
    const isHeat = activeLayer === "heatwave_risk" || activeLayer === "temperature" || currentMetric === "temperature" || activeRisk === "heatwave";
    const isNdvi = activeLayer === "green_cover" || activeLayer === "ndvi" || currentMetric === "ndvi" || activeRisk === "drought";

    if (isFlood) {
      return {
        title: "Flood Inundation Warning & Basin Run-Off",
        message: `High precipitation anomalies detected. It is highly recommended to run a Flood Inflow Scenario in the Simulator, analyze CWC river runoff channels in Climate Analytics, and coordinate with local block-level emergency water diversion guides.`,
        icon: Droplets,
        color: "text-blue-400 border-blue-500/20 bg-blue-950/10",
        simPreset: "extreme_flood"
      };
    }
    if (isWaterDeficit) {
      return {
        title: "Hydrological Water Stress Alert",
        message: `Active reservoir level drawdown detected. Planners should review CWC storage capacities, prioritize micro-irrigation layout structures, and analyze ground soil moisture depletion rates in the Risk Center.`,
        icon: AlertTriangle,
        color: "text-sky-400 border-sky-500/20 bg-sky-950/10",
        simPreset: "severe_drought"
      };
    }
    if (isHeat) {
      return {
        title: "Extreme Ambient Thermal Heat Dome Anomaly",
        message: `Elevated Land Surface Temperature (LST) is triggering crop canopy stress alerts. Review municipal power grid cooling load capacity, establish cooling shelters, and assess agricultural water stress vulnerability.`,
        icon: Flame,
        color: "text-rose-400 border-rose-500/20 bg-rose-950/10",
        simPreset: "heatwave"
      };
    }
    if (isNdvi) {
      return {
        title: "Vegetative Decline & Sowing Stress",
        message: `Severe crop stress detected via ISRO Bhuvan NDVI indexes. Consider distributing drought-resistant seed allocations, evaluating soil moisture dry indexes in the Risk Center, and reviewing groundwater recharging basins.`,
        icon: Leaf,
        color: "text-emerald-400 border-emerald-500/20 bg-emerald-950/10",
        simPreset: "green_recovery"
      };
    }

    // Default recommendation
    return {
      title: "Climatic Anomalies Under Watch",
      message: `Ecosystem indicators are stable. Local planning offices should continue tracking pre-monsoon convective rainfall deficiencies, aquifer levels, and air stagnation grids.`,
      icon: ShieldAlert,
      color: "text-cyan-400 border-cyan-500/20 bg-cyan-950/10",
      simPreset: "2050_climate"
    };
  }, [activeLayer, currentMetric, activeRisk]);

  // 2. Navigation Actions list based on Current Page
  const actions = useMemo(() => {
    const list = [];
    const locationName = currentDistrictName || selectedStateName || "National";
    const contextQuery = `?district_id=${selectedDistrictId || ''}&state_id=${selectedStateId || ''}&year=${activeYear}`;

    switch (currentPage) {
      case "dashboard":
        list.push({
          label: "Explore Digital Twin",
          icon: Map,
          onClick: () => router.push(`/map${contextQuery}`),
          desc: "Analyze spatial risk layers for " + locationName
        });
        list.push({
          label: "View Climate Analytics",
          icon: BarChart3,
          onClick: () => router.push(`/analytics${contextQuery}`),
          desc: "Compare gridded timelines & sustainability pillars"
        });
        list.push({
          label: "Open Risk Center",
          icon: ShieldAlert,
          onClick: () => router.push(`/risk-center${contextQuery}`),
          desc: "Check multi-hazard probability attributions"
        });
        list.push({
          label: "Scenario Simulator",
          icon: SlidersHorizontal,
          onClick: () => router.push(`/simulator${contextQuery}`),
          desc: "Run atmospheric or hydrological stress models"
        });
        list.push({
          label: "Ask AI Copilot",
          icon: Bot,
          onClick: () => {
            const query = `Analyze the current climate risk profiles for ${locationName} in ${activeYear}`;
            router.push(`/copilot?query=${encodeURIComponent(query)}`);
          },
          desc: "Consult the AI Copilot on regional indicators"
        });
        break;

      case "map":
        list.push({
          label: "View Climate Analytics",
          icon: BarChart3,
          onClick: () => router.push(`/analytics${contextQuery}`),
          desc: "Examine sustainability scorecards for " + locationName
        });
        list.push({
          label: "Open Risk Center",
          icon: ShieldAlert,
          onClick: () => router.push(`/risk-center${contextQuery}`),
          desc: "Inspect probability attributions"
        });
        list.push({
          label: "Generate AI Report",
          icon: FileText,
          onClick: () => router.push(`/reports${contextQuery}`),
          desc: "Compile official PDF dossier for " + locationName
        });
        list.push({
          label: "Run Scenario Simulation",
          icon: SlidersHorizontal,
          onClick: () => router.push(`/simulator${contextQuery}`),
          desc: "Test climate resilience under future anomalies"
        });
        list.push({
          label: "Ask AI Copilot",
          icon: Bot,
          onClick: () => {
            const query = `Provide an emergency assessment for ${locationName} given the active map layers.`;
            router.push(`/copilot?query=${encodeURIComponent(query)}`);
          },
          desc: "Get cognitive recommendations"
        });
        break;

      case "analytics":
        list.push({
          label: "Explain with AI",
          icon: Bot,
          onClick: () => {
            const metricLabel = currentMetric ? `${currentMetric} metrics` : "sustainability and weather trends";
            const query = `Explain the current monthly ${metricLabel} trends for ${locationName} in the year ${activeYear}.`;
            router.push(`/copilot?query=${encodeURIComponent(query)}`);
          },
          desc: "Analyze gridded chart values using Copilot"
        });
        list.push({
          label: "Generate Executive Report",
          icon: FileText,
          onClick: () => router.push(`/reports${contextQuery}`),
          desc: "Download official administrative PDF report"
        });
        list.push({
          label: "Open Risk Center",
          icon: ShieldAlert,
          onClick: () => router.push(`/risk-center${contextQuery}`),
          desc: "Link to multi-disaster prediction indexes"
        });
        list.push({
          label: "Run Scenario Simulation",
          icon: SlidersHorizontal,
          onClick: () => router.push(`/simulator${contextQuery}`),
          desc: "Model how budget adjustments affect paths"
        });
        list.push({
          label: "View Climate Timeline",
          icon: CalendarRange,
          onClick: () => router.push(`/timeline${contextQuery}`),
          desc: "Trace decadal climate deviations"
        });
        break;

      case "risk-center":
        list.push({
          label: "View Affected Districts",
          icon: Map,
          onClick: () => router.push(`/map${contextQuery}&layer=composite`),
          desc: "Show spatial risk hotspots"
        });
        list.push({
          label: "Explain Risk with AI",
          icon: Bot,
          onClick: () => {
            const query = `Detail the physical risk attributions and drivers for ${locationName} in ${activeYear}.`;
            router.push(`/copilot?query=${encodeURIComponent(query)}`);
          },
          desc: "Get detailed XAI explanation"
        });
        list.push({
          label: "Generate Mitigation Report",
          icon: FileText,
          onClick: () => router.push(`/reports${contextQuery}`),
          desc: "Produce emergency guidelines PDF"
        });
        list.push({
          label: "View Historical Timeline",
          icon: CalendarRange,
          onClick: () => router.push(`/timeline${contextQuery}`),
          desc: "Compare against decadal anomalies"
        });
        break;

      case "simulator":
        list.push({
          label: "Compare with Current Climate",
          icon: BarChart3,
          onClick: () => router.push(`/analytics${contextQuery}`),
          desc: "Evaluate simulated versus current indexes"
        });
        list.push({
          label: "Generate Simulation Report",
          icon: FileText,
          onClick: () => router.push(`/reports${contextQuery}`),
          desc: "Compile future projections PDF dossier"
        });
        list.push({
          label: "Ask AI to Explain Results",
          icon: Bot,
          onClick: () => {
            const simOutput = activeSimulation ? `with composite risk projection of ${activeSimulation.composite_risk}%` : "";
            const query = `Explain the results of my future climate scenario simulation for ${locationName} ${simOutput}.`;
            router.push(`/copilot?query=${encodeURIComponent(query)}`);
          },
          desc: "Consult Copilot on simulated paths"
        });
        list.push({
          label: "Open Risk Center",
          icon: ShieldAlert,
          onClick: () => router.push(`/risk-center${contextQuery}`),
          desc: "Map simulated values back to risk profiles"
        });
        break;

      case "timeline":
        list.push({
          label: "Compare with Current Year",
          icon: BarChart3,
          onClick: () => router.push(`/analytics${contextQuery}`),
          desc: "Check differences in seasonal cycles"
        });
        list.push({
          label: "Explain Timeline with AI",
          icon: Bot,
          onClick: () => {
            const query = `Provide a climate timeline analysis for ${locationName} showing decadal temperature and water deviations.`;
            router.push(`/copilot?query=${encodeURIComponent(query)}`);
          },
          desc: "Analyze decadal trends using AI"
        });
        list.push({
          label: "Generate Timeline Report",
          icon: FileText,
          onClick: () => router.push(`/reports${contextQuery}`),
          desc: "Export decadal tracking report"
        });
        list.push({
          label: "Open Digital Twin",
          icon: Map,
          onClick: () => router.push(`/map${contextQuery}`),
          desc: "View spatial overlays"
        });
        break;

      case "reports":
        list.push({
          label: "Discuss Report with Copilot",
          icon: Bot,
          onClick: () => {
            const rTitle = currentGeneratedReport?.title || "Latest Regional Assessment";
            const query = `Let's discuss the generated Climate Vulnerability Report for ${locationName}. Suggest local action plans.`;
            router.push(`/copilot?query=${encodeURIComponent(query)}`);
          },
          desc: "Pass report details automatically to the AI conversation"
        });
        list.push({
          label: "View Location on Digital Twin",
          icon: Map,
          onClick: () => router.push(`/map${contextQuery}`),
          desc: "View gridded boundaries for " + locationName
        });
        list.push({
          label: "Open Climate Analytics",
          icon: BarChart3,
          onClick: () => router.push(`/analytics${contextQuery}`),
          desc: "Examine sustainability scorecards"
        });
        list.push({
          label: "Open Risk Center",
          icon: ShieldAlert,
          onClick: () => router.push(`/risk-center${contextQuery}`),
          desc: "Verify risk drivers"
        });
        list.push({
          label: "Run Future Climate Scenario",
          icon: SlidersHorizontal,
          onClick: () => router.push(`/simulator${contextQuery}`),
          desc: "Model future projections for " + locationName
        });
        break;

      case "copilot":
        list.push({
          label: "Open Digital Twin",
          icon: Map,
          onClick: () => router.push(`/map${contextQuery}`),
          desc: "View current location spatial map"
        });
        list.push({
          label: "View Climate Analytics",
          icon: BarChart3,
          onClick: () => router.push(`/analytics${contextQuery}`),
          desc: "Inspect monthly trend charts"
        });
        list.push({
          label: "Generate Vulnerability Report",
          icon: FileText,
          onClick: () => router.push(`/reports${contextQuery}`),
          desc: "Generate official administrative PDF"
        });
        list.push({
          label: "Run Simulation",
          icon: SlidersHorizontal,
          onClick: () => router.push(`/simulator${contextQuery}`),
          desc: "Model weather modifications"
        });
        list.push({
          label: "View Historical Timeline",
          icon: CalendarRange,
          onClick: () => router.push(`/timeline${contextQuery}`),
          desc: "Review decadal deviations"
        });
        break;
    }
    return list;
  }, [currentPage, currentMetric, currentDistrictName, selectedStateName, selectedStateId, selectedDistrictId, activeYear, activeSimulation, currentGeneratedReport, router]);

  const SuggestionIcon = smartSuggestion.icon;

  return (
    <div className="grid gap-5 mt-4">
      {/* ─── Smart Recommendation Box ─── */}
      <div className={`flex flex-col md:flex-row gap-4 p-4 rounded-2xl border ${smartSuggestion.color} backdrop-blur-md items-start md:items-center justify-between`}>
        <div className="flex gap-3 items-start">
          <div className="p-2 bg-white/5 rounded-xl shrink-0">
            <SuggestionIcon className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white leading-normal flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              {smartSuggestion.title}
            </h4>
            <p className="text-[11px] text-secondary-foreground leading-relaxed mt-1">
              {smartSuggestion.message}
            </p>
          </div>
        </div>
        <Button 
          size="sm"
          className="text-xs shrink-0 bg-white/10 hover:bg-white/20 text-white font-bold border border-white/5 py-1.5 h-8 gap-1 transition-all"
          onClick={() => router.push(`/simulator?district_id=${selectedDistrictId || ''}&preset=${smartSuggestion.simPreset}`)}
        >
          Activate Scenario Lab <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* ─── Next-Step Actions panel ─── */}
      <Card className="glass-card border-white/[0.08] p-5">
        <h4 className="text-xs font-bold uppercase tracking-wider text-brand-titanium mb-3.5 flex items-center gap-1.5 font-orbitron">
          <SlidersHorizontal className="h-4 w-4" />
          Climate Intelligence Workflow Decisions
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {actions.map((act) => {
            const Icon = act.icon;
            return (
              <div 
                key={act.label} 
                onClick={act.onClick}
                className="group flex flex-col justify-between p-3.5 rounded-2xl border border-white/[0.05] bg-white/[0.01] hover:bg-surface-elevated transition-all duration-300 hover:scale-[1.02] cursor-pointer hover:border-brand-blue/30 active:scale-95 min-h-[96px]"
              >
                <div className="flex justify-between items-center w-full">
                  <span className="text-[10px] font-bold text-white uppercase tracking-wider leading-none">
                    {act.label}
                  </span>
                  <Icon className="h-4 w-4 text-brand-blue group-hover:scale-110 transition-transform" />
                </div>
                <p className="text-[9px] text-muted-foreground mt-2 leading-relaxed">
                  {act.desc}
                </p>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
