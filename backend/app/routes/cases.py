import shutil
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.case import Case
from app.schemas.case import CaseCreate, CaseResponse, CaseUpdate


router = APIRouter(prefix="/cases", tags=["Cases"])

# Keep this consistent with the evidence upload route.
STORAGE_ROOT = Path("storage/cases")


@router.post(
    "",
    response_model=CaseResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_case(
    case_data: CaseCreate,
    db: Session = Depends(get_db),
):
    existing_case = db.scalar(
        select(Case).where(
            Case.case_number == case_data.case_number
        )
    )

    if existing_case:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Case number already exists",
        )

    case = Case(
        case_number=case_data.case_number,
        title=case_data.title,
        description=case_data.description,
    )

    try:
        db.add(case)
        db.commit()
        db.refresh(case)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Case number already exists",
        ) from exc
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to create case",
        ) from exc

    return case


@router.get("", response_model=list[CaseResponse])
def list_cases(db: Session = Depends(get_db)):
    return db.scalars(
        select(Case).order_by(Case.created_at.desc())
    ).all()


@router.get("/{case_id}", response_model=CaseResponse)
def get_case(case_id: int, db: Session = Depends(get_db)):
    case = db.get(Case, case_id)

    if case is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found",
        )

    return case


@router.patch("/{case_id}", response_model=CaseResponse)
def update_case(
    case_id: int,
    case_data: CaseUpdate,
    db: Session = Depends(get_db),
):
    case = db.get(Case, case_id)

    if case is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found",
        )

    update_data = case_data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(case, field, value)

    try:
        db.commit()
        db.refresh(case)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The case update conflicts with existing data",
        ) from exc
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to update case",
        ) from exc

    return case


@router.delete("/{case_id}")
def delete_case(
    case_id: int,
    db: Session = Depends(get_db),
):
    case = db.get(Case, case_id)

    if case is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found",
        )

    # Resolve paths and ensure we only operate on this case's directory.
    storage_root = STORAGE_ROOT.resolve()
    case_directory = (storage_root / str(case_id)).resolve()

    if case_directory.parent != storage_root:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid case storage path",
        )

    # Stage the directory so it can be restored if the DB transaction fails.
    quarantined_directory = None

    if case_directory.exists():
        if not case_directory.is_dir():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Case storage path is not a directory",
            )

        quarantined_directory = (
            storage_root / f".deleting-{case_id}-{uuid.uuid4().hex}"
        )

        try:
            case_directory.rename(quarantined_directory)
        except OSError as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Unable to stage case evidence for deletion",
            ) from exc

    try:
        db.delete(case)
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()

        if quarantined_directory and quarantined_directory.exists():
            try:
                quarantined_directory.rename(case_directory)
            except OSError:
                # Keep the quarantined directory rather than deleting evidence.
                pass

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Case deletion failed. Check database constraints and "
                "storage for any quarantined evidence."
            ),
        ) from exc

    # The database deletion succeeded. Clean up the staged files.
    if quarantined_directory and quarantined_directory.exists():
        try:
            shutil.rmtree(quarantined_directory)
        except OSError:
            # The case is already deleted; do not pretend the DB rolled back.
            return {
                "message": "Case deleted, but evidence-file cleanup failed.",
                "case_id": case_id,
                "storage_cleanup": "pending",
            }

    return {
        "message": "Case and related records deleted.",
        "case_id": case_id,
        "storage_cleanup": "complete",
    }
