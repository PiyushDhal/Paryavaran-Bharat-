"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { generateRankings } from "@/lib/mock/engine";
import type { Ranking } from "@/lib/types";

type ClimateContextType = {
  activeYear: number;
  setActiveYear: (year: number) => void;
  selectedDistrictId: number | undefined;
  setSelectedDistrictId: (id: number | undefined) => void;
  activeLayer: string;
  setActiveLayer: (layer: string) => void;
  rankings: Ranking[];
};

const ClimateContext = createContext<ClimateContextType | undefined>(undefined);

export function ClimateProvider({ children }: { children: React.ReactNode }) {
  const [activeYear, setActiveYear] = useState<number>(2025);
  const [selectedDistrictId, setSelectedDistrictId] = useState<number | undefined>(101);
  const [activeLayer, setActiveLayer] = useState<string>("composite");
  const [rankings, setRankings] = useState<Ranking[]>([]);

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
        rankings
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
