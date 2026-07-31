from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.ai_conversation import AIConversation, MarketQuery
from app.models.user import User
from app.schemas.ai import (
    AIAnswerResponse,
    AIConversationOut,
    AIQuestionRequest,
    MarketQueryRequest,
    MarketQueryResponse,
)
from app.services.ai_assistant import ask_financial_assistant
from app.services.market_price import ask_market_assistant

router = APIRouter(tags=["AI"])


@router.post("/ai/ask", response_model=AIAnswerResponse)
def ask_ai(
    payload: AIQuestionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    answer = ask_financial_assistant(db, current_user, payload.question)

    if payload.save_history:
        conversation = AIConversation(user_id=current_user.id, question=payload.question, answer=answer)
        db.add(conversation)
        db.commit()

    return AIAnswerResponse(question=payload.question, answer=answer)


@router.get("/ai/history", response_model=list[AIConversationOut])
def ai_history(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.scalars(
        select(AIConversation)
        .where(AIConversation.user_id == current_user.id)
        .order_by(AIConversation.created_at.desc())
        .limit(50)
    ).all()


@router.delete("/ai/history/{conversation_id}", status_code=204)
def delete_ai_history_item(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    convo = db.get(AIConversation, conversation_id)
    if convo and convo.user_id == current_user.id:
        db.delete(convo)
        db.commit()
    return None


@router.delete("/ai/history", status_code=204)
def clear_ai_history(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(AIConversation).filter(AIConversation.user_id == current_user.id).delete()
    db.commit()
    return None


@router.post("/market/ask", response_model=MarketQueryResponse)
def ask_market(
    payload: MarketQueryRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    answer = ask_market_assistant(payload.query)

    record = MarketQuery(user_id=current_user.id, query_text=payload.query, answer=answer)
    db.add(record)
    db.commit()

    return MarketQueryResponse(query=payload.query, answer=answer)
