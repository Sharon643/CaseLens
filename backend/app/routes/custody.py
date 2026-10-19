from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.case import Case
from app.models.evidence import Evidence
from app.models.custody_record import CustodyRecord

router = APIRouter(
    prefix="/cases/{case_id}/evidence/{evidence_id}/custody",
    tags=["Chain of Custody"],
)


class CustodyRecordCreate(BaseModel):
    action: str = Field(min_length=1, max_length=50)
    actor: str = Field(min_length=1, max_length=255)
    details: str | None = None


@router.post("")
def create_custody_record(
    case_id: int,
    evidence_id: int,
    payload: CustodyRecordCreate,
    db: Session = Depends(get_db),
):
    case = db.get(Case, case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")

    evidence = (
        db.query(Evidence)
        .filter(
            Evidence.id == evidence_id,
            Evidence.case_id == case_id,
        )
        .first()
    )
    if evidence is None:
        raise HTTPException(
            status_code=404,
            detail="Evidence not found in this case",
        )

    record = CustodyRecord(
        case_id=case_id,
        evidence_id=evidence_id,
        action=payload.action.strip(),
        actor=payload.actor.strip(),
        details=payload.details,
        sha256_hash=evidence.sha256_hash,
        recorded_at=datetime.now(timezone.utc),
    )

    db.add(record)
    db.commit()
    db.refresh(record)

    return {
        "id": record.id,
        "case_id": record.case_id,
        "evidence_id": record.evidence_id,
        "action": record.action,
        "actor": record.actor,
        "details": record.details,
        "sha256_hash": record.sha256_hash,
        "recorded_at": record.recorded_at,
    }


@router.get("")
def list_custody_records(
    case_id: int,
    evidence_id: int,
    db: Session = Depends(get_db),
):
    evidence = (
        db.query(Evidence)
        .filter(
            Evidence.id == evidence_id,
            Evidence.case_id == case_id,
        )
        .first()
    )
    if evidence is None:
        raise HTTPException(
            status_code=404,
            detail="Evidence not found in this case",
        )

    records = (
        db.query(CustodyRecord)
        .filter(
            CustodyRecord.case_id == case_id,
            CustodyRecord.evidence_id == evidence_id,
        )
        .order_by(
            CustodyRecord.recorded_at.asc(),
            CustodyRecord.id.asc(),
        )
        .all()
    )

    return {
        "case_id": case_id,
        "evidence_id": evidence_id,
        "count": len(records),
        "records": [
            {
                "id": record.id,
                "action": record.action,
                "actor": record.actor,
                "details": record.details,
                "sha256_hash": record.sha256_hash,
                "recorded_at": record.recorded_at,
            }
            for record in records
        ],
    }