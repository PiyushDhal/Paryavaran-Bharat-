"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { generateRankings } from "@/lib/mock/engine";
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
};

const ClimateContext = createContext<ClimateContextType | undefined>(undefined);

export function ClimateProvider({ children }: { children: React.ReactNode }) {
  const [activeYear, setActiveYear] = useState<number>(2025);
  const [selectedDistrictId, setSelectedDistrictId] = useState<number | undefined>(101);
  const [activeLayer, setActiveLayer] = useState<string>("composite");
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [timelineStep, setTimelineStep] = useState<string>("today");
  const [mapMode, setMapMode] = useState<string>("streets");
  const [activeSimulation, setActiveSimulation] = useState<SimulationResult | null>(null);

  useEffect(() => {
    if (timelineStep === "2030") {
      setActiveYear(2030);
    } else {
      setActiveYear(2025);
    }
  }, [timelineStep]);

  useEffect(() => {
    setRankings(generateRankings(activeYear));
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
