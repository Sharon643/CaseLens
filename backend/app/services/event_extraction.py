import csv
import io
import re
from datetime import datetime

from sqlalchemy.orm import Session

from app.models.event import Event
from app.models.evidence import Evidence


TIMESTAMP_PATTERNS = [
    re.compile(
        r"\b\d{4}-\d{2}-\d{2}"
        r"T"
        r"\d{2}:\d{2}:\d{2}"
        r"(?:\.\d+)?"
        r"Z\b"
    ),

    re.compile(
        r"\b\d{4}-\d{2}-\d{2}"
        r"[ T]"
        r"\d{2}:\d{2}:\d{2}\b"
    ),

    re.compile(
        r"\b\d{4}/\d{2}/\d{2}"
        r"[ T]"
        r"\d{2}:\d{2}:\d{2}\b"
    ),

    re.compile(
        r"\b\d{2}-\d{2}-\d{4}"
        r"[ T]"
        r"\d{2}:\d{2}:\d{2}\b"
    ),
]


TIMESTAMP_FORMATS = [
    "%Y-%m-%dT%H:%M:%SZ",
    "%Y-%m-%dT%H:%M:%S.%fZ",
    "%Y-%m-%d %H:%M:%S",
    "%Y-%m-%dT%H:%M:%S",
    "%Y/%m/%d %H:%M:%S",
    "%Y/%m/%dT%H:%M:%S",
    "%d-%m-%Y %H:%M:%S",
]


class EventExtractionService:

    def __init__(self, db: Session):
        self.db = db

    def extract_from_evidence(
        self,
        evidence_id: int,
    ) -> dict:

        evidence = self.db.get(
            Evidence,
            evidence_id,
        )

        if not evidence:
            raise ValueError(
                f"Evidence {evidence_id} not found"
            )

        if not evidence.extracted_text:
            raise ValueError(
                "Evidence has no extracted text"
            )

        text = evidence.extracted_text

        # Remove previously extracted events
        # so re-running extraction does not create duplicates.
        self.db.query(Event).filter(
            Event.evidence_id == evidence_id
        ).delete(
            synchronize_session=False
        )

        if self._is_structured_csv(text):
            events = self._extract_csv_events(
                evidence_id,
                text,
            )
        else:
            events = self._extract_text_events(
                evidence_id,
                text,
            )

        self.db.commit()

        return {
            "evidence_id": evidence_id,
            "events_found": len(events),
        }

    def extract_from_case(
        self,
        case_id: int,
    ) -> dict:

        evidence_items = (
            self.db.query(Evidence)
            .filter(
                Evidence.case_id == case_id,
                Evidence.extracted_text.isnot(None),
            )
            .order_by(Evidence.id)
            .all()
        )

        total = len(evidence_items)
        processed = 0
        skipped = 0
        failed = 0
        total_events = 0
        failures = []

        for evidence in evidence_items:

            try:

                existing_count = (
                    self.db.query(Event)
                    .filter(
                        Event.evidence_id == evidence.id
                    )
                    .count()
                )

                if existing_count > 0:
                    skipped += 1
                    total_events += existing_count
                    continue

                result = self.extract_from_evidence(
                    evidence.id
                )

                processed += 1
                total_events += result["events_found"]

            except Exception as exc:

                failed += 1

                self.db.rollback()

                failures.append({
                    "evidence_id": evidence.id,
                    "filename": evidence.original_filename,
                    "error": str(exc),
                })

        return {
            "case_id": case_id,
            "total": total,
            "processed": processed,
            "skipped": skipped,
            "failed": failed,
            "total_events": total_events,
            "failures": failures,
        }

    def _is_structured_csv(
        self,
        text: str,
    ) -> bool:

        try:
            reader = csv.DictReader(
                io.StringIO(text)
            )

            if not reader.fieldnames:
                return False

            fields = {
                field.strip().lower()
                for field in reader.fieldnames
                if field
            }

            required_fields = {
                "timestamp",
                "user",
                "device",
                "action",
                "file",
            }

            return required_fields.issubset(fields)

        except Exception:
            return False

    def _extract_csv_events(
        self,
        evidence_id: int,
        text: str,
    ) -> list[Event]:

        events = []

        reader = csv.DictReader(
            io.StringIO(text)
        )

        for row in reader:

            timestamp_text = (
                row.get("timestamp") or ""
            ).strip()

            if not timestamp_text:
                continue

            timestamp = self._parse_timestamp(
                timestamp_text
            )

            if not timestamp:
                continue

            user = (
                row.get("user") or ""
            ).strip()

            device = (
                row.get("device") or ""
            ).strip()

            action = (
                row.get("action") or ""
            ).strip()

            file_name = (
                row.get("file") or ""
            ).strip()

            description_parts = []

            if user:
                description_parts.append(
                    f"User {user}"
                )

            if action:
                description_parts.append(
                    f"performed {action}"
                )

            if file_name:
                description_parts.append(
                    f"on {file_name}"
                )

            if device:
                description_parts.append(
                    f"using device {device}"
                )

            description = " ".join(
                description_parts
            )

            event = Event(
                evidence_id=evidence_id,
                event_type=(
                    action.lower()
                    if action
                    else "activity"
                ),
                timestamp=timestamp,
                description=description,
                source_text=(
                    f"{timestamp_text},"
                    f"{user},"
                    f"{device},"
                    f"{action},"
                    f"{file_name}"
                ),
            )

            self.db.add(event)
            events.append(event)

        return events

    def _extract_text_events(
        self,
        evidence_id: int,
        text: str,
    ) -> list[Event]:

        events = []

        lines = text.splitlines()

        for line in lines:

            line = line.strip()

            if not line:
                continue

            timestamp = self._extract_timestamp(
                line
            )

            if not timestamp:
                continue

            event = Event(
                evidence_id=evidence_id,
                event_type="timestamped_activity",
                timestamp=timestamp,
                description=line,
                source_text=line,
            )

            self.db.add(event)
            events.append(event)

        return events

    def _extract_timestamp(
        self,
        line: str,
    ) -> datetime | None:

        for pattern in TIMESTAMP_PATTERNS:

            match = pattern.search(line)

            if not match:
                continue

            timestamp_text = match.group(0)

            timestamp = self._parse_timestamp(
                timestamp_text
            )

            if timestamp:
                return timestamp

        return None

    def _parse_timestamp(
        self,
        timestamp_text: str,
    ) -> datetime | None:

        timestamp_text = timestamp_text.strip()

        # Handle ISO 8601 timestamps ending in Z.
        if timestamp_text.endswith("Z"):
            try:
                return datetime.fromisoformat(
                    timestamp_text.replace(
                        "Z",
                        "+00:00",
                    )
                )
            except ValueError:
                pass

        for timestamp_format in TIMESTAMP_FORMATS:

            try:
                return datetime.strptime(
                    timestamp_text,
                    timestamp_format,
                )

            except ValueError:
                continue

        return None