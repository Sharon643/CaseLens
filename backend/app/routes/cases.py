from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.case import Case
from app.schemas.case import CaseCreate, CaseResponse, CaseUpdate


router = APIRouter(
    prefix="/cases",
    tags=["Cases"],
)


@router.post(
    "",
    response_model=CaseResponse,
    status_code=201,
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
            status_code=409,
            detail="Case number already exists",
        )

    case = Case(
        case_number=case_data.case_number,
        title=case_data.title,
        description=case_data.description,
    )

    db.add(case)
    db.commit()
    db.refresh(case)

    return case


@router.get(
    "",
    response_model=list[CaseResponse],
)
def list_cases(
    db: Session = Depends(get_db),
):
    return db.scalars(
        select(Case).order_by(Case.created_at.desc())
    ).all()


@router.get(
    "/{case_id}",
    response_model=CaseResponse,
)
def get_case(
    case_id: int,
    db: Session = Depends(get_db),
):
    case = db.get(Case, case_id)

    if not case:
        raise HTTPException(
            status_code=404,
            detail="Case not found",
        )

    return case


@router.patch(
    "/{case_id}",
    response_model=CaseResponse,
)
def update_case(
    case_id: int,
    case_data: CaseUpdate,
    db: Session = Depends(get_db),
):
    case = db.get(Case, case_id)

    if not case:
        raise HTTPException(
            status_code=404,
            detail="Case not found",
        )

    update_data = case_data.model_dump(
        exclude_unset=True
    )

    for field, value in update_data.items():
        setattr(case, field, value)

    db.commit()
    db.refresh(case)

    return case


@router.delete(
    "/{case_id}",
    status_code=204,
)
def delete_case(
    case_id: int,
    db: Session = Depends(get_db),
):
    case = db.get(Case, case_id)

    if not case:
        raise HTTPException(
            status_code=404,
            detail="Case not found",
        )

    db.delete(case)
    db.commit()