import type { CaseGraph } from "../api/caseApi";
import type { EvidenceDetails } from "../api/caseApi";
import type { EvidenceEvent } from "../types";
import type { Node } from "@xyflow/react";

interface EvidenceViewerProps {
  evidenceDetails: EvidenceDetails | null;
  evidenceLoading: boolean;
  evidenceError: string | null;
  evidenceEvents: EvidenceEvent[];
  evidenceEventsLoading: boolean;
  evidenceEventsError: string | null;
  originalFileOpen: boolean;
  originalFileContent: string;
  originalFileLoading: boolean;
  originalFileError: string | null;
  originalImageUrl: string;
  graph: CaseGraph;
  onClose: () => void;
  onOpenOriginalFile: () => void;
  onCloseOriginalFile: () => void;
  onNavigateToNode: (node: Node) => void;
}

function isImageEvidence(filename: string | undefined): boolean {
  return /\.(png|jpe?g|webp)$/i.test(filename ?? "");
}

function highlightEvidenceLine(line: string, graph: CaseGraph, onNavigateToNode: (node: Node) => void) {
  const parts = line.split(
    /(\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z\b|\b(?:process|action|file|user|device)=\S+)/g
  );

  return parts.map((part, index) => {
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(part)) {
      return (
        <span key={index} className="evidence-token evidence-timestamp">
          {part}
        </span>
      );
    }

    if (part.startsWith("process=")) {
      return (
        <span key={index} className="evidence-token evidence-process">
          {part}
        </span>
      );
    }

    if (part.startsWith("action=")) {
      return (
        <span key={index} className="evidence-token evidence-action">
          {part}
        </span>
      );
    }

    if (part.startsWith("file=")) {
      const fileValue = part.replace(/^file=/, "");
      const targetNode = graph.nodes.find(
        (node) => node.id === `file:${fileValue}`
      );

      if (!targetNode) {
        return (
          <span key={index} className="evidence-token evidence-file">
            {part}
          </span>
        );
      }

      return (
        <button
          key={index}
          type="button"
          className="evidence-token evidence-file evidence-token-button"
          onClick={() =>
            onNavigateToNode({
              id: targetNode.id,
              type: targetNode.type,
              position: { x: 0, y: 0 },
              data: { label: targetNode.label },
            })
          }
        >
          {part}
        </button>
      );
    }

    if (part.startsWith("user=")) {
      return (
        <span key={index} className="evidence-token evidence-user">
          {part}
        </span>
      );
    }

    if (part.startsWith("device=")) {
      return (
        <span key={index} className="evidence-token evidence-device">
          {part}
        </span>
      );
    }

    return part;
  });
}

export default function EvidenceViewer({
  evidenceDetails,
  evidenceLoading,
  evidenceError,
  evidenceEvents,
  evidenceEventsLoading,
  evidenceEventsError,
  originalFileOpen,
  originalFileContent,
  originalFileLoading,
  originalFileError,
  originalImageUrl,
  graph,
  onClose,
  onOpenOriginalFile,
  onCloseOriginalFile,
  onNavigateToNode,
}: EvidenceViewerProps) {
  return (
    <div
      className={`evidence-viewer-overlay ${originalFileOpen ? "with-original-file" : ""}`}
      onClick={onClose}
    >
      <div
        className="evidence-viewer"
        onClick={(event) => event.stopPropagation()}
      >
        {/* ── HEADER ── */}
        <div className="evidence-viewer-header">
          <div>
            <div className="evidence-viewer-label">EVIDENCE</div>
            <h2>
              {evidenceDetails?.original_filename ?? "Loading evidence..."}
            </h2>
          </div>

          <div className="evidence-viewer-actions">
            <button
              type="button"
              className="open-original-file-button"
              onClick={onOpenOriginalFile}
              disabled={evidenceLoading || !evidenceDetails}
            >
              Open Original File
            </button>

            <button
              type="button"
              className="evidence-viewer-close"
              onClick={onClose}
              aria-label="Close evidence viewer"
            >
              ×
            </button>
          </div>
        </div>

        {/* ── LOADING ── */}
        {evidenceLoading && (
          <div className="evidence-viewer-loading">Loading evidence...</div>
        )}

        {/* ── ERROR ── */}
        {evidenceError && (
          <div className="details-error">{evidenceError}</div>
        )}

        {/* ── EVIDENCE DETAILS ── */}
        {evidenceDetails && !evidenceLoading && (
          <>
            {/* Metadata */}
            <div className="evidence-metadata">
              <div>
                <span>FILE TYPE</span>
                <strong>{evidenceDetails.file_type ?? "Unknown"}</strong>
              </div>

              <div>
                <span>FILE SIZE</span>
                <strong>{evidenceDetails.file_size ?? 0} bytes</strong>
              </div>

              <div>
                <span>EVIDENCE ID</span>
                <strong>#{evidenceDetails.id}</strong>
              </div>

              <div>
                <span>SHA-256</span>
                <strong className="hash-value">
                  {evidenceDetails.sha256_hash ?? "Unavailable"}
                </strong>
              </div>
            </div>

            {/* Extraction status */}
            <div className="evidence-status-row">
              <span>EXTRACTION STATUS</span>
              <strong
                className={
                  evidenceDetails.extraction_status === "completed"
                    ? "status-completed"
                    : ""
                }
              >
                {evidenceDetails.extraction_status ?? "Unknown"}
              </strong>
            </div>

            {/* Correlated events */}
            <section className="detail-section evidence-correlated-events">
              <div className="panel-header">
                <div>
                  <h3>Related Events</h3>
                  <span>Events linked to this evidence file</span>
                </div>
                {!evidenceEventsLoading && (
                  <span>{evidenceEvents.length} found</span>
                )}
              </div>

              {evidenceEventsLoading && (
                <p className="empty-detail">Loading related events...</p>
              )}

              {evidenceEventsError && !evidenceEventsLoading && (
                <p className="empty-detail">{evidenceEventsError}</p>
              )}

              {!evidenceEventsLoading &&
                !evidenceEventsError &&
                evidenceEvents.length === 0 && (
                  <p className="empty-detail">
                    No events are linked to this evidence.
                  </p>
                )}

              {!evidenceEventsLoading &&
                evidenceEvents.map((event) => (
                  <article className="detail-item event-item" key={event.id}>
                    <div className="event-type">
                      {event.event_type.replaceAll("_", " ")}
                    </div>

                    {event.timestamp && (
                      <div className="event-timestamp">
                        {new Date(event.timestamp).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "medium",
                          timeZone: "UTC",
                        })}{" "}
                        UTC
                      </div>
                    )}

                    {event.description && (
                      <div className="event-description">
                        {event.description.split(/(file=\S+)/g).map(
                          (part, index) => {
                            if (!part.startsWith("file=")) {
                              return <span key={index}>{part}</span>;
                            }

                            const fileValue = part.replace(/^file=/, "");
                            const targetNode = graph.nodes.find(
                              (node) => node.id === `file:${fileValue}`
                            );

                            if (!targetNode) {
                              return <span key={index}>{part}</span>;
                            }

                            return (
                              <button
                                key={index}
                                type="button"
                                className="evidence-event-file-link"
                                onClick={() => {
                                  onNavigateToNode({
                                    id: targetNode.id,
                                    type: targetNode.type,
                                    position: { x: 0, y: 0 },
                                    data: { label: targetNode.label },
                                  });
                                  onClose();
                                }}
                                title={`Open ${fileValue} in the investigation graph`}
                              >
                                {part}
                              </button>
                            );
                          }
                        )}
                      </div>
                    )}

                    {event.source_text &&
                      event.source_text !== event.description && (
                        <details>
                          <summary>View source text</summary>
                          <p className="event-description">
                            {event.source_text}
                          </p>
                        </details>
                      )}

                    <span>
                      Event #{event.id} · Evidence #{event.evidence_id}
                    </span>
                  </article>
                ))}
            </section>

            {/* Extracted content */}
            <div className="evidence-content">
              <div className="evidence-content-header">
                <span>EXTRACTED CONTENT</span>

                <div className="evidence-legend">
                  <span className="evidence-legend-title">LEGEND</span>
                  <span className="evidence-legend-item">
                    <span className="legend-dot legend-timestamp" />
                    Timestamp
                  </span>
                  <span className="evidence-legend-item">
                    <span className="legend-dot legend-process" />
                    Process
                  </span>
                  <span className="evidence-legend-item">
                    <span className="legend-dot legend-action" />
                    Action
                  </span>
                  <span className="evidence-legend-item">
                    <span className="legend-dot legend-file" />
                    File
                  </span>
                  <span className="evidence-legend-item">
                    <span className="legend-dot legend-user" />
                    User
                  </span>
                  <span className="evidence-legend-item">
                    <span className="legend-dot legend-device" />
                    Device
                  </span>
                </div>

                {evidenceDetails.extracted_text && (
                  <span className="evidence-line-count">
                    {evidenceDetails.extracted_text.split("\n").length} lines
                  </span>
                )}
              </div>

              <div className="evidence-text-viewer">
                {evidenceDetails.extracted_text ? (
                  evidenceDetails.extracted_text
                    .split("\n")
                    .map((line, index) => {
                      const trimmedLine = line.trim();
                      return (
                        <div className="evidence-text-line" key={index}>
                          <span className="evidence-line-number">
                            {String(index + 1).padStart(3, "0")}
                          </span>
                          <span className="evidence-line-content">
                            {trimmedLine
                              ? highlightEvidenceLine(
                                  trimmedLine,
                                  graph,
                                  onNavigateToNode
                                )
                              : "\u00A0"}
                          </span>
                        </div>
                      );
                    })
                ) : (
                  <div className="evidence-empty-content">
                    No extracted text available.
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── ORIGINAL FILE PANEL ── */}
      {originalFileOpen && (
        <section
          className="original-file-panel"
          aria-label="Original evidence file"
          onClick={(event) => event.stopPropagation()}
        >
          <header className="original-file-header">
            <div>
              <div className="evidence-viewer-label">ORIGINAL EVIDENCE</div>
              <h2>{evidenceDetails?.original_filename ?? "Evidence file"}</h2>
            </div>

            <button
              type="button"
              className="evidence-viewer-close"
              onClick={onCloseOriginalFile}
              aria-label="Close original file panel"
            >
              ×
            </button>
          </header>

          <div className="original-file-meta">
            Read-only view · Original file is not modified
          </div>

          {originalFileLoading && (
            <div className="evidence-viewer-loading">
              Loading original file...
            </div>
          )}

          {originalFileError && (
            <div className="details-error">{originalFileError}</div>
          )}

          {!originalFileLoading && !originalFileError && (
            isImageEvidence(evidenceDetails?.original_filename) ? (
              <div className="original-image-content">
                <img
                  src={originalImageUrl}
                  alt={evidenceDetails?.original_filename ?? "Evidence image"}
                  onError={() => {
                    /* error state managed by parent via onCloseOriginalFile callback */
                  }}
                />
              </div>
            ) : (
              <div className="original-file-content">
                {originalFileContent.split(/\r?\n/).map((line, index) => (
                  <div className="original-file-line" key={index}>
                    <span className="original-file-line-number">
                      {index + 1}
                    </span>
                    <pre>{line || " "}</pre>
                  </div>
                ))}
              </div>
            )
          )}
        </section>
      )}
    </div>
  );
}
