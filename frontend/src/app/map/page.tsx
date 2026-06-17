"use client";

import { DigitalTwinMap } from "@/components/climate/DigitalTwinMap";
import { Badge } from "@/components/ui/badge";
import { TimelineSlider } from "@/components/climate/TimelineSlider";
import { useClimate } from "@/store/useClimateStore";

export default function MapPage() {
  const { activeYear } = useClimate();

  return (
    <div className="grid gap-4">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <Badge>Full-screen GIS dashboard</Badge>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal text-white">Interactive Digital Twin Map</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-300">
            Toggle temperature, rainfall, NDVI, air quality, soil moisture, reservoirs, flood, and drought overlays for AD {activeYear}.
          </p>
        </div>
      </div>
      <DigitalTwinMap />
      <TimelineSlider />
    </div>
  );
}
