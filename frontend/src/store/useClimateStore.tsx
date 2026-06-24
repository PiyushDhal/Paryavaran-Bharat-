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

  // Hydrate from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const year = localStorage.getItem("bct_activeYear");
        if (year) setActiveYear(Number(year));
        
        const distId = localStorage.getItem("bct_selectedDistrictId");
        if (distId && distId !== "undefined" && distId !== "null") setSelectedDistrictId(Number(distId));
        
        const layer = localStorage.getItem("bct_activeLayer");
        if (layer) setActiveLayer(layer);
        
        const step = localStorage.getItem("bct_timelineStep");
        if (step) setTimelineStep(step);
        
        const stateName = localStorage.getItem("bct_selectedStateName");
        if (stateName) setSelectedStateName(stateName);
        
        const stateId = localStorage.getItem("bct_selectedStateId");
        if (stateId && stateId !== "undefined" && stateId !== "null") setSelectedStateId(stateId === "" ? "" : Number(stateId));
        
        const dataset = localStorage.getItem("bct_selectedDataset");
        if (dataset) setSelectedDataset(dataset);
        
        const risk = localStorage.getItem("bct_activeRisk");
        if (risk) setActiveRisk(risk);
      } catch (err) {
        console.warn("Could not hydrate BCT global store from localStorage", err);
      }
    }
  }, []);

  // Persist state variables to localStorage when changing
  useEffect(() => {
    try {
      localStorage.setItem("bct_activeYear", String(activeYear));
    } catch {}
  }, [activeYear]);

  useEffect(() => {
    try {
      if (selectedDistrictId !== undefined) {
        localStorage.setItem("bct_selectedDistrictId", String(selectedDistrictId));
      } else {
        localStorage.removeItem("bct_selectedDistrictId");
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
      if (selectedStateName) localStorage.setItem("bct_selectedStateName", selectedStateName);
      else localStorage.removeItem("bct_selectedStateName");
    } catch {}
  }, [selectedStateName]);

  useEffect(() => {
    try {
      localStorage.setItem("bct_selectedStateId", String(selectedStateId));
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

  useEffect(() => {
    Promise.all([
      api.states().catch(() => []),
      api.districts().catch(() => [])
    ]).then(([statesData, districtsData]) => {
      setAllStates(statesData);
      setAllDistricts(districtsData);
    }).catch(() => undefined);
  }, []);

  // Sync state id and name bi-directionally
  useEffect(() => {
    if (allStates.length > 0) {
      if (selectedStateId !== "") {
        const match = allStates.find(s => s.id === Number(selectedStateId));
        if (match && selectedStateName !== match.name) {
          setSelectedStateName(match.name);
        }
      } else if (selectedStateId === "" && selectedStateName !== null) {
        setSelectedStateName(null);
      }
    }
  }, [selectedStateId, allStates]);

  useEffect(() => {
    if (allStates.length > 0) {
      if (selectedStateName) {
        const match = allStates.find(s => s.name.toLowerCase() === selectedStateName.toLowerCase());
        if (match && selectedStateId !== match.id) {
          setSelectedStateId(match.id);
        }
      } else if (selectedStateName === null && selectedStateId !== "") {
        setSelectedStateId("");
      }
    }
  }, [selectedStateName, allStates]);

  // Set state from district selection
  useEffect(() => {
    if (selectedDistrictId && allDistricts.length > 0) {
      const match = allDistricts.find(d => d.id === selectedDistrictId);
      if (match) {
        setSelectedStateId(match.state_id);
        if (match.state_name) {
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
