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


type CaseTimelineEvent = {
  id: number;
  evidence_id: number;
  evidence_filename: string;
  event_type: string;
  timestamp: string | null;
  description: string | null;
  source_text: string | null;
};

type CaseTimelineResponse = {
  case_id: number;
  event_count: number;
  events: CaseTimelineEvent[];
};


type TransferEvidence = {
  event_id: number;
  evidence_id: number;
  evidence_filename: string;
};

type PossibleTransfer = {
  timestamp: string | null;
  filename: string;
  supporting_evidence: TransferEvidence[];
};

type InvestigationFinding = {
  event_id: number | null;
  evidence_id: number | null;
  evidence_filename: string | null;
  timestamp: string | null;
  severity: string;
  rule: string;
  title: string;
  reason: string;
  description: string;
  transfers?: PossibleTransfer[];
};

type CaseAnalysisResponse = {
  case_id: number;
  event_count: number;
  finding_count: number;
  findings: InvestigationFinding[];
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

  const [timelineEvents, setTimelineEvents] =
    useState<CaseTimelineEvent[]>([]);

  const [timelineLoading, setTimelineLoading] =
    useState(true);

  const [timelineError, setTimelineError] =
    useState<string | null>(null);

  const [analysis, setAnalysis] =
    useState<CaseAnalysisResponse | null>(null);

  const [analysisLoading, setAnalysisLoading] = useState(true);

  const [analysisError, setAnalysisError] =
    useState<string | null>(null);


  const [timelineSearch, setTimelineSearch] = useState("");
  const [timelineTypeFilter, setTimelineTypeFilter] = useState("all");
  const [usbOnly, setUsbOnly] = useState(false);
  const [activeFinding, setActiveFinding] =
    useState<PossibleTransfer | null>(null);

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
     LOAD TIMELINE
  ========================================================= */

  
  useEffect(() => {
    let cancelled = false;

    async function loadTimeline() {
      setTimelineLoading(true);
      setTimelineError(null);

      try {
        const response = await api.get<CaseTimelineResponse>(
          `/evidence/cases/${CASE_ID}/events`
        );

        if (!cancelled) {
          const events = Array.isArray(response.data.events)
            ? response.data.events
            : [];

          setTimelineEvents(
            [...events].sort((a, b) => {
              if (!a.timestamp) return 1;
              if (!b.timestamp) return -1;

              return (
                new Date(a.timestamp).getTime() -
                new Date(b.timestamp).getTime()
              );
            })
          );
        }
      } catch (err) {
        console.error("Failed to load case timeline:", err);

        if (!cancelled) {
          setTimelineError(
            "Unable to load the investigation timeline."
          );
        }
      } finally {
        if (!cancelled) {
          setTimelineLoading(false);
        }
      }
    }

    void loadTimeline();

    return () => {
      cancelled = true;
    };
  }, []);

  /* =========================================================
     LOAD ANALYSIS
  ========================================================= */

  useEffect(() => {
    let cancelled = false;

    async function loadAnalysis() {
      setAnalysisLoading(true);
      setAnalysisError(null);

      try {
        const response = await api.get<CaseAnalysisResponse>(
          `/evidence/cases/${CASE_ID}/analysis`
        );

        if (!cancelled) {
          setAnalysis(response.data);
        }
      } catch (err) {
        console.error("Failed to load investigation analysis:", err);

        if (!cancelled) {
          setAnalysisError(
            "Unable to load investigation findings."
          );
        }
      } finally {
        if (!cancelled) {
          setAnalysisLoading(false);
        }
      }
    }

    void loadAnalysis();

    return () => {
      cancelled = true;
    };
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

  
  const filteredTimelineEvents = timelineEvents.filter((event) => {
    const searchableText = [
      event.event_type,
      event.description ?? "",
      event.source_text ?? "",
      event.evidence_filename,
    ]
      .join(" ")
      .toLowerCase();

    const matchesSearch = searchableText.includes(
      timelineSearch.trim().toLowerCase()
    );

    const matchesType =
      timelineTypeFilter === "all" ||
      event.event_type === timelineTypeFilter;

    const matchesUsb =
      !usbOnly ||
      /usb|removable|flash drive/i.test(searchableText);

    return matchesSearch && matchesType && matchesUsb;
  });

  const timelineEventTypes = [
    ...new Set(timelineEvents.map((event) => event.event_type)),
  ].sort();

  const groupedTransferFinding = analysis?.findings.find(
    (finding) => finding.rule === "multiple_usb_writes"
  );

  const possibleTransfers =
    groupedTransferFinding?.transfers ?? [];

  const standaloneTransferFindings =
    analysis?.findings.filter(
      (finding) =>
        finding.rule === "possible_usb_file_transfer"
    ) ?? [];


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

        {/* INVESTIGATION FINDINGS */}
        <section className="panel findings-panel">
          <div className="panel-header">
            <div>
              <h2>Investigation Findings</h2>
              <p>Potential incidents identified from evidence records</p>
            </div>

            <span className="panel-count">
              {possibleTransfers.length} items to review
            </span>
          </div>

          <div className="findings-intro">
            <div className="findings-intro-icon">i</div>
            <div>
              <strong>What does this mean?</strong>
              <p>
                CaseLens detected records that may indicate files were copied
                to a USB device. Related records are grouped together to help
                you investigate the same activity across different sources.
                This is an investigative lead, not proof of wrongdoing.
              </p>
            </div>
          </div>

          {analysisLoading && (
            <p className="findings-message">
              Analyzing investigation events...
            </p>
          )}

          {analysisError && (
            <p className="findings-message findings-error">
              {analysisError}
            </p>
          )}

          {!analysisLoading &&
            !analysisError &&
            possibleTransfers.length === 0 && (
              <p className="findings-message">
                No grouped USB transfer indicators were found.
              </p>
            )}

          {!analysisLoading &&
            !analysisError &&
            possibleTransfers.length > 0 && (
              <div className="finding-transfer-list">
                {possibleTransfers.map((transfer, index) => (
                  <article
                    className="finding-transfer"
                    key={`${transfer.timestamp}-${transfer.filename}`}
                  >
                    <div className="finding-transfer-heading">
                      <span className="finding-number">
                        Finding {index + 1}
                      </span>

                      <span className="finding-severity">
                        REVIEW REQUIRED
                      </span>
                    </div>

                    <h3 className="finding-file-name">
                      {transfer.filename}
                    </h3>
                    <button
                      type="button"
                      className="finding-timeline-button"
                      onClick={() => {
                        setActiveFinding(transfer);
                        setTimelineSearch(transfer.filename);
                        setTimelineTypeFilter("all");
                        setUsbOnly(false);

                        document
                          .getElementById("case-event-timeline")
                          ?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                    >
                      View matching timeline events →
                    </button>

                    <div className="finding-facts">
                      <div>
                        <span className="finding-label">
                          RECORDED TIME
                        </span>
                        <strong>
                          {transfer.timestamp
                            ? `${new Date(
                                transfer.timestamp
                              ).toLocaleString("en-IN", {
                                dateStyle: "medium",
                                timeStyle: "medium",
                                timeZone: "UTC",
                              })} UTC`
                            : "Not available"}
                        </strong>
                      </div>

                      <div>
                        <span className="finding-label">
                          RELATED RECORDS
                        </span>
                        <strong>
                          {transfer.supporting_evidence.length} records
                        </strong>
                      </div>
                    </div>

                    <div className="finding-explanation">
                      <h4>Why was this flagged?</h4>
                      <p>
                        Multiple evidence records describe activity involving
                        this file and removable media. The matching timestamp
                        and filename help correlate the records, but the
                        records must be checked to determine whether they
                        describe the same real-world action.
                      </p>
                    </div>

                    <div className="finding-explanation">
                      <h4>What should you verify?</h4>
                      <ul>
                        <li>
                          Confirm whether the USB device and file transfer
                          were authorized.
                        </li>
                        <li>
                          Compare the original records, timestamps, and
                          device identifiers.
                        </li>
                        <li>
                          Check file hashes and surrounding system activity
                          where those records are available.
                        </li>
                      </ul>
                    </div>

                    <div className="finding-evidence-section">
                      <div className="finding-evidence-title">
                        <h4>Supporting evidence</h4>
                        <span>
                          Open a source record to inspect its contents
                        </span>
                      </div>

                      <div className="finding-evidence-list">
                        {transfer.supporting_evidence.map((source) => (
                          <button
                            type="button"
                            className="finding-evidence-button"
                            key={source.event_id}
                            onClick={() =>
                              setSelectedEvidenceId(source.evidence_id)
                            }
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
              Automated rules identify patterns for review. They do not
              establish intent, authorization, or responsibility. Conclusions
              should be based on verified evidence and corroborating context.
            </p>
          </div>
        </section>

        {/* EVIDENCE CORRELATION */}
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

          {!analysisLoading &&
            !analysisError &&
            possibleTransfers.length === 0 && (
              <p className="findings-message">
                No transfers are available to compare.
              </p>
            )}

          {possibleTransfers.map((transfer, index) => (
            <article
              className="correlation-transfer"
              key={`${transfer.timestamp}-${transfer.filename}`}
            >
              <div className="correlation-transfer-header">
                <div>
                  <span className="finding-number">
                    TRANSFER {index + 1}
                  </span>
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
                    ? `${new Date(transfer.timestamp).toLocaleString(
                        "en-IN",
                        {
                          dateStyle: "medium",
                          timeStyle: "medium",
                          timeZone: "UTC",
                        }
                      )} UTC`
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
                    {transfer.supporting_evidence.map((source) => (
                      <tr key={source.event_id}>
                        <td>{source.evidence_filename}</td>
                        <td>#{source.evidence_id}</td>
                        <td>#{source.event_id}</td>
                        <td>
                          <button
                            type="button"
                            className="finding-timeline-button"
                            onClick={() =>
                              setSelectedEvidenceId(source.evidence_id)
                            }
                          >
                            Inspect evidence →
                          </button>
                        </td>
                      </tr>
                    ))}
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
              Three records do not necessarily mean three independent
              confirmations. Verify the original contents, timestamps, device
              identifiers, and provenance before drawing conclusions.
            </p>
          </div>
        </section>


        {/* ===================================================
            TIMELINE
        =================================================== */}

        <section id="case-event-timeline" className="panel timeline-panel" >
          <div className="panel-header timeline-header">
            <div className="timeline-heading">
              <h2>Event Timeline</h2>
              <span>
                Showing {filteredTimelineEvents.length} of{" "}
                {timelineEvents.length} events
              </span>
            </div>
          </div>

          <div className="timeline-filters">
            <input
              type="search"
              className="timeline-search"
              placeholder="Search events, files..."
              value={timelineSearch}
              onChange={(event) => setTimelineSearch(event.target.value)}
              aria-label="Search timeline events"
            />

            <select
              className="timeline-type-filter"
              value={timelineTypeFilter}
              onChange={(event) => setTimelineTypeFilter(event.target.value)}
              aria-label="Filter by event type"
            >
              <option value="all">All event types</option>
              {timelineEventTypes.map((type) => (
                <option key={type} value={type}>
                  {type.replaceAll("_", " ")}
                </option>
              ))}
            </select>

            <label className="timeline-usb-filter">
              <input
                type="checkbox"
                checked={usbOnly}
                onChange={(event) => setUsbOnly(event.target.checked)}
              />
              USB activity
            </label>

            <button
              type="button"
              className="timeline-clear-button"
              onClick={() => {
                setTimelineSearch("");
                setTimelineTypeFilter("all");
                setUsbOnly(false);
              }}
            >
              Clear filters
            </button>
          </div>


          <div className="timeline-list">
            {timelineLoading && (
              <p className="timeline-message">
                Loading investigation events...
              </p>
            )}

            {timelineError && !timelineLoading && (
              <p className="timeline-message timeline-error">
                {timelineError}
              </p>
            )}

            {!timelineLoading &&
              !timelineError &&
              filteredTimelineEvents.length === 0 && (
                <p className="timeline-message">
                  No matching events. Try changing or clearing your filters.
                </p>
              )}

            {!timelineLoading &&
              !timelineError &&
              filteredTimelineEvents.map((event) => {
                const isUsbActivity =
                  event.description?.includes("USB-4471") ?? false;

                const matchesActiveFinding =
                activeFinding !== null &&
                activeFinding.timestamp !== null &&
                event.timestamp !== null &&
                Math.abs(
                  new Date(event.timestamp).getTime() -
                    new Date(activeFinding.timestamp).getTime()
                ) < 1000 &&
                activeFinding.supporting_evidence.some(
                  (source) => source.evidence_id === event.evidence_id
                );

                return (
                  <article
                    key={event.id}
                    className={[
                      "timeline-event",
                      isUsbActivity ? "timeline-event-usb" : "",
                      matchesActiveFinding ? "timeline-event-finding-match" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <div className="timeline-event-marker" />

                    <div className="timeline-event-content">
                      <div className="timeline-event-top">
                        <span className="timeline-event-type">
                          {event.event_type.replaceAll("_", " ")}
                        </span>

                        {isUsbActivity && (
                          <span className="timeline-usb-badge">
                            USB ACTIVITY
                          </span>
                        )}
                        {matchesActiveFinding && (
                          <span className="timeline-finding-match-badge">
                            MATCHED TO FINDING
                          </span>
                        )}
                      </div>

                      <div className="timeline-event-time">
                        {event.timestamp
                          ? `${new Date(event.timestamp).toLocaleString(
                              "en-IN",
                              {
                                dateStyle: "medium",
                                timeStyle: "medium",
                                timeZone: "UTC",
                              }
                            )} UTC`
                          : "Timestamp unavailable"}
                      </div>

                      <p className="timeline-event-description">
                        {event.description || "No description available."}
                      </p>

                      <button
                        type="button"
                        className="timeline-source-button"
                        onClick={() => {
                          setSelectedEvidenceId(event.evidence_id);
                        }}
                      >
                        <span aria-hidden="true">↗</span>
                        {event.evidence_filename}
                        <span className="timeline-source-id">
                          Evidence #{event.evidence_id}
                        </span>
                      </button>
                    </div>
                  </article>
                );
              })}
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