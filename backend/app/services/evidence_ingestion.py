import hashlib
import shutil
from pathlib import Path

from sqlalchemy.orm import Session

from app.models.case import Case
from app.models.evidence import Evidence


class EvidenceIngestionService:

    def __init__(self, db: Session):
        self.db = db

    def ingest_directory(
        self,
        case_id: int,
        source_directory: str,
    ) -> dict:

        case = self.db.get(Case, case_id)

        if not case:
            raise ValueError(f"Case {case_id} not found")

        source = Path(source_directory)

        if not source.exists():
            raise ValueError(
                f"Evidence directory does not exist: {source}"
            )

        if not source.is_dir():
            raise ValueError(
                f"Evidence path is not a directory: {source}"
            )

        storage_root = (
            Path("storage")
            / "cases"
            / str(case_id)
        )

        storage_root.mkdir(
            parents=True,
            exist_ok=True,
        )

        discovered = 0
        processed = 0
        skipped = 0
        failed = 0
        failures = []

        for source_file in source.rglob("*"):

            if not source_file.is_file():
                continue

            discovered += 1

            try:
                relative_path = source_file.relative_to(source)

                destination = (
                    storage_root / relative_path
                )

                destination.parent.mkdir(
                    parents=True,
                    exist_ok=True,
                )

                sha256 = hashlib.sha256()
                file_size = 0

                with source_file.open("rb") as input_file:
                    with destination.open("wb") as output_file:

                        while chunk := input_file.read(
                            1024 * 1024
                        ):
                            output_file.write(chunk)
                            sha256.update(chunk)
                            file_size += len(chunk)

                file_hash = sha256.hexdigest()

                existing = (
                    self.db.query(Evidence)
                    .filter(
                        Evidence.case_id == case_id,
                        Evidence.sha256_hash == file_hash,
                    )
                    .first()
                )

                if existing:
                    destination.unlink(
                        missing_ok=True
                    )

                    skipped += 1
                    continue

                evidence = Evidence(
                    case_id=case_id,
                    original_filename=source_file.name,
                    stored_filename=source_file.name,
                    file_path=str(destination),
                    file_type=(
                        self._detect_file_type(source_file)
                    ),
                    file_size=file_size,
                    sha256_hash=file_hash,
                )

                self.db.add(evidence)

                processed += 1

            except Exception as exc:

                failed += 1

                failures.append({
                    "file": str(source_file),
                    "error": str(exc),
                })

        self.db.commit()

        return {
            "case_id": case_id,
            "source_directory": str(source),
            "discovered": discovered,
            "processed": processed,
            "skipped": skipped,
            "failed": failed,
            "failures": failures,
        }

    @staticmethod
    def _detect_file_type(
        path: Path,
    ) -> str:

        extension = path.suffix.lower()

        types = {
            ".txt": "text/plain",
            ".log": "text/plain",
            ".csv": "text/csv",
            ".pdf": "application/pdf",
            ".docx": (
                "application/"
                "vnd.openxmlformats-officedocument."
                "wordprocessingml.document"
            ),
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
        }

        return types.get(
            extension,
            "application/octet-stream",
        )