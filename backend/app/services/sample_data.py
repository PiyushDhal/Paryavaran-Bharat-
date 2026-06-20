from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from math import sin
from random import Random

DISTRICTS = [
    {
        "state": "Andhra Pradesh",
        "state_code": "AP",
        "district": "East Godavari",
        "district_code": "AP-EG",
        "lat": 17.0,
        "lon": 82.2,
        "population": 5150000,
        "area": 10807,
        "profile": "coastal_flood",
    },
    {
        "state": "Assam",
        "state_code": "AS",
        "district": "Dhemaji",
        "district_code": "AS-DH",
        "lat": 27.5,
        "lon": 94.6,
        "population": 690000,
        "area": 3237,
        "profile": "riverine_flood",
    },
    {
        "state": "Bihar",
        "state_code": "BR",
        "district": "Patna",
        "district_code": "BR-PT",
        "lat": 25.6,
        "lon": 85.1,
        "population": 5838000,
        "area": 3202,
        "profile": "heat_flood",
    },
    {
        "state": "Gujarat",
        "state_code": "GJ",
        "district": "Kutch",
        "district_code": "GJ-KC",
        "lat": 23.7,
        "lon": 69.8,
        "population": 2092000,
        "area": 45674,
        "profile": "arid_drought",
    },
    {
        "state": "Karnataka",
        "state_code": "KA",
        "district": "Bengaluru Urban",
        "district_code": "KA-BU",
        "lat": 12.97,
        "lon": 77.59,
        "population": 9621551,
        "area": 2196,
        "profile": "urban_heat",
    },
    {
        "state": "Maharashtra",
        "state_code": "MH",
        "district": "Marathwada",
        "district_code": "MH-MW",
        "lat": 19.88,
        "lon": 75.32,
        "population": 18700000,
        "area": 64590,
        "profile": "drought",
    },
    {
        "state": "Odisha",
        "state_code": "OD",
        "district": "Puri",
        "district_code": "OD-PR",
        "lat": 19.8,
        "lon": 85.82,
        "population": 1698000,
        "area": 3055,
        "profile": "coastal_cyclone",
    },
    {
        "state": "Rajasthan",
        "state_code": "RJ",
        "district": "Jaisalmer",
        "district_code": "RJ-JS",
        "lat": 26.91,
        "lon": 70.91,
        "population": 672000,
        "area": 38401,
        "profile": "desert_heat",
    },
    {
        "state": "Tamil Nadu",
        "state_code": "TN",
        "district": "Chennai",
        "district_code": "TN-CH",
        "lat": 13.08,
        "lon": 80.27,
        "population": 4646700,
        "area": 426,
        "profile": "urban_coastal",
    },
    {
        "state": "Uttar Pradesh",
        "state_code": "UP",
        "district": "Varanasi",
        "district_code": "UP-VR",
        "lat": 25.31,
        "lon": 82.97,
        "population": 3677000,
        "area": 1535,
        "profile": "heat_water_stress",
    },
]

PROFILE_BASELINES = {
    "coastal_flood": (190, 31, 73, 5.7, 68, 0.62, 76, 82),
    "riverine_flood": (240, 29, 82, 7.2, 76, 0.68, 83, 78),
    "heat_flood": (140, 35, 62, 5.9, 52, 0.49, 59, 145),
    "arid_drought": (28, 39, 29, 1.7, 18, 0.21, 22, 108),
    "urban_heat": (92, 34, 56, 2.4, 39, 0.36, 34, 168),
    "drought": (44, 38, 34, 2.1, 24, 0.26, 27, 132),
    "coastal_cyclone": (205, 31, 77, 5.4, 66, 0.61, 71, 92),
    "desert_heat": (16, 42, 22, 0.8, 12, 0.14, 14, 115),
    "urban_coastal": (132, 34, 69, 3.8, 49, 0.42, 48, 156),
    "heat_water_stress": (70, 40, 38, 2.3, 26, 0.29, 31, 174),
}


def clamp(value: float, lower: float = 0, upper: float = 100) -> float:
    return max(lower, min(upper, value))


def synthetic_boundary(lat: float, lon: float, size: float = 0.5) -> dict:
    return {
        "type": "Feature",
        "geometry": {
            "type": "Polygon",
            "coordinates": [
                [
                    [lon - size, lat - size],
                    [lon + size, lat - size * 0.7],
                    [lon + size * 0.8, lat + size],
                    [lon - size * 0.8, lat + size * 0.8],
                    [lon - size, lat - size],
                ]
            ],
        },
        "properties": {},
    }


def generate_observations(district_code: str, profile: str, years: int | list[int] = 7) -> list[dict]:
    rng = Random(district_code)
    rainfall, temp, humidity, river, soil, ndvi, reservoir, aqi = PROFILE_BASELINES[profile]
    rows = []

    if isinstance(years, int):
        today_year = date.today().year
        years_list = list(range(today_year - years + 1, today_year + 1))
    else:
        years_list = years

    is_wet = profile in ["coastal_flood", "riverine_flood", "heat_flood", "urban_coastal"]
    is_dry = profile in ["arid_drought", "drought", "desert_heat"]

    for year in years_list:
        temp_rise = 0.0
        if year == 2010:
            temp_rise = -0.5
        elif year == 2015:
            temp_rise = -0.25
        elif year == 2020:
            temp_rise = 0.0
        elif year == 2026:
            temp_rise = 0.4
        elif year == 2030:
            temp_rise = 0.8
        elif year == 2040:
            temp_rise = 1.6
        elif year == 2050:
            temp_rise = 2.6
        else:
            temp_rise = (year - 2020) * 0.08

        rain_scale = 1.0
        if year >= 2030:
            if is_wet:
                rain_scale = 1.0 + (year - 2020) * 0.005
            elif is_dry:
                rain_scale = 1.0 - (year - 2020) * 0.008

        for month in range(1, 13):
            observed = date(year, month, 1)
            monsoon = 1.0 + 0.55 * sin((month - 5) / 12 * 6.283)
            heat = 1.0 + 0.22 * sin((month - 3) / 12 * 6.283)
            noise = rng.uniform(-0.08, 0.08)

            adjusted_rainfall = max(0.0, rainfall * monsoon * rain_scale * (1.0 + noise))
            adjusted_temp = temp * heat + temp_rise + rng.uniform(-1.0, 1.0)

            soil_scale = max(0.2, 1.0 - (temp_rise * 0.05)) if temp_rise > 0 else 1.0
            adjusted_soil = clamp(soil * soil_scale + (adjusted_rainfall - rainfall) * 0.08 - (adjusted_temp - temp) * 1.2)
            adjusted_ndvi = clamp(ndvi + (adjusted_soil - soil) * 0.005, 0.0, 1.0)
            adjusted_reservoir = clamp(reservoir * (rain_scale if rain_scale < 1 else 1.0) + (adjusted_rainfall - rainfall) * 0.1 - (adjusted_temp - temp) * 1.0)

            deficit = clamp((rainfall - adjusted_rainfall) / max(rainfall, 1) * 100, -100, 100)

            rows.append(
                {
                    "observed_on": observed,
                    "rainfall_mm": round(adjusted_rainfall, 1),
                    "rainfall_deficit_pct": round(deficit, 1),
                    "temperature_c": round(adjusted_temp, 1),
                    "humidity_pct": round(clamp(humidity + rng.uniform(-5, 5)), 1),
                    "river_level_m": round(max(0.2, river * (1.0 + (rain_scale - 1.0) * 0.5) + (adjusted_rainfall - rainfall) * 0.012), 2),
                    "soil_moisture_pct": round(adjusted_soil, 1),
                    "aqi": int(clamp(aqi + (temp_rise * 5) + rng.uniform(-12, 15), 10, 400)),
                    "ndvi": round(adjusted_ndvi, 3),
                    "land_surface_temp_c": round(adjusted_temp + rng.uniform(1.0, 3.5), 1),
                    "water_body_index": round(clamp(0.2 + adjusted_reservoir / 180, 0, 1), 3),
                    "reservoir_level_pct": round(adjusted_reservoir, 1),
                }
            )

    return rows


def sample_alerts() -> list[dict]:
    now = datetime.now(timezone.utc)
    return [
        {
            "district_code": "AS-DH",
            "severity": "high",
            "alert_type": "Flood Watch",
            "title": "Brahmaputra tributary levels rising",
            "message": "River levels and soil saturation indicate elevated flood risk over the next 72 hours.",
            "issued_at": now,
        },
        {
            "district_code": "RJ-JS",
            "severity": "critical",
            "alert_type": "Heatwave",
            "title": "Extreme heat stress likely",
            "message": "Maximum temperature anomaly and low humidity indicate severe outdoor exposure risk.",
            "issued_at": now,
        },
        {
            "district_code": "MH-MW",
            "severity": "high",
            "alert_type": "Drought",
            "title": "Reservoir drawdown alert",
            "message": "Reservoir storage and vegetation health remain below district resilience thresholds.",
            "issued_at": now,
        },
    ]
