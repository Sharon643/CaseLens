import re

from sqlalchemy.orm import Session

from app.models.entity import Entity
from app.models.evidence import Evidence


PATTERNS = {
    "email": re.compile(
        r"\b[A-Za-z0-9._%+-]+"
        r"@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b"
    ),

    "ipv4": re.compile(
        r"\b(?:"
        r"(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\."
        r"){3}"
        r"(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\b"
    ),

    "url": re.compile(
        r"https?://[^\s<>\"]+",
        re.IGNORECASE,
    ),

    "username": re.compile(
        r"\b(?:user|username|account)"
        r"\s*[:=]\s*"
        r"([A-Za-z0-9._-]+)",
        re.IGNORECASE,
    ),

    "filename": re.compile(
        r"\b[A-Za-z0-9_.-]+"
        r"\.(?:pdf|docx|xlsx|csv|txt|log|zip|"
        r"png|jpg|jpeg|exe|dll|py|js)\b",
        re.IGNORECASE,
    ),
}


class EntityExtractionService:

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

        # Remove previously extracted entities
        # so re-running extraction does not create duplicates.
        self.db.query(Entity).filter(
            Entity.evidence_id == evidence_id
        ).delete(
            synchronize_session=False
        )

        entities = []

        for entity_type, pattern in PATTERNS.items():

            for match in pattern.finditer(text):

                if entity_type == "username":
                    value = match.group(1)
                    start_position = match.start(1)
                    end_position = match.end(1)

                else:
                    value = match.group(0)
                    start_position = match.start()
                    end_position = match.end()

                entity = Entity(
                    evidence_id=evidence_id,
                    entity_type=entity_type,
                    value=value,
                    start_position=start_position,
                    end_position=end_position,
                )

                self.db.add(entity)
                entities.append(entity)

        self.db.commit()

        return {
            "evidence_id": evidence_id,
            "entities_found": len(entities),
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
        total_entities = 0
        failures = []

        for evidence in evidence_items:

            try:
                existing_count = (
                    self.db.query(Entity)
                    .filter(
                        Entity.evidence_id == evidence.id
                    )
                    .count()
                )

                if existing_count > 0:
                    skipped += 1
                    total_entities += existing_count
                    continue

                result = self.extract_from_evidence(
                    evidence.id
                )

                processed += 1
                total_entities += result["entities_found"]

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
            "total_entities": total_entities,
            "failures": failures,
        }