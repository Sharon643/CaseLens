from fastapi import FastAPI

from app.database import Base, engine
from app.routes.cases import router as cases_router
from app.routes.evidence import router as evidence_router
from app.routes.ingestion import router as ingestion_router
from app.routes.extraction import router as extraction_router

from app.models.case import Case
from app.models.evidence import Evidence

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


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "caselens-api",
        "version": "0.1.0",
    }