import re

from sqlalchemy.orm import Session

from app.models.event import Event
from app.models.evidence import Evidence
from app.models.relationship import Relationship


ACTION_RELATIONSHIPS = {
    "OPEN": "OPENED",
    "COPY": "COPIED",
    "DOWNLOAD": "DOWNLOADED",
    "DELETE": "DELETED",
    "CREATE": "CREATED",
    "MODIFY": "MODIFIED",
    "WRITE": "WROTE",
    "READ": "READ",
    "MOUNT": "MOUNTED",
}


class RelationshipExtractionService:

    def __init__(self, db: Session):
        self.db = db

    def extract_from_event(
        self,
        event_id: int,
    ) -> dict:

        event = self.db.get(Event, event_id)

        if not event:
            raise ValueError(
                f"Event {event_id} not found"
            )

        evidence = self.db.get(
            Evidence,
            event.evidence_id,
        )

        if not evidence:
            raise ValueError(
                f"Evidence {event.evidence_id} not found"
            )

        # Remove previously generated relationships
        # for this event so extraction is idempotent.
        self.db.query(Relationship).filter(
            Relationship.event_id == event.id
        ).delete(
            synchronize_session=False
        )

        relationships = self._build_relationships(
            event,
            evidence,
        )

        for relationship in relationships:
            self.db.add(relationship)

        self.db.commit()

        return {
            "event_id": event.id,
            "relationships_created": len(
                relationships
            ),
        }

    def extract_from_case(
        self,
        case_id: int,
    ) -> dict:

        events = (
            self.db.query(Event)
            .join(
                Evidence,
                Event.evidence_id == Evidence.id,
            )
            .filter(
                Evidence.case_id == case_id,
            )
            .order_by(
                Event.timestamp,
                Event.id,
            )
            .all()
        )

        total = len(events)
        processed = 0
        skipped = 0
        failed = 0
        total_relationships = 0
        failures = []

        for event in events:

            try:

                existing_count = (
                    self.db.query(Relationship)
                    .filter(
                        Relationship.event_id
                        == event.id
                    )
                    .count()
                )

                if existing_count > 0:
                    skipped += 1
                    total_relationships += (
                        existing_count
                    )
                    continue

                result = self.extract_from_event(
                    event.id
                )

                processed += 1

                total_relationships += (
                    result["relationships_created"]
                )

            except Exception as exc:

                self.db.rollback()

                failed += 1

                failures.append({
                    "event_id": event.id,
                    "error": str(exc),
                })

        return {
            "case_id": case_id,
            "total_events": total,
            "processed": processed,
            "skipped": skipped,
            "failed": failed,
            "total_relationships": (
                total_relationships
            ),
            "failures": failures,
        }

    def _build_relationships(
        self,
        event: Event,
        evidence: Evidence,
    ) -> list[Relationship]:

        text = event.description

        relationships = []

        # -------------------------------------------------
        # Format 1
        #
        # User arjun.nair performed COPY
        # on orion_core_v7.zip
        # using device ORN-LAP-02
        # -------------------------------------------------

        match = re.search(
            r"User\s+(?P<user>\S+)"
            r"\s+performed\s+(?P<action>\S+)"
            r"\s+on\s+(?P<file>.+?)"
            r"\s+using\s+device\s+(?P<device>\S+)",
            text,
            re.IGNORECASE,
        )

        if match:

            user = match.group("user")
            action = match.group("action")
            file_name = match.group("file")
            device = match.group("device")

            relationships.extend(
                self._person_file_device(
                    evidence.id,
                    event.id,
                    user,
                    action,
                    file_name,
                    device,
                )
            )

            return relationships

        # -------------------------------------------------
        # Format 2
        #
        # user=arjun.nair | file=file.zip |
        # classification=CONFIDENTIAL
        #
        # OR
        #
        # user=arjun.nair | file=file.zip |
        # action=COPY | destination=USB-4471
        # -------------------------------------------------

        user = self._get_field(
            text,
            "user",
        )

        file_name = self._get_field(
            text,
            "file",
        )

        action = self._get_field(
            text,
            "action",
        )

        destination = self._get_field(
            text,
            "destination",
        )

        if user and file_name:

            if action:

                relationships.append(
                    self._relationship(
                        evidence.id,
                        event.id,
                        "person",
                        user,
                        ACTION_RELATIONSHIPS.get(
                            action.upper(),
                            action.upper(),
                        ),
                        "file",
                        file_name,
                    )
                )

            else:

                relationships.append(
                    self._relationship(
                        evidence.id,
                        event.id,
                        "person",
                        user,
                        "ACCESSED",
                        "file",
                        file_name,
                    )
                )

            if destination:

                relationships.append(
                    self._relationship(
                        evidence.id,
                        event.id,
                        "file",
                        file_name,
                        "WRITTEN_TO",
                        "device",
                        destination,
                    )
                )

        # -------------------------------------------------
        # Format 3
        #
        # process=FileCopy action=write
        # destination=USB-4471
        # file=orion_core_v7.zip
        # -------------------------------------------------

        process = self._get_field(
            text,
            "process",
        )

        if process and file_name:

            process_action = (
                action.upper()
                if action
                else "ACCESSED"
            )

            relationships.append(
                self._relationship(
                    evidence.id,
                    event.id,
                    "process",
                    process,
                    ACTION_RELATIONSHIPS.get(
                        process_action,
                        process_action,
                    ),
                    "file",
                    file_name,
                )
            )

            if destination:

                relationships.append(
                    self._relationship(
                        evidence.id,
                        event.id,
                        "process",
                        process,
                        "WRITTEN_TO",
                        "device",
                        destination,
                    )
                )

                relationships.append(
                    self._relationship(
                        evidence.id,
                        event.id,
                        "file",
                        file_name,
                        "WRITTEN_TO",
                        "device",
                        destination,
                    )
                )

        # -------------------------------------------------
        # Format 4
        #
        # session_resume user=arjun.nair
        #
        # interactive_login user=arjun.nair
        #
        # session_end user=arjun.nair
        # -------------------------------------------------

        if user and not file_name:

            event_type = event.event_type.lower()

            relationship_type = (
                self._session_relationship(
                    event_type,
                    text,
                )
            )

            if relationship_type:

                relationships.append(
                    self._relationship(
                        evidence.id,
                        event.id,
                        "person",
                        user,
                        relationship_type,
                        "event",
                        event_type,
                    )
                )

        # -------------------------------------------------
        # Format 5
        #
        # device_detected device=USB-4471
        #
        # device_removed device=USB-4471
        #
        # CONNECT device=USB-4471
        #
        # MOUNT device=USB-4471
        # -------------------------------------------------

        device = self._get_field(
            text,
            "device",
        )

        if device:

            event_type = event.event_type.lower()

            device_relationship = (
                self._device_relationship(
                    event_type,
                    text,
                )
            )

            if device_relationship:

                relationships.append(
                    self._relationship(
                        evidence.id,
                        event.id,
                        "device",
                        device,
                        device_relationship,
                        "event",
                        event_type,
                    )
                )

        return relationships

    def _person_file_device(
        self,
        evidence_id: int,
        event_id: int,
        user: str,
        action: str,
        file_name: str,
        device: str,
    ) -> list[Relationship]:

        relationship_type = (
            ACTION_RELATIONSHIPS.get(
                action.upper(),
                action.upper(),
            )
        )

        return [
            self._relationship(
                evidence_id,
                event_id,
                "person",
                user,
                relationship_type,
                "file",
                file_name,
            ),
            self._relationship(
                evidence_id,
                event_id,
                "person",
                user,
                "USED",
                "device",
                device,
            ),
            self._relationship(
                evidence_id,
                event_id,
                "device",
                device,
                relationship_type,
                "file",
                file_name,
            ),
        ]

    def _get_field(
        self,
        text: str,
        field: str,
    ) -> str | None:

        pattern = rf"\b{re.escape(field)}="
        
        match = re.search(
            pattern + r"([^\s|]+)",
            text,
            re.IGNORECASE,
        )

        if not match:
            return None

        return match.group(1).strip()

    def _session_relationship(
        self,
        event_type: str,
        text: str,
    ) -> str | None:

        if "interactive_login" in text:
            return "LOGGED_IN"

        if "session_resume" in text:
            return "RESUMED_SESSION"

        if "session_end" in text:
            return "ENDED_SESSION"

        if "logout" in text.lower():
            return "LOGGED_OUT"

        return None

    def _device_relationship(
        self,
        event_type: str,
        text: str,
    ) -> str | None:

        if "device_detected" in text:
            return "DETECTED"

        if "device_removed" in text:
            return "REMOVED"

        if "CONNECT" in text:
            return "CONNECTED"

        if "MOUNT" in text:
            return "MOUNTED"

        return None

    def _relationship(
        self,
        evidence_id: int,
        event_id: int,
        source_type: str,
        source_value: str,
        relationship_type: str,
        target_type: str,
        target_value: str,
    ) -> Relationship:

        return Relationship(
            evidence_id=evidence_id,
            event_id=event_id,
            source_type=source_type,
            source_value=source_value,
            relationship_type=relationship_type,
            target_type=target_type,
            target_value=target_value,
        )