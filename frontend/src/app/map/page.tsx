import { DigitalTwinMap } from "@/components/climate/DigitalTwinMap";
import { TimelineSlider } from "@/components/climate/TimelineSlider";
import { WorkflowRecommendations } from "@/components/climate/WorkflowRecommendations";
import { Badge } from "@/components/ui/badge";

export default function MapPage() {
  return (
    <div className="grid gap-4">
      <div>
        <Badge>Full-screen GIS dashboard</Badge>
        <h1 className="mt-3 text-3xl font-semibold text-white font-orbitron tracking-[0.12em] uppercase">Interactive Digital Twin Map</h1>
        <p className="mt-2 max-w-3xl text-sm text-secondary-foreground">
          Toggle temperature, rainfall, NDVI, air quality, soil moisture, reservoirs, flood, and drought overlays.
        </p>
      </div>
      <DigitalTwinMap />
      <div className="mt-2">
        <TimelineSlider />
      </div>
      <div className="mt-4 no-print">
        <WorkflowRecommendations currentPage="map" />
      </div>
    </div>
  );
}
