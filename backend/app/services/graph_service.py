from sqlalchemy.orm import Session

from app.models.evidence import Evidence
from app.models.relationship import Relationship


class GraphService:

    def __init__(self, db: Session):
        self.db = db

    def get_case_graph(
        self,
        case_id: int,
    ) -> dict:

        relationships = (
            self.db.query(Relationship)
            .join(
                Evidence,
                Relationship.evidence_id == Evidence.id,
            )
            .filter(
                Evidence.case_id == case_id,
            )
            .order_by(Relationship.id)
            .all()
        )

        nodes = {}
        edges = []

        for relationship in relationships:

            source_id = (
                f"{relationship.source_type}:"
                f"{relationship.source_value}"
            )

            target_id = (
                f"{relationship.target_type}:"
                f"{relationship.target_value}"
            )

            if source_id not in nodes:
                nodes[source_id] = {
                    "id": source_id,
                    "type": relationship.source_type,
                    "label": relationship.source_value,
                }

            if target_id not in nodes:
                nodes[target_id] = {
                    "id": target_id,
                    "type": relationship.target_type,
                    "label": relationship.target_value,
                }

            edges.append({
                "id": f"relationship:{relationship.id}",
                "source": source_id,
                "target": target_id,
                "relationship": (
                    relationship.relationship_type
                ),
                "evidence_id": (
                    relationship.evidence_id
                ),
                "event_id": (
                    relationship.event_id
                ),
            })

        return {
            "case_id": case_id,
            "nodes": list(nodes.values()),
            "edges": edges,
            "node_count": len(nodes),
            "edge_count": len(edges),
        }