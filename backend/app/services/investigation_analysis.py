import re
from collections import defaultdict
from sqlalchemy.orm import Session

from app.models.event import Event
from app.models.evidence import Evidence


USB_PATTERN = re.compile(
    r"\b(?:usb|removable|flash\s*drive|USB-4471)\b",
    re.IGNORECASE,
)

WRITE_PATTERN = re.compile(
    r"\b(?:write|written|copied|copy|transfer|transferred|exported)\b",
    re.IGNORECASE,
)


def get_transfer_key(text: str, timestamp) -> tuple | None:
    """Build a key to group records describing the same transfer."""
    device_match = re.search(
        r"\bUSB-[A-Z0-9-]+\b|\b(?:USB|removable|flash\s*drive)\b",
        text,
        re.IGNORECASE,
    )

    file_match = re.search(
        r"\bfile\s*=\s*([^,\s|]+)|"
        r"\bon\s+([^\s,|]+)|"
        r"\bfor\s+([^\s,|]+)",
        text,
        re.IGNORECASE,
    )

    if not device_match or not file_match or timestamp is None:
        return None

    filename = next(
        (group for group in file_match.groups() if group),
        None,
    )

    if not filename:
        return None

    return (
        device_match.group(0).upper(),
        timestamp.isoformat(),
        filename.lower(),
    )



class InvestigationAnalysisService:
    def __init__(self, db: Session):
        self.db = db

    def analyze_case(self, case_id: int) -> dict:
        rows = (
            self.db.query(Event, Evidence.original_filename)
            .join(Evidence, Event.evidence_id == Evidence.id)
            .filter(Evidence.case_id == case_id)
            .order_by(Event.timestamp.asc().nullslast(), Event.id.asc())
            .all()
        )

        if not rows:
            return {
                "case_id": case_id,
                "event_count": 0,
                "finding_count": 0,
                "findings": [],
            }

        findings = []
        usb_writes = defaultdict(dict)

        for event, filename in rows:
            text = " ".join(
                part or ""
                for part in (
                    event.event_type,
                    event.description,
                    event.source_text,
                )
            )

            # Flag a possible write/copy involving removable media.
            if USB_PATTERN.search(text) and WRITE_PATTERN.search(text):
                transfer_key = get_transfer_key(text, event.timestamp)

                if transfer_key:
                    usb_writes[transfer_key[0]].setdefault(
                        transfer_key,
                        {
                            "timestamp": event.timestamp,
                            "filename": transfer_key[2],
                            "events": [],
                        },
                    )["events"].append({
                        "event_id": event.id,
                        "evidence_id": event.evidence_id,
                        "evidence_filename": filename,
                    })

                findings.append({
                    "event_id": event.id,
                    "evidence_id": event.evidence_id,
                    "evidence_filename": filename,
                    "timestamp": event.timestamp,
                    "severity": "review",
                    "rule": "possible_usb_file_transfer",
                    "title": "Possible USB file transfer",
                    "reason": (
                        "The event text contains both removable-media "
                        "and file-write/copy indicators."
                    ),
                    "description": event.description,
                })

            # Missing timestamps or descriptions indicate data-quality gaps.
            missing = []

            if event.timestamp is None:
                missing.append("timestamp")

            if not (event.description or "").strip():
                missing.append("description")

            if missing:
                findings.append({
                    "event_id": event.id,
                    "evidence_id": event.evidence_id,
                    "evidence_filename": filename,
                    "timestamp": event.timestamp,
                    "severity": "info",
                    "rule": "incomplete_event_details",
                    "title": "Incomplete event details",
                    "reason": (
                        "Missing: " + ", ".join(missing) + "."
                    ),
                    "description": event.description,
                })

        # Group related writes to highlight repeated activity.

        for device, transfers in usb_writes.items():
            if len(transfers) >= 2:
                transfer_list = list(transfers.values())

                findings.append({
                    "event_id": None,
                    "evidence_id": None,
                    "evidence_filename": None,
                    "timestamp": transfer_list[0]["timestamp"],
                    "severity": "review",
                    "rule": "multiple_usb_writes",
                    "title": "Multiple possible USB transfers",
                    "reason": (
                        f"{len(transfer_list)} distinct possible transfers "
                        f"involving {device} were identified."
                    ),
                    "description": (
                        "Supporting evidence records are grouped by device, "
                        "timestamp, and filename. Review the records before "
                        "drawing conclusions."
                    ),
                    "transfers": [
                        {
                            "timestamp": transfer["timestamp"],
                            "filename": transfer["filename"],
                            "supporting_evidence": transfer["events"],
                        }
                        for transfer in transfer_list
                    ],
                })


        findings.sort(
            key=lambda finding: (
                finding["timestamp"] is None,
                finding["timestamp"] or 0,
            )
        )

        return {
            "case_id": case_id,
            "event_count": len(rows),
            "finding_count": len(findings),
            "findings": findings,
        }
