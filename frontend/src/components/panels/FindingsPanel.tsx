import type { PossibleTransfer } from "../../types";

interface FindingsPanelProps {
  possibleTransfers: PossibleTransfer[];
  analysisLoading: boolean;
  analysisError: string | null;
  onViewTimeline: (transfer: PossibleTransfer) => void;
  onSelectEvidence: (id: number) => void;
}

export default function FindingsPanel({
  possibleTransfers,
  analysisLoading,
  analysisError,
  onViewTimeline,
  onSelectEvidence,
}: FindingsPanelProps) {
  return (
    <section className="panel findings-panel">
      <div className="panel-header">
        <div>
          <h2>Investigation Findings</h2>
          <p>Potential incidents identified from evidence records</p>
        </div>
        <span className="panel-count">{possibleTransfers.length} items to review</span>
      </div>

      <div className="findings-intro">
        <div className="findings-intro-icon">i</div>
        <div>
          <strong>What does this mean?</strong>
          <p>
            CaseLens detected records that may indicate files were copied to a
            USB device. Related records are grouped together to help you
            investigate the same activity across different sources. This is an
            investigative lead, not proof of wrongdoing.
          </p>
        </div>
      </div>

      {analysisLoading && (
        <p className="findings-message">Analyzing investigation events...</p>
      )}

      {analysisError && (
        <p className="findings-message findings-error">{analysisError}</p>
      )}

      {!analysisLoading && !analysisError && possibleTransfers.length === 0 && (
        <p className="findings-message">
          No grouped USB transfer indicators were found.
        </p>
      )}

      {!analysisLoading && !analysisError && possibleTransfers.length > 0 && (
        <div className="finding-transfer-list">
          {possibleTransfers.map((transfer, index) => (
            <article
              className="finding-transfer"
              key={`${transfer.timestamp}-${transfer.filename}`}
            >
              <div className="finding-transfer-heading">
                <span className="finding-number">Finding {index + 1}</span>
                <span className="finding-severity">REVIEW REQUIRED</span>
              </div>

              <h3 className="finding-file-name">{transfer.filename}</h3>

              <button
                type="button"
                className="finding-timeline-button"
                onClick={() => onViewTimeline(transfer)}
              >
                View matching timeline events →
              </button>

              <div className="finding-facts">
                <div>
                  <span className="finding-label">RECORDED TIME</span>
                  <strong>
                    {transfer.timestamp
                      ? `${new Date(transfer.timestamp).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "medium",
                          timeZone: "UTC",
                        })} UTC`
                      : "Not available"}
                  </strong>
                </div>

                <div>
                  <span className="finding-label">RELATED RECORDS</span>
                  <strong>{transfer.supporting_evidence.length} records</strong>
                </div>
              </div>

              <div className="finding-explanation">
                <h4>Why was this flagged?</h4>
                <p>
                  Multiple evidence records describe activity involving this
                  file and removable media. The matching timestamp and filename
                  help correlate the records, but the records must be checked to
                  determine whether they describe the same real-world action.
                </p>
              </div>

              <div className="finding-explanation">
                <h4>What should you verify?</h4>
                <ul>
                  <li>
                    Confirm whether the USB device and file transfer were
                    authorized.
                  </li>
                  <li>
                    Compare the original records, timestamps, and device
                    identifiers.
                  </li>
                  <li>
                    Check file hashes and surrounding system activity where
                    those records are available.
                  </li>
                </ul>
              </div>

              <div className="finding-evidence-section">
                <div className="finding-evidence-title">
                  <h4>Supporting evidence</h4>
                  <span>Open a source record to inspect its contents</span>
                </div>

                <div className="finding-evidence-list">
                  {transfer.supporting_evidence.map((source) => (
                    <button
                      type="button"
                      className="finding-evidence-button"
                      key={source.event_id}
                      onClick={() => onSelectEvidence(source.evidence_id)}
                    >
                      <span className="finding-source-name">
                        {source.evidence_filename}
                      </span>
                      <span className="finding-source-action">
                        View record →
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="findings-disclaimer">
        <strong>Investigator note</strong>
        <p>
          Automated rules identify patterns for review. They do not establish
          intent, authorization, or responsibility. Conclusions should be based
          on verified evidence and corroborating context.
        </p>
      </div>
    </section>
  );
}
