from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.graph_service import GraphService


router = APIRouter(
    prefix="/cases",
    tags=["Investigation Graph"],
)


@router.get("/{case_id}/graph")
def get_case_graph(
    case_id: int,
    db: Session = Depends(get_db),
):
    service = GraphService(db)

    return service.get_case_graph(case_id)