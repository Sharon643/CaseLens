from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.relationship_extraction import (
    RelationshipExtractionService,
)


router = APIRouter(
    prefix="/evidence",
    tags=["Relationship Extraction"],
)


@router.post("/{evidence_id}/relationships")
def extract_evidence_relationships(
    evidence_id: int,
    db: Session = Depends(get_db),
):
    try:
        service = RelationshipExtractionService(db)

        # Get events belonging to this evidence.
        from app.models.event import Event

        events = (
            db.query(Event)
            .filter(
                Event.evidence_id == evidence_id
            )
            .all()
        )

        total_relationships = 0

        for event in events:
            result = service.extract_from_event(
                event.id
            )

            total_relationships += (
                result["relationships_created"]
            )

        return {
            "evidence_id": evidence_id,
            "events_processed": len(events),
            "relationships_created": (
                total_relationships
            ),
        }

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


@router.post("/cases/{case_id}/relationships")
def extract_case_relationships(
    case_id: int,
    db: Session = Depends(get_db),
):
    try:
        service = RelationshipExtractionService(db)

        return service.extract_from_case(
            case_id
        )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=str(exc),
        )