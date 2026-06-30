"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { api } from "@/lib/api";
import type { Ranking, SimulationResult, District, State } from "@/lib/types";

type ClimateContextType = {
  activeYear: number;
  setActiveYear: (year: number) => void;
  selectedDistrictId: number | undefined;
  setSelectedDistrictId: (id: number | undefined) => void;
  activeLayer: string;
  setActiveLayer: (layer: string) => void;
  rankings: Ranking[];
  timelineStep: string;
  setTimelineStep: (step: string) => void;
  mapMode: string;
  setMapMode: (mode: string) => void;
  activeSimulation: SimulationResult | null;
  setActiveSimulation: (result: SimulationResult | null) => void;
  selectedStateName: string | null;
  setSelectedStateName: (name: string | null) => void;
  selectedStateId: number | "";
  setSelectedStateId: (id: number | "") => void;
  selectedDataset: string;
  setSelectedDataset: (dataset: string) => void;
  activeRisk: string;
  setActiveRisk: (risk: string) => void;
  currentAIConversation: any[];
  setCurrentAIConversation: (messages: any[]) => void;
  currentGeneratedReport: any | null;
  setCurrentGeneratedReport: (report: any | null) => void;
  analyticsFilters: {
    stateId: number | "";
    districtId: number | "";
    climateZone: string;
    riskCategory: string;
  };
  setAnalyticsFilters: (filters: {
    stateId: number | "";
    districtId: number | "";
    climateZone: string;
    riskCategory: string;
  }) => void;
  
  // New Global Context Fields
  currentDashboard: string;
  setCurrentDashboard: (dashboard: string) => void;
  selectedVillageId: number | string | undefined;
  setSelectedVillageId: (id: number | string | undefined) => void;
  selectedVillageName: string | null;
  setSelectedVillageName: (name: string | null) => void;
  currentDateRange: { start: string; end: string };
  setCurrentDateRange: (range: { start: string; end: string }) => void;
  currentFilters: any;
  setCurrentFilters: (filters: any) => void;
  currentComparison: any;
  setCurrentComparison: (comp: any) => void;
  theme: "light" | "dark";
  setTheme: (theme: "light" | "dark") => void;
  mapPosition: { lat: number; lng: number };
  setMapPosition: (pos: { lat: number; lng: number }) => void;
  zoomLevel: number;
  setZoomLevel: (zoom: number) => void;
  selectedFeature: any;
  setSelectedFeature: (feature: any) => void;
};

const ClimateContext = createContext<ClimateContextType | undefined>(undefined);

export function ClimateProvider({ children }: { children: React.ReactNode }) {
  const [activeYear, setActiveYear] = useState<number>(2026);
  const [selectedDistrictId, setSelectedDistrictId] = useState<number | undefined>(undefined);
  const [activeLayer, setActiveLayer] = useState<string>("composite");
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [timelineStep, setTimelineStep] = useState<string>("today");
  const [mapMode, setMapMode] = useState<string>("streets");
  const [activeSimulation, setActiveSimulation] = useState<SimulationResult | null>(null);
  const [selectedStateName, setSelectedStateName] = useState<string | null>(null);
  
  const [selectedStateId, setSelectedStateId] = useState<number | "">("");
  const [selectedDataset, setSelectedDataset] = useState<string>("imd");
  const [activeRisk, setActiveRisk] = useState<string>("composite");
  const [currentAIConversation, setCurrentAIConversation] = useState<any[]>([]);
  const [currentGeneratedReport, setCurrentGeneratedReport] = useState<any | null>(null);

  const [analyticsFilters, setAnalyticsFilters] = useState<{
    stateId: number | "";
    districtId: number | "";
    climateZone: string;
    riskCategory: string;
  }>({
    stateId: "",
    districtId: "",
    climateZone: "",
    riskCategory: "",
  });

  const [allDistricts, setAllDistricts] = useState<District[]>([]);
  const [allStates, setAllStates] = useState<State[]>([]);

  // Expanded fields state
  const [currentDashboard, setCurrentDashboard] = useState<string>("composite");
  const [selectedVillageId, setSelectedVillageId] = useState<number | string | undefined>(undefined);
  const [selectedVillageName, setSelectedVillageName] = useState<string | null>(null);
  const [currentDateRange, setCurrentDateRange] = useState<{ start: string; end: string }>({ start: "2026-01-01", end: "2026-12-31" });
  const [currentFilters, setCurrentFilters] = useState<any>({});
  const [currentComparison, setCurrentComparison] = useState<any>(null);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [mapPosition, setMapPosition] = useState<{ lat: number; lng: number }>({ lat: 20.5937, lng: 78.9629 });
  const [zoomLevel, setZoomLevel] = useState<number>(5);
  const [selectedFeature, setSelectedFeature] = useState<any>(null);

  // Hydrate from localStorage/sessionStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const year = localStorage.getItem("bct_activeYear");
        if (year) setActiveYear(Number(year));
        
        const distId = sessionStorage.getItem("bct_selectedDistrictId") || localStorage.getItem("bct_selectedDistrictId");
        if (distId && distId !== "undefined" && distId !== "null") setSelectedDistrictId(Number(distId));
        
        const layer = localStorage.getItem("bct_activeLayer");
        if (layer) setActiveLayer(layer);
        
        const step = localStorage.getItem("bct_timelineStep");
        if (step) setTimelineStep(step);
        
        const stateName = sessionStorage.getItem("bct_selectedStateName") || localStorage.getItem("bct_selectedStateName");
        if (stateName) setSelectedStateName(stateName);
        
        const stateId = sessionStorage.getItem("bct_selectedStateId") || localStorage.getItem("bct_selectedStateId");
        if (stateId && stateId !== "undefined" && stateId !== "null") setSelectedStateId(stateId === "" ? "" : Number(stateId));
        
        const dataset = localStorage.getItem("bct_selectedDataset");
        if (dataset) setSelectedDataset(dataset);
        
        const risk = localStorage.getItem("bct_activeRisk");
        if (risk) setActiveRisk(risk);

        // Hydrate expanded context
        const dash = localStorage.getItem("bct_currentDashboard");
        if (dash) setCurrentDashboard(dash);

        const vilId = localStorage.getItem("bct_selectedVillageId");
        if (vilId && vilId !== "undefined" && vilId !== "null") setSelectedVillageId(vilId);

        const vilName = localStorage.getItem("bct_selectedVillageName");
        if (vilName) setSelectedVillageName(vilName);

        const dateRangeStr = localStorage.getItem("bct_currentDateRange");
        if (dateRangeStr) setCurrentDateRange(JSON.parse(dateRangeStr));

        const filtersStr = localStorage.getItem("bct_currentFilters");
        if (filtersStr) setCurrentFilters(JSON.parse(filtersStr));

        const compStr = localStorage.getItem("bct_currentComparison");
        if (compStr) setCurrentComparison(JSON.parse(compStr));

        const storedTheme = localStorage.getItem("theme") as "light" | "dark";
        if (storedTheme) setTheme(storedTheme);

        const mapPosStr = localStorage.getItem("bct_mapPosition");
        if (mapPosStr) setMapPosition(JSON.parse(mapPosStr));

        const zoomStr = localStorage.getItem("bct_zoomLevel");
        if (zoomStr) setZoomLevel(Number(zoomStr));

        const featStr = localStorage.getItem("bct_selectedFeature");
        if (featStr) setSelectedFeature(JSON.parse(featStr));

        const simStr = localStorage.getItem("bct_activeSimulation");
        if (simStr) setActiveSimulation(JSON.parse(simStr));

        const reportStr = localStorage.getItem("bct_currentGeneratedReport");
        if (reportStr) setCurrentGeneratedReport(JSON.parse(reportStr));

        const aiConvStr = localStorage.getItem("bct_currentAIConversation");
        if (aiConvStr) setCurrentAIConversation(JSON.parse(aiConvStr));

        // Clean up legacy localStorage items to prevent lingering locks
        localStorage.removeItem("bct_selectedDistrictId");
        localStorage.removeItem("bct_selectedStateName");
        localStorage.removeItem("bct_selectedStateId");
      } catch (err) {
        console.warn("Could not hydrate BCT global store", err);
      }
    }
  }, []);

  // Persist state variables when changing
  useEffect(() => {
    try {
      localStorage.setItem("bct_activeYear", String(activeYear));
    } catch {}
  }, [activeYear]);

  useEffect(() => {
    try {
      if (selectedDistrictId !== undefined) {
        sessionStorage.setItem("bct_selectedDistrictId", String(selectedDistrictId));
      } else {
        sessionStorage.removeItem("bct_selectedDistrictId");
      }
    } catch {}
  }, [selectedDistrictId]);

  useEffect(() => {
    try {
      localStorage.setItem("bct_activeLayer", activeLayer);
    } catch {}
  }, [activeLayer]);

  useEffect(() => {
    try {
      localStorage.setItem("bct_timelineStep", timelineStep);
    } catch {}
  }, [timelineStep]);

  useEffect(() => {
    try {
      if (selectedStateName) sessionStorage.setItem("bct_selectedStateName", selectedStateName);
      else sessionStorage.removeItem("bct_selectedStateName");
    } catch {}
  }, [selectedStateName]);

  useEffect(() => {
    try {
      sessionStorage.setItem("bct_selectedStateId", String(selectedStateId));
    } catch {}
  }, [selectedStateId]);

  useEffect(() => {
    try {
      localStorage.setItem("bct_selectedDataset", selectedDataset);
    } catch {}
  }, [selectedDataset]);

  useEffect(() => {
    try {
      localStorage.setItem("bct_activeRisk", activeRisk);
    } catch {}
  }, [activeRisk]);

  // Persist new variables
  useEffect(() => {
    try {
      localStorage.setItem("bct_currentDashboard", currentDashboard);
    } catch {}
  }, [currentDashboard]);

  useEffect(() => {
    try {
      if (selectedVillageId !== undefined) {
        localStorage.setItem("bct_selectedVillageId", String(selectedVillageId));
      } else {
        localStorage.removeItem("bct_selectedVillageId");
      }
    } catch {}
  }, [selectedVillageId]);

  useEffect(() => {
    try {
      if (selectedVillageName) {
        localStorage.setItem("bct_selectedVillageName", selectedVillageName);
      } else {
        localStorage.removeItem("bct_selectedVillageName");
      }
    } catch {}
  }, [selectedVillageName]);

  useEffect(() => {
    try {
      localStorage.setItem("bct_currentDateRange", JSON.stringify(currentDateRange));
    } catch {}
  }, [currentDateRange]);

  useEffect(() => {
    try {
      localStorage.setItem("bct_currentFilters", JSON.stringify(currentFilters));
    } catch {}
  }, [currentFilters]);

  useEffect(() => {
    try {
      localStorage.setItem("bct_currentComparison", JSON.stringify(currentComparison));
    } catch {}
  }, [currentComparison]);

  useEffect(() => {
    try {
      localStorage.setItem("theme", theme);
      if (theme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } catch {}
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem("bct_mapPosition", JSON.stringify(mapPosition));
    } catch {}
  }, [mapPosition]);

  useEffect(() => {
    try {
      localStorage.setItem("bct_zoomLevel", String(zoomLevel));
    } catch {}
  }, [zoomLevel]);

  useEffect(() => {
    try {
      localStorage.setItem("bct_selectedFeature", JSON.stringify(selectedFeature));
    } catch {}
  }, [selectedFeature]);

  useEffect(() => {
    try {
      if (activeSimulation) {
        localStorage.setItem("bct_activeSimulation", JSON.stringify(activeSimulation));
      } else {
        localStorage.removeItem("bct_activeSimulation");
      }
    } catch {}
  }, [activeSimulation]);

  useEffect(() => {
    try {
      if (currentGeneratedReport) {
        localStorage.setItem("bct_currentGeneratedReport", JSON.stringify(currentGeneratedReport));
      } else {
        localStorage.removeItem("bct_currentGeneratedReport");
      }
    } catch {}
  }, [currentGeneratedReport]);

  useEffect(() => {
    try {
      localStorage.setItem("bct_currentAIConversation", JSON.stringify(currentAIConversation));
    } catch {}
  }, [currentAIConversation]);

  useEffect(() => {
    Promise.all([
      api.states().catch(() => []),
      api.districts().catch(() => [])
    ]).then(([statesData, districtsData]) => {
      setAllStates(statesData);
      setAllDistricts(districtsData);
    }).catch(() => undefined);
  }, []);

  // Sync state id and name bi-directionally in a single, guarded effect to avoid render loops
  useEffect(() => {
    if (allStates.length === 0) return;

    if (selectedStateName === null || selectedStateName === "") {
      if (selectedStateId !== "") {
        setSelectedStateId("");
      }
      return;
    }

    if (selectedStateId !== "") {
      const match = allStates.find(s => s.id === Number(selectedStateId));
      if (match) {
        if (selectedStateName !== match.name) {
          setSelectedStateName(match.name);
        }
      }
    } else if (selectedStateName) {
      const match = allStates.find(s => s.name.toLowerCase() === selectedStateName.toLowerCase());
      if (match) {
        if (selectedStateId === "" || selectedStateId !== match.id) {
          setSelectedStateId(match.id);
        }
      } else {
        setSelectedStateName(null);
      }
    }
  }, [selectedStateId, selectedStateName, allStates]);

  // Set state from district selection
  useEffect(() => {
    if (selectedDistrictId && allDistricts.length > 0) {
      const match = allDistricts.find(d => d.id === selectedDistrictId);
      if (match) {
        if (selectedStateId === "" || selectedStateId !== match.state_id) {
          setSelectedStateId(match.state_id);
        }
        if (match.state_name && selectedStateName !== match.state_name) {
          setSelectedStateName(match.state_name);
        }
      }
    }
  }, [selectedDistrictId, allDistricts]);

  // Clear district selection if it does not belong to the selected state
  useEffect(() => {
    if (selectedDistrictId && allDistricts.length > 0 && selectedStateId !== "") {
      const match = allDistricts.find(d => d.id === selectedDistrictId);
      if (match && match.state_id !== Number(selectedStateId)) {
        setSelectedDistrictId(undefined);
      }
    }
  }, [selectedStateId, selectedDistrictId, allDistricts]);

  useEffect(() => {
    if (timelineStep === "2030") {
      setActiveYear(2030);
    } else {
      setActiveYear(2026);
    }
  }, [timelineStep]);

  useEffect(() => {
    api.rankings(1000, activeYear).then(setRankings).catch(() => undefined);
  }, [activeYear]);

  return (
    <ClimateContext.Provider
      value={{
        activeYear,
        setActiveYear,
        selectedDistrictId,
        setSelectedDistrictId,
        activeLayer,
        setActiveLayer,
        rankings,
        timelineStep,
        setTimelineStep,
        mapMode,
        setMapMode,
        activeSimulation,
        setActiveSimulation,
        selectedStateName,
        setSelectedStateName,
        selectedStateId,
        setSelectedStateId,
        selectedDataset,
        setSelectedDataset,
        activeRisk,
        setActiveRisk,
        currentAIConversation,
        setCurrentAIConversation,
        currentGeneratedReport,
        setCurrentGeneratedReport,
        analyticsFilters,
        setAnalyticsFilters,
        
        // Expanded context
        currentDashboard,
        setCurrentDashboard,
        selectedVillageId,
        setSelectedVillageId,
        selectedVillageName,
        setSelectedVillageName,
        currentDateRange,
        setCurrentDateRange,
        currentFilters,
        setCurrentFilters,
        currentComparison,
        setCurrentComparison,
        theme,
        setTheme,
        mapPosition,
        setMapPosition,
        zoomLevel,
        setZoomLevel,
        selectedFeature,
        setSelectedFeature,
      }}
    >
      {children}
    </ClimateContext.Provider>
  );
}

export function useClimate() {
  const context = useContext(ClimateContext);
  if (!context) {
    throw new Error("useClimate must be used within a ClimateProvider");
  }
  return context;
}
