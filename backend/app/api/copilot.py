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
    ranked = rankings(limit=15, db=db)
    response = copilot_service.answer(payload, ranked, db)
    db.add(ChatHistory(user_id=user.id if user else None, prompt=payload.prompt, response=response))
    db.commit()
    return CopilotResponse(**response)


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
