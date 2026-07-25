import uuid
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.category import CategoryType


class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    icon: Optional[str] = None
    color: Optional[str] = None
    type: CategoryType
    parent_id: Optional[uuid.UUID] = None


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    parent_id: Optional[uuid.UUID] = None


class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    icon: Optional[str]
    color: Optional[str]
    type: CategoryType
    parent_id: Optional[uuid.UUID]
    is_default: bool
