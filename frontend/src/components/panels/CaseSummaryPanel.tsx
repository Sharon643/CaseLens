import type { CaseSummary } from "../../api/caseApi";

interface CaseSummaryPanelProps {
  summary: CaseSummary;
}

export default function CaseSummaryPanel({ summary }: CaseSummaryPanelProps) {
  return (
    <section className="summary-grid">
      <div className="summary-card">
        <span>Evidence</span>
        <strong>{summary.evidence_count}</strong>
      </div>

      <div className="summary-card">
        <span>Entities</span>
        <strong>{summary.entity_count}</strong>
      </div>

      <div className="summary-card">
        <span>Events</span>
        <strong>{summary.event_count}</strong>
      </div>

      <div className="summary-card">
        <span>Relationships</span>
        <strong>{summary.relationship_count}</strong>
      </div>
    </section>
  );
}
