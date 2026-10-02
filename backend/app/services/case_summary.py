from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.case import Case
from app.models.evidence import Evidence
from app.models.entity import Entity
from app.models.event import Event
from app.models.relationship import Relationship


class CaseSummaryService:

    def __init__(self, db: Session):
        self.db = db

    def get_summary(self, case_id: int) -> dict:

        case = self.db.get(Case, case_id)

        if not case:
            raise ValueError(
                f"Case {case_id} not found"
            )

        # -------------------------
        # Basic counts
        # -------------------------

        evidence_count = (
            self.db.query(func.count(Evidence.id))
            .filter(
                Evidence.case_id == case_id
            )
            .scalar()
            or 0
        )

        event_count = (
            self.db.query(func.count(Event.id))
            .join(
                Evidence,
                Event.evidence_id == Evidence.id,
            )
            .filter(
                Evidence.case_id == case_id
            )
            .scalar()
            or 0
        )

        entity_count = (
            self.db.query(func.count(Entity.id))
            .join(
                Evidence,
                Entity.evidence_id == Evidence.id,
            )
            .filter(
                Evidence.case_id == case_id
            )
            .scalar()
            or 0
        )

        relationship_count = (
            self.db.query(
                func.count(Relationship.id)
            )
            .join(
                Evidence,
                Relationship.evidence_id
                == Evidence.id,
            )
            .filter(
                Evidence.case_id == case_id
            )
            .scalar()
            or 0
        )

        # -------------------------
        # Actors
        # -------------------------

        actors = [
            row[0]
            for row in (
                self.db.query(
                    Relationship.source_value
                )
                .join(
                    Evidence,
                    Relationship.evidence_id
                    == Evidence.id,
                )
                .filter(
                    Evidence.case_id == case_id,
                    Relationship.source_type
                    == "person",
                )
                .distinct()
                .all()
            )
        ]

        # -------------------------
        # Devices
        # -------------------------

        devices = [
            row[0]
            for row in (
                self.db.query(
                    Relationship.target_value
                )
                .join(
                    Evidence,
                    Relationship.evidence_id
                    == Evidence.id,
                )
                .filter(
                    Evidence.case_id == case_id,
                    Relationship.target_type
                    == "device",
                )
                .distinct()
                .all()
            )
        ]

        # Also include devices appearing
        # as relationship sources.
        source_devices = [
            row[0]
            for row in (
                self.db.query(
                    Relationship.source_value
                )
                .join(
                    Evidence,
                    Relationship.evidence_id
                    == Evidence.id,
                )
                .filter(
                    Evidence.case_id == case_id,
                    Relationship.source_type
                    == "device",
                )
                .distinct()
                .all()
            )
        ]

        devices = sorted(
            set(devices + source_devices)
        )

        # -------------------------
        # Files
        # -------------------------

        files = [
            row[0]
            for row in (
                self.db.query(
                    Relationship.target_value
                )
                .join(
                    Evidence,
                    Relationship.evidence_id
                    == Evidence.id,
                )
                .filter(
                    Evidence.case_id == case_id,
                    Relationship.target_type
                    == "file",
                )
                .distinct()
                .all()
            )
        ]

        source_files = [
            row[0]
            for row in (
                self.db.query(
                    Relationship.source_value
                )
                .join(
                    Evidence,
                    Relationship.evidence_id
                    == Evidence.id,
                )
                .filter(
                    Evidence.case_id == case_id,
                    Relationship.source_type
                    == "file",
                )
                .distinct()
                .all()
            )
        ]

        files = sorted(
            set(files + source_files)
        )

        # -------------------------
        # Event types
        # -------------------------

        event_type_rows = (
            self.db.query(
                Event.event_type,
                func.count(Event.id),
            )
            .join(
                Evidence,
                Event.evidence_id == Evidence.id,
            )
            .filter(
                Evidence.case_id == case_id
            )
            .group_by(Event.event_type)
            .all()
        )

        event_types = {
            event_type: count
            for event_type, count
            in event_type_rows
        }

        return {
            "case_id": case_id,
            "evidence_count": evidence_count,
            "entity_count": entity_count,
            "event_count": event_count,
            "relationship_count": relationship_count,
            "actors": sorted(actors),
            "devices": devices,
            "files": files,
            "event_types": event_types,
        }