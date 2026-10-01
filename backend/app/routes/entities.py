from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.entity_extraction import (
    EntityExtractionService,
)


router = APIRouter(
    prefix="/evidence",
    tags=["Entity Extraction"],
)


@router.post("/{evidence_id}/entities")
def extract_entities(
    evidence_id: int,
    db: Session = Depends(get_db),
):
    try:
        service = EntityExtractionService(db)

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

@router.post("/cases/{case_id}/entities")
def extract_case_entities(
    case_id: int,
    db: Session = Depends(get_db),
):
    try:
        service = EntityExtractionService(db)

        return service.extract_from_case(
            case_id
        )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=str(exc),
        )