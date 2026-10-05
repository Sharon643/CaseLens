from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db

from app.models.entity import Entity
from app.models.event import Event
from app.models.evidence import Evidence
from app.models.relationship import Relationship


router = APIRouter(
    prefix="/cases",
    tags=["Entity Details"],
)


@router.get("/{case_id}/graph-node/details")
def get_graph_node_details(
    case_id: int,
    node_type: str,
    node_value: str,
    db: Session = Depends(get_db),
):
    # ---------------------------------------------------------
    # 1. Verify the case has evidence
    # ---------------------------------------------------------

    evidence_ids = (
        db.query(Evidence.id)
        .filter(
            Evidence.case_id == case_id
        )
        .all()
    )

    evidence_ids = [
        evidence_id
        for (evidence_id,) in evidence_ids
    ]

    if not evidence_ids:
        raise HTTPException(
            status_code=404,
            detail="Case has no evidence",
        )

    # ---------------------------------------------------------
    # 2. Find relationships involving this graph node
    # ---------------------------------------------------------

    relationships = (
        db.query(Relationship)
        .filter(
            Relationship.evidence_id.in_(
                evidence_ids
            )
        )
        .filter(
            (
                (
                    Relationship.source_type
                    == node_type
                )
                &
                (
                    Relationship.source_value
                    == node_value
                )
            )
            |
            (
                (
                    Relationship.target_type
                    == node_type
                )
                &
                (
                    Relationship.target_value
                    == node_value
                )
            )
        )
        .order_by(
            Relationship.id.asc()
        )
        .all()
    )

    # ---------------------------------------------------------
    # 3. Find entity records if they exist
    # ---------------------------------------------------------

    entities = (
        db.query(Entity)
        .filter(
            Entity.evidence_id.in_(
                evidence_ids
            ),
            Entity.entity_type == node_type,
            Entity.value == node_value,
        )
        .all()
    )

    # ---------------------------------------------------------
    # 4. Find events connected to those relationships
    # ---------------------------------------------------------

    event_ids = {
        relationship.event_id
        for relationship in relationships
        if relationship.event_id is not None
    }

    events = []

    if event_ids:
        events = (
            db.query(Event)
            .filter(
                Event.id.in_(event_ids)
            )
            .order_by(
                Event.timestamp.asc()
            )
            .all()
        )

    # ---------------------------------------------------------
    # 5. Find evidence connected to relationships/events
    # ---------------------------------------------------------

    related_evidence_ids = set(
        relationship.evidence_id
        for relationship in relationships
    )

    related_evidence_ids.update(
        event.evidence_id
        for event in events
    )

    evidence = []

    if related_evidence_ids:
        evidence = (
            db.query(Evidence)
            .filter(
                Evidence.id.in_(
                    related_evidence_ids
                )
            )
            .order_by(
                Evidence.id.asc()
            )
            .all()
        )

    # ---------------------------------------------------------
    # 6. Serialize entities
    # ---------------------------------------------------------

    entity_data = [
        {
            "id": entity.id,
            "evidence_id":
                entity.evidence_id,
            "entity_type":
                entity.entity_type,
            "value":
                entity.value,
            "start_position":
                entity.start_position,
            "end_position":
                entity.end_position,
            "extracted_at":
                entity.extracted_at.isoformat()
                if entity.extracted_at
                else None,
        }
        for entity in entities
    ]

    # ---------------------------------------------------------
    # 7. Serialize events
    # ---------------------------------------------------------

    event_data = [
        {
            "id": event.id,
            "evidence_id":
                event.evidence_id,
            "event_type":
                event.event_type,
            "timestamp":
                event.timestamp.isoformat()
                if event.timestamp
                else None,
            "description":
                event.description,
            "source_text":
                event.source_text,
        }
        for event in events
    ]

    # ---------------------------------------------------------
    # 8. Serialize relationships
    # ---------------------------------------------------------

    relationship_data = [
        {
            "id": relationship.id,
            "evidence_id":
                relationship.evidence_id,
            "source_type":
                relationship.source_type,
            "source_value":
                relationship.source_value,
            "relationship_type":
                relationship.relationship_type,
            "target_type":
                relationship.target_type,
            "target_value":
                relationship.target_value,
            "event_id":
                relationship.event_id,
        }
        for relationship in relationships
    ]

    # ---------------------------------------------------------
    # 9. Serialize evidence
    # ---------------------------------------------------------

    evidence_data = [
        {
            "id": item.id,
            "case_id":
                item.case_id,
            "original_filename":
                item.original_filename,
            "stored_filename":
                item.stored_filename,
            "file_type":
                item.file_type,
            "file_size":
                item.file_size,
            "sha256_hash":
                item.sha256_hash,
            "extraction_status":
                item.extraction_status,
            "uploaded_at":
                item.uploaded_at.isoformat()
                if item.uploaded_at
                else None,
        }
        for item in evidence
    ]

    # ---------------------------------------------------------
    # 10. Return graph-node investigation data
    # ---------------------------------------------------------

    return {
        "node": {
            "type": node_type,
            "value": node_value,
            "id": f"{node_type}:{node_value}",
        },

        "entities": entity_data,

        "events": event_data,

        "relationships": relationship_data,

        "evidence": evidence_data,

        "counts": {
            "entities": len(entity_data),
            "events": len(event_data),
            "relationships": len(
                relationship_data
            ),
            "evidence": len(evidence_data),
        },
    }