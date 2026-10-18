import type { Node } from "@xyflow/react";
import type { CaseGraph, GraphNodeDetails } from "../../api/caseApi";
import InvestigationGraph from "../InvestigationGraph";

type NodeEvidence = GraphNodeDetails["evidence"][number];
type NodeEvent = GraphNodeDetails["events"][number];
type NodeRelationship = GraphNodeDetails["relationships"][number];

interface InvestigationDetailsPanelProps {
  graph: CaseGraph;
  selectedNode: Node | null;
  nodeDetails: GraphNodeDetails | null;
  detailsLoading: boolean;
  detailsError: string | null;
  selectedEvidenceId: number | null;
  onNodeSelect: (node: Node) => void;
  onSelectEvidence: (id: number) => void;
}

export default function InvestigationDetailsPanel({
  graph,
  selectedNode,
  nodeDetails,
  detailsLoading,
  detailsError,
  selectedEvidenceId,
  onNodeSelect,
  onSelectEvidence,
}: InvestigationDetailsPanelProps) {
  const navigateToRelationshipNode = (targetNodeId: string) => {
    const targetNode = graph.nodes.find((node) => node.id === targetNodeId);
    if (!targetNode) {
      console.warn("Graph node not found:", targetNodeId);
      return;
    }
    onNodeSelect({
      id: targetNode.id,
      type: targetNode.type,
      position: { x: 0, y: 0 },
      data: { label: targetNode.label },
    });
  };

  return (
    <section className="investigation-grid">
      {/* ── GRAPH ── */}
      <div className="panel graph-panel">
        <div className="panel-header">
          <div>
            <h2>Investigation Graph</h2>
            <span>
              {graph.node_count} nodes · {graph.edge_count} edges
            </span>
          </div>
        </div>

        <div className="graph-container">
          <InvestigationGraph graph={graph} onNodeSelect={onNodeSelect} />
        </div>
      </div>

      {/* ── DETAILS SIDEBAR ── */}
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2>Investigation Details</h2>
            <span>{selectedNode ? "Selected graph node" : "Select a node"}</span>
          </div>
        </div>

        {/* No selection */}
        {!selectedNode && (
          <div className="selected-entity empty">
            <div className="selected-entity-header">SELECTED ENTITY</div>
            <div className="selected-entity-name">Select a node</div>
            <div className="selected-entity-id">
              Click any graph node to investigate it.
            </div>
          </div>
        )}

        {/* Node selected */}
        {selectedNode && (
          <div className="selected-entity">
            <div className="selected-entity-header">SELECTED ENTITY</div>

            <div className="selected-entity-name">
              {String(selectedNode.data.label)}
            </div>

            <div className="selected-entity-id">ID: {selectedNode.id}</div>

            {detailsLoading && (
              <div className="details-loading">Loading investigation data...</div>
            )}

            {detailsError && (
              <div className="details-error">{detailsError}</div>
            )}

            {nodeDetails && !detailsLoading && (
              <div className="node-details">
                {/* Counts */}
                <div className="detail-counts">
                  <div>
                    <span>Evidence</span>
                    <strong>{nodeDetails.counts.evidence}</strong>
                  </div>
                  <div>
                    <span>Events</span>
                    <strong>{nodeDetails.counts.events}</strong>
                  </div>
                  <div>
                    <span>Relations</span>
                    <strong>{nodeDetails.counts.relationships}</strong>
                  </div>
                </div>

                {/* Evidence list */}
                <div className="detail-section">
                  <h3>Evidence</h3>
                  {nodeDetails.evidence.length === 0 ? (
                    <p className="empty-detail">No evidence found.</p>
                  ) : (
                    nodeDetails.evidence.map((item: NodeEvidence) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`detail-item evidence-item ${
                          selectedEvidenceId === item.id
                            ? "evidence-item-selected"
                            : ""
                        }`}
                        onClick={() => onSelectEvidence(item.id)}
                      >
                        <strong>{item.original_filename}</strong>
                        <span>Evidence #{item.id}</span>
                        {item.file_type && (
                          <span>Type: {item.file_type}</span>
                        )}
                        {item.extraction_status && (
                          <span>Extraction: {item.extraction_status}</span>
                        )}
                      </button>
                    ))
                  )}
                </div>

                {/* Events list */}
                <div className="detail-section">
                  <h3>Events</h3>
                  {nodeDetails.events.length === 0 ? (
                    <p className="empty-detail">No events found.</p>
                  ) : (
                    nodeDetails.events.map((event: NodeEvent) => {
                      const description = event.description ?? "";
                      const processMatch = description.match(/process=([^\|\s]+)/);
                      const actionMatch = description.match(/action=([^\|\s]+)/);
                      const fileMatch = description.match(/file=([^\|\s]+)/);

                      return (
                        <div className="detail-item event-item" key={event.id}>
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

                          {processMatch && (
                            <div className="event-field">
                              <span>PROCESS</span>
                              <strong>{processMatch[1]}</strong>
                            </div>
                          )}

                          {actionMatch && (
                            <div className="event-field">
                              <span>ACTION</span>
                              <strong>{actionMatch[1]}</strong>
                            </div>
                          )}

                          {fileMatch && (
                            <div className="event-field">
                              <span>FILE</span>
                              <strong>{fileMatch[1]}</strong>
                            </div>
                          )}

                          {!processMatch && !actionMatch && !fileMatch && event.description && (
                            <div className="event-description">
                              {event.description}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Relationships list */}
                <div className="detail-section">
                  <h3>Relationships</h3>
                  {nodeDetails.relationships.length === 0 ? (
                    <p className="empty-detail">No relationships found.</p>
                  ) : (
                    nodeDetails.relationships.map((relationship: NodeRelationship) => {
                      const isSource =
                        relationship.source_type === nodeDetails.node.type &&
                        relationship.source_value === nodeDetails.node.value;

                      const targetType = isSource
                        ? relationship.target_type
                        : relationship.source_type;

                      const targetValue = isSource
                        ? relationship.target_value
                        : relationship.source_value;

                      const targetNodeId = `${targetType}:${targetValue}`;

                      return (
                        <button
                          key={relationship.id}
                          type="button"
                          className="detail-item relationship-item"
                          onClick={() => navigateToRelationshipNode(targetNodeId)}
                        >
                          <div className="relationship-type">
                            {relationship.relationship_type}
                          </div>
                          <div className="relationship-path">
                            <span>{relationship.source_value}</span>
                            <span className="relationship-arrow">→</span>
                            <span>{relationship.target_value}</span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
