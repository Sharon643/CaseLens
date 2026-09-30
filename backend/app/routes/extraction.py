from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.extraction_service import (
    ExtractionService,
)


router = APIRouter(
    prefix="/evidence",
    tags=["Evidence Extraction"],
)


@router.post("/{evidence_id}/extract")
def extract_evidence(
    evidence_id: int,
    db: Session = Depends(get_db),
):
    try:
        service = ExtractionService(db)

        return service.extract(
            evidence_id
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=404,
            detail=str(exc),
        )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=str(exc),
        )


@router.post("/cases/{case_id}/extract")
def extract_case(
    case_id: int,
    db: Session = Depends(get_db),
):
    try:
        service = ExtractionService(db)

        return service.extract_case(
            case_id
        )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=str(exc),
        )