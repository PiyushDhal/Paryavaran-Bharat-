import { DigitalTwinMap } from "@/components/climate/DigitalTwinMap";
import { TimelineSlider } from "@/components/climate/TimelineSlider";
import { Badge } from "@/components/ui/badge";

export default function MapPage() {
  return (
    <div className="grid gap-4">
      <div>
        <Badge>Full-screen GIS dashboard</Badge>
        <h1 className="mt-3 text-3xl font-semibold tracking-normal text-white">Interactive Digital Twin Map</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-300">
          Toggle temperature, rainfall, NDVI, air quality, soil moisture, reservoirs, flood, and drought overlays.
        </p>
      </div>
      <DigitalTwinMap />
      <div className="mt-2">
        <TimelineSlider />
      </div>
    </div>
  );
}
