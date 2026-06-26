"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { 
  FileText, 
  Download, 
  Printer, 
  ShieldCheck, 
  Search, 
  Trash2, 
  Activity, 
  TrendingUp, 
  Bot, 
  Sparkles, 
  Globe2, 
  SlidersHorizontal, 
  Layers, 
  Calendar, 
  MapPin, 
  ArrowRight, 
  History, 
  Copy, 
  Plus, 
  FileSpreadsheet, 
  FileImage, 
  RefreshCw, 
  AlertTriangle,
  Users,
  Building,
  GraduationCap,
  Scale,
  Leaf,
  X,
  Play,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api, API_BASE_URL, getToken } from "@/lib/api";
import type { District, Ranking, State, ClimateObservation } from "@/lib/types";
import { riskColor } from "@/lib/utils";
import { useClimate } from "@/store/useClimateStore";
import { WorkflowRecommendations } from "@/components/climate/WorkflowRecommendations";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

// ─── Local Interface for Persistent Report ───────────────────────
interface PersistentReport {
  id: string;
  name: string;
  reportType: string;
  stateName: string;
  districtName: string;
  compareStateName?: string;
  compareDistrictName?: string;
  year: number;
  sector: string;
  disasterType: string;
  riskLevelFilter: string;
  dateCompiled: string;
  refNo: string;
  isComparison: boolean;
  climateParameter?: string;
}

export default function ReportsPage() {
  const { 
    selectedDistrictId, 
    setSelectedDistrictId, 
    selectedStateId: globalStateId, 
    setSelectedStateId: setGlobalStateId, 
    setSelectedStateName, 
    setActiveLayer, 
    activeYear, 
    setCurrentGeneratedReport 
  } = useClimate();

  const [districts, setDistricts] = useState<District[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [rankings, setRankings] = useState<Ranking[]>([]);

  // ─── States ────────────────────────────────────────────────────────
  const [hoveredStateName, setHoveredStateName] = useState<string | null>(null);
  const [hoveredDistrictZone, setHoveredDistrictZone] = useState<string | null>(null);
  const [hoveredHeatspot, setHoveredHeatspot] = useState<string | null>(null);

  const [selectedStateId, setSelectedStateId] = useState<string>("all");
  const [compareStateId, setCompareStateId] = useState<string>("all");
  
  const [districtId, setDistrictId] = useState<number>(101);
  const [year, setYear] = useState<number>(2026);
  const [sector, setSector] = useState<string>("water");
  const [reportType, setReportType] = useState<string>("district_climate");
  const [disasterType, setDisasterType] = useState<string>("all");
  const [riskLevelFilter, setRiskLevelFilter] = useState<string>("all");
  const [climateParameter, setClimateParameter] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("2026-06-01");
  const [endDate, setEndDate] = useState<string>("2026-12-31");

  // Sync with global activeYear
  useEffect(() => {
    setYear(activeYear);
  }, [activeYear]);

  // Comparison Mode states
  const [isComparison, setIsComparison] = useState<boolean>(false);
  const [compareDistrictId, setCompareDistrictId] = useState<number>(102);

  // Generation status
  const [generating, setGenerating] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<PersistentReport | null>(null);

  // History Library
  const [history, setHistory] = useState<PersistentReport[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Presentation slide state variables
  const [presentationActive, setPresentationActive] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Bidirectional sync with global store
  useEffect(() => {
    if (districts.length > 0) {
      if (selectedDistrictId && selectedDistrictId !== districtId) {
        setDistrictId(selectedDistrictId);
        const d = districts.find(x => x.id === selectedDistrictId);
        if (d && d.state_id) {
          setSelectedStateId(String(d.state_id));
        }
      } else if (globalStateId && globalStateId !== (selectedStateId === "all" ? "" : Number(selectedStateId)) && !selectedDistrictId) {
        setSelectedStateId(String(globalStateId));
      }
    }
  }, [districts, selectedDistrictId, globalStateId]);

  useEffect(() => {
    if (districtId && districts.length > 0) {
      if (selectedDistrictId !== districtId) {
        setSelectedDistrictId(districtId);
        const d = districts.find(x => x.id === districtId);
        if (d) {
          setGlobalStateId(d.state_id || "");
          setSelectedStateName(d.state_name || null);
        }
      }
    } else if (selectedStateId !== "all" && selectedStateId !== "") {
      const stateVal = Number(selectedStateId);
      if (globalStateId !== stateVal) {
        setGlobalStateId(stateVal);
        const stateObj = states.find(s => s.id === stateVal);
        setSelectedStateName(stateObj ? stateObj.name : null);
        setSelectedDistrictId(undefined);
      }
    }
  }, [districtId, selectedStateId, districts, states]);

  // Load from backend APIs
  useEffect(() => {
    Promise.all([
      api.states(),
      api.districts()
    ]).then(([statesData, districtsData]) => {
      setStates(statesData);
      setDistricts(districtsData);

      if (districtsData.length > 0) {
        if (selectedDistrictId) {
          setDistrictId(selectedDistrictId);
          const d = districtsData.find(x => x.id === selectedDistrictId);
          if (d && d.state_id) {
            setSelectedStateId(String(d.state_id));
          }
        } else {
          setDistrictId(districtsData[0].id);
        }
        setCompareDistrictId(districtsData[1] ? districtsData[1].id : districtsData[0].id);
      }
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    api.rankings(1000, year)
      .then(setRankings)
      .catch(() => undefined);
  }, [year]);

  // ─── Dynamic Filtering Memos ──────────────────────────────────────
  const filteredDistricts = useMemo(() => {
    if (selectedStateId === "all") return districts;
    const stateIdNum = Number(selectedStateId);
    return districts.filter((d) => d.state_id === stateIdNum);
  }, [selectedStateId, districts]);

  const filteredCompareDistricts = useMemo(() => {
    if (compareStateId === "all") return districts;
    const stateIdNum = Number(compareStateId);
    return districts.filter((d) => d.state_id === stateIdNum);
  }, [compareStateId, districts]);

  // Adjust selections if state filter excludes current district
  useEffect(() => {
    if (filteredDistricts.length > 0) {
      const exists = filteredDistricts.some((d) => d.id === districtId);
      if (!exists) {
        setDistrictId(filteredDistricts[0].id);
      }
    }
  }, [filteredDistricts, districtId]);

  useEffect(() => {
    if (filteredCompareDistricts.length > 0) {
      const exists = filteredCompareDistricts.some((d) => d.id === compareDistrictId);
      if (!exists) {
        setCompareDistrictId(filteredCompareDistricts[0].id);
      }
    }
  }, [filteredCompareDistricts, compareDistrictId]);

  // ─── Setup Location Reference ──────────────────────────────────────
  const district = useMemo(() => districts.find((d) => d.id === districtId) || districts[0], [districts, districtId]);
  const compareDistrict = useMemo(() => districts.find((d) => d.id === compareDistrictId) || districts[1], [districts, compareDistrictId]);
  
  const ranking = useMemo(() => rankings.find((r) => r.district_id === districtId) || rankings[0], [rankings, districtId]);
  const compareRanking = useMemo(() => rankings.find((r) => r.district_id === compareDistrictId) || rankings[1], [rankings, compareDistrictId]);

  // Safeguard loading state
  const isDataLoading = states.length === 0 || districts.length === 0 || rankings.length === 0;

  const [historyObservations, setHistoryObservations] = useState<ClimateObservation[]>([]);

  // Load observations history for selected district and year
  useEffect(() => {
    if (!districtId) return;
    api.history(districtId, year)
      .then(setHistoryObservations)
      .catch(() => setHistoryObservations([]));
  }, [districtId, year]);

  // Keypress listener for ArrowLeft/ArrowRight to navigate slides in presentation mode
  useEffect(() => {
    if (!presentationActive) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "Right") {
        setCurrentSlide((prev) => Math.min(prev + 1, 6));
      } else if (e.key === "ArrowLeft" || e.key === "Left") {
        setCurrentSlide((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Escape") {
        setPresentationActive(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [presentationActive]);

  const districtZoneForecasts = useMemo(() => {
    const forecasts: Record<string, { risk: number; temp: number; rainfall: number; soil: string; warning: string }> = {};
    if (!ranking) return forecasts;
    forecasts["North Taluka"] = { 
      risk: Math.round(ranking.composite_risk * 0.9), 
      temp: Math.round(ranking.heatwave_risk * 0.4 + 20), 
      rainfall: Math.round(ranking.flood_risk * 2), 
      soil: ranking.drought_risk > 60 ? "Depleted (22% saturation)" : "Adequate (52% saturation)", 
      warning: ranking.drought_risk > 60 ? "⚠️ Crop stress warning" : "✓ Conditions nominal" 
    };
    forecasts["East Taluka"] = { 
      risk: Math.round(ranking.composite_risk * 1.1), 
      temp: Math.round(ranking.heatwave_risk * 0.35 + 20), 
      rainfall: Math.round(ranking.flood_risk * 3.5), 
      soil: ranking.flood_risk > 60 ? "Saturated (92% saturation)" : "Adequate (58% saturation)", 
      warning: ranking.flood_risk > 60 ? "🚨 Flood inundation alert" : "✓ Conditions nominal" 
    };
    forecasts["South Taluka"] = { 
      risk: Math.round(ranking.composite_risk * 0.8), 
      temp: Math.round(ranking.heatwave_risk * 0.3 + 20), 
      rainfall: Math.round(ranking.flood_risk * 1.2), 
      soil: "Adequate (58% saturation)", 
      warning: "✓ Conditions nominal" 
    };
    forecasts["West Taluka"] = { 
      risk: Math.round(ranking.composite_risk * 0.75), 
      temp: Math.round(ranking.heatwave_risk * 0.3 + 20), 
      rainfall: Math.round(ranking.flood_risk * 0.8), 
      soil: "Adequate (52% saturation)", 
      warning: "✓ Conditions nominal" 
    };
    return forecasts;
  }, [ranking]);

  const stateForecasts = useMemo(() => {
    const forecasts: Record<string, { alert: string; temp: number; risk: number; forecast: string }> = {};
    const statesList = ["Rajasthan", "Gujarat", "Maharashtra", "Karnataka", "Tamil Nadu", "Uttar Pradesh", "West Bengal", "Assam"];
    statesList.forEach((stateName) => {
      const stateRankings = rankings.filter((r) => r.state_name === stateName);
      const avgRisk = stateRankings.length
        ? Math.round(stateRankings.reduce((sum, r) => sum + r.composite_risk, 0) / stateRankings.length)
        : 45;
      const avgTemp = stateRankings.length
        ? Math.round(stateRankings.reduce((sum, r) => sum + (r.heatwave_risk * 0.2 + 25), 0) / stateRankings.length)
        : 32;
      const alert = avgRisk >= 70 ? "CRITICAL ALERT" : avgRisk >= 50 ? "HIGH RISK" : "SAFE ZONE";
      const forecast = avgRisk >= 70 
        ? "Extreme climate anomalies detected. Action required." 
        : "Stable conditions with seasonal variations.";
      forecasts[stateName] = { alert, temp: avgTemp, risk: avgRisk, forecast };
    });
    return forecasts;
  }, [rankings]);

  const heatmapHotspotForecasts = useMemo(() => {
    const hotspots: Record<string, { title: string; risk: string; desc: string }> = {};
    if (!ranking) return hotspots;
    hotspots["basin"] = { 
      title: "River Basin Discharge Point", 
      risk: ranking.flood_risk > 60 ? "CRITICAL FLOOD SPEED" : "STANDARD DISCHARGE", 
      desc: ranking.flood_risk > 60 ? "Monsoon runoff peaks are causing rapid elevation rise. Watch levels closely." : "River discharge levels within seasonal standard capacity." 
    };
    hotspots["urban"] = { 
      title: "Metropolitan Heat Island", 
      risk: ranking.heatwave_risk > 60 ? "EXTREME TEMPERATURE" : "MODERATE HEAT LOAD", 
      desc: ranking.heatwave_risk > 60 ? "Concentrated concrete sprawl trapping convective heat. Thermal load is high." : "Standard metropolitan temperature anomaly dispersion." 
    };
    hotspots["farm"] = { 
      title: "Arid Crop Belt Focus", 
      risk: ranking.drought_risk > 60 ? "HIGH MOISTURE DEFICIT" : "NORMAL TOPSOIL MOISTURE", 
      desc: ranking.drought_risk > 60 ? "Topsoil moisture depleted below sustainable crop root-depth thresholds." : "Topsoil moisture levels are sufficient for seasonal crops." 
    };
    return hotspots;
  }, [ranking]);

  const reportChartData = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    if (historyObservations.length === 0) {
      return months.map((m) => ({
        month: m,
        rainfall: 0,
        temperature: 25,
        aqi: 50,
        risk: 30,
        floodRisk: 30,
        droughtRisk: 30,
        heatwaveRisk: 30,
        populationImpact: 30,
        ndvi: 0.5
      }));
    }
    
    return historyObservations.map((obs) => {
      const dateObj = new Date(obs.observed_on);
      const monthLabel = months[dateObj.getMonth()] || "Jan";
      const floodRisk = Math.round(obs.rainfall_mm > 150 ? 80 : obs.rainfall_mm > 80 ? 55 : 30);
      const droughtRisk = Math.round(obs.rainfall_deficit_pct > 30 ? 75 : obs.rainfall_deficit_pct > 10 ? 50 : 25);
      const heatwaveRisk = Math.round(obs.temperature_c > 38 ? 85 : obs.temperature_c > 33 ? 55 : 30);
      const compositeRisk = Math.round((floodRisk + droughtRisk + heatwaveRisk) / 3);

      return {
        month: monthLabel,
        rainfall: obs.rainfall_mm,
        temperature: obs.temperature_c,
        aqi: obs.aqi,
        risk: compositeRisk,
        floodRisk,
        droughtRisk,
        heatwaveRisk,
        populationImpact: Math.round(compositeRisk * 1.1),
        ndvi: obs.ndvi ?? 0.5
      };
    });
  }, [historyObservations]);

  // Loading History
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("bct_report_history");
      if (saved) {
        setHistory(JSON.parse(saved));
      } else {
        const initialHistory: PersistentReport[] = [
          {
            id: "rep-1",
            name: "Jodhpur Desert Mitigation Plan",
            reportType: "drought_assessment",
            stateName: "Rajasthan",
            districtName: "Jodhpur",
            year: 2030,
            sector: "agriculture",
            disasterType: "drought",
            riskLevelFilter: "high",
            dateCompiled: "14 June 2026",
            refNo: "BCT-REP-JDH-2030",
            isComparison: false
          },
          {
            id: "rep-2",
            name: "Assam Flood Infrastructure Audit",
            reportType: "flood_assessment",
            stateName: "Assam",
            districtName: "Cachar",
            year: 2026,
            sector: "infrastructure",
            disasterType: "flood",
            riskLevelFilter: "critical",
            dateCompiled: "10 June 2026",
            refNo: "BCT-REP-CAC-2026",
            isComparison: false
          }
        ];
        localStorage.setItem("bct_report_history", JSON.stringify(initialHistory));
        setHistory(initialHistory);
      }
    }
  }, []);

  // Save history to localStorage helper
  const saveHistory = (newHistory: PersistentReport[]) => {
    setHistory(newHistory);
    localStorage.setItem("bct_report_history", JSON.stringify(newHistory));
  };

  // Toast feedback helper
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };  // Handle Generate Report
  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      const ref = `BCT-REP-${district.code.toUpperCase()}-${year}-${Math.floor(100 + Math.random() * 900)}`;
      const newReport: PersistentReport = {
        id: "rep-" + Date.now(),
        name: isComparison 
          ? `Comparative Study: ${district.name} vs ${compareDistrict.name}`
          : `${district.name} ${reportType.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}`,
        reportType,
        stateName: district.state_name ?? "Unknown State",
        districtName: district.name,
        compareStateName: isComparison ? (compareDistrict.state_name ?? "Unknown State") : undefined,
        compareDistrictName: isComparison ? compareDistrict.name : undefined,
        year,
        sector,
        disasterType,
        riskLevelFilter,
        climateParameter,
        dateCompiled: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
        refNo: ref,
        isComparison
      };
      
      saveHistory([newReport, ...history]);
      setGeneratedReport(newReport);
      setCurrentGeneratedReport(newReport);
      setGenerating(false);
      showToast("Report compiled with Decision Intelligence framework.");
    }, 1200);
  };
  
  // Download report PDF from backend
  const handleDownloadPDF = () => {
    if (!generatedReport) return;
    
    let path = "";
    const type = generatedReport.reportType;
    
    if (type === "district_climate") {
      path = `/reports/district/${districtId}.pdf`;
    } else if (type === "state_climate") {
      const stateId = selectedStateId === "all" ? (district?.state_id || 1) : selectedStateId;
      path = `/reports/state/${stateId}.pdf`;
    } else if (type === "flood_assessment") {
      path = `/reports/flood/${districtId}.pdf`;
    } else if (type === "drought_assessment") {
      path = `/reports/drought/${districtId}.pdf`;
    } else if (type === "heatwave_assessment") {
      path = `/reports/heatwave/${districtId}.pdf`;
    } else if (type === "water_stress") {
      path = `/reports/water/${districtId}.pdf`;
    } else if (type === "climate_resilience") {
      path = `/reports/resilience/${districtId}.pdf`;
    } else if (type === "agriculture_impact") {
      path = `/reports/agriculture/${districtId}.pdf`;
    } else if (type === "disaster_preparedness") {
      path = `/reports/preparedness/${districtId}.pdf`;
    } else if (type === "executive_summary") {
      path = `/reports/executive.pdf`;
    } else if (type === "mission_brief") {
      path = `/reports/mission-brief/${districtId}.pdf`;
    }
    
    if (path) {
      const token = getToken();
      const downloadUrl = `${API_BASE_URL}/api/v1/climate${path}${token ? `?token=${token}` : ""}`;
      window.open(downloadUrl, "_blank");
      showToast("PDF report download initiated.");
    } else {
      showToast("Download not supported for this report type.");
    }
  };

  // Print friendly print handler
  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  // Export report to CSV
  const handleExportCSV = () => {
    if (!generatedReport) return;
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += `Report Title,${generatedReport.name}\n`;
    csvContent += `Reference Number,${generatedReport.refNo}\n`;
    csvContent += `Compiled Date,${generatedReport.dateCompiled}\n`;
    csvContent += `Target Year,${generatedReport.year}\n`;
    csvContent += `Focus Area,${generatedReport.districtName} (${generatedReport.stateName})\n`;
    if (generatedReport.isComparison) {
      csvContent += `Comparison Area,${generatedReport.compareDistrictName} (${generatedReport.compareStateName})\n`;
    }
    csvContent += `\n`;
    
    if (generatedReport.isComparison) {
      csvContent += `Parameter,${generatedReport.districtName},${generatedReport.compareDistrictName},Difference\n`;
      csvContent += `Composite Climate Risk,${ranking.composite_risk}%,${compareRanking.composite_risk}%,${ranking.composite_risk - compareRanking.composite_risk}%\n`;
      csvContent += `Flood Inundation Risk,${ranking.flood_risk}%,${compareRanking.flood_risk}%,${ranking.flood_risk - compareRanking.flood_risk}%\n`;
      csvContent += `Agricultural Drought Risk,${ranking.drought_risk}%,${compareRanking.drought_risk}%,${ranking.drought_risk - compareRanking.drought_risk}%\n`;
      csvContent += `Extreme Heatwave Risk,${ranking.heatwave_risk}%,${compareRanking.heatwave_risk}%,${ranking.heatwave_risk - compareRanking.heatwave_risk}%\n`;
      csvContent += `Water Stress Risk,${ranking.water_stress_risk}%,${compareRanking.water_stress_risk}%,${ranking.water_stress_risk - compareRanking.water_stress_risk}%\n`;
    } else {
      csvContent += `Climate Risk Index,Score/Value\n`;
      csvContent += `Composite Climate Risk,${ranking.composite_risk}%\n`;
      csvContent += `Flood Inundation Risk,${ranking.flood_risk}%\n`;
      csvContent += `Agricultural Drought Risk,${ranking.drought_risk}%\n`;
      csvContent += `Extreme Heatwave Risk,${ranking.heatwave_risk}%\n`;
      csvContent += `Water Stress Risk,${ranking.water_stress_risk}%\n`;
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${generatedReport.refNo}_data.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    showToast("CSV dataset exported successfully.");
  };

  // Delete Report History
  const handleDeleteReport = (id: string) => {
    const updated = history.filter((r) => r.id !== id);
    saveHistory(updated);
    if (generatedReport?.id === id) {
      setGeneratedReport(null);
      setCurrentGeneratedReport(null);
    }
    showToast("Report deleted from library.");
  };

  // Duplicate Report History
  const handleDuplicateReport = (report: PersistentReport) => {
    const dup: PersistentReport = {
      ...report,
      id: "rep-" + Date.now(),
      name: `${report.name} (Copy)`,
      dateCompiled: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
      refNo: `${report.refNo}-DUP`
    };
    saveHistory([dup, ...history]);
    showToast("Report duplicated in library.");
  };

  // Rename Report History
  const handleStartRename = (report: PersistentReport) => {
    setRenamingId(report.id);
    setRenameValue(report.name);
  };

  const handleSaveRename = () => {
    const updated = history.map((r) => {
      if (r.id === renamingId) {
        return { ...r, name: renameValue };
      }
      return r;
    });
    saveHistory(updated);
    if (generatedReport && generatedReport.id === renamingId) {
      setGeneratedReport({ ...generatedReport, name: renameValue });
      setCurrentGeneratedReport({ ...generatedReport, name: renameValue });
    }
    setRenamingId(null);
    showToast("Report title updated.");
  };

  // Load a report from library history
  const handleLoadReport = (report: PersistentReport) => {
    setGeneratedReport(report);
    
    // Set UI selectors
    const d = districts.find(x => x.name === report.districtName);
    if (d) {
      setDistrictId(d.id);
      setSelectedStateId(d.state_id ? String(d.state_id) : "all");
    }
    
    if (report.isComparison && report.compareDistrictName) {
      const cd = districts.find(x => x.name === report.compareDistrictName);
      if (cd) {
        setCompareDistrictId(cd.id);
        setCompareStateId(cd.state_id ? String(cd.state_id) : "all");
        setIsComparison(true);
      }
    } else {
      setIsComparison(false);
    }
    
    setYear(report.year);
    setSector(report.sector);
    setReportType(report.reportType);
    setDisasterType(report.disasterType);
    setRiskLevelFilter(report.riskLevelFilter);
    if (report.climateParameter) {
      setClimateParameter(report.climateParameter);
    }
    setCurrentGeneratedReport(report);
    showToast(`Loaded report: ${report.name}`);  };

  // ─── Filtered History ──────────────────────────────────────────────
  const filteredHistory = useMemo(() => {
    return history.filter((rep) => {
      const matchesSearch = rep.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            rep.districtName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            rep.refNo.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === "all" || rep.reportType === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [history, searchTerm, typeFilter]);

  // ─── Generate report-specific text contents ────────────────────────
  const reportNarrative = useMemo(() => {
    if (!generatedReport) return null;
    
    const isComp = generatedReport.isComparison;
    const type = generatedReport.reportType;
    const focusSector = generatedReport.sector;
    
    // Key stats
    const riskDiff = Math.abs(ranking.composite_risk - compareRanking.composite_risk);
    const rainLevel = ranking.flood_risk > 70 ? "torrential precipitation anomalies (+22%)" : "normal seasonal monsoon distributions";
    
    let summary = `This strategic intelligence assessment maps the projected climate risk profiles for ${district.name} District, ${district.state_name} UT/State, for target year ${year} AD. The geographical focus area supports ${district.population.toLocaleString()} citizens over ${district.area_sq_km.toLocaleString()} sq km of terrain. Sensor observation gridded feeds from INSAT-3DR and IMD networks suggest a composite climate risk score of ${ranking.composite_risk}/100.`;
    
    let condition = `Recent gridded climate grids identify ${rainLevel} in the district. Soil moisture saturation levels are hovering at ${ranking.drought_risk > 60 ? "depleted (low agricultural resilience)" : "adequate seasonal capacity"}. Hydrological reservoirs are holding at approximately ${ranking.water_stress_risk > 70 ? "critical levels (elevated local drawdowns)" : "nominal operating pressures"}.`;
    
    let aiBrief = `COGNITIVE AUDIT: The threat model forecasts substantial vulnerabilities centered on ${focusSector} security. Machine learning grids run over SSP5-8.5 emission pathways indicate that local thermal thresholds are likely to increase, pushing heatwave indexes. In low-lying agricultural zones, exposure metrics suggest that crop vulnerability index scores will rise, necessitating regional contingency adjustments.`;

    let highRiskZones = `${district.name}'s eastern flood basin clusters and low-lying coastal drainage belts.`;
    let immediateActions = [
      "Deploy localized emergency streamflow sensors at river checkpoints",
      "Subsidize moisture-retaining soil cover and heat-resilient pearl millet seeds",
      "Issue Level-2 municipal water-rationing guidelines for industrial grids"
    ];
    let shortTermAdvisories = [
      "Review sandbag defense stockpiles in critical drainage basins",
      "Implement mandatory cooling shelter structures in peak industrial belts",
      "Optimize micro-drip agricultural irrigation systems for summer crops"
    ];
    let longTermAdaptations = [
      "Construct reinforced concrete flood embankments along the river basin",
      "Invest in sustainable aquifer recharge wells to stabilize public water wells",
      "Establish institutional climate stress frameworks inside urban planning laws"
    ];
    let keyFindings = [
      `Composite vulnerability score is ${ranking.composite_risk >= 60 ? "elevated" : "moderate"} at ${ranking.composite_risk}/100.`,
      `Flood probability index is projected at ${ranking.flood_risk}% with monsoon peaks.`,
      `Reservoir storage buffers are expected to operate near critical threshold values.`,
      `Socio-economic population exposure models estimate over 40% high threat vulnerability.`
    ];

    if (isComp) {
      summary = `This bilateral climate comparison compares the projected risk models of ${district.name} (${district.state_name}) and ${compareDistrict.name} (${compareDistrict.state_name}) for the scenario horizon of ${year} AD. There is a composite risk delta of ${riskDiff}% between the locations.`;
      condition = `${district.name} exhibits a composite risk of ${ranking.composite_risk}% (with flood risk at ${ranking.flood_risk}% and drought risk at ${ranking.drought_risk}%) while ${compareDistrict.name} reports a composite risk of ${compareRanking.composite_risk}% (with flood risk at ${compareRanking.flood_risk}% and drought risk at ${compareRanking.drought_risk}%).`;
      aiBrief = `COMPARATIVE SYNTHESIS: The observation profiles suggest divergent climate adaptation pathways. ${district.name} is primarily driven by ${ranking.flood_risk > ranking.drought_risk ? "excess run-off and flooding vectors" : "prolonged precipitation deficits"}, whereas ${compareDistrict.name} displays critical vulnerabilities related to ${compareRanking.flood_risk > compareRanking.drought_risk ? "water discharge anomalies" : "agricultural moisture dry-out"}.`;
      highRiskZones = `${district.name}'s high-risk sectors and ${compareDistrict.name}'s vulnerable coastal zones.`;
      
      immediateActions = [
        `Harmonize disaster alert sharing frequencies between ${district.name} and surrounding talukas`,
        `Establish regional resource hubs near high-stress borders`
      ];
      
      keyFindings = [
        `Composite risk delta between selected regions is ${riskDiff}%.`,
        `${district.name} displays higher flood index exposure (${ranking.flood_risk}%) than ${compareDistrict.name} (${compareRanking.flood_risk}%).`,
        `Long-term planning should prioritize localized infrastructure in the highest threat zone.`
      ];
    } else {
      if (type === "flood_assessment") {
        summary = `FLOOD VULNERABILITY REPORT: Emergency evaluation memorandum for ${district.name}. Runoff metrics indicate flood risk is ${ranking.flood_risk}% under target simulation parameters. Infrastructure networks, including primary highways and power hubs, face extreme discharge load thresholds.`;
        aiBrief = `FLOOD EXPOSURE MODELING: River basin modeling maps show that local river level projections could exceed alert marks by 2.4 meters due to extreme run-off rates. This will impact lowlands, requiring immediate flood defenses.`;
        immediateActions = [
          "Pre-position inflatable rescue rafts and medical tents at safe stations",
          "Conduct emergency safety structural tests on river bridges and dams",
          "Issue flash flood warnings to low-lying community centers via SMS grids"
        ];
      } else if (type === "drought_assessment") {
        summary = `AGRICULTURAL DROUGHT CHARTER: Soil moisture observation maps for ${district.name} show drought risk at ${ranking.drought_risk}%. Precipitation deficits have depleted topsoil moisture, threatening agricultural yields.`;
        aiBrief = `DROUGHT STRESS AUDIT: NDVI vegetation charts display early indications of stress in standing crops. Groundwater drawdowns are accelerating, calling for restrictions on deep borewell drilling.`;
        immediateActions = [
          "Set up regional tanker logistics for priority household districts",
          "Deploy subsidised multi-crop seeds resistant to seasonal dry spells",
          "Announce state electricity hour schedules optimized for crop pumping"
        ];
      } else if (type === "heatwave_assessment") {
        summary = `EXTREME HEATWAVE ADVISORY: Climate models project heatwave risk at ${ranking.heatwave_risk}% for ${district.name}. Thermal indices indicate that surface temperatures are expected to spike to critical margins.`;
        aiBrief = `THERMAL INVERSION MODELING: Heat indices are expected to exceed normal thresholds by 5.5°C. Urban heat island effects will exacerbate conditions, requiring strict monitoring of industrial worker exposure and cooling load grids.`;
        immediateActions = [
          "Establish municipal cooling shelters in high-density areas",
          "Distribute hydration packets and emergency medical protocols to local health clinics",
          "Enforce mandatory shade breaks for construction and outdoor laborers"
        ];
      } else if (type === "water_stress") {
        summary = `WATER STRESS EVALUATION: Hydrological metrics show water stress risk at ${ranking.water_stress_risk}% for ${district.name}. Reservoir capacities and water tables are entering depletion thresholds.`;
        aiBrief = `AQUIFER OBSERVATIONS: Satellite gravity data indicates rapid depletion of shallow groundwater tables. Local demand loads have exceeded natural recharge capacities by 18%, requiring aggressive rainwater harvesting.`;
        immediateActions = [
          "Impose industrial water recycling quotas and limit commercial extractions",
          "Deploy smart water meters on agricultural pump connections",
          "Initiate community rainwater harvesting retrofits in high-density sectors"
        ];
      } else if (type === "climate_resilience") {
        summary = `CLIMATE RESILIENCE STRATEGY MEMO: Comprehensive review of long-term climate vulnerabilities and adaptive structures for ${district.name}. Composite resilience capacity is calculated at ${100 - ranking.composite_risk}%.`;
        aiBrief = `RESILIENCE MATRIX: Enhancing institutional resilience requires multi-sector interventions. Improving soil carbon sponge indices and updating urban building codes will provide buffers against flash extremes.`;
        immediateActions = [
          "Incorporate climate risk data into district master planning files",
          "Sponsor localized sustainable farming training networks",
          "Develop community emergency response grids using local volunteer hubs"
        ];
      } else if (type === "agriculture_impact") {
        summary = `AGRICULTURAL IMPACT & CROP SECURITY ADVISORY: Soil moisture profiles and thermal grids indicate agriculture risk at ${ranking.drought_risk}% for ${district.name}. Major crop yields are projected to decline.`;
        aiBrief = `CROP SECURITY MODELING: Projected changes in monsoon patterns will impact key planting timelines. Prolonged dry spells during crop reproductive stages are forecast to affect yields by up to 14%.`;
        immediateActions = [
          "Subsidize heat-tolerant seed varieties for smallholder farmers",
          "Establish crop micro-insurance programs linked to local weather grids",
          "Deploy mobile SMS advisory services containing localized weather updates"
        ];
      } else if (type === "disaster_preparedness") {
        summary = `DISASTER PREPAREDNESS AUDIT: Evaluation of emergency shelters, evacuation accessibility, and relief supply chains for ${district.name}. Multi-hazard exposure index is calculated at ${ranking.composite_risk}%.`;
        aiBrief = `PREPAREDNESS SIMULATION: Emergency access modeling indicates that key roads in low-lying sectors face high inundation probabilities during severe precipitation events, necessitating alternative transport routes.`;
        immediateActions = [
          "Pre-position relief supplies and emergency power units at high-ground shelters",
          "Conduct community mock drill simulations in flood and storm surge zones",
          "Upgrade localized early warning sirens and weather alerts channels"
        ];
      } else if (type === "executive_summary") {
        summary = `EXECUTIVE CLIMATE SECURITY MEMORANDUM: High-level synthesis of climate vulnerabilities, hazard exposure, and policy guidelines for ${district.name}. Urgent priority actions are detailed below.`;
        aiBrief = `EXECUTIVE INTELLIGENCE SYNTHESIS: The overlap of high thermal risks with rising water stress demands integrated governance. Multi-agency collaboration is critical to prevent compounding resource strains.`;
        immediateActions = [
          "Brief district disaster management authorities on the updated warning levels",
          "Authorize emergency budgets for water storage upgrades",
          "Establish high-level coordination groups for interstate climate response"
        ];
      } else if (type === "state_climate") {
        summary = `STATE CLIMATE PROFILE: Strategic climate assessment for ${district.state_name ?? "State"}, aggregating multi-district metrics. Projected state composite risk is modeled at ${ranking.composite_risk}%.`;
        aiBrief = `STATE-LEVEL SYNERGY: Wide variations in district microclimates require flexible policies. Regional adaptation plans should focus on major river basins and key economic hubs.`;
        immediateActions = [
          "Establish state-wide emergency resource reserves at key transport nodes",
          "Incorporate localized risk layers into state-level infrastructure models",
          "Subsidize regional watershed management programs across critical basins"
        ];
      } else if (type === "mission_brief") {
        summary = `OPERATIONAL BRIEF: Strategic climate response plan compiled for ${district.name} District, ${district.state_name}. Commencing risk management protocols for scenario year ${year} AD. The monitored area spans ${district.area_sq_km.toLocaleString()} sq km, housing ${district.population.toLocaleString()} citizens.`;
        aiBrief = `RISK BRIEFING: Integrated observations indicate critical compound risks focused on ${focusSector} sectors. Local hazard indices are projected to peak, creating municipal exposure. Local authorities must establish immediate coordination channels with block-level disaster committees.`;
        immediateActions = [
          "Establish high-priority sensor links with NDMA operations center",
          "Issue Level-2 water and resource quotas for heavy industrial zones",
          "Position emergency rescue fleets and medical kits at regional headquarters"
        ];
        shortTermAdvisories = [
          "Pre-stage transport detours in case flood indicators cross critical lines",
          "Audit central crop seed reserves to support fast re-planting",
          "Set up mobile shade shelters in high-density work zones"
        ];
        longTermAdaptations = [
          "Deploy regional aquifer recharge grids and structural wells",
          "Re-route major transport lines around predicted landslide/flood paths",
          "Integrate real-time IoT water monitoring tools across municipal grids"
        ];
        keyFindings = [
          `Composite regional risk is calculated at ${ranking.composite_risk}/100.`,
          `Operational area population exposure limits stand at ${Math.round(ranking.composite_risk * 1.8)}k citizens.`,
          `Resource availability index matches high-alert drawdown states.`,
          `Communication channel status is active and verified by Operations Center.`
        ];
      }
    }
    return {
      summary,
      condition,
      aiBrief,
      highRiskZones,
      immediateActions,
      shortTermAdvisories,
      longTermAdaptations,
      keyFindings
    };
  }, [generatedReport, district, compareDistrict, year, ranking, compareRanking]);



  if (isDataLoading) {
    return <div className="text-center py-20 text-muted-foreground">Loading reports parameters...</div>;
  }

  return (
    <div className="grid gap-6 pb-6 select-none">
      
      {/* ─── TOAST NOTIFICATION ────────────────────────────────────────── */}
      {toastMsg && (
        <div className="fixed top-20 right-6 z-50 animate-bounce flex items-center gap-2.5 rounded-lg border border-white/[0.08] bg-background/90 px-4 py-3 text-xs font-semibold text-emerald-200 shadow-[0_0_20px_rgba(6,182,212,0.3)] backdrop-blur-md">
          <Sparkles className="h-4 w-4 text-brand-blue animate-pulse" />
          {toastMsg}
        </div>
      )}

      {/* ─── HEADER SECTION ──────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 no-print">
        <div>
          <Badge className="bg-surface-elevated text-brand-titanium border border-white/[0.08] px-3 py-1 font-semibold text-[10px] tracking-wider uppercase">
            Strategic Decision Dashboard
          </Badge>
          <h1 className="mt-2 text-3xl font-bold text-white md:text-4xl font-orbitron tracking-[0.12em] uppercase">
            Reports & Decision Intelligence Center
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-secondary-foreground">
            Generate AI-synthesized climate security memos, carry out comparative studies, and access structural recommendations for NDMA and state operations.
          </p>
        </div>
      </div>

      {/* ─── MAIN WORKSPACE ──────────────────────────────────────────── */}
      <div className="grid gap-6 xl:grid-cols-[280px_1fr] items-start no-print">
        
        {/* LEFT COLUMN: Report history library */}
        <div className="grid gap-5">
          <Card className="glass-card border-white/5 bg-surface/20 p-4 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-brand-blue" /> Report Library
              </span>
              <Badge className="bg-surface-elevated border-white/[0.08] text-brand-titanium text-[9px] font-bold">
                {history.length} Saved Memos
              </Badge>
            </div>
            
            {/* Search and filters */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search memos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8 pl-8 text-xs bg-background/60 border-slate-800 text-white placeholder:text-muted-foreground"
              />
            </div>
            
            {/* Library list */}
            <div className="max-h-[360px] overflow-y-auto space-y-2 pr-1 scrollbar-thin">
              {filteredHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-xs">
                  No saved reports found.
                </div>
              ) : (
                filteredHistory.map((rep) => {
                  const isRenaming = renamingId === rep.id;
                  const isActive = generatedReport?.id === rep.id;
                  
                  return (
                    <div 
                      key={rep.id} 
                      className={`group rounded-lg border p-2.5 transition-all cursor-pointer ${
                        isActive 
                          ? "border-white/[0.08] bg-brand-blue/10" 
                          : "border-slate-800 bg-surface/35 hover:border-slate-700"
                      }`}
                      onClick={() => !isRenaming && handleLoadReport(rep)}
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="flex-1 min-w-0">
                          {isRenaming ? (
                            <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                              <Input
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                className="h-7 text-xs px-2 py-0 bg-background text-white"
                                autoFocus
                              />
                              <Button size="sm" onClick={handleSaveRename} className="h-7 px-2 bg-brand-blue text-slate-950 font-bold text-xs">Save</Button>
                            </div>
                          ) : (
                            <p className="text-xs font-semibold text-white truncate group-hover:text-brand-titanium transition-colors">
                              {rep.name}
                            </p>
                          )}
                          <div className="mt-1 flex items-center gap-1.5 text-[9px] text-muted-foreground">
                            <span className="font-mono text-brand-blue">{rep.refNo.split("-")[2]} AD</span>
                            <span>·</span>
                            <span>{rep.dateCompiled}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Hover Actions */}
                      <div className="mt-2 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                        <button 
                          onClick={() => handleStartRename(rep)}
                          className="p-1 text-[9px] text-muted-foreground hover:text-brand-titanium bg-white/5 rounded border border-white/5"
                        >
                          Rename
                        </button>
                        <button 
                          onClick={() => handleDuplicateReport(rep)}
                          className="p-1 text-[9px] text-muted-foreground hover:text-brand-titanium bg-white/5 rounded border border-white/5"
                          title="Duplicate"
                        >
                          <Copy className="w-2.5 h-2.5" />
                        </button>
                        <button 
                          onClick={() => handleDeleteReport(rep.id)}
                          className="p-1 text-[9px] text-rose-400 hover:bg-rose-500/10 bg-white/5 rounded border border-white/5"
                          title="Delete"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>

        {/* RIGHT COLUMN: Configuration Panel + Generated Report Preview */}
        <div className="grid gap-6">
          
          {/* CONFIGURATION CARD */}
          <Card className="glass-card border-white/5">
            <CardHeader className="pb-3 border-b border-white/5">
              <CardTitle className="text-base text-white flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-brand-blue" /> Configure Climate Memorandum Parameters
              </CardTitle>
              <CardDescription className="text-muted-foreground text-xs">
                Select target districts, timeframe ranges, and scenario metrics to initiate AI synthesis.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 grid gap-4 md:grid-cols-3">
              {/* Report Type selector */}
              <div className="grid gap-1.5">
                <label className="text-[10px] font-bold uppercase text-muted-foreground">Report Template Type</label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full bg-background/70 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-emerald-400"
                >
                  <option value="district_climate">District Climate Report</option>
                  <option value="state_climate">State Climate Report</option>
                  <option value="flood_assessment">Flood Risk Assessment</option>
                  <option value="drought_assessment">Drought Assessment</option>
                  <option value="heatwave_assessment">Heatwave Assessment</option>
                  <option value="water_stress">Water Stress Report</option>
                  <option value="climate_resilience">Climate Resilience Report</option>
                  <option value="agriculture_impact">Agriculture Impact Report</option>
                  <option value="disaster_preparedness">Disaster Preparedness Report</option>
                  <option value="executive_summary">Executive Summary Report</option>
                  <option value="mission_brief">Operational Response Brief</option>
                </select>
              </div>

              {/* State Filter Selector */}
              <div className="grid gap-1.5">
                <label className="text-[10px] font-bold uppercase text-muted-foreground">State / Territory Filter</label>
                <select
                  value={selectedStateId}
                  onChange={(e) => setSelectedStateId(e.target.value)}
                  className="w-full bg-background/70 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-emerald-400"
                >
                  <option value="all">All States</option>
                  {states.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Target Area selector */}
              <div className="grid gap-1.5">
                <label className="text-[10px] font-bold uppercase text-muted-foreground">Target District Location</label>
                <select
                  value={districtId}
                  onChange={(e) => setDistrictId(Number(e.target.value))}
                  className="w-full bg-background/70 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-emerald-400"
                >
                  {filteredDistricts.map((d) => (
                    <option key={d.id} value={d.id}>{d.name} ({d.state_name})</option>
                  ))}
                </select>
              </div>

              {/* Year Scenario selector */}
              <div className="grid gap-1.5">
                <label className="text-[10px] font-bold uppercase text-muted-foreground">Target Forecast Year</label>
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="w-full bg-background/70 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-emerald-400"
                >
                  {[2020, 2026, 2030, 2040, 2050].map((y) => (
                    <option key={y} value={y}>{y} AD Horizon</option>
                  ))}
                </select>
              </div>

              {/* Climate Parameter Focus Selector */}
              <div className="grid gap-1.5">
                <label className="text-[10px] font-bold uppercase text-muted-foreground">Climate Parameter Focus</label>
                <select
                  value={climateParameter}
                  onChange={(e) => setClimateParameter(e.target.value)}
                  className="w-full bg-background/70 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-emerald-400"
                >
                  <option value="all">All Parameters</option>
                  <option value="temperature">Temperature Trends</option>
                  <option value="rainfall">Rainfall Trends</option>
                  <option value="aqi">AQI Trends</option>
                  <option value="flood_risk">Flood Risk Index</option>
                  <option value="drought_risk">Drought Risk Index</option>
                  <option value="heatwave_risk">Heatwave Risk Index</option>
                  <option value="water_stress">Water Stress Index</option>
                  <option value="ndvi">NDVI Vegetation</option>
                  <option value="population_at_risk">Population Exposure</option>
                </select>
              </div>

              {/* Disaster Risk type filter */}
              <div className="grid gap-1.5">
                <label className="text-[10px] font-bold uppercase text-muted-foreground">Disaster Category filter</label>
                <select
                  value={disasterType}
                  onChange={(e) => setDisasterType(e.target.value)}
                  className="w-full bg-background/70 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-emerald-400"
                >
                  <option value="all">All Hazards (Combo)</option>
                  <option value="flood">Flood Inundation</option>
                  <option value="drought">Agricultural Drought</option>
                  <option value="heatwave">Convective Heatwave</option>
                </select>
              </div>

              {/* Date ranges */}
              <div className="grid gap-1.5">
                <label className="text-[10px] font-bold uppercase text-muted-foreground">Start Range Date</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-8.5 bg-background/70 border-slate-800 text-xs text-white"
                />
              </div>

              <div className="grid gap-1.5">
                <label className="text-[10px] font-bold uppercase text-muted-foreground">End Range Date</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-8.5 bg-background/70 border-slate-800 text-xs text-white"
                />
              </div>

              {/* Risk Level Category */}
              <div className="grid gap-1.5">
                <label className="text-[10px] font-bold uppercase text-muted-foreground">Risk Threshold</label>
                <select
                  value={riskLevelFilter}
                  onChange={(e) => setRiskLevelFilter(e.target.value)}
                  className="w-full bg-background/70 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-emerald-400"
                >
                  <option value="all">All Thresholds</option>
                  <option value="safe">Safe Only (&lt;35)</option>
                  <option value="moderate">Moderate Only (35-60)</option>
                  <option value="high">High Only (60-80)</option>
                  <option value="critical">Critical Only (&gt;80)</option>
                </select>
              </div>

              {/* Sector Focus selector */}
              <div className="grid gap-1.5">
                <label className="text-[10px] font-bold uppercase text-muted-foreground">Primary Sector Focus</label>
                <select
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  className="w-full bg-background/70 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-emerald-400"
                >
                  <option value="water">Water Resources & Storage</option>
                  <option value="agriculture">Agricultural Crops & Drought</option>
                  <option value="infrastructure">Coastal & Flood Infrastructure</option>
                  <option value="health">Public Health & Extreme Heat</option>
                </select>
              </div>

              {/* COMPARATIVE TOGGLE */}
              <div className="flex flex-col justify-end gap-1.5">
                <div className="flex items-center gap-2.5 rounded-lg border border-slate-800 bg-background/40 p-2 text-xs">
                  <input
                    type="checkbox"
                    id="compare-check"
                    checked={isComparison}
                    onChange={(e) => setIsComparison(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-brand-blue focus:ring-emerald-400 bg-background border-slate-800"
                  />
                  <label htmlFor="compare-check" className="font-semibold text-secondary-foreground cursor-pointer">
                    Enable Location Comparison
                  </label>
                </div>
              </div>

              {/* COMPARATIVE SELECTOR (Visible only if toggle active) */}
              {isComparison && (
                <div className="grid gap-1.5 md:col-span-3 border-t border-white/[0.08] pt-4 mt-1 animate-fade-in">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="grid gap-1.5">
                      <label className="text-[10px] font-bold uppercase text-brand-blue">Bilateral Comparison State</label>
                      <select
                        value={compareStateId}
                        onChange={(e) => setCompareStateId(e.target.value)}
                        className="w-full bg-background/70 border border-white/[0.08] rounded-lg p-2 text-xs text-white focus:outline-none focus:border-emerald-400"
                      >
                        <option value="all">All States</option>
                        {states.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid gap-1.5">
                      <label className="text-[10px] font-bold uppercase text-brand-blue">Bilateral Comparison Location</label>
                      <select
                        value={compareDistrictId}
                        onChange={(e) => setCompareDistrictId(Number(e.target.value))}
                        className="w-full bg-background/70 border border-white/[0.08] rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-400"
                      >
                        {filteredCompareDistricts.map((d) => (
                          <option key={d.id} value={d.id}>{d.name} ({d.state_name})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground leading-normal">
                    Comparing <span className="text-white font-semibold">{district.name} ({district.state_name})</span> side-by-side with <span className="text-brand-titanium font-semibold">{compareDistrict.name} ({compareDistrict.state_name})</span>.
                  </div>
                </div>
              )}

              {/* Action trigger button */}
              <div className="md:col-span-3 flex justify-end mt-2">
                <Button 
                  onClick={handleGenerate}
                  disabled={generating}
                  className="bg-brand-blue hover:bg-brand-blue text-slate-950 font-bold px-6 py-2 gap-2 shadow-[0_0_15px_rgba(6,182,212,0.25)] rounded-full text-xs"
                >
                  {generating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Synthesizing Operations Intelligence...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" /> Synthesize Decision intelligence
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* EMPTY STATE */}
          {!generatedReport && !generating && (
            <div className="grid min-h-[360px] place-items-center rounded-2xl border border-dashed border-white/[0.08] text-center text-sm text-muted-foreground bg-background/10">
              <div>
                <FileText className="h-10 w-10 mx-auto text-slate-700 mb-3" />
                <p className="font-semibold text-muted-foreground">Decision Intelligence Center Idle</p>
                <p className="max-w-md mt-1.5 text-xs text-muted-foreground leading-relaxed">
                  Provide configuration variables on the panel above or load a historical memorandum from the library to generate your certified memorandum.
                </p>
              </div>
            </div>
          )}

          {/* LOADING GENERATION STATE */}
          {generating && (
            <div className="grid min-h-[360px] place-items-center rounded-2xl border border-white/[0.08] text-center text-sm text-secondary-foreground bg-background/20 animate-pulse">
              <div>
                <Bot className="h-10 w-10 mx-auto text-brand-blue mb-4 animate-bounce" />
                <p className="font-bold text-white uppercase tracking-wider text-xs">Consulting Neural Forecasting Engine</p>
                <p className="max-w-md mt-1 text-[11px] text-muted-foreground leading-normal">
                  Fusing satellite rainfall grids with IMD daily temperature datasets, computing population multipliers, and establishing adaptation contingencies...
                </p>
              </div>
            </div>
          )}

          {/* GENERATED MEMORANDUM DOCUMENT PREVIEW */}
          {generatedReport && !generating && (
            <>
            <Card className="glass-card overflow-hidden animate-fade-in border-white/[0.08] shadow-[0_0_40px_rgba(6,182,212,0.05)]">
              
              {/* Document Actions bar */}
              <CardHeader className="flex flex-row items-center justify-between border-b border-white/[0.08] pb-4 no-print flex-wrap gap-3">
                <div>
                  <CardTitle className="text-white text-base">Decision Advisory Preview</CardTitle>
                  <CardDescription className="text-muted-foreground text-xs">Government-grade climate security advisory ready for export.</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => setPresentationActive(true)} size="sm" className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs gap-1.5 rounded-full shadow-[0_0_15px_rgba(147,51,234,0.3)]">
                    <Play className="h-3.5 w-3.5" /> Presentation Mode
                  </Button>
                  <Button onClick={handleDownloadPDF} size="sm" className="bg-brand-blue hover:bg-brand-blue/80 text-slate-950 font-bold text-xs gap-1.5 rounded-full">
                    <Download className="h-3.5 w-3.5" /> Download PDF
                  </Button>
                  <Button onClick={handlePrint} size="sm" variant="outline" className="border-slate-800 hover:bg-surface-elevated text-secondary-foreground text-xs gap-1.5 font-bold rounded-full">
                    <Printer className="h-3.5 w-3.5" /> Print Preview
                  </Button>
                  <Button onClick={handleExportCSV} size="sm" variant="outline" className="border-slate-800 hover:bg-surface-elevated text-secondary-foreground text-xs gap-1.5 font-bold rounded-full">
                    <FileSpreadsheet className="h-3.5 w-3.5" /> Export CSV
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="pt-6 select-text">
                <div id="print-area" className="border border-white/[0.08] rounded-2xl p-8 bg-surface/10 text-secondary-foreground font-serif leading-relaxed relative overflow-hidden shadow-2xl">
                  
                  {/* Decorative background grid and emblem for print styling */}
                  <div className="absolute inset-0 bg-radar-grid bg-[size:40px_40px] opacity-[0.03] pointer-events-none" />
                  
                  {/* MEMORANDUM HEADER */}
                  <div className="border-b-2 border-slate-700 pb-6 text-center flex flex-col items-center relative z-10">
                    <div className="w-10 h-10 rounded bg-brand-blue/10 border border-white/[0.08] grid place-items-center text-brand-blue mb-2">
                      <ShieldCheck className="h-6 w-6" />
                    </div>
                    <h2 className="text-base font-extrabold tracking-[0.15em] text-white uppercase font-sans">
                      Government of India — Paryavaran Bharat Command
                    </h2>
                    <p className="text-[9px] tracking-widest text-brand-titanium font-sans font-bold mt-1.5 uppercase">
                      National Security Advisory & Mitigation Memorandum
                    </p>
                  </div>

                  {/* MEMORANDUM METADATA */}
                  <div className="grid grid-cols-2 gap-4 text-xs font-sans border-b border-slate-800 py-5 text-muted-foreground relative z-10">
                    <div>
                      <span className="font-bold block text-muted-foreground text-[10px] tracking-wider">REF INDEX NUMBER:</span>
                      <span className="font-mono text-white text-[11.5px] font-bold">{generatedReport.refNo}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold block text-muted-foreground text-[10px] tracking-wider">DATE OF INGEST:</span>
                      <span className="text-white font-bold">{generatedReport.dateCompiled}</span>
                    </div>
                    <div>
                      <span className="font-bold block text-muted-foreground text-[10px] tracking-wider">LOCATION FOCUS:</span>
                      <span className="text-white font-semibold">
                        {generatedReport.districtName} District, {generatedReport.stateName}
                        {generatedReport.isComparison && (
                          <span className="text-brand-titanium font-bold"> vs {generatedReport.compareDistrictName} ({generatedReport.compareStateName})</span>
                        )}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold block text-muted-foreground text-[10px] tracking-wider">SCENARIO TARGET:</span>
                      <span className="text-brand-titanium font-bold tracking-wider">{generatedReport.year} AD Climate Model</span>
                    </div>
                  </div>

                  {/* SUMMARY SECTION */}
                  <div className="py-6 space-y-6 text-sm font-serif text-secondary-foreground relative z-10">
                    
                    <div>
                      <h4 className="text-[10px] font-bold font-sans uppercase tracking-[0.12em] text-brand-titanium mb-2.5 flex items-center gap-1.5 border-b border-white/[0.08] pb-1">
                        <FileText className="w-3.5 h-3.5 text-brand-blue" /> I. Executive Summary
                      </h4>
                      <p className="text-justify indent-8 leading-relaxed font-normal">{reportNarrative?.summary}</p>
                    </div>

                    <div>
                      <h4 className="text-[10px] font-bold font-sans uppercase tracking-[0.12em] text-brand-titanium mb-2.5 flex items-center gap-1.5 border-b border-white/[0.08] pb-1">
                        <Activity className="w-3.5 h-3.5 text-brand-blue" /> II. Observations & Current Conditions
                      </h4>
                      <p className="text-justify indent-8 leading-relaxed font-normal">{reportNarrative?.condition}</p>
                    </div>
                    {/* SPATIAL INTELLIGENCE MAPS */}
                    <div>
                      <h4 className="text-[10px] font-bold font-sans uppercase tracking-[0.12em] text-brand-titanium mb-4 flex items-center gap-1.5 border-b border-white/[0.08] pb-1">
                        <Globe2 className="w-3.5 h-3.5 text-brand-blue" /> III. Spatial Intelligence & Multi-Hazard Mapping
                      </h4>
                      <div className="grid gap-4 md:grid-cols-3 no-print mb-6">
                        
                        {/* Map 1: District boundary */}
                        <div className="relative group flex flex-col justify-between bg-background/40 p-3 rounded-lg border border-slate-800 select-none">
                          <div>
                            <p className="text-[10px] font-bold font-sans uppercase tracking-wider text-muted-foreground mb-1 flex items-center justify-between">
                              <span>District Boundaries Grid</span>
                              <span className="text-[9px] text-brand-blue font-mono">Interactive Talukas</span>
                            </p>
                            <p className="text-[9px] text-muted-foreground mb-2 leading-tight">Hover zones for observation forecast details.</p>
                          </div>
                          <div className="relative overflow-visible">
                            <svg viewBox="0 0 200 150" className="w-full h-36 bg-background/60 border border-slate-900 rounded-lg">
                              <line x1="20" y1="0" x2="20" y2="150" stroke="rgba(6,182,212,0.08)" strokeDasharray="2" />
                              <line x1="60" y1="0" x2="60" y2="150" stroke="rgba(6,182,212,0.08)" strokeDasharray="2" />
                              <line x1="100" y1="0" x2="100" y2="150" stroke="rgba(6,182,212,0.08)" strokeDasharray="2" />
                              <line x1="140" y1="0" x2="140" y2="150" stroke="rgba(6,182,212,0.08)" strokeDasharray="2" />
                              <line x1="180" y1="0" x2="180" y2="150" stroke="rgba(6,182,212,0.08)" strokeDasharray="2" />
                              <line x1="0" y1="30" x2="200" y2="30" stroke="rgba(6,182,212,0.08)" strokeDasharray="2" />
                              <line x1="0" y1="75" x2="200" y2="75" stroke="rgba(6,182,212,0.08)" strokeDasharray="2" />
                              <line x1="0" y1="120" x2="200" y2="120" stroke="rgba(6,182,212,0.08)" strokeDasharray="2" />
                              
                              {/* Taluka Polygons */}
                              <polygon 
                                points="45,35 100,28 100,70 45,70" 
                                fill={hoveredDistrictZone === "North Taluka" ? "rgba(6,182,212,0.18)" : "rgba(6,182,212,0.04)"} 
                                stroke={hoveredDistrictZone === "North Taluka" ? "#4DA8DA" : "rgba(6,182,212,0.3)"} 
                                strokeWidth={hoveredDistrictZone === "North Taluka" ? "1.5" : "1"} 
                                onMouseEnter={() => setHoveredDistrictZone("North Taluka")} 
                                onMouseLeave={() => setHoveredDistrictZone(null)}
                                className="cursor-pointer transition-all duration-200" 
                              />
                              <polygon 
                                points="100,28 125,25 165,55 100,70" 
                                fill={hoveredDistrictZone === "East Taluka" ? "rgba(6,182,212,0.18)" : "rgba(6,182,212,0.04)"} 
                                stroke={hoveredDistrictZone === "East Taluka" ? "#4DA8DA" : "rgba(6,182,212,0.3)"} 
                                strokeWidth={hoveredDistrictZone === "East Taluka" ? "1.5" : "1"} 
                                onMouseEnter={() => setHoveredDistrictZone("East Taluka")} 
                                onMouseLeave={() => setHoveredDistrictZone(null)}
                                className="cursor-pointer transition-all duration-200" 
                              />
                              <polygon 
                                points="100,70 145,115 75,125 100,70" 
                                fill={hoveredDistrictZone === "South Taluka" ? "rgba(6,182,212,0.18)" : "rgba(6,182,212,0.04)"} 
                                stroke={hoveredDistrictZone === "South Taluka" ? "#4DA8DA" : "rgba(6,182,212,0.3)"} 
                                strokeWidth={hoveredDistrictZone === "South Taluka" ? "1.5" : "1"} 
                                onMouseEnter={() => setHoveredDistrictZone("South Taluka")} 
                                onMouseLeave={() => setHoveredDistrictZone(null)}
                                className="cursor-pointer transition-all duration-200" 
                              />
                              <polygon 
                                points="45,35 100,70 75,125 35,85" 
                                fill={hoveredDistrictZone === "West Taluka" ? "rgba(6,182,212,0.18)" : "rgba(6,182,212,0.04)"} 
                                stroke={hoveredDistrictZone === "West Taluka" ? "#4DA8DA" : "rgba(6,182,212,0.3)"} 
                                strokeWidth={hoveredDistrictZone === "West Taluka" ? "1.5" : "1"} 
                                onMouseEnter={() => setHoveredDistrictZone("West Taluka")} 
                                onMouseLeave={() => setHoveredDistrictZone(null)}
                                className="cursor-pointer transition-all duration-200" 
                              />
                              
                              <circle cx="100" cy="70" r="3.5" fill="#4DA8DA" className="pointer-events-none" />
                              <text x="105" y="73" fill="#4DA8DA" fontSize="8" fontWeight="bold" fontFamily="sans-serif" className="pointer-events-none">{generatedReport.districtName}</text>
                              <text x="10" y="142" fill="#64748b" fontSize="7" fontFamily="monospace" className="pointer-events-none">MODEL ACC: SSP5-8.5</text>
                            </svg>

                            {/* Floating Observations Box for District Zone */}
                            {hoveredDistrictZone && districtZoneForecasts[hoveredDistrictZone] && (
                              <div className="absolute z-30 p-2.5 rounded-lg border border-white/[0.08] bg-background/95 shadow-2xl text-[9px] text-secondary-foreground w-44 font-sans leading-normal pointer-events-none transition-all" style={{ top: '10px', left: '10px' }}>
                                <p className="font-bold text-brand-titanium border-b border-white/5 pb-0.5 flex items-center justify-between">
                                  <span>{hoveredDistrictZone}</span>
                                  <span className="text-[7.5px] px-1 bg-brand-blue text-brand-titanium rounded uppercase font-mono">Risk: {districtZoneForecasts[hoveredDistrictZone].risk}%</span>
                                </p>
                                <p className="mt-1 font-semibold text-white font-mono">Temp: {districtZoneForecasts[hoveredDistrictZone].temp}°C | Precip: {districtZoneForecasts[hoveredDistrictZone].rainfall}mm</p>
                                <p className="text-muted-foreground mt-0.5 leading-tight text-[8px]">Soil: {districtZoneForecasts[hoveredDistrictZone].soil}</p>
                                <p className="text-rose-300 mt-0.5 font-bold">{districtZoneForecasts[hoveredDistrictZone].warning}</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Map 2: State positioning (Interactive India Map) */}
                        <div className="relative group flex flex-col justify-between bg-background/40 p-3 rounded-lg border border-slate-800 select-none">
                          <div>
                            <p className="text-[10px] font-bold font-sans uppercase tracking-wider text-muted-foreground mb-1 flex items-center justify-between">
                              <span>National Climate Threat Map</span>
                              <span className="text-[9px] text-brand-blue font-mono">Click to Select State</span>
                            </p>
                            <p className="text-[9px] text-muted-foreground mb-2 leading-tight">Hover states for weather alerts & forecasts.</p>
                          </div>
                          <div className="relative overflow-visible">
                            <svg viewBox="0 0 200 150" className="w-full h-36 bg-background/60 border border-slate-900 rounded-lg">
                              {/* India major state outline polygons */}
                              {/* Rajasthan */}
                              <polygon 
                                points="40,40 70,30 85,55 65,80 40,65" 
                                fill={hoveredStateName === "Rajasthan" ? "rgba(244,63,94,0.35)" : "#f43f5e"} 
                                fillOpacity={hoveredStateName === "Rajasthan" ? 0.45 : 0.2}
                                stroke={hoveredStateName === "Rajasthan" ? "#f43f5e" : "rgba(244,63,94,0.5)"} 
                                strokeWidth={hoveredStateName === "Rajasthan" ? "1.5" : "1"} 
                                onMouseEnter={() => setHoveredStateName("Rajasthan")} 
                                onMouseLeave={() => setHoveredStateName(null)}
                                onClick={() => { setSelectedStateId("3"); showToast("State focus: Rajasthan"); }}
                                className="cursor-pointer transition-all duration-200" 
                              />
                              {/* Gujarat */}
                              <polygon 
                                points="25,75 50,80 60,95 35,100 20,90" 
                                fill={hoveredStateName === "Gujarat" ? "rgba(77, 168, 218,0.35)" : "#4DA8DA"} 
                                fillOpacity={hoveredStateName === "Gujarat" ? 0.45 : 0.2}
                                stroke={hoveredStateName === "Gujarat" ? "#4DA8DA" : "rgba(77, 168, 218,0.5)"} 
                                strokeWidth={hoveredStateName === "Gujarat" ? "1.5" : "1"} 
                                onMouseEnter={() => setHoveredStateName("Gujarat")} 
                                onMouseLeave={() => setHoveredStateName(null)}
                                onClick={() => { setSelectedStateId("5"); showToast("State focus: Gujarat"); }}
                                className="cursor-pointer transition-all duration-200" 
                              />
                              {/* Maharashtra */}
                              <polygon 
                                points="55,90 95,85 100,115 65,130 50,115" 
                                fill={hoveredStateName === "Maharashtra" ? "rgba(251,146,60,0.35)" : "#fb923c"} 
                                fillOpacity={hoveredStateName === "Maharashtra" ? 0.45 : 0.2}
                                stroke={hoveredStateName === "Maharashtra" ? "#fb923c" : "rgba(251,146,60,0.5)"} 
                                strokeWidth={hoveredStateName === "Maharashtra" ? "1.5" : "1"} 
                                onMouseEnter={() => setHoveredStateName("Maharashtra")} 
                                onMouseLeave={() => setHoveredStateName(null)}
                                onClick={() => { setSelectedStateId("1"); showToast("State focus: Maharashtra"); }}
                                className="cursor-pointer transition-all duration-200" 
                              />
                              {/* Karnataka */}
                              <polygon 
                                points="58,130 78,125 85,160 65,170" 
                                fill={hoveredStateName === "Karnataka" ? "rgba(34, 197, 94,0.35)" : "#22C55E"} 
                                fillOpacity={hoveredStateName === "Karnataka" ? 0.45 : 0.2}
                                stroke={hoveredStateName === "Karnataka" ? "#22C55E" : "rgba(34, 197, 94,0.5)"} 
                                strokeWidth={hoveredStateName === "Karnataka" ? "1.5" : "1"} 
                                onMouseEnter={() => setHoveredStateName("Karnataka")} 
                                onMouseLeave={() => setHoveredStateName(null)}
                                onClick={() => { setSelectedStateId("6"); showToast("State focus: Karnataka"); }}
                                className="cursor-pointer transition-all duration-200" 
                              />
                              {/* Tamil Nadu */}
                              <polygon 
                                points="78,160 92,155 98,180 82,180" 
                                fill={hoveredStateName === "Tamil Nadu" ? "rgba(34, 197, 94,0.35)" : "#22C55E"} 
                                fillOpacity={hoveredStateName === "Tamil Nadu" ? 0.45 : 0.2}
                                stroke={hoveredStateName === "Tamil Nadu" ? "#22C55E" : "rgba(34, 197, 94,0.5)"} 
                                strokeWidth={hoveredStateName === "Tamil Nadu" ? "1.5" : "1"} 
                                onMouseEnter={() => setHoveredStateName("Tamil Nadu")} 
                                onMouseLeave={() => setHoveredStateName(null)}
                                onClick={() => { setSelectedStateId("4"); showToast("State focus: Tamil Nadu"); }}
                                className="cursor-pointer transition-all duration-200" 
                              />
                              {/* Uttar Pradesh */}
                              <polygon 
                                points="85,45 125,40 135,65 100,75" 
                                fill={hoveredStateName === "Uttar Pradesh" ? "rgba(251,146,60,0.35)" : "#fb923c"} 
                                fillOpacity={hoveredStateName === "Uttar Pradesh" ? 0.45 : 0.2}
                                stroke={hoveredStateName === "Uttar Pradesh" ? "#fb923c" : "rgba(251,146,60,0.5)"} 
                                strokeWidth={hoveredStateName === "Uttar Pradesh" ? "1.5" : "1"} 
                                onMouseEnter={() => setHoveredStateName("Uttar Pradesh")} 
                                onMouseLeave={() => setHoveredStateName(null)}
                                onClick={() => { setSelectedStateId("8"); showToast("State focus: Uttar Pradesh"); }}
                                className="cursor-pointer transition-all duration-200" 
                              />
                              {/* West Bengal */}
                              <polygon 
                                points="140,70 160,70 155,100 140,100" 
                                fill={hoveredStateName === "West Bengal" ? "rgba(251,146,60,0.35)" : "#fb923c"} 
                                fillOpacity={hoveredStateName === "West Bengal" ? 0.45 : 0.2}
                                stroke={hoveredStateName === "West Bengal" ? "#fb923c" : "rgba(251,146,60,0.5)"} 
                                strokeWidth={hoveredStateName === "West Bengal" ? "1.5" : "1"} 
                                onMouseEnter={() => setHoveredStateName("West Bengal")} 
                                onMouseLeave={() => setHoveredStateName(null)}
                                onClick={() => { setSelectedStateId("7"); showToast("State focus: West Bengal"); }}
                                className="cursor-pointer transition-all duration-200" 
                              />
                              {/* Assam */}
                              <polygon 
                                points="170,55 195,50 190,70 165,70" 
                                fill={hoveredStateName === "Assam" ? "rgba(244,63,94,0.35)" : "#f43f5e"} 
                                fillOpacity={hoveredStateName === "Assam" ? 0.45 : 0.2}
                                stroke={hoveredStateName === "Assam" ? "#f43f5e" : "rgba(244,63,94,0.5)"} 
                                strokeWidth={hoveredStateName === "Assam" ? "1.5" : "1"} 
                                onMouseEnter={() => setHoveredStateName("Assam")} 
                                onMouseLeave={() => setHoveredStateName(null)}
                                onClick={() => { setSelectedStateId("2"); showToast("State focus: Assam"); }}
                                className="cursor-pointer transition-all duration-200" 
                              />
                              
                              {/* Dynamic glowing target indicator for currently selected district's state */}
                              {district && (
                                <>
                                  <circle cx={district.state_id === 3 ? 62 : district.state_id === 1 ? 75 : district.state_id === 2 ? 180 : district.state_id === 4 ? 88 : district.state_id === 5 ? 42 : district.state_id === 6 ? 72 : district.state_id === 7 ? 150 : 110} cy={district.state_id === 3 ? 55 : district.state_id === 1 ? 110 : district.state_id === 2 ? 60 : district.state_id === 4 ? 170 : district.state_id === 5 ? 88 : district.state_id === 6 ? 148 : district.state_id === 7 ? 85 : 58} r="3" fill="#4DA8DA" className="pointer-events-none" />
                                  <circle cx={district.state_id === 3 ? 62 : district.state_id === 1 ? 75 : district.state_id === 2 ? 180 : district.state_id === 4 ? 88 : district.state_id === 5 ? 42 : district.state_id === 6 ? 72 : district.state_id === 7 ? 150 : 110} cy={district.state_id === 3 ? 55 : district.state_id === 1 ? 110 : district.state_id === 2 ? 60 : district.state_id === 4 ? 170 : district.state_id === 5 ? 88 : district.state_id === 6 ? 148 : district.state_id === 7 ? 85 : 58} r="8" fill="none" stroke="#4DA8DA" strokeWidth="1" className="animate-ping pointer-events-none" />
                                </>
                              )}

                              {/* Risk Legend Graphic inside SVG */}
                              <g transform="translate(10, 110)" className="pointer-events-none">
                                <rect x="0" y="0" width="8" height="6" fill="#22C55E" />
                                <rect x="10" y="0" width="8" height="6" fill="#fb923c" />
                                <rect x="20" y="0" width="8" height="6" fill="#4DA8DA" />
                                <rect x="30" y="0" width="8" height="6" fill="#f43f5e" />
                                <text x="0" y="14" fill="#64748b" fontSize="6" fontFamily="sans-serif">Normal</text>
                                <text x="30" y="14" fill="#f43f5e" fontSize="6" fontFamily="sans-serif" fontWeight="bold">Critical</text>
                              </g>
                            </svg>

                            {/* Floating Observations Box for State */}
                            {hoveredStateName && stateForecasts[hoveredStateName] && (
                              <div className="absolute z-30 p-2.5 rounded-lg border border-white/[0.08] bg-background/95 shadow-2xl text-[9px] text-secondary-foreground w-44 font-sans leading-normal pointer-events-none transition-all" style={{ top: '10px', left: '10px' }}>
                                <p className="font-bold text-brand-titanium border-b border-white/5 pb-0.5 flex items-center justify-between">
                                  <span>{hoveredStateName}</span>
                                  <span className="text-[7.5px] px-1 bg-brand-blue text-brand-titanium rounded uppercase font-mono">{stateForecasts[hoveredStateName].alert}</span>
                                </p>
                                <p className="mt-1 font-semibold text-white font-mono">Temp: {stateForecasts[hoveredStateName].temp}°C | Risk: {stateForecasts[hoveredStateName].risk}%</p>
                                <p className="text-muted-foreground mt-0.5 leading-tight">{stateForecasts[hoveredStateName].forecast}</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Map 3: Risk Heatmap */}
                        <div className="relative group flex flex-col justify-between bg-background/40 p-3 rounded-lg border border-slate-800 select-none">
                          <div>
                            <p className="text-[10px] font-bold font-sans uppercase tracking-wider text-muted-foreground mb-1 flex items-center justify-between">
                              <span>Multi-Hazard Risk Heatmap</span>
                              <span className="text-[9px] text-rose-400 font-mono">Radar Hotspots</span>
                            </p>
                            <p className="text-[9px] text-muted-foreground mb-2 leading-tight">Hover hotspots for specific observation summaries.</p>
                          </div>
                          <div className="relative overflow-visible">
                            <svg viewBox="0 0 200 150" className="w-full h-36 bg-background/60 border border-slate-900 rounded-lg relative overflow-hidden">
                              <defs>
                                <radialGradient id="heat-glow-rep" cx="50%" cy="50%" r="50%">
                                  <stop offset="0%" stopColor={ranking.composite_risk > 60 ? "#ef4444" : "#eab308"} stopOpacity="0.4" />
                                  <stop offset="70%" stopColor={ranking.composite_risk > 60 ? "#ef4444" : "#eab308"} stopOpacity="0.08" />
                                  <stop offset="100%" stopColor="#091220" stopOpacity="0" />
                                </radialGradient>
                              </defs>
                              
                              <circle cx="110" cy="65" r="45" fill="url(#heat-glow-rep)" className="pointer-events-none" />
                              <circle cx="75" cy="80" r="28" fill="url(#heat-glow-rep)" opacity="0.7" className="pointer-events-none" />
                              
                              <path d="M 55,65 Q 105,45 135,75" fill="none" stroke="rgba(239,68,68,0.2)" strokeWidth="0.8" strokeDasharray="3" className="pointer-events-none" />
                              <path d="M 45,75 Q 105,55 125,85" fill="none" stroke="rgba(239,68,68,0.12)" strokeWidth="0.8" strokeDasharray="3" className="pointer-events-none" />
                              
                              {/* Interactive Hotspots circles */}
                              {/* River Basin Spot */}
                              <circle 
                                cx="110" 
                                cy="65" 
                                r="12" 
                                fill={hoveredHeatspot === "basin" ? "rgba(239,68,68,0.2)" : "rgba(239,68,68,0.05)"} 
                                stroke="#ef4444" 
                                strokeWidth={hoveredHeatspot === "basin" ? "1.5" : "1"} 
                                onMouseEnter={() => setHoveredHeatspot("basin")} 
                                onMouseLeave={() => setHoveredHeatspot(null)}
                                className="cursor-pointer transition-all duration-200" 
                              />
                              {/* Urban Spot */}
                              <circle 
                                cx="75" 
                                cy="80" 
                                r="10" 
                                fill={hoveredHeatspot === "urban" ? "rgba(77, 168, 218,0.2)" : "rgba(77, 168, 218,0.05)"} 
                                stroke="#4DA8DA" 
                                strokeWidth={hoveredHeatspot === "urban" ? "1.5" : "1"} 
                                onMouseEnter={() => setHoveredHeatspot("urban")} 
                                onMouseLeave={() => setHoveredHeatspot(null)}
                                className="cursor-pointer transition-all duration-200" 
                              />
                              {/* Farm Spot */}
                              <circle 
                                cx="140" 
                                cy="110" 
                                r="9" 
                                fill={hoveredHeatspot === "farm" ? "rgba(34, 197, 94,0.2)" : "rgba(34, 197, 94,0.05)"} 
                                stroke="#22C55E" 
                                strokeWidth={hoveredHeatspot === "farm" ? "1.5" : "1"} 
                                onMouseEnter={() => setHoveredHeatspot("farm")} 
                                onMouseLeave={() => setHoveredHeatspot(null)}
                                className="cursor-pointer transition-all duration-200" 
                              />
                              
                              <text x="10" y="20" fill="#f87171" fontSize="8" fontWeight="bold" fontFamily="sans-serif" className="pointer-events-none">HEAT CONTROLS</text>
                              <text x="125" y="142" fill="#C0C8D4" fontSize="8" fontFamily="monospace" className="pointer-events-none">{ranking.composite_risk}% composite</text>
                            </svg>

                            {/* Floating Observations Box for Heatspot */}
                            {hoveredHeatspot && heatmapHotspotForecasts[hoveredHeatspot] && (
                              <div className="absolute z-30 p-2.5 rounded-lg border border-rose-400/40 bg-background/95 shadow-2xl text-[9px] text-secondary-foreground w-44 font-sans leading-normal pointer-events-none transition-all" style={{ top: '10px', left: '10px' }}>
                                <p className="font-bold text-rose-400 border-b border-white/5 pb-0.5">
                                  {heatmapHotspotForecasts[hoveredHeatspot].title}
                                </p>
                                <p className="mt-1 font-semibold text-white font-mono">Status: {heatmapHotspotForecasts[hoveredHeatspot].risk}</p>
                                <p className="text-muted-foreground mt-0.5 leading-tight text-[8.5px]">{heatmapHotspotForecasts[hoveredHeatspot].desc}</p>
                              </div>
                            )}
                          </div>
                        </div>

                      </div>
                    </div>

                    {/* CHARTS CONTAINER (Publication-ready visuals) */}
                    <div>
                      <h4 className="text-[10px] font-bold font-sans uppercase tracking-[0.12em] text-brand-titanium mb-4 flex items-center gap-1.5 border-b border-white/[0.08] pb-1">
                        <TrendingUp className="w-3.5 h-3.5 text-brand-blue" /> IV. Climate Charts & Analytical Trends
                      </h4>
                      
                      <div className="grid gap-4 md:grid-cols-2 mb-6 no-print">
                        {/* Chart 1: Rainfall trend */}
                        <div className="bg-background/50 p-3 rounded-lg border border-slate-800">
                          <p className="text-[10px] font-bold font-sans uppercase tracking-wider text-muted-foreground text-center mb-3">
                            Rainfall Trends (Monsoon Precipitation mm)
                          </p>
                          <ResponsiveContainer width="100%" height={150}>
                            <AreaChart data={reportChartData}>
                              <defs>
                                <linearGradient id="rain-grad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.35} />
                                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid stroke="rgba(148,163,184,0.06)" vertical={false} />
                              <XAxis dataKey="month" stroke="#64748b" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                              <YAxis stroke="#64748b" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                              <Tooltip contentStyle={{ background: "#091220", border: "1px solid rgba(103,232,249,0.2)", fontSize: 10 }} />
                              <Area type="monotone" dataKey="rainfall" stroke="#38bdf8" fill="url(#rain-grad)" strokeWidth={1.5} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>

                        {/* Chart 2: Temperature & Heatwave */}
                        <div className="bg-background/50 p-3 rounded-lg border border-slate-800">
                          <p className="text-[10px] font-bold font-sans uppercase tracking-wider text-muted-foreground text-center mb-3">
                            Temperature Curve & Heatwave Index
                          </p>
                          <ResponsiveContainer width="100%" height={150}>
                            <LineChart data={reportChartData}>
                              <CartesianGrid stroke="rgba(148,163,184,0.06)" vertical={false} />
                              <XAxis dataKey="month" stroke="#64748b" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                              <YAxis stroke="#64748b" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                              <Tooltip contentStyle={{ background: "#091220", border: "1px solid rgba(103,232,249,0.2)", fontSize: 10 }} />
                              <Line type="monotone" dataKey="temperature" name="Temp °C" stroke="#f87171" strokeWidth={1.5} dot={{ r: 1 }} />
                              <Line type="monotone" dataKey="heatwaveRisk" name="Heat Index %" stroke="#4DA8DA" strokeWidth={1} strokeDasharray="3 3" dot={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>

                        {/* Chart 3: AQI Trends */}
                        <div className="bg-background/50 p-3 rounded-lg border border-slate-800">
                          <p className="text-[10px] font-bold font-sans uppercase tracking-wider text-muted-foreground text-center mb-3">
                            AQI Indices & Risk Levels
                          </p>
                          <ResponsiveContainer width="100%" height={150}>
                            <BarChart data={reportChartData}>
                              <CartesianGrid stroke="rgba(148,163,184,0.06)" vertical={false} />
                              <XAxis dataKey="month" stroke="#64748b" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                              <YAxis stroke="#64748b" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                              <Tooltip contentStyle={{ background: "#091220", border: "1px solid rgba(103,232,249,0.2)", fontSize: 10 }} />
                              <Bar dataKey="aqi" fill="#a78bfa" radius={[2, 2, 0, 0]} name="AQI Score" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>

                        {/* Chart 4: Drought & Water Stress Indices */}
                        <div className="bg-background/50 p-3 rounded-lg border border-slate-800">
                          <p className="text-[10px] font-bold font-sans uppercase tracking-wider text-muted-foreground text-center mb-3">
                            Water Stress & Drought Indices
                          </p>
                          {generatedReport.isComparison ? (
                            <ResponsiveContainer width="100%" height={150}>
                              <BarChart data={[
                                { name: "Composite", [district.name]: ranking.composite_risk, [compareDistrict.name]: compareRanking.composite_risk },
                                { name: "Flood", [district.name]: ranking.flood_risk, [compareDistrict.name]: compareRanking.flood_risk },
                                { name: "Drought", [district.name]: ranking.drought_risk, [compareDistrict.name]: compareRanking.drought_risk },
                                { name: "Heat", [district.name]: ranking.heatwave_risk, [compareDistrict.name]: compareRanking.heatwave_risk },
                              ]}>
                                <CartesianGrid stroke="rgba(148,163,184,0.06)" vertical={false} />
                                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                                <YAxis stroke="#64748b" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={{ background: "#091220", border: "1px solid rgba(103,232,249,0.2)", fontSize: 10 }} />
                                <Legend wrapperStyle={{ fontSize: 9, paddingTop: 5 }} />
                                <Bar dataKey={district.name} fill="#38bdf8" radius={[2, 2, 0, 0]} />
                                <Bar dataKey={compareDistrict.name} fill="#f43f5e" radius={[2, 2, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          ) : (
                            <ResponsiveContainer width="100%" height={150}>
                              <AreaChart data={reportChartData}>
                                <CartesianGrid stroke="rgba(148,163,184,0.06)" vertical={false} />
                                <XAxis dataKey="month" stroke="#64748b" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                                <YAxis stroke="#64748b" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={{ background: "#091220", border: "1px solid rgba(103,232,249,0.2)", fontSize: 10 }} />
                                <Area type="monotone" dataKey="droughtRisk" name="Drought Index" stroke="#fb923c" fill="rgba(251,146,60,0.1)" strokeWidth={1} />
                                <Area type="monotone" dataKey="floodRisk" name="Flood Index" stroke="#6EE7B7" fill="rgba(103,232,249,0.1)" strokeWidth={1} />
                              </AreaChart>
                            </ResponsiveContainer>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* RISK & EXPOSURE METRICS (GRID) */}
                    <div>
                      <h4 className="text-[10px] font-bold font-sans uppercase tracking-[0.12em] text-brand-titanium mb-3 flex items-center gap-1.5 border-b border-white/[0.08] pb-1">
                        <Layers className="w-3.5 h-3.5 text-brand-blue" /> V. Socio-Economic Exposure & Impact Index
                      </h4>
                      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 font-sans text-center">
                        <div className="p-3 border border-slate-800 bg-background/20 rounded-lg flex flex-col justify-between items-center">
                          <Users className="w-4 h-4 text-brand-blue mb-1" />
                          <span className="text-[8.5px] text-muted-foreground font-bold uppercase">Pop. Exposure</span>
                          <span className="text-sm font-bold text-white font-mono mt-1">{Math.round(ranking.composite_risk * 1.8)}k citizens</span>
                          <div className="w-full bg-surface-elevated h-1 rounded-full mt-2 overflow-hidden">
                            <div className="bg-brand-blue h-full rounded-full" style={{ width: `${Math.min(ranking.composite_risk * 1.2, 100)}%` }} />
                          </div>
                        </div>
                        <div className="p-3 border border-slate-800 bg-background/20 rounded-lg flex flex-col justify-between items-center">
                          <Building className="w-4 h-4 text-rose-400 mb-1" />
                          <span className="text-[8.5px] text-muted-foreground font-bold uppercase">Infrastructure Risk</span>
                          <span className="text-sm font-bold text-white font-mono mt-1">{ranking.flood_risk}% Threat</span>
                          <div className="w-full bg-surface-elevated h-1 rounded-full mt-2 overflow-hidden">
                            <div className="bg-rose-500 h-full rounded-full" style={{ width: `${ranking.flood_risk}%` }} />
                          </div>
                        </div>
                        <div className="p-3 border border-slate-800 bg-background/20 rounded-lg flex flex-col justify-between items-center">
                          <Leaf className="w-4 h-4 text-brand-blue mb-1" />
                          <span className="text-[8.5px] text-muted-foreground font-bold uppercase">Agricultural Stress</span>
                          <span className="text-sm font-bold text-white font-mono mt-1">{ranking.drought_risk}% Stress</span>
                          <div className="w-full bg-surface-elevated h-1 rounded-full mt-2 overflow-hidden">
                            <div className="bg-brand-blue h-full rounded-full" style={{ width: `${ranking.drought_risk}%` }} />
                          </div>
                        </div>
                        <div className="p-3 border border-slate-800 bg-background/20 rounded-lg flex flex-col justify-between items-center">
                          <Scale className="w-4 h-4 text-brand-blue mb-1" />
                          <span className="text-[8.5px] text-muted-foreground font-bold uppercase">Economic Index</span>
                          <span className="text-sm font-bold text-white font-mono mt-1">x{((ranking.composite_risk / 100) * 2.5 + 1).toFixed(1)} Multiplier</span>
                          <div className="w-full bg-surface-elevated h-1 rounded-full mt-2 overflow-hidden">
                            <div className="bg-brand-blue h-full rounded-full" style={{ width: `${Math.min(ranking.composite_risk * 1.5, 100)}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* AI RECOMMENDATION / COGNITIVE ADVISORY */}
                    <div className="border-l-2 border-emerald-400 pl-4 bg-brand-blue/10 py-4.5 rounded-r">
                      <div className="flex items-center gap-1.5 text-brand-titanium font-bold font-sans text-xs mb-1.5">
                        <Bot className="w-4 h-4 text-brand-blue" /> AI CLIMATE COGNITIVE BRIEF
                      </div>
                      <p className="italic text-emerald-200 text-justify font-serif text-sm leading-relaxed">{reportNarrative?.aiBrief}</p>
                    </div>

                    {/* DECISION INTELLIGENCE BLOCK */}
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-bold font-sans uppercase tracking-[0.12em] text-brand-titanium mb-2.5 flex items-center gap-1.5 border-b border-white/[0.08] pb-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-brand-blue" /> VI. Decision Intelligence Advisories
                      </h4>
                      
                      <div className="space-y-3 font-sans text-xs">
                        <div className="p-3.5 border border-slate-800 bg-background/20 rounded-lg">
                          <p className="font-bold text-white text-[11px] mb-1.5 uppercase flex items-center gap-1">
                            🚨 Highest Priority Zones
                          </p>
                          <p className="text-muted-foreground font-serif leading-relaxed text-sm">{reportNarrative?.highRiskZones}</p>
                        </div>

                        <div className="p-3.5 border border-slate-800 bg-background/20 rounded-lg">
                          <p className="font-bold text-rose-400 text-[11px] mb-1.5 uppercase flex items-center gap-1">
                            ⚠️ Immediate Government Protocols
                          </p>
                          <ul className="space-y-1.5 text-secondary-foreground list-disc pl-4 font-serif text-sm">
                            {reportNarrative?.immediateActions.map((act, i) => (
                              <li key={i}>{act}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="p-3.5 border border-slate-800 bg-background/20 rounded-lg">
                          <p className="font-bold text-brand-blue text-[11px] mb-1.5 uppercase flex items-center gap-1">
                            📋 Short-Term Planning Recommendations (Next 90 Days)
                          </p>
                          <ul className="space-y-1.5 text-secondary-foreground list-disc pl-4 font-serif text-sm">
                            {reportNarrative?.shortTermAdvisories.map((act, i) => (
                              <li key={i}>{act}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="p-3.5 border border-slate-800 bg-background/20 rounded-lg">
                          <p className="font-bold text-brand-blue text-[11px] mb-1.5 uppercase flex items-center gap-1">
                            🌱 Long-Term Infrastructure & Resource Adaptation
                          </p>
                          <ul className="space-y-1.5 text-secondary-foreground list-disc pl-4 font-serif text-sm">
                            {reportNarrative?.longTermAdaptations.map((act, i) => (
                              <li key={i}>{act}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* KEY FINDINGS */}
                    <div>
                      <h4 className="text-[10px] font-bold font-sans uppercase tracking-[0.12em] text-brand-titanium mb-2 flex items-center gap-1.5 border-b border-white/[0.08] pb-1">
                        <Sparkles className="w-3.5 h-3.5 text-brand-blue" /> VII. Key Findings & Confidence Levels
                      </h4>
                      <div className="grid gap-2 font-sans text-xs">
                        {reportNarrative?.keyFindings.map((finding, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-secondary-foreground bg-background/10 p-2 rounded border border-slate-800/40">
                            <span className="text-brand-blue font-bold mt-0.5">•</span>
                            <span className="font-serif text-[13px]">{finding}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>

                  {/* SIGNATURE / CERTIFICATION BLOCK */}
                  <div className="border-t border-slate-800 pt-6 mt-6 flex justify-between items-center text-[10px] font-sans text-muted-foreground relative z-10">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-brand-blue" />
                      Certified by Paryavaran Bharat AI Forecaster Layer v2.1.0
                    </span>
                    <span className="italic">Authorized digital signature — Command operations center</span>
                  </div>

                </div>

                {/* SMART FOLLOW-UP ACTIONS GRID */}
                <div className="mt-8 border-t border-slate-850 pt-6 no-print">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground mb-3.5">
                    💡 Connect Command Operations
                  </p>
                  
                  <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                    
                    {/* Action 1: Digital Twin Map */}
                    <div 
                      onClick={() => {
                        setSelectedDistrictId(districtId);
                        setActiveLayer(disasterType === "flood" ? "flood_risk" : disasterType === "drought" ? "drought_risk" : "composite_risk");
                      }}
                    >
                      <Link href={`/map?district_id=${districtId}`} className="flex items-center justify-between border border-white/[0.08] bg-brand-blue/10 hover:bg-surface-elevated p-3.5 rounded-2xl transition-all duration-300 hover:scale-[1.01] cursor-pointer">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-lg bg-brand-blue/10 grid place-items-center text-brand-blue">
                            <Globe2 className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-emerald-200">Open Digital Twin Map</p>
                            <p className="text-[9px] text-muted-foreground">Visualize layer context</p>
                          </div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-brand-blue" />
                      </Link>
                    </div>

                    {/* Action 2: Ask AI Copilot */}
                    <Link href="/copilot" className="flex items-center justify-between border border-white/[0.08] bg-brand-blue/10 hover:bg-surface-elevated p-3.5 rounded-2xl transition-all duration-300 hover:scale-[1.01] cursor-pointer">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-brand-blue/10 grid place-items-center text-brand-blue">
                          <Bot className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-emerald-200">Consult Bharat Climate Intelligence</p>
                          <p className="text-[9px] text-muted-foreground">Ask operational queries</p>
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-brand-blue" />
                    </Link>

                    {/* Action 3: Run Scenario Simulator */}
                    <Link href="/simulator" className="flex items-center justify-between border border-purple-500/15 bg-purple-500/5 hover:bg-purple-500/10 p-3.5 rounded-2xl transition-all duration-300 hover:scale-[1.01] cursor-pointer">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-purple-400/10 grid place-items-center text-purple-300">
                          <SlidersHorizontal className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-purple-200">Run Scenario Stress-test</p>
                          <p className="text-[9px] text-muted-foreground">Model risk variables</p>
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-purple-300" />
                    </Link>

                  </div>
                </div>

              </CardContent>
            </Card>
            <div className="no-print">
              <WorkflowRecommendations currentPage="reports" />
            </div>
            </>
          )}

        </div>

      </div>

      {/* ─── PRESENTATION MODE OVERLAY ─────────────────────────────────── */}
      {presentationActive && generatedReport && (
        <div className="fixed inset-0 z-50 bg-[#091220]/95 backdrop-blur-xl flex flex-col p-6 font-sans text-white select-text">
          {/* Header */}
          <div className="flex justify-between items-center border-b border-white/[0.08] pb-4 mb-6 animate-fade-in">
            <div className="flex items-center gap-3">
              <Badge className="bg-brand-blue/20 text-brand-titanium border border-brand-blue/30 text-[10px] tracking-wider uppercase">
                Presentation Deck Mode
              </Badge>
              <h2 className="text-sm font-bold uppercase tracking-widest text-white">
                {generatedReport.name} — Slide {currentSlide + 1} of 7
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setPresentationActive(false)}
                className="p-2 text-slate-400 hover:text-white bg-slate-900 border border-white/[0.08] rounded-full hover:scale-105 transition-all"
                title="Exit Presentation"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Slide Content Frame */}
          <div className="flex-1 flex justify-center items-center overflow-y-auto max-h-[72vh] px-4">
            <div className="w-full max-w-5xl h-full flex flex-col justify-between">
              
              {/* Slide 0: Executive Command Summary */}
              {currentSlide === 0 && (
                <div className="space-y-6 animate-fade-in font-serif leading-relaxed text-slate-200">
                  <div className="text-center py-4 border-b border-slate-800">
                    <h3 className="text-xl font-bold uppercase tracking-wider text-white font-orbitron">Government of India — Command Operations</h3>
                    <p className="text-[10px] text-brand-titanium tracking-widest font-sans uppercase font-bold mt-1">National Security Advisory & Mitigation Memorandum</p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-sans p-4 border border-slate-800 bg-background/20 rounded-xl my-4">
                    <div>
                      <span className="font-bold text-[9px] uppercase block text-muted-foreground">REF ID:</span>
                      <span className="font-mono text-white text-[11px] font-bold">{generatedReport.refNo}</span>
                    </div>
                    <div>
                      <span className="font-bold text-[9px] uppercase block text-muted-foreground">DATE:</span>
                      <span className="text-white font-bold">{generatedReport.dateCompiled}</span>
                    </div>
                    <div>
                      <span className="font-bold text-[9px] uppercase block text-muted-foreground">LOCATION:</span>
                      <span className="text-white font-bold">{generatedReport.districtName} ({generatedReport.stateName})</span>
                    </div>
                    <div>
                      <span className="font-bold text-[9px] uppercase block text-muted-foreground">SCENARIO:</span>
                      <span className="text-brand-titanium font-bold">{generatedReport.year} AD Climate Model</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold font-sans uppercase text-brand-titanium border-b border-white/5 pb-1 flex items-center gap-1.5"><FileText className="w-4 h-4 text-brand-blue" /> I. Executive Summary</h4>
                    <p className="text-base text-justify leading-relaxed indent-8">{reportNarrative?.summary}</p>
                  </div>
                </div>
              )}

              {/* Slide 1: Ground Observations Matrix */}
              {currentSlide === 1 && (
                <div className="space-y-5 animate-fade-in">
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold font-sans uppercase text-brand-titanium border-b border-white/5 pb-1 flex items-center gap-1.5"><Activity className="w-4 h-4 text-brand-blue" /> II. Observations & Current Conditions</h4>
                    <p className="text-xs text-slate-350 leading-relaxed font-serif text-justify mb-4">{reportNarrative?.condition}</p>
                  </div>
                  <div className="grid gap-3.5 grid-cols-2 md:grid-cols-3">
                    {[
                      { name: "Ambient Temperature", val: `${ranking ? Math.round(ranking.heatwave_risk * 0.2 + 25) : 31}°C`, desc: "IMD Daily Observations", color: "text-rose-450" },
                      { name: "Precipitation Inflow", val: `${ranking ? Math.round(ranking.flood_risk * 2.5) : 100} mm`, desc: "IMD stations gridded", color: "text-cyan-400" },
                      { name: "Vegetation greenness", val: `${ranking ? (0.8 - (ranking.drought_risk * 0.005)).toFixed(2) : 0.42} NDVI`, desc: "ISRO Sentinel-2 NDVI", color: "text-emerald-400" },
                      { name: "Reservoir Active Storage", val: `${ranking ? Math.round(100 - ranking.water_stress_risk) : 48}%`, desc: "India-WRIS observations", color: "text-cyan-400" },
                      { name: "Air Quality Index", val: `${ranking ? Math.round(ranking.composite_risk * 1.5 + 40) : 75}`, desc: "CPCB monitoring", color: "text-purple-400" },
                      { name: "Soil Infiltration Index", val: `${ranking ? Math.round(100 - ranking.drought_risk) : 45}%`, desc: "NRSC Scatterometer", color: "text-orange-400" }
                    ].map((obs) => (
                      <div key={obs.name} className="p-4 rounded-xl border border-white/[0.06] bg-slate-950/40 shadow-md">
                        <p className="text-[9px] uppercase font-bold text-slate-400">{obs.name}</p>
                        <p className={`text-xl font-bold font-mono mt-1 ${obs.color}`}>{obs.val}</p>
                        <p className="text-[9px] text-muted-foreground mt-0.5">{obs.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Slide 2: Multi-Hazard Risks */}
              {currentSlide === 2 && (
                <div className="grid gap-6 md:grid-cols-2 animate-fade-in items-center">
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold font-sans uppercase text-brand-titanium border-b border-white/5 pb-1 flex items-center gap-1.5"><Layers className="w-4 h-4 text-brand-blue" /> III. Multi-Hazard Risks</h4>
                    <p className="text-xs text-slate-350 leading-relaxed font-serif text-justify">Calculated multi-disaster vulnerability spectrum for the region based on gridded sensor indexes. Run scenario simulators to evaluate mitigation plans.</p>
                    <div className="overflow-x-auto border border-white/[0.08] rounded-xl bg-background/50 text-[11px] font-sans">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-brand-blue/15 border-b border-white/[0.08] text-[8px] font-bold uppercase tracking-wider text-emerald-300">
                            <th className="p-2">Hazard</th>
                            <th className="p-2">Score</th>
                            <th className="p-2">Category</th>
                            <th className="p-2">Trend</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { h: "Flood Vulnerability", s: `${ranking ? ranking.flood_risk : 45}/100`, cat: ranking && ranking.flood_risk > 60 ? "High" : "Moderate", t: ranking ? ranking.trend : "stable" },
                            { h: "Drought Vulnerability", s: `${ranking ? ranking.drought_risk : 50}/100`, cat: ranking && ranking.drought_risk > 60 ? "High" : "Moderate", t: ranking ? ranking.trend : "stable" },
                            { h: "Heatwave Vulnerability", s: `${ranking ? ranking.heatwave_risk : 35}/100`, cat: ranking && ranking.heatwave_risk > 60 ? "High" : "Moderate", t: ranking ? ranking.trend : "stable" },
                            { h: "Water Stress Vulnerability", s: `${ranking ? ranking.water_stress_risk : 40}/100`, cat: ranking && ranking.water_stress_risk > 60 ? "High" : "Moderate", t: ranking ? ranking.trend : "stable" },
                            { h: "Composite Risk Score", s: `${ranking ? ranking.composite_risk : 48}/100`, cat: ranking && ranking.composite_risk > 60 ? "Critical" : "Moderate", t: ranking ? ranking.trend : "stable" }
                          ].map((row, i) => (
                            <tr key={i} className="border-b border-white/[0.04] last:border-0">
                              <td className="p-2 font-semibold">{row.h}</td>
                              <td className="p-2 font-mono text-cyan-400">{row.s}</td>
                              <td className="p-2">{row.cat}</td>
                              <td className="p-2 text-slate-400 font-mono">{row.t}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="p-4 border border-slate-800 bg-background/30 rounded-2xl flex flex-col justify-center items-center">
                    <p className="text-[10px] uppercase font-bold text-slate-400 text-center mb-3">Multi-Hazard Radar Heatmap Hotspots</p>
                    <div className="w-full max-w-[340px]">
                      <svg viewBox="0 0 200 150" className="w-full h-44 bg-background/60 border border-slate-900 rounded-lg overflow-hidden">
                        <defs>
                          <radialGradient id="heat-glow-rep-pres" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor={ranking && ranking.composite_risk > 60 ? "#ef4444" : "#eab308"} stopOpacity="0.45" />
                            <stop offset="70%" stopColor={ranking && ranking.composite_risk > 60 ? "#ef4444" : "#eab308"} stopOpacity="0.1" />
                            <stop offset="100%" stopColor="#091220" stopOpacity="0" />
                          </radialGradient>
                        </defs>
                        <circle cx="110" cy="65" r="45" fill="url(#heat-glow-rep-pres)" />
                        <circle cx="75" cy="80" r="28" fill="url(#heat-glow-rep-pres)" opacity="0.7" />
                        <circle cx="110" cy="65" r="12" fill="rgba(239,68,68,0.1)" stroke="#ef4444" strokeWidth="1.5" />
                        <circle cx="75" cy="80" r="10" fill="rgba(77,168,218,0.1)" stroke="#4DA8DA" strokeWidth="1.5" />
                        <circle cx="140" cy="110" r="9" fill="rgba(34,197,94,0.1)" stroke="#22C55E" strokeWidth="1.5" />
                        <text x="10" y="20" fill="#f87171" fontSize="8" fontWeight="bold" fontFamily="sans-serif">HEAT RADAR</text>
                        <text x="125" y="142" fill="#C0C8D4" fontSize="8" fontFamily="monospace">{ranking ? ranking.composite_risk : 48}% composite</text>
                      </svg>
                    </div>
                  </div>
                </div>
              )}

              {/* Slide 3: Regional Maps */}
              {currentSlide === 3 && (
                <div className="space-y-4 animate-fade-in">
                  <h4 className="text-xs font-bold font-sans uppercase text-brand-titanium border-b border-white/5 pb-1 flex items-center gap-1.5"><Globe2 className="w-4 h-4 text-brand-blue" /> IV. Spatial Intelligence Maps</h4>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="p-4 border border-slate-800 bg-background/20 rounded-2xl flex flex-col justify-center items-center">
                      <p className="text-[10px] uppercase font-bold text-slate-400 text-center mb-2.5">District Boundary Talukas Map</p>
                      <div className="w-full max-w-[340px]">
                        <svg viewBox="0 0 200 150" className="w-full h-44 bg-background/60 border border-slate-900 rounded-lg">
                          <polygon points="45,35 100,28 100,70 45,70" fill="rgba(6,182,212,0.06)" stroke="rgba(6,182,212,0.4)" strokeWidth="1" />
                          <polygon points="100,28 125,25 165,55 100,70" fill="rgba(6,182,212,0.06)" stroke="rgba(6,182,212,0.4)" strokeWidth="1" />
                          <polygon points="100,70 145,115 75,125 100,70" fill="rgba(6,182,212,0.06)" stroke="rgba(6,182,212,0.4)" strokeWidth="1" />
                          <polygon points="45,35 100,70 75,125 35,85" fill="rgba(6,182,212,0.06)" stroke="rgba(6,182,212,0.4)" strokeWidth="1" />
                          <circle cx="100" cy="70" r="4" fill="#4DA8DA" />
                          <text x="105" y="73" fill="#4DA8DA" fontSize="8" fontWeight="bold" fontFamily="sans-serif">{generatedReport.districtName}</text>
                        </svg>
                      </div>
                    </div>
                    <div className="p-4 border border-slate-800 bg-background/20 rounded-2xl flex flex-col justify-center items-center">
                      <p className="text-[10px] uppercase font-bold text-slate-400 text-center mb-2.5">National Climate Threat Map</p>
                      <div className="w-full max-w-[340px]">
                        <svg viewBox="0 0 200 150" className="w-full h-44 bg-background/60 border border-slate-900 rounded-lg">
                          <polygon points="40,40 70,30 85,55 65,80 40,65" fill="#f43f5e" fillOpacity="0.25" stroke="rgba(244,63,94,0.5)" strokeWidth="1" />
                          <polygon points="25,75 50,80 60,95 35,100 20,90" fill="#4DA8DA" fillOpacity="0.25" stroke="rgba(77,168,218,0.5)" strokeWidth="1" />
                          <polygon points="55,90 95,85 100,115 65,130 50,115" fill="#fb923c" fillOpacity="0.25" stroke="rgba(251,146,60,0.5)" strokeWidth="1" />
                          <polygon points="58,130 78,125 85,160 65,170" fill="#22C55E" fillOpacity="0.25" stroke="rgba(34,197,94,0.5)" strokeWidth="1" />
                          <polygon points="85,45 125,40 135,65 100,75" fill="#fb923c" fillOpacity="0.25" stroke="rgba(251,146,60,0.5)" strokeWidth="1" />
                          <circle cx="62" cy="55" r="4.5" fill="#4DA8DA" />
                          <circle cx="62" cy="55" r="8" fill="none" stroke="#4DA8DA" strokeWidth="1" className="animate-ping" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Slide 4: Recharts Analytics Trends */}
              {currentSlide === 4 && (
                <div className="space-y-4 animate-fade-in">
                  <h4 className="text-xs font-bold font-sans uppercase text-brand-titanium border-b border-white/5 pb-1 flex items-center gap-1.5"><TrendingUp className="w-4 h-4 text-brand-blue" /> V. Analytical Trends Charts</h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="bg-background/50 p-3 rounded-lg border border-slate-800">
                      <p className="text-[10px] font-bold text-slate-400 text-center mb-2">Rainfall Trends (mm)</p>
                      <ResponsiveContainer width="100%" height={120}>
                        <AreaChart data={reportChartData}>
                          <CartesianGrid stroke="rgba(148,163,184,0.06)" vertical={false} />
                          <XAxis dataKey="month" stroke="#64748b" tick={{ fontSize: 8 }} tickLine={false} />
                          <YAxis stroke="#64748b" tick={{ fontSize: 8 }} tickLine={false} />
                          <Area type="monotone" dataKey="rainfall" stroke="#38bdf8" fill="rgba(56,189,248,0.15)" strokeWidth={1} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="bg-background/50 p-3 rounded-lg border border-slate-800">
                      <p className="text-[10px] font-bold text-slate-400 text-center mb-2">Temperature Curve & Heat Index</p>
                      <ResponsiveContainer width="100%" height={120}>
                        <LineChart data={reportChartData}>
                          <CartesianGrid stroke="rgba(148,163,184,0.06)" vertical={false} />
                          <XAxis dataKey="month" stroke="#64748b" tick={{ fontSize: 8 }} tickLine={false} />
                          <YAxis stroke="#64748b" tick={{ fontSize: 8 }} tickLine={false} />
                          <Line type="monotone" dataKey="temperature" stroke="#f87171" strokeWidth={1} dot={false} />
                          <Line type="monotone" dataKey="heatwaveRisk" stroke="#4DA8DA" strokeWidth={1} strokeDasharray="3 3" dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="bg-background/50 p-3 rounded-lg border border-slate-800">
                      <p className="text-[10px] font-bold text-slate-400 text-center mb-2">AQI Score Trends</p>
                      <ResponsiveContainer width="100%" height={120}>
                        <BarChart data={reportChartData}>
                          <CartesianGrid stroke="rgba(148,163,184,0.06)" vertical={false} />
                          <XAxis dataKey="month" stroke="#64748b" tick={{ fontSize: 8 }} tickLine={false} />
                          <YAxis stroke="#64748b" tick={{ fontSize: 8 }} tickLine={false} />
                          <Bar dataKey="aqi" fill="#a78bfa" radius={[2, 2, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="bg-background/50 p-3 rounded-lg border border-slate-800">
                      <p className="text-[10px] font-bold text-slate-400 text-center mb-2">Drought & Flood Risk Comparison</p>
                      <ResponsiveContainer width="100%" height={120}>
                        <AreaChart data={reportChartData}>
                          <CartesianGrid stroke="rgba(148,163,184,0.06)" vertical={false} />
                          <XAxis dataKey="month" stroke="#64748b" tick={{ fontSize: 8 }} tickLine={false} />
                          <YAxis stroke="#64748b" tick={{ fontSize: 8 }} tickLine={false} />
                          <Area type="monotone" dataKey="droughtRisk" stroke="#fb923c" fill="rgba(251,146,60,0.08)" strokeWidth={1} />
                          <Area type="monotone" dataKey="floodRisk" stroke="#34d399" fill="rgba(52,211,153,0.08)" strokeWidth={1} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}

              {/* Slide 5: Socio-Economic Impact Indexes */}
              {currentSlide === 5 && (
                <div className="space-y-6 animate-fade-in text-center">
                  <h4 className="text-xs font-bold font-sans uppercase text-brand-titanium border-b border-white/5 pb-1 flex items-center gap-1.5"><Layers className="w-4 h-4 text-brand-blue" /> VI. Socio-Economic Exposure & Impact Index</h4>
                  <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-4 font-sans max-w-4xl mx-auto my-6">
                    <div className="p-5 border border-slate-800 bg-slate-950/50 rounded-2xl flex flex-col justify-between items-center shadow-lg">
                      <Users className="w-8 h-8 text-brand-blue mb-2" />
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Population Exposed</span>
                      <span className="text-lg font-bold text-white font-mono mt-1">{ranking ? Math.round(ranking.composite_risk * 1.8) : 80}k citizens</span>
                    </div>
                    <div className="p-5 border border-slate-800 bg-slate-950/50 rounded-2xl flex flex-col justify-between items-center shadow-lg">
                      <Building className="w-8 h-8 text-rose-400 mb-2" />
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Infrastructure Risk</span>
                      <span className="text-lg font-bold text-white font-mono mt-1">{ranking ? ranking.flood_risk : 45}% Vulnerable</span>
                    </div>
                    <div className="p-5 border border-slate-800 bg-slate-950/50 rounded-2xl flex flex-col justify-between items-center shadow-lg">
                      <Leaf className="w-8 h-8 text-emerald-450 mb-2" />
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Agricultural Stress</span>
                      <span className="text-lg font-bold text-white font-mono mt-1">{ranking ? ranking.drought_risk : 50}% Stress</span>
                    </div>
                    <div className="p-5 border border-slate-800 bg-slate-950/50 rounded-2xl flex flex-col justify-between items-center shadow-lg">
                      <Scale className="w-8 h-8 text-brand-blue mb-2" />
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Economic Loss Multiplier</span>
                      <span className="text-lg font-bold text-white font-mono mt-1">x{ranking ? ((ranking.composite_risk / 100) * 2.5 + 1).toFixed(1) : 2.2} Impact</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Slide 6: AI Brief & Recommended Action Plan */}
              {currentSlide === 6 && (
                <div className="space-y-4 animate-fade-in font-serif text-slate-200 leading-relaxed text-sm">
                  <h4 className="text-xs font-bold font-sans uppercase text-brand-titanium border-b border-white/5 pb-1 flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-brand-blue" /> VII. Command Decision Advisories</h4>
                  <div className="border-l-2 border-emerald-400 pl-4 bg-emerald-950/15 py-3 rounded-r my-3">
                    <p className="italic text-emerald-200 text-justify text-[13px]">{reportNarrative?.aiBrief}</p>
                  </div>
                  <div className="grid gap-3.5 md:grid-cols-3 font-sans text-xs">
                    <div className="p-3 border border-slate-800 bg-background/25 rounded-xl">
                      <p className="font-bold text-rose-400 uppercase mb-1 flex items-center gap-1">🚨 Immediate Protocols</p>
                      <ul className="list-disc pl-4 space-y-1 text-slate-300 font-serif">
                        {reportNarrative?.immediateActions.map((act, idx) => <li key={idx}>{act}</li>)}
                      </ul>
                    </div>
                    <div className="p-3 border border-slate-800 bg-background/25 rounded-xl">
                      <p className="font-bold text-brand-blue uppercase mb-1 flex items-center gap-1">📋 Short-Term Plans</p>
                      <ul className="list-disc pl-4 space-y-1 text-slate-300 font-serif">
                        {reportNarrative?.shortTermAdvisories.map((act, idx) => <li key={idx}>{act}</li>)}
                      </ul>
                    </div>
                    <div className="p-3 border border-slate-800 bg-background/25 rounded-xl">
                      <p className="font-bold text-brand-blue uppercase mb-1 flex items-center gap-1">🌱 Long-Term Adaptation</p>
                      <ul className="list-disc pl-4 space-y-1 text-slate-300 font-serif">
                        {reportNarrative?.longTermAdaptations.map((act, idx) => <li key={idx}>{act}</li>)}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Slide Controls Footer inside Slide Frame */}
              <div className="border-t border-white/[0.08] pt-4 mt-6 flex justify-between items-center text-xs font-sans text-muted-foreground no-print">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-brand-blue" />
                  PB Operations Center presentation deck
                </span>
                <div className="flex gap-4">
                  <button 
                    disabled={currentSlide === 0} 
                    onClick={() => setCurrentSlide((c) => Math.max(c - 1, 0))}
                    className="flex items-center gap-1 hover:text-white disabled:opacity-30 transition-opacity"
                  >
                    <ChevronLeft className="w-4 h-4" /> Previous
                  </button>
                  <button 
                    disabled={currentSlide === 6} 
                    onClick={() => setCurrentSlide((c) => Math.min(c + 1, 6))}
                    className="flex items-center gap-1 hover:text-white disabled:opacity-30 transition-opacity"
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

            </div>
          </div>
          
          {/* Navigation Dots Indicator */}
          <div className="flex justify-center gap-2 mt-4 pb-2">
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                className={`w-2 h-2 rounded-full transition-all ${currentSlide === i ? "bg-brand-blue w-6" : "bg-slate-700 hover:bg-slate-500"}`}
                title={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
