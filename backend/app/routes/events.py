from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.event_extraction import (
    EventExtractionService,
)


router = APIRouter(
    prefix="/evidence",
    tags=["Event Extraction"],
)


@router.post("/{evidence_id}/events")
def extract_evidence_events(
    evidence_id: int,
    db: Session = Depends(get_db),
):
    try:
        service = EventExtractionService(db)

        return service.extract_from_evidence(
            evidence_id
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=str(exc),
        )


@router.post("/cases/{case_id}/events")
def extract_case_events(
    case_id: int,
    db: Session = Depends(get_db),
):
    try:
        service = EventExtractionService(db)

        return service.extract_from_case(
            case_id
        )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=str(exc),
        )