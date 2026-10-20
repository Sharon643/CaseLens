from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.case import Case
from app.services.anomaly_detection import AnomalyDetectionService

router = APIRouter(
    tags=["Anomaly Detection"],
)


@router.get("/cases/{case_id}/anomalies")
def get_case_anomalies(
    case_id: int,
    db: Session = Depends(get_db),
):
    case = db.get(Case, case_id)

    if not case:
        raise HTTPException(
            status_code=404,
            detail=f"Case {case_id} not found",
        )

    service = AnomalyDetectionService(db)
    return service.analyze_case(case_id)