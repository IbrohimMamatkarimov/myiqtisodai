import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class AIQuestionRequest(BaseModel):
    question: str = Field(min_length=2, max_length=2000)


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
