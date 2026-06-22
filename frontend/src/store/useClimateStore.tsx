"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { api } from "@/lib/api";
import type { Ranking, SimulationResult } from "@/lib/types";

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
