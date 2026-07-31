import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class AIQuestionRequest(BaseModel):
    question: str = Field(min_length=2, max_length=2000)
    # The Dashboard's AI Coach card silently reuses this same endpoint to
    # generate its insight text. Without this flag, that internal call was
    # polluting the user's real chat history on the Assistant page.
    save_history: bool = True


class AIAnswerResponse(BaseModel):
    question: str
    answer: str


class AIConversationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    question: str
    answer: str
    created_at: datetime


class MarketQueryRequest(BaseModel):
    query: str = Field(min_length=2, max_length=500)


class MarketQueryResponse(BaseModel):
    query: str
    answer: str
    disclaimer: str = (
        "Prices are AI-estimated approximations and may not reflect real-time market data. "
        "Connect a live market data provider in services/market_price.py for accurate figures."
    )
