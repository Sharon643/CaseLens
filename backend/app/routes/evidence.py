import hashlib
import shutil
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.case import Case
from app.models.evidence import Evidence


router = APIRouter(
    prefix="/cases/{case_id}/evidence",
    tags=["Evidence"],
)


STORAGE_ROOT = Path("storage/cases")


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
)
def upload_evidence(
    case_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    case = db.get(Case, case_id)

    if not case:
        raise HTTPException(
            status_code=404,
            detail="Case not found",
        )

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="File must have a filename",
        )

    case_directory = STORAGE_ROOT / str(case_id)
    case_directory.mkdir(
        parents=True,
        exist_ok=True,
    )

    safe_filename = Path(file.filename).name
    destination = case_directory / safe_filename

    if destination.exists():
        raise HTTPException(
            status_code=409,
            detail="A file with this name already exists for this case",
        )

    sha256 = hashlib.sha256()
    file_size = 0

    with destination.open("wb") as buffer:
        while chunk := file.file.read(1024 * 1024):
            buffer.write(chunk)
            sha256.update(chunk)
            file_size += len(chunk)

    evidence = Evidence(
        case_id=case_id,
        original_filename=safe_filename,
        stored_filename=safe_filename,
        file_path=str(destination),
        file_type=file.content_type or "application/octet-stream",
        file_size=file_size,
        sha256_hash=sha256.hexdigest(),
    )

    db.add(evidence)
    db.commit()
    db.refresh(evidence)

    return {
        "id": evidence.id,
        "case_id": evidence.case_id,
        "filename": evidence.original_filename,
        "file_type": evidence.file_type,
        "file_size": evidence.file_size,
        "sha256_hash": evidence.sha256_hash,
        "uploaded_at": evidence.uploaded_at,
    }

@router.get("/{evidence_id}")
def get_evidence(
    case_id: int,
    evidence_id: int,
    db: Session = Depends(get_db),
):
    evidence = (
        db.query(Evidence)
        .filter(
            Evidence.id == evidence_id,
            Evidence.case_id == case_id,
        )
        .first()
    )

    if not evidence:
        raise HTTPException(
            status_code=404,
            detail="Evidence not found",
        )

    file_path = Path(evidence.file_path)

    if not file_path.exists():
        raise HTTPException(
            status_code=404,
            detail="Evidence file not found on disk",
        )

    extracted_text = ""

    try:
        extracted_text = file_path.read_text(
            encoding="utf-8",
            errors="replace",
        )
    except Exception:
        extracted_text = ""

    return {
        "id": evidence.id,
        "case_id": evidence.case_id,
        "original_filename": evidence.original_filename,
        "stored_filename": evidence.stored_filename,
        "file_type": evidence.file_type,
        "file_size": evidence.file_size,
        "sha256_hash": evidence.sha256_hash,
        "uploaded_at": evidence.uploaded_at,
        "extraction_status": getattr(
            evidence,
            "extraction_status",
            None,
        ),
        "extracted_text": extracted_text,
    }