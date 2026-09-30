from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy.orm import Session

from app.extractors.csv import CSVExtractor
from app.extractors.docx import DOCXExtractor
from app.extractors.image import ImageExtractor
from app.extractors.pdf import PDFExtractor
from app.extractors.text import TextExtractor
from app.models.evidence import Evidence


class ExtractionService:

    def __init__(self, db: Session):
        self.db = db

        self.extractors = {
            ".txt": TextExtractor(),
            ".log": TextExtractor(),
            ".csv": CSVExtractor(),
            ".pdf": PDFExtractor(),
            ".docx": DOCXExtractor(),
            ".png": ImageExtractor(),
            ".jpg": ImageExtractor(),
            ".jpeg": ImageExtractor(),
            ".bmp": ImageExtractor(),
            ".tiff": ImageExtractor(),
            ".webp": ImageExtractor(),
        }

    def extract(self, evidence_id: int) -> dict:

        evidence = self.db.get(
            Evidence,
            evidence_id,
        )

        if not evidence:
            raise ValueError(
                f"Evidence {evidence_id} not found"
            )

        return self._extract_evidence(evidence)

    def extract_case(self, case_id: int) -> dict:

        evidence_items = (
            self.db.query(Evidence)
            .filter(Evidence.case_id == case_id)
            .order_by(Evidence.id)
            .all()
        )

        total = len(evidence_items)
        processed = 0
        skipped = 0
        failed = 0
        failures = []

        for evidence in evidence_items:

            # Don't process evidence that already succeeded.
            if evidence.extraction_status == "completed":
                skipped += 1
                continue

            try:
                self._extract_evidence(evidence)
                processed += 1

            except Exception as exc:
                failed += 1

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
            "failures": failures,
        }

    def _extract_evidence(
        self,
        evidence: Evidence,
    ) -> dict:

        file_path = Path(
            evidence.file_path
        )

        extension = file_path.suffix.lower()

        extractor = self.extractors.get(
            extension
        )

        evidence.extraction_started_at = (
            datetime.now(timezone.utc)
        )

        evidence.extraction_error = None

        if not extractor:
            evidence.extraction_status = "unsupported"
            evidence.extraction_completed_at = (
                datetime.now(timezone.utc)
            )

            self.db.commit()

            return {
                "evidence_id": evidence.id,
                "status": "unsupported",
                "message": (
                    f"No extractor for {extension}"
                ),
            }

        try:
            text = extractor.extract(
                file_path
            )

            evidence.extracted_text = text
            evidence.extraction_status = "completed"
            evidence.extraction_error = None
            evidence.extraction_completed_at = (
                datetime.now(timezone.utc)
            )

            self.db.commit()

            return {
                "evidence_id": evidence.id,
                "status": "completed",
                "characters": len(text),
            }

        except Exception as exc:

            evidence.extraction_status = "failed"
            evidence.extraction_error = str(exc)

            self.db.commit()

            raise