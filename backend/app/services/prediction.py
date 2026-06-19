from __future__ import annotations

from datetime import date, timedelta

from app.services.risk_engine import risk_band
from app.core.utils import clamp


class DisasterPredictionService:
    """Model facade for XGBoost, Random Forest, and scikit-learn pipelines.

    The current implementation is deterministic and explainable so local demos work
    without trained model binaries. Production adapters can load serialized models
    behind these methods while preserving API contracts.
    """

    model_version = "baseline-2026.06"

    def flood(self, inputs: dict) -> dict:
        probability = clamp(
            (inputs.get("rainfall_mm") or 0) * 0.22
            + (inputs.get("river_level_m") or 0) * 8.5
            + (inputs.get("soil_moisture_pct") or 0) * 0.24
            + (inputs.get("reservoir_capacity_pct") or 50) * 0.08
        )
        return self._response(
            "flood",
            probability,
            "RandomForestFlood-v1",
            inputs,
            "Flood probability combines rainfall intensity, river level, soil saturation, and reservoir headroom.",
        )

    def drought(self, inputs: dict) -> dict:
        probability = clamp(
            max(inputs.get("rainfall_deficit_pct") or 0, 0) * 0.64
            + max((inputs.get("temperature_c") or 30) - 30, 0) * 4.2
            + max(0.55 - (inputs.get("ndvi") or 0.4), 0) * 70
        )
        return self._response(
            "drought",
            probability,
            "XGBoostDrought-v1",
            inputs,
            "Drought probability is driven by rainfall deficit, heat anomaly, and declining vegetation health.",
        )

    def heatwave(self, inputs: dict) -> dict:
        probability = clamp(
            max((inputs.get("temperature_c") or 30) - 32, 0) * 10
            + max((inputs.get("humidity_pct") or 45) - 45, 0) * 0.8
        )
        return self._response(
            "heatwave",
            probability,
            "SklearnHeatAlert-v1",
            inputs,
            "Heatwave alert probability combines temperature trend and humidity-driven heat stress.",
        )

    def _response(
        self,
        prediction_type: str,
        probability: float,
        model_name: str,
        inputs: dict,
        explanation: str,
    ) -> dict:
        probability = round(probability, 1)
        return {
            "prediction_type": prediction_type,
            "probability": probability,
            "risk_zone": risk_band(probability),
            "model_name": model_name,
            "model_version": self.model_version,
            "valid_for": date.today() + timedelta(days=3),
            "explanation": explanation,
            "inputs": inputs,
        }
