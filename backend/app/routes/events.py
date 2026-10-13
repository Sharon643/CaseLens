from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.evidence import Evidence
from app.models.event import Event
from app.services.event_extraction import EventExtractionService
from app.services.investigation_analysis import InvestigationAnalysisService



router = APIRouter(
    prefix="/evidence",
    tags=["Event Extraction"],
)


@router.post("/{evidence_id}/events")
def extract_evidence_events(
    evidence_id: int,
    db: Session = Depends(get_db),
):
    """Extract events from one evidence record."""
    try:
        service = EventExtractionService(db)
        return service.extract_from_evidence(evidence_id)

    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Failed to extract events from evidence.",
        ) from exc


@router.get("/{evidence_id}/events")
def get_evidence_events(
    evidence_id: int,
    db: Session = Depends(get_db),
):
    """Return events associated with one evidence record."""
    evidence = (
        db.query(Evidence)
        .filter(Evidence.id == evidence_id)
        .first()
    )

    if evidence is None:
        raise HTTPException(
            status_code=404,
            detail=f"Evidence {evidence_id} was not found.",
        )

    events = (
        db.query(Event)
        .filter(Event.evidence_id == evidence_id)
        .order_by(Event.timestamp.asc().nullslast(), Event.id.asc())
        .all()
    )

    return {
        "case_id": evidence.case_id,
        "evidence_id": evidence.id,
        "events": [
            {
                "id": event.id,
                "evidence_id": event.evidence_id,
                "event_type": event.event_type,
                "timestamp": event.timestamp,
                "description": event.description,
                "source_text": event.source_text,
            }
            for event in events
        ],
    }


@router.post("/cases/{case_id}/events")
def extract_case_events(
    case_id: int,
    db: Session = Depends(get_db),
):
    """Extract events from all evidence belonging to a case."""
    try:
        service = EventExtractionService(db)
        return service.extract_from_case(case_id)

    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Failed to extract case events.",
        ) from exc


@router.get("/cases/{case_id}/events")
def get_case_events(
    case_id: int,
    db: Session = Depends(get_db),
):
    """Return all events for a case in chronological order."""

    rows = (
        db.query(Event, Evidence.original_filename)
        .join(Evidence, Event.evidence_id == Evidence.id)
        .filter(Evidence.case_id == case_id)
        .order_by(
            Event.timestamp.asc().nullslast(),
            Event.id.asc(),
        )
        .all()
    )

    return {
        "case_id": case_id,
        "event_count": len(rows),
        "events": [
            {
                "id": event.id,
                "evidence_id": event.evidence_id,
                "evidence_filename": filename,
                "event_type": event.event_type,
                "timestamp": event.timestamp,
                "description": event.description,
                "source_text": event.source_text,
            }
            for event, filename in rows
        ],
    }


@router.get("/cases/{case_id}/analysis")
def analyze_case(
    case_id: int,
    db: Session = Depends(get_db),
):
    """Return explainable investigation findings for a case."""
    case_exists = (
        db.query(Evidence.id)
        .filter(Evidence.case_id == case_id)
        .first()
    )

    if case_exists is None:
        raise HTTPException(
            status_code=404,
            detail=f"No evidence found for case {case_id}.",
        )

    try:
        service = InvestigationAnalysisService(db)
        return service.analyze_case(case_id)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Failed to analyze investigation events.",
        ) from exc

