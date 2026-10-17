import hashlib
import shutil
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import PlainTextResponse
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.case import Case
from app.models.evidence import Evidence


router = APIRouter(
    prefix="/cases/{case_id}/evidence",
    tags=["Evidence"],
)


STORAGE_ROOT = Path("storage/cases")

@router.get("")
def list_case_evidence(
    case_id: int,
    db: Session = Depends(get_db),
):
    case = db.get(Case, case_id)

    if not case:
        raise HTTPException(
            status_code=404,
            detail="Case not found",
        )

    evidence_items = (
        db.query(Evidence)
        .filter(Evidence.case_id == case_id)
        .order_by(Evidence.id.desc())
        .all()
    )

    return {
        "case_id": case_id,
        "count": len(evidence_items),
        "files": [
            {
                "id": item.id,
                "original_filename": item.original_filename,
                "file_type": item.file_type,
                "file_size": item.file_size,
                "sha256_hash": item.sha256_hash,
                "uploaded_at": item.uploaded_at,
                "extraction_status": getattr(
                    item,
                    "extraction_status",
                    None,
                ),
                "available_on_disk": Path(
                    item.file_path
                ).is_file(),
            }
            for item in evidence_items
        ],
    }


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

@router.get("/{evidence_id}/content", response_class=PlainTextResponse)
def get_evidence_content(
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

    if not file_path.is_file():
        raise HTTPException(
            status_code=404,
            detail="Evidence file not found on disk",
        )

    # This endpoint is for readable text files only.
    allowed_extensions = {
        ".txt", ".log", ".csv", ".json", ".xml",
        ".md", ".eml", ".yaml", ".yml",
    }

    if file_path.suffix.lower() not in allowed_extensions:
        raise HTTPException(
            status_code=415,
            detail="Original-file viewer currently supports text-based files only.",
        )

    try:
        content = file_path.read_text(
            encoding="utf-8",
            errors="replace",
        )
    except OSError as exc:
        raise HTTPException(
            status_code=500,
            detail="Could not read the evidence file.",
        ) from exc

    return content

@router.get("/{evidence_id}/image")
def get_original_evidence_image(
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
            detail="Evidence file not found",
        )

    file_path = Path(evidence.file_path)

    if not file_path.is_file():
        raise HTTPException(
            status_code=404,
            detail="Original file is missing from storage",
        )

    allowed_types = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
    }

    media_type = allowed_types.get(file_path.suffix.lower())

    if not media_type:
        raise HTTPException(
            status_code=415,
            detail="Unsupported image format",
        )

    return FileResponse(
        path=file_path,
        media_type=media_type,
        filename=evidence.original_filename,
        content_disposition_type="inline",
    )