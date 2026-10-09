import { useEffect, useState } from "react";

import {
  getCaseSummary,
  getCaseGraph,
  getGraphNodeDetails,
  getEvidenceDetails,
  api,
} from "./api/caseApi";

import type {
  CaseSummary,
  CaseGraph,
  GraphNodeDetails,
  EvidenceDetails,
} from "./api/caseApi";

import type { Node } from "@xyflow/react";

import "./App.css";

import InvestigationGraph from "./components/InvestigationGraph";


type EvidenceEvent = {
  id: number;
  evidence_id: number;
  event_type: string;
  timestamp: string | null;
  description: string | null;
  source_text: string | null;
};

type EvidenceEventsResponse = {
  evidence_id: number;
  events: EvidenceEvent[];
};

function App() {
  const CASE_ID = 1;

  /* =========================================================
     CASE STATE
  ========================================================= */

  const [summary, setSummary] =
    useState<CaseSummary | null>(null);

  const [graph, setGraph] =
    useState<CaseGraph | null>(null);


  /* =========================================================
     GRAPH NODE STATE
  ========================================================= */

  const [selectedNode, setSelectedNode] =
    useState<Node | null>(null);

  const [nodeDetails, setNodeDetails] =
    useState<GraphNodeDetails | null>(null);

  const [detailsLoading, setDetailsLoading] =
    useState(false);

  const [detailsError, setDetailsError] =
    useState<string | null>(null);

  const [relatedEvents, setRelatedEvents] = 
    useState<
    GraphNodeDetails["events"]
    >([]);


  /* =========================================================
     EVIDENCE VIEWER STATE
  ========================================================= */

  const [selectedEvidenceId, setSelectedEvidenceId] =
    useState<number | null>(null);

  const [evidenceDetails, setEvidenceDetails] =
    useState<EvidenceDetails | null>(null);

  const [evidenceLoading, setEvidenceLoading] =
    useState(false);

  const [evidenceError, setEvidenceError] =
    useState<string | null>(null);

  const [evidenceEvents, setEvidenceEvents] =
    useState<EvidenceEvent[]>([]);

  const [evidenceEventsLoading, setEvidenceEventsLoading] =
    useState(false);

  const [evidenceEventsError, setEvidenceEventsError] =
    useState<string | null>(null);


  /* =========================================================
     APP STATE
  ========================================================= */

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);


  /* =========================================================
     LOAD CASE
  ========================================================= */

  useEffect(() => {
    async function loadCase() {
      try {
        const [
          summaryData,
          graphData,
        ] = await Promise.all([
          getCaseSummary(CASE_ID),
          getCaseGraph(CASE_ID),
        ]);

        setSummary(summaryData);
        setGraph(graphData);

      } catch (err) {
        console.error(
          "Failed to load case:",
          err
        );

        setError(
          "Unable to connect to CaseLens backend."
        );

      } finally {
        setLoading(false);
      }
    }

    loadCase();
  }, []);


  /* =========================================================
     LOAD SELECTED GRAPH NODE DETAILS
  ========================================================= */

  useEffect(() => {
    if (!selectedNode) {
      setNodeDetails(null);
      setDetailsError(null);
      return;
    }

    const nodeId = selectedNode.id;

    const separatorIndex =
      nodeId.indexOf(":");

    if (separatorIndex === -1) {
      setNodeDetails(null);

      setDetailsError(
        "Unable to determine graph node type."
      );

      return;
    }

    const nodeType =
      nodeId.substring(
        0,
        separatorIndex
      );

    const nodeValue =
      nodeId.substring(
        separatorIndex + 1
      );


    async function loadNodeDetails() {
      setDetailsLoading(true);
      setDetailsError(null);
      setNodeDetails(null);

      try {
        const details =
          await getGraphNodeDetails(
            CASE_ID,
            nodeType,
            nodeValue
          );

        setNodeDetails(details);

      } catch (err) {
        console.error(
          "Failed to load graph node details:",
          err
        );

        setDetailsError(
          "Unable to load investigation details."
        );

      } finally {
        setDetailsLoading(false);
      }
    }

    loadNodeDetails();

  }, [selectedNode]);


  /* =========================================================
     LOAD SELECTED EVIDENCE
  ========================================================= */

  useEffect(() => {
    if (selectedEvidenceId === null) {
      setEvidenceDetails(null);
      setEvidenceError(null);
      setEvidenceEvents([]);
      setEvidenceEventsError(null);
      return;
    }

    const evidenceId = selectedEvidenceId;
    let cancelled = false;

    async function loadEvidence() {
      setEvidenceLoading(true);
      setEvidenceError(null);
      setEvidenceDetails(null);

      try {
        const details = await getEvidenceDetails(CASE_ID, evidenceId);
        if (!cancelled) setEvidenceDetails(details);
      } catch (err) {
        console.error("Failed to load evidence:", err);
        if (!cancelled) setEvidenceError("Unable to load evidence.");
      } finally {
        if (!cancelled) setEvidenceLoading(false);
      }
    }

    async function loadEvidenceEvents() {
      setEvidenceEventsLoading(true);
      setEvidenceEventsError(null);
      setEvidenceEvents([]);

      try {
        const response = await api.get<EvidenceEventsResponse>(
          `/evidence/${evidenceId}/events`
        );
        if (!cancelled) {
          setEvidenceEvents(Array.isArray(response.data.events) ? response.data.events : []);
        }
      } catch (err) {
        console.error("Failed to load evidence-related events:", err);
        if (!cancelled) {
          setEvidenceEventsError("Related events are not available yet.");
        }
      } finally {
        if (!cancelled) setEvidenceEventsLoading(false);
      }
    }

    void loadEvidence();
    void loadEvidenceEvents();

    return () => {
      cancelled = true;
    };
  }, [selectedEvidenceId]);


  /* =========================================================
     CLOSE EVIDENCE VIEWER
  ========================================================= */

  const closeEvidenceViewer = () => {
    setSelectedEvidenceId(null);
    setEvidenceDetails(null);
    setEvidenceError(null);
    setEvidenceEvents([]);
    setEvidenceEventsError(null);
  };


  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <div className="loading-screen">
        Loading CaseLens...
      </div>
    );
  }


  /* =========================================================
     ERROR
  ========================================================= */

  if (error) {
    return (
      <div className="error-screen">
        {error}
      </div>
    );
  }
  const highlightEvidenceLine = (line: string) => {
  const parts = line.split(
    /(\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z\b|\b(?:process|action|file|user|device)=\S+)/g
  );

  return parts.map((part, index) => {
    if (
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(part)
    ) {
      return (
        <span
          key={index}
          className="evidence-token evidence-timestamp"
        >
          {part}
        </span>
      );
    }

    if (part.startsWith("process=")) {
      return (
        <span
          key={index}
          className="evidence-token evidence-process"
        >
          {part}
        </span>
      );
    }

    if (part.startsWith("action=")) {
      return (
        <span
          key={index}
          className="evidence-token evidence-action"
        >
          {part}
        </span>
      );
    }

    if (part.startsWith("file=")) {
      return (
          <button
            key={index}
            type="button"
            className="evidence-token evidence-file evidence-token-button"
            onClick={() => {
              const fileValue = part.replace(
                /^file=/,
                ""
              );

              if (!graph) {
                console.warn("Graph is not loaded.");
                return;
              }

              const targetNode = graph.nodes.find(
                (node) =>
                  node.id === `file:${fileValue}`
              );

              if (!targetNode) {
                console.warn(
                  "Graph node not found:",
                  `file:${fileValue}`
                );

                return;
              }

              setSelectedNode({
                id: targetNode.id,
                type: targetNode.type,
                position: {
                  x: 0,
                  y: 0,
                },
                data: {
                  label: targetNode.label,
                },
              });
            }}
          >
            {part}
          </button>
      );
    }

    if (part.startsWith("user=")) {
      return (
        <span
          key={index}
          className="evidence-token evidence-user"
        >
          {part}
        </span>
      );
    }

    if (part.startsWith("device=")) {
      return (
        <span
          key={index}
          className="evidence-token evidence-device"
        >
          {part}
        </span>
      );
    }

    return part;
  });
};

  if (!summary || !graph) {
    return (
      <div className="error-screen">
        No case data available.
      </div>
    );
  }

  


  /* =========================================================
     UI
  ========================================================= */

  return (
    <div className="app">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="header">

        <div>
          <h1>
            CaseLens
          </h1>

          <p>
            Digital Investigation Platform
          </p>
        </div>

        <div className="case-info">
          <span>
            CASE
          </span>

          <strong>
            #{summary.case_id}
          </strong>
        </div>

      </header>


      {/* =====================================================
          MAIN CONTENT
      ===================================================== */}

      <main className="dashboard">


        {/* ===================================================
            SUMMARY
        =================================================== */}

        <section className="summary-grid">

          <div className="summary-card">
            <span>
              Evidence
            </span>

            <strong>
              {summary.evidence_count}
            </strong>
          </div>


          <div className="summary-card">
            <span>
              Entities
            </span>

            <strong>
              {summary.entity_count}
            </strong>
          </div>


          <div className="summary-card">
            <span>
              Events
            </span>

            <strong>
              {summary.event_count}
            </strong>
          </div>


          <div className="summary-card">
            <span>
              Relationships
            </span>

            <strong>
              {summary.relationship_count}
            </strong>
          </div>

        </section>


        {/* ===================================================
            INVESTIGATION AREA
        =================================================== */}

        <section className="investigation-grid">


          {/* =================================================
              GRAPH
          ================================================= */}

          <div className="panel graph-panel">

            <div className="panel-header">

              <div>

                <h2>
                  Investigation Graph
                </h2>

                <span>
                  {graph.node_count} nodes ·{" "}
                  {graph.edge_count} edges
                </span>

              </div>

            </div>


            <div className="graph-container">

              <InvestigationGraph
                graph={graph}
                onNodeSelect={
                  setSelectedNode
                }
              />

            </div>

          </div>


          {/* =================================================
              INVESTIGATION DETAILS
          ================================================= */}

          <div className="panel">

            <div className="panel-header">

              <div>

                <h2>
                  Investigation Details
                </h2>

                <span>
                  {selectedNode
                    ? "Selected graph node"
                    : "Select a node"}
                </span>

              </div>

            </div>


            {/* =================================================
                NO NODE SELECTED
            ================================================= */}

            {!selectedNode && (

              <div className="selected-entity empty">

                <div className="selected-entity-header">
                  SELECTED ENTITY
                </div>

                <div className="selected-entity-name">
                  Select a node
                </div>

                <div className="selected-entity-id">
                  Click any graph node to investigate it.
                </div>

              </div>

            )}


            {/* =================================================
                SELECTED NODE
            ================================================= */}

            {selectedNode && (

              <div className="selected-entity">

                <div className="selected-entity-header">
                  SELECTED ENTITY
                </div>


                <div className="selected-entity-name">
                  {String(
                    selectedNode.data.label
                  )}
                </div>


                <div className="selected-entity-id">
                  ID: {selectedNode.id}
                </div>


                {/* =============================================
                    LOADING
                ============================================= */}

                {detailsLoading && (

                  <div className="details-loading">
                    Loading investigation data...
                  </div>

                )}


                {/* =============================================
                    ERROR
                ============================================= */}

                {detailsError && (

                  <div className="details-error">
                    {detailsError}
                  </div>

                )}


                {/* =============================================
                    DETAILS
                ============================================= */}

                {nodeDetails &&
                  !detailsLoading && (

                    <div className="node-details">


                      {/* =======================================
                          COUNTS
                      ======================================= */}

                      <div className="detail-counts">

                        <div>

                          <span>
                            Evidence
                          </span>

                          <strong>
                            {
                              nodeDetails.counts
                                .evidence
                            }
                          </strong>

                        </div>


                        <div>

                          <span>
                            Events
                          </span>

                          <strong>
                            {
                              nodeDetails.counts
                                .events
                            }
                          </strong>

                        </div>


                        <div>

                          <span>
                            Relations
                          </span>

                          <strong>
                            {
                              nodeDetails.counts
                                .relationships
                            }
                          </strong>

                        </div>

                      </div>


                      {/* =================================================
                          EVIDENCE
                      ================================================= */}

                      <div className="detail-section">

                        <h3>
                          Evidence
                        </h3>


                        {nodeDetails.evidence.length === 0 ? (

                          <p className="empty-detail">
                            No evidence found.
                          </p>

                        ) : (

                          nodeDetails.evidence.map(
                            (item) => (

                              <button
                                key={item.id}
                                type="button"
                                className={`detail-item evidence-item ${
                                  selectedEvidenceId === item.id
                                    ? "evidence-item-selected"
                                    : ""
                                }`}
                                onClick={() =>
                                  setSelectedEvidenceId(
                                    item.id
                                  )
                                }
                              >

                                <strong>
                                  {
                                    item.original_filename
                                  }
                                </strong>

                                <span>
                                  Evidence #{item.id}
                                </span>

                                {item.file_type && (

                                  <span>
                                    Type:{" "}
                                    {item.file_type}
                                  </span>

                                )}

                                {item.extraction_status && (

                                  <span>
                                    Extraction:{" "}
                                    {
                                      item.extraction_status
                                    }
                                  </span>

                                )}

                              </button>

                            )
                          )

                        )}

                      </div>


                      {/* =================================================
                          EVENTS
                      ================================================= */}

                      <div className="detail-section">

                        <h3>
                          Events
                        </h3>


                        {nodeDetails.events.length === 0 ? (

                          <p className="empty-detail">
                            No events found.
                          </p>

                        ) : (

                          nodeDetails.events.map(
                            (event) => {

                              const description =
                                event.description ??
                                "";

                              const processMatch =
                                description.match(
                                  /process=([^|\s]+)/
                                );

                              const actionMatch =
                                description.match(
                                  /action=([^|\s]+)/
                                );

                              const fileMatch =
                                description.match(
                                  /file=([^|\s]+)/
                                );


                              return (

                                <div
                                  className="detail-item event-item"
                                  key={event.id}
                                >

                                  <div className="event-type">
                                    {
                                      event.event_type
                                        .replaceAll(
                                          "_",
                                          " "
                                        )
                                    }
                                  </div>


                                  {event.timestamp && (

                                    <div className="event-timestamp">

                                      {
                                        new Date(
                                          event.timestamp
                                        ).toLocaleString(
                                          "en-IN",
                                          {
                                            dateStyle:
                                              "medium",
                                            timeStyle:
                                              "medium",
                                            timeZone:
                                              "UTC",
                                          }
                                        )
                                      }{" "}
                                      UTC

                                    </div>

                                  )}


                                  {processMatch && (

                                    <div className="event-field">

                                      <span>
                                        PROCESS
                                      </span>

                                      <strong>
                                        {
                                          processMatch[1]
                                        }
                                      </strong>

                                    </div>

                                  )}


                                  {actionMatch && (

                                    <div className="event-field">

                                      <span>
                                        ACTION
                                      </span>

                                      <strong>
                                        {
                                          actionMatch[1]
                                        }
                                      </strong>

                                    </div>

                                  )}


                                  {fileMatch && (

                                    <div className="event-field">

                                      <span>
                                        FILE
                                      </span>

                                      <strong>
                                        {
                                          fileMatch[1]
                                        }
                                      </strong>

                                    </div>

                                  )}


                                  {!processMatch &&
                                    !actionMatch &&
                                    !fileMatch &&
                                    event.description && (

                                      <div className="event-description">
                                        {
                                          event.description
                                        }
                                      </div>

                                    )}

                                </div>

                              );

                            }
                          )

                        )}

                      </div>


                      {/* =================================================
                          RELATIONSHIPS
                      ================================================= */}

                      <div className="detail-section">

                        <h3>
                          Relationships
                        </h3>


                        {nodeDetails.relationships.length === 0 ? (

                          <p className="empty-detail">
                            No relationships found.
                          </p>

                        ) : (

                          nodeDetails.relationships.map(
                            (relationship) => {

                              const isSource =
                                relationship.source_type ===
                                  nodeDetails.node.type &&
                                relationship.source_value ===
                                  nodeDetails.node.value;


                              const targetType =
                                isSource
                                  ? relationship.target_type
                                  : relationship.source_type;


                              const targetValue =
                                isSource
                                  ? relationship.target_value
                                  : relationship.source_value;


                              const targetNodeId =
                                `${targetType}:${targetValue}`;


                              const handleRelationshipClick =
                                () => {

                                  const targetNode =
                                    graph.nodes.find(
                                      (node) =>
                                        node.id ===
                                        targetNodeId
                                    );


                                  if (!targetNode) {

                                    console.warn(
                                      "Graph node not found:",
                                      targetNodeId
                                    );

                                    return;
                                  }


                                  setSelectedNode({
                                    id: targetNode.id,

                                    type:
                                      targetNode.type,

                                    position: {
                                      x: 0,
                                      y: 0,
                                    },

                                    data: {
                                      label:
                                        targetNode.label,
                                    },
                                  });

                                };


                              return (

                                <button
                                  key={
                                    relationship.id
                                  }
                                  type="button"
                                  className="detail-item relationship-item"
                                  onClick={
                                    handleRelationshipClick
                                  }
                                >

                                  <div className="relationship-type">
                                    {
                                      relationship.relationship_type
                                    }
                                  </div>


                                  <div className="relationship-path">

                                    <span>
                                      {
                                        relationship.source_value
                                      }
                                    </span>


                                    <span className="relationship-arrow">
                                      →
                                    </span>


                                    <span>
                                      {
                                        relationship.target_value
                                      }
                                    </span>

                                  </div>

                                </button>

                              );

                            }
                          )

                        )}

                      </div>

                    </div>

                  )}

              </div>

            )}

          </div>

        </section>


        {/* ===================================================
            KEY ENTITIES
        =================================================== */}

        <section className="panel">

          <div className="panel-header">

            <div>

              <h2>
                Key Entities
              </h2>

              <span>
                {summary.entity_count} detected
              </span>

            </div>

          </div>


          <div className="entity-list">


            {/* ACTORS */}

            <div className="entity-section">

              <h3>
                Actors
              </h3>

              {summary.actors.map(
                (actor) => (

                  <div
                    className="entity-item"
                    key={actor}
                  >

                    <span className="entity-dot person" />

                    {actor}

                  </div>

                )
              )}

            </div>


            {/* DEVICES */}

            <div className="entity-section">

              <h3>
                Devices
              </h3>

              {summary.devices.map(
                (device) => (

                  <div
                    className="entity-item"
                    key={device}
                  >

                    <span className="entity-dot device" />

                    {device}

                  </div>

                )
              )}

            </div>


            {/* FILES */}

            <div className="entity-section">

              <h3>
                Files
              </h3>

              {summary.files.map(
                (file) => (

                  <div
                    className="entity-item"
                    key={file}
                  >

                    <span className="entity-dot file" />

                    {file}

                  </div>

                )
              )}

            </div>

          </div>

        </section>


        {/* ===================================================
            TIMELINE
        =================================================== */}

        <section className="panel timeline-panel">

          <div className="panel-header">

            <div>

              <h2>
                Event Timeline
              </h2>

              <span>
                {summary.event_count} events
              </span>

            </div>

          </div>


          <div className="timeline-placeholder">
            Timeline visualization will be
            implemented next.
          </div>

        </section>

      </main>


      {/* =====================================================
          EVIDENCE VIEWER
      ===================================================== */}

      {selectedEvidenceId !== null && (

        <div
          className="evidence-viewer-overlay"
          onClick={closeEvidenceViewer}
        >

          <div
            className="evidence-viewer"
            onClick={(event) =>
              event.stopPropagation()
            }
          >


            {/* ===============================================
                VIEWER HEADER
            =============================================== */}

            <div className="evidence-viewer-header">

              <div>

                <div className="evidence-viewer-label">
                  EVIDENCE
                </div>

                <h2>
                  {
                    evidenceDetails?.original_filename ??
                    "Loading evidence..."
                  }
                </h2>

              </div>


              <button
                type="button"
                className="evidence-viewer-close"
                onClick={closeEvidenceViewer}
                aria-label="Close evidence viewer"
              >
                ×
              </button>

            </div>


            {/* ===============================================
                LOADING
            =============================================== */}

            {evidenceLoading && (

              <div className="evidence-viewer-loading">
                Loading evidence...
              </div>

            )}


            {/* ===============================================
                ERROR
            =============================================== */}

            {evidenceError && (

              <div className="details-error">
                {evidenceError}
              </div>

            )}


            {/* ===============================================
                EVIDENCE DETAILS
            =============================================== */}

            {evidenceDetails &&
              !evidenceLoading && (

                <>

                  {/* =========================================
                      METADATA
                  ========================================= */}

                  <div className="evidence-metadata">


                    <div>

                      <span>
                        FILE TYPE
                      </span>

                      <strong>
                        {
                          evidenceDetails.file_type ??
                          "Unknown"
                        }
                      </strong>

                    </div>


                    <div>

                      <span>
                        FILE SIZE
                      </span>

                      <strong>
                        {
                          evidenceDetails.file_size ??
                          0
                        }{" "}
                        bytes
                      </strong>

                    </div>


                    <div>

                      <span>
                        EVIDENCE ID
                      </span>

                      <strong>
                        #{evidenceDetails.id}
                      </strong>

                    </div>


                    <div>

                      <span>
                        SHA-256
                      </span>

                      <strong className="hash-value">
                        {
                          evidenceDetails.sha256_hash ??
                          "Unavailable"
                        }
                      </strong>

                    </div>

                  </div>


                  {/* =========================================
                      EXTRACTION STATUS
                  ========================================= */}

                  <div className="evidence-status-row">

                    <span>
                      EXTRACTION STATUS
                    </span>

                    <strong
                      className={
                        evidenceDetails.extraction_status ===
                        "completed"
                          ? "status-completed"
                          : ""
                      }
                    >
                      {
                        evidenceDetails.extraction_status ??
                        "Unknown"
                      }
                    </strong>

                  </div>


                  {/* =========================================
                      CORRELATED EVENTS
                  ========================================= */}

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

                    {!evidenceEventsLoading && !evidenceEventsError && evidenceEvents.length === 0 && (
                      <p className="empty-detail">No events are linked to this evidence.</p>
                    )}

                    {!evidenceEventsLoading && evidenceEvents.map((event) => (
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
                            })} UTC
                          </div>
                        )}
                        {event.description && (
                          <div className="event-description">   
                            {event.description.split(/(file=\S+)/g).map((part, index) => {
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
                                    setSelectedNode({
                                      id: targetNode.id,
                                      type: targetNode.type,
                                      position: { x: 0, y: 0 },
                                      data: { label: targetNode.label },
                                    });
                                    closeEvidenceViewer();
                                  }}
                                  title={`Open ${fileValue} in the investigation graph`}
                                >
                                  {part}
                                </button>
                              );
                            })}
                          </div>
                        )}
                        {event.source_text && event.source_text !== event.description && (
                          <details>
                            <summary>View source text</summary>
                            <p className="event-description">{event.source_text}</p>
                          </details>
                        )}
                        <span>Event #{event.id} · Evidence #{event.evidence_id}</span>
                      </article>
                    ))}
                  </section>

                  {/* =========================================
                      EXTRACTED CONTENT
                  ========================================= */}

                  <div className="evidence-content">

                    <div className="evidence-content-header">
                      <span>EXTRACTED CONTENT</span>

                      <div className="evidence-legend">

                        <span className="evidence-legend-title">
                          LEGEND
                        </span>

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
                          {
                            evidenceDetails.extracted_text
                              .split("\n")
                              .length
                          } lines
                        </span>
                      )}
                    </div>


                    <div className="evidence-text-viewer">

                      {evidenceDetails.extracted_text ? (
                        evidenceDetails.extracted_text
                          .split("\n")
                          .map((line, index) => {

                            const trimmedLine =
                              line.trim();

                            return (
                              <div
                                className="evidence-text-line"
                                key={index}
                              >

                                <span className="evidence-line-number">
                                  {String(index + 1).padStart(3, "0")}
                                </span>

                                <span className="evidence-line-content">
                                  {trimmedLine
                                    ? highlightEvidenceLine(trimmedLine)
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

        </div>

      )}

    </div>
  );
}


export default App;