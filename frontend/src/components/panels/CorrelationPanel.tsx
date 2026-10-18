import { assessSourceConsistency } from "../../types";
import type { PossibleTransfer, CaseTimelineEvent } from "../../types";

interface CorrelationPanelProps {
  possibleTransfers: PossibleTransfer[];
  timelineEvents: CaseTimelineEvent[];
  analysisLoading: boolean;
  analysisError: string | null;
  onSelectEvidence: (id: number) => void;
}

export default function CorrelationPanel({
  possibleTransfers,
  timelineEvents,
  analysisLoading,
  analysisError,
  onSelectEvidence,
}: CorrelationPanelProps) {
  return (
    <section className="panel correlation-panel">
      <div className="panel-header">
        <div>
          <h2>Evidence Correlation</h2>
          <p>Compare records associated with each suspected transfer.</p>
        </div>
      </div>

      <div className="correlation-note">
        Matching filenames and timestamps can connect records, but do not
        independently establish that a transfer was unauthorized.
      </div>

      {!analysisLoading && !analysisError && possibleTransfers.length === 0 && (
        <p className="findings-message">No transfers are available to compare.</p>
      )}

      {possibleTransfers.map((transfer, index) => (
        <article
          className="correlation-transfer"
          key={`${transfer.timestamp}-${transfer.filename}`}
        >
          <div className="correlation-transfer-header">
            <div>
              <span className="finding-number">TRANSFER {index + 1}</span>
              <h3>{transfer.filename}</h3>
            </div>
            <span className="correlation-count">
              {transfer.supporting_evidence.length} source records
            </span>
          </div>

          <div className="correlation-meta">
            <span>Recorded time</span>
            <strong>
              {transfer.timestamp
                ? `${new Date(transfer.timestamp).toLocaleString("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "medium",
                    timeZone: "UTC",
                  })} UTC`
                : "Timestamp unavailable"}
            </strong>
          </div>

          <div className="correlation-table-wrapper">
            <table className="correlation-table">
              <thead>
                <tr>
                  <th>Source file</th>
                  <th>Evidence ID</th>
                  <th>Event ID</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {transfer.supporting_evidence.map((source) => {
                  const matchingEvent = timelineEvents.find(
                    (event) => event.id === source.event_id
                  );

                  const assessment = assessSourceConsistency(
                    [
                      matchingEvent?.source_text ?? "",
                      matchingEvent?.description ?? "",
                    ].join(" "),
                    transfer.filename,
                    transfer.timestamp
                  );

                  return (
                    <tr key={source.event_id}>
                      <td>
                        <div>{source.evidence_filename}</div>
                        <div className="source-assessment">
                          <strong>{assessment.label}</strong>
                          <p>{assessment.explanation}</p>
                        </div>
                      </td>

                      <td>#{source.evidence_id}</td>
                      <td>#{source.event_id}</td>

                      <td>
                        <button
                          type="button"
                          className="finding-timeline-button"
                          onClick={() => onSelectEvidence(source.evidence_id)}
                        >
                          Inspect evidence →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="correlation-footnote">
            These records are associated with the same suspected transfer.
            Inspect their contents to determine whether they independently
            support the activity or repeat information from another source.
          </p>
        </article>
      ))}

      <div className="findings-disclaimer">
        <strong>Interpretation</strong>
        <p>
          Three records do not necessarily mean three independent confirmations.
          Verify the original contents, timestamps, device identifiers, and
          provenance before drawing conclusions.
        </p>
      </div>
    </section>
  );
}
