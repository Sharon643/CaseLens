from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CaseCreate(BaseModel):
    case_number: str
    title: str
    description: str | None = None


class CaseUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: str | None = None


class CaseResponse(BaseModel):
    id: int
    case_number: str
    title: str
    description: str | None
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)