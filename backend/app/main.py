from fastapi import FastAPI

from app.database import Base, engine
from app.routes.cases import router as cases_router
from app.routes.evidence import router as evidence_router
from app.routes.ingestion import router as ingestion_router
from app.routes.extraction import router as extraction_router
from app.routes.entities import router as entities_router
from app.routes.events import router as events_router
from app.routes.relationships import router as relationships_router
from app.routes.graph import router as graph_router
from app.routes.case_summary import router as case_summary_router

from app.models.case import Case
from app.models.evidence import Evidence
from app.models.entity import Entity
from app.models.event import Event
from app.models.relationship import Relationship

Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="CaseLens API",
    description="AI-powered digital investigation platform",
    version="0.1.0",
)

app.include_router(cases_router)
app.include_router(evidence_router)
app.include_router(ingestion_router)
app.include_router(extraction_router)
app.include_router(entities_router)
app.include_router(events_router)
app.include_router(relationships_router)
app.include_router(graph_router)
app.include_router(case_summary_router)


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "caselens-api",
        "version": "0.1.0",
    }