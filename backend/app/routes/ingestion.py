from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.evidence_ingestion import (
    EvidenceIngestionService,
)


router = APIRouter(
    prefix="/cases/{case_id}/ingestion",
    tags=["Evidence Ingestion"],
)


@router.post("")
def ingest_evidence(
    case_id: int,
    db: Session = Depends(get_db),
):
    source_directory = (
        f"../dataset/case_001/evidence"
    )

    try:
        service = EvidenceIngestionService(db)

        result = service.ingest_directory(
            case_id=case_id,
            source_directory=source_directory,
        )

        return result

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )