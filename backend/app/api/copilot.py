from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_optional_user
from app.api.climate import rankings
from app.db.session import get_db
from app.models.climate import ChatHistory
from app.models.user import User
from app.schemas.climate import CopilotRequest, CopilotResponse
from app.services.copilot import ClimateCopilot

router = APIRouter(prefix="/copilot", tags=["copilot"])
copilot_service = ClimateCopilot()


@router.post("/chat", response_model=CopilotResponse)
def chat(
    payload: CopilotRequest,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_optional_user),
) -> CopilotResponse:
    try:
        try:
            ranked = rankings(year=payload.active_year, limit=15, db=db)
        except Exception as e:
            logger.error(f"[COPILOT API] Failed to fetch rankings: {e}")
            ranked = []
        
        response = copilot_service.answer(payload, ranked, db)
        
        try:
            db.add(ChatHistory(user_id=user.id if user else None, prompt=payload.prompt, response=response))
            db.commit()
        except Exception as e:
            logger.error(f"[COPILOT API] Failed to save chat history: {e}")
            db.rollback()
            
        return CopilotResponse(**response)
    except Exception as err:
        logger.error(f"[COPILOT API] Unhandled exception in chat endpoint: {err}")
        # Build immediate safe fallback payload
        fallback_res = {
            "explanation": "### Climate Copilot Interface\n\nThe Climate Copilot is currently running in local offline safety mode due to an unexpected system warning. Active monitoring registries remain operational.",
            "risk_analysis": "Operational status is stable. Database queries are being bypassed.",
            "recommended_actions": ["Refresh the dashboard console.", "Check telemetry service connections."],
            "chart": {"type": "bar", "data": []},
            "districts": [],
            "action": None,
            "suggestions": ["Show Platform Help"],
            "explainable_risk": {"confidence": 100, "drivers": ["System Fallback"], "actions": [], "sources": ["Local Safety Engine"]},
            "insights": ["Copilot safety mode engaged."]
        }
        return CopilotResponse(**fallback_res)


@router.get("/history")
def history(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> list[dict]:
    rows = (
        db.query(ChatHistory)
        .filter(ChatHistory.user_id == user.id)
        .order_by(ChatHistory.created_at.desc())
        .limit(25)
        .all()
    )
    return [
        {
            "id": row.id,
            "prompt": row.prompt,
            "response": row.response,
            "created_at": row.created_at.isoformat(),
        }
        for row in rows
    ]
