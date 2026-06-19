from __future__ import annotations

from fastapi import HTTPException
from app.db.session import SessionLocal
from app.models.climate import District, WeatherData, SatelliteData

def map_to_dict(weather: WeatherData, satellite: SatelliteData) -> dict:
    return {
        "observed_on": weather.observed_on,
        "rainfall_mm": weather.rainfall_mm,
        "rainfall_deficit_pct": weather.rainfall_deficit_pct,
        "temperature_c": weather.temperature_c,
        "humidity_pct": weather.humidity_pct,
        "river_level_m": weather.river_level_m,
        "soil_moisture_pct": weather.soil_moisture_pct,
        "aqi": weather.aqi,
        "ndvi": satellite.ndvi,
        "land_surface_temp_c": satellite.land_surface_temp_c,
        "water_body_index": satellite.water_body_index,
        "reservoir_level_pct": satellite.reservoir_level_pct,
    }

class ClimateDataGateway:
    """Production integration boundary for national climate data providers powered by PostgreSQL."""

    def fetch_imd_weather(self, district_code: str) -> list[dict]:
        with SessionLocal() as db:
            district = db.query(District).filter(District.code == district_code).first()
            if not district:
                raise HTTPException(status_code=404, detail="District not found")
            
            rows = (
                db.query(WeatherData, SatelliteData)
                .join(
                    SatelliteData,
                    (SatelliteData.district_id == WeatherData.district_id)
                    & (SatelliteData.observed_on == WeatherData.observed_on),
                )
                .filter(WeatherData.district_id == district.id)
                .order_by(WeatherData.observed_on.asc())
                .all()
            )
            if not rows:
                raise HTTPException(status_code=404, detail="No weather/satellite data found for this district")
            
            return [map_to_dict(w, s) for w, s in rows]

    def fetch_nrsc_satellite(self, district_code: str) -> list[dict]:
        return self.fetch_imd_weather(district_code)

    def fetch_bhuvan_boundary(self, district_code: str) -> dict:
        with SessionLocal() as db:
            district = db.query(District).filter(District.code == district_code).first()
            if not district:
                raise HTTPException(status_code=404, detail="District not found")
            return {
                "provider": "ISRO Bhuvan",
                "district_code": district_code,
                "centroid": [district.centroid_lon, district.centroid_lat],
            }

    def fetch_wris_reservoirs(self, district_code: str) -> dict:
        weather_list = self.fetch_imd_weather(district_code)
        if not weather_list:
            raise HTTPException(status_code=404, detail="No reservoir data found for this district")
        latest = weather_list[-1]
        return {
            "provider": "India-WRIS",
            "reservoir_level_pct": latest["reservoir_level_pct"],
            "major_reservoirs": [
                {"name": "Integrated Basin Storage", "level_pct": latest["reservoir_level_pct"]}
            ],
        }

    def fetch_cpcb_aqi(self, district_code: str) -> dict:
        weather_list = self.fetch_imd_weather(district_code)
        if not weather_list:
            raise HTTPException(status_code=404, detail="No AQI data found for this district")
        latest = weather_list[-1]
        return {"provider": "CPCB", "aqi": latest["aqi"]}

    def _district(self, district_code: str) -> dict:
        with SessionLocal() as db:
            district = db.query(District).filter(District.code == district_code).first()
            if not district:
                raise HTTPException(status_code=404, detail="District not found")
            return {
                "id": district.id,
                "state_id": district.state_id,
                "name": district.name,
                "district_code": district.code,
                "population": district.population,
                "area": district.area_sq_km,
                "lat": district.centroid_lat,
                "lon": district.centroid_lon,
            }
