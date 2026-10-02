from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.case_summary import CaseSummaryService


router = APIRouter(
    prefix="/cases",
    tags=["Case Summary"],
)


@router.get("/{case_id}/summary")
def get_case_summary(
    case_id: int,
    db: Session = Depends(get_db),
):
    try:
        service = CaseSummaryService(db)

        return service.get_summary(case_id)

    except ValueError as exc:
        raise HTTPException(
            status_code=404,
            detail=str(exc),
        )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=str(exc),
        )