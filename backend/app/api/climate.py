from __future__ import annotations

from datetime import date
from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from sqlalchemy import desc, func, extract
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.climate import ClimateAlert, District, RiskScore, SatelliteData, State, WeatherData
from app.schemas.climate import AlertRead, ClimateObservation, DistrictRead, StateRead

router = APIRouter(prefix="/climate", tags=["climate"])


@router.get("/states", response_model=list[StateRead])
def states(db: Session = Depends(get_db)) -> list[State]:
    return db.query(State).order_by(State.name).all()


@router.get("/districts", response_model=list[DistrictRead])
def districts(state_id: int | None = None, db: Session = Depends(get_db)) -> list[DistrictRead]:
    query = db.query(District).join(State)
    if state_id:
        query = query.filter(District.state_id == state_id)
    return [
        DistrictRead(
            id=d.id,
            state_id=d.state_id,
            state_name=d.state.name,
            name=d.name,
            code=d.code,
            population=d.population,
            area_sq_km=d.area_sq_km,
            centroid_lat=d.centroid_lat,
            centroid_lon=d.centroid_lon,
            boundary_geojson=d.boundary_geojson,
        )
        for d in query.order_by(State.name, District.name).all()
    ]


@router.get("/districts/{district_id}/history", response_model=list[ClimateObservation])
def district_history(
    district_id: int,
    year: int | None = None,
    db: Session = Depends(get_db),
) -> list[ClimateObservation]:
    query = (
        db.query(WeatherData, SatelliteData)
        .join(
            SatelliteData,
            (SatelliteData.district_id == WeatherData.district_id)
            & (SatelliteData.observed_on == WeatherData.observed_on),
        )
        .filter(WeatherData.district_id == district_id)
    )
    if year:
        query = query.filter(extract("year", WeatherData.observed_on) == year)
    rows = query.order_by(WeatherData.observed_on).all()
    return [
        ClimateObservation(
            observed_on=w.observed_on,
            rainfall_mm=w.rainfall_mm,
            rainfall_deficit_pct=w.rainfall_deficit_pct,
            temperature_c=w.temperature_c,
            humidity_pct=w.humidity_pct,
            river_level_m=w.river_level_m,
            soil_moisture_pct=w.soil_moisture_pct,
            aqi=w.aqi,
            ndvi=s.ndvi,
            reservoir_level_pct=s.reservoir_level_pct,
            data_source=w.source,
            last_updated=w.last_updated,
            dataset_version=w.dataset_version,
            confidence=w.quality_status,
        )
        for w, s in rows
    ]


@router.get("/map/layers")
def map_layers(year: int | None = None, db: Session = Depends(get_db)) -> dict:
    latest_subquery = db.query(RiskScore.district_id, func.max(RiskScore.valid_on).label("valid_on"))
    if year:
        latest_subquery = latest_subquery.filter(extract("year", RiskScore.valid_on) == year)
    latest_subquery = latest_subquery.group_by(RiskScore.district_id).subquery()
    rows = (
        db.query(District, State, RiskScore)
        .join(State)
        .join(RiskScore, RiskScore.district_id == District.id)
        .join(
            latest_subquery,
            (latest_subquery.c.district_id == RiskScore.district_id)
            & (latest_subquery.c.valid_on == RiskScore.valid_on),
        )
        .all()
    )
    return {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": district.boundary_geojson["geometry"] if district.boundary_geojson else None,
                "properties": {
                    "district_id": district.id,
                    "district": district.name,
                    "state": state.name,
                    "temperature": risk.drivers.get("temperature_c"),
                    "rainfall": risk.drivers.get("rainfall_mm"),
                    "ndvi": risk.drivers.get("ndvi"),
                    "air_quality": risk.drivers.get("aqi", 100),
                    "soil_moisture": risk.drivers.get("soil_moisture_pct"),
                    "water_bodies": round(float(risk.drivers.get("water_body_index", 0.4)) * 100, 1),
                    "reservoir_level": risk.drivers.get("reservoir_level_pct"),
                    "flood_risk": risk.flood_risk,
                    "drought_risk": risk.drought_risk,
                    "heatwave_risk": risk.heatwave_risk,
                    "water_stress_risk": risk.water_stress_risk,
                    "composite_risk": risk.composite_risk,
                    "trend": risk.trend,
                },
            }
            for district, state, risk in rows
        ],
    }


@router.get("/rankings")
def rankings(year: int | None = None, limit: int = 10, db: Session = Depends(get_db)) -> list[dict]:
    query_latest = db.query(RiskScore.district_id, func.max(RiskScore.valid_on).label("valid_on"))
    if year:
        query_latest = query_latest.filter(extract("year", RiskScore.valid_on) == year)
    latest = query_latest.group_by(RiskScore.district_id).subquery()
    rows = (
        db.query(District, State, RiskScore)
        .join(State)
        .join(RiskScore)
        .join(latest, (latest.c.district_id == RiskScore.district_id) & (latest.c.valid_on == RiskScore.valid_on))
        .order_by(desc(RiskScore.composite_risk))
        .limit(limit)
        .all()
    )
    return [
        {
            "district_id": district.id,
            "district_name": district.name,
            "state_name": state.name,
            "flood_risk": risk.flood_risk,
            "drought_risk": risk.drought_risk,
            "heatwave_risk": risk.heatwave_risk,
            "water_stress_risk": risk.water_stress_risk,
            "composite_risk": risk.composite_risk,
            "trend": risk.trend,
        }
        for district, state, risk in rows
    ]


@router.get("/analytics")
def analytics(year: int | None = None, db: Session = Depends(get_db)) -> dict:
    query = (
        db.query(
            WeatherData.observed_on,
            func.avg(WeatherData.temperature_c),
            func.avg(WeatherData.rainfall_mm),
            func.avg(WeatherData.aqi),
            func.avg(SatelliteData.reservoir_level_pct),
        )
        .join(
            SatelliteData,
            (SatelliteData.district_id == WeatherData.district_id)
            & (SatelliteData.observed_on == WeatherData.observed_on),
        )
    )
    if year:
        query = query.filter(extract("year", WeatherData.observed_on) == year)
    rows = query.group_by(WeatherData.observed_on).order_by(WeatherData.observed_on).all()
    latest = rows[-1] if rows else None
    return {
        "national_trends": [
            {
                "date": row[0].isoformat(),
                "temperature_c": round(row[1], 1),
                "rainfall_mm": round(row[2], 1),
                "aqi": round(row[3], 0),
                "reservoir_level_pct": round(row[4], 1),
            }
            for row in rows[-36:]
        ],
        "summary": {
            "avg_temperature_c": round(latest[1], 1) if latest else 0,
            "avg_rainfall_mm": round(latest[2], 1) if latest else 0,
            "avg_aqi": round(latest[3], 0) if latest else 0,
            "avg_reservoir_level_pct": round(latest[4], 1) if latest else 0,
            "districts_monitored": db.query(District).count(),
        },
    }

@router.get("/alerts", response_model=list[AlertRead])
def alerts(db: Session = Depends(get_db)) -> list[AlertRead]:
    rows = (
        db.query(ClimateAlert, District, State)
        .join(District, ClimateAlert.district_id == District.id)
        .join(State, District.state_id == State.id)
        .order_by(desc(ClimateAlert.issued_at))
        .all()
    )

    return [
        AlertRead(
            id=alert.id,
            district=district.name,
            state=state.name,
            severity=alert.severity,
            alert_type=alert.alert_type,
            title=alert.title,
            message=alert.message,
            issued_at=alert.issued_at,
        )
        for alert, district, state in rows
    ]

@router.get("/reports/district/{district_id}.pdf")
def district_pdf_report(district_id: int, db: Session = Depends(get_db)) -> StreamingResponse:
    district = db.get(District, district_id)
    if not district:
        raise HTTPException(status_code=404, detail="District not found")
    risk = (
        db.query(RiskScore)
        .filter(RiskScore.district_id == district_id)
        .order_by(desc(RiskScore.valid_on))
        .first()
    )
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    pdf.setTitle(f"{district.name} Climate Risk Report")
    pdf.setFont("Helvetica-Bold", 18)
    pdf.drawString(72, 780, "Bharat Climate Twin")
    pdf.setFont("Helvetica", 12)
    pdf.drawString(72, 750, f"District: {district.name}, {district.state.name}")
    pdf.drawString(72, 730, f"Generated: {date.today().isoformat()}")
    if risk:
        pdf.drawString(72, 700, f"Composite Risk: {risk.composite_risk}/100 ({risk.trend})")
        pdf.drawString(72, 680, f"Flood: {risk.flood_risk}  Drought: {risk.drought_risk}")
        pdf.drawString(72, 660, f"Heatwave: {risk.heatwave_risk}  Water Stress: {risk.water_stress_risk}")
    pdf.drawString(72, 620, "Recommended Actions:")
    pdf.drawString(92, 600, "- Coordinate advisories with district disaster management authority.")
    pdf.drawString(92, 582, "- Validate reservoir, crop, and health exposure data within 24 hours.")
    pdf.showPage()
    pdf.save()
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=district-{district_id}-risk-report.pdf"},
    )


@router.get("/reports/state/{state_id}.pdf")
def state_pdf_report(state_id: int, db: Session = Depends(get_db)) -> StreamingResponse:
    state = db.get(State, state_id)
    if not state:
        raise HTTPException(status_code=404, detail="State not found")
    
    districts = db.query(District).filter(District.state_id == state_id).all()
    district_ids = [d.id for d in districts]
    
    avg_risk = 50.0
    if district_ids:
        avg_risk = db.query(func.avg(RiskScore.composite_risk)).filter(RiskScore.district_id.in_(district_ids)).scalar() or 50.0

    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    pdf.setTitle(f"{state.name} State Climate Risk Report")
    pdf.setFont("Helvetica-Bold", 18)
    pdf.drawString(72, 780, "Bharat Climate Twin")
    pdf.setFont("Helvetica", 12)
    pdf.drawString(72, 750, f"State: {state.name} (Code: {state.code})")
    pdf.drawString(72, 730, f"Generated: {date.today().isoformat()}")
    pdf.drawString(72, 700, f"Average State Composite Risk: {round(float(avg_risk), 1)}/100")
    
    pdf.drawString(72, 660, f"Monitored Districts in State ({len(districts)}):")
    y = 640
    for d in districts[:10]:
        pdf.drawString(92, y, f"- {d.name} (Pop: {d.population})")
        y -= 20
        
    pdf.drawString(72, y - 20, "Recommended Regional Actions:")
    pdf.drawString(92, y - 40, "- Coordinate cross-district flood-diversion infrastructure channels.")
    pdf.drawString(92, y - 58, "- Distribute drought-contingency subsidies for low-moisture sub-regions.")
    
    pdf.showPage()
    pdf.save()
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=state-{state_id}-risk-report.pdf"},
    )
