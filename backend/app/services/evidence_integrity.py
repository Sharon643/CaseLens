import hashlib
from pathlib import Path

from sqlalchemy.orm import Session

from app.models.evidence import Evidence
from app.models.custody_record import CustodyRecord


def calculate_sha256(file_path: Path) -> str:
    """Calculate the SHA-256 hash of a file in chunks."""
    digest = hashlib.sha256()

    with file_path.open("rb") as file:
        while chunk := file.read(1024 * 1024):
            digest.update(chunk)

    return digest.hexdigest()


class EvidenceIntegrityService:
    def __init__(self, db: Session):
        self.db = db

    def verify_evidence(
        self,
        case_id: int,
        evidence_id: int,
    ) -> dict:
        evidence = (
            self.db.query(Evidence)
            .filter(
                Evidence.id == evidence_id,
                Evidence.case_id == case_id,
            )
            .first()
        )

        if evidence is None:
            raise ValueError("Evidence not found")

        file_path = Path(evidence.file_path)

        if not file_path.is_file():
            return {
                "case_id": case_id,
                "evidence_id": evidence.id,
                "filename": evidence.original_filename,
                "status": "missing",
                "recorded_sha256": evidence.sha256_hash,
                "calculated_sha256": None,
                "message": "The original evidence file is missing.",
            }

        calculated_hash = calculate_sha256(file_path)
        recorded_hash = evidence.sha256_hash

        if not recorded_hash:
            status = "unverified"
            message = (
                "No recorded SHA-256 hash is available for comparison."
            )
        elif calculated_hash.lower() == recorded_hash.lower():
            status = "verified"
            message = (
                "The current file hash matches the recorded hash."
            )
        else:
            status = "mismatch"
            message = (
                "The current file hash differs from the recorded hash."
            )

        return {
            "case_id": case_id,
            "evidence_id": evidence.id,
            "filename": evidence.original_filename,
            "status": status,
            "recorded_sha256": recorded_hash,
            "calculated_sha256": calculated_hash,
            "message": message,
        }

    def verify_case(self, case_id: int) -> dict:
        evidence_items = (
            self.db.query(Evidence)
            .filter(Evidence.case_id == case_id)
            .order_by(Evidence.id.asc())
            .all()
        )

        results = [
            self.verify_evidence(
                case_id=case_id,
                evidence_id=item.id,
            )
            for item in evidence_items
        ]

        counts = {
            status: sum(
                1 for result in results
                if result["status"] == status
            )
            for status in (
                "verified",
                "mismatch",
                "missing",
                "unverified",
            )
        }

        return {
            "case_id": case_id,
            "total_files": len(results),
            **counts,
            "results": results,
        }

    def record_verification(
    self,
    case_id: int,
    evidence_id: int,
    result: dict,
    actor: str = "system",
) -> None:
        

        action_by_status = {
            "verified": "integrity_verified",
            "mismatch": "integrity_mismatch",
            "missing": "integrity_missing",
            "unverified": "integrity_unverified",
        }

        record = CustodyRecord(
            case_id=case_id,
            evidence_id=evidence_id,
            action=action_by_status[result["status"]],
            actor=actor,
            details=result["message"],
            sha256_hash=result.get("calculated_sha256")
            or result.get("recorded_sha256"),
        )

        self.db.add(record)
        self.db.commit()