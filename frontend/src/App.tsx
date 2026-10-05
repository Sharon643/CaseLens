import { useEffect, useState } from "react";

import {
  getCaseSummary,
  getCaseGraph,
  getGraphNodeDetails,
} from "./api/caseApi";

import type {
  CaseSummary,
  CaseGraph,
  GraphNodeDetails,
} from "./api/caseApi";

import type { Node } from "@xyflow/react";

import "./App.css";
import InvestigationGraph from "./components/InvestigationGraph";


function App() {
  const CASE_ID = 1;

  const [summary, setSummary] =
    useState<CaseSummary | null>(null);

  const [graph, setGraph] =
    useState<CaseGraph | null>(null);

  const [selectedNode, setSelectedNode] =
    useState<Node | null>(null);

  const [nodeDetails, setNodeDetails] =
    useState<GraphNodeDetails | null>(null);

  const [detailsLoading, setDetailsLoading] =
    useState(false);

  const [detailsError, setDetailsError] =
    useState<string | null>(null);

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
        console.error(err);

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
          <h1>CaseLens</h1>

          <p>
            Digital Investigation Platform
          </p>
        </div>

        <div className="case-info">
          <span>CASE</span>
          <strong>#{summary.case_id}</strong>
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
            <span>Evidence</span>

            <strong>
              {summary.evidence_count}
            </strong>
          </div>


          <div className="summary-card">
            <span>Entities</span>

            <strong>
              {summary.entity_count}
            </strong>
          </div>


          <div className="summary-card">
            <span>Events</span>

            <strong>
              {summary.event_count}
            </strong>
          </div>


          <div className="summary-card">
            <span>Relationships</span>

            <strong>
              {summary.relationship_count}
            </strong>
          </div>

        </section>


        {/* ===================================================
            INVESTIGATION
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
                          <span>Evidence</span>
                          <strong>
                            {
                              nodeDetails.counts
                                .evidence
                            }
                          </strong>
                        </div>

                        <div>
                          <span>Events</span>
                          <strong>
                            {
                              nodeDetails.counts
                                .events
                            }
                          </strong>
                        </div>

                        <div>
                          <span>Relations</span>
                          <strong>
                            {
                              nodeDetails.counts
                                .relationships
                            }
                          </strong>
                        </div>

                      </div>


                      {/* =======================================
                          EVIDENCE
                      ======================================= */}

                      <div className="detail-section">

                        <h3>
                          Evidence
                        </h3>

                        {nodeDetails
                          .evidence
                          .length === 0 ? (
                          <p className="empty-detail">
                            No evidence found.
                          </p>
                        ) : (
                          nodeDetails.evidence.map(
                            (item) => (
                              <div
                                className="detail-item"
                                key={item.id}
                              >
                                <strong>
                                  {
                                    item.original_filename
                                  }
                                </strong>

                                <span>
                                  Evidence #
                                  {item.id}
                                </span>
                              </div>
                            )
                          )
                        )}

                      </div>


                {/* =======================================================
                    EVENTS
                ======================================================= */}

                <div className="detail-section">

                  <h3>
                    Events
                  </h3>

                  {nodeDetails.events.length === 0 ? (
                    <p className="empty-detail">
                      No events found.
                    </p>
                  ) : (
                    nodeDetails.events.map((event) => {
                      const description = event.description ?? "";

                      const processMatch = description.match(
                        /process=([^|\s]+)/
                      );

                      const actionMatch = description.match(
                        /action=([^|\s]+)/
                      );

                      const fileMatch = description.match(
                        /file=([^|\s]+)/
                      );

                      return (
                        <div
                          className="detail-item event-item"
                          key={event.id}
                        >

                          <div className="event-type">
                            {event.event_type.replaceAll("_", " ")}
                          </div>

                          {event.timestamp && (
                            <div className="event-timestamp">
                              {new Date(event.timestamp).toLocaleString(
                                "en-IN",
                                {
                                  dateStyle: "medium",
                                  timeStyle: "medium",
                                  timeZone: "UTC",
                                }
                              )}{" "}
                              UTC
                            </div>
                          )}

                          {processMatch && (
                            <div className="event-field">
                              <span>PROCESS</span>
                              <strong>
                                {processMatch[1]}
                              </strong>
                            </div>
                          )}

                          {actionMatch && (
                            <div className="event-field">
                              <span>ACTION</span>
                              <strong>
                                {actionMatch[1]}
                              </strong>
                            </div>
                          )}

                          {fileMatch && (
                            <div className="event-field">
                              <span>FILE</span>
                              <strong>
                                {fileMatch[1]}
                              </strong>
                            </div>
                          )}

                          {!processMatch &&
                            !actionMatch &&
                            !fileMatch &&
                            event.description && (
                              <div className="event-description">
                                {event.description}
                              </div>
                            )}

                        </div>
                      );
                    })
                  )}

                </div>


                {/* =======================================================
                    RELATIONSHIPS
                ======================================================= */}

                <div className="detail-section">

                  <h3>
                    Relationships
                  </h3>

                  {nodeDetails.relationships.length === 0 ? (
                    <p className="empty-detail">
                      No relationships found.
                    </p>
                  ) : (
                    nodeDetails.relationships.map((relationship) => {

                      const isSource =
                        relationship.source_type ===
                          nodeDetails.node.type &&
                        relationship.source_value ===
                          nodeDetails.node.value;

                      const targetType = isSource
                        ? relationship.target_type
                        : relationship.source_type;

                      const targetValue = isSource
                        ? relationship.target_value
                        : relationship.source_value;

                      const targetNodeId =
                        `${targetType}:${targetValue}`;

                      const handleRelationshipClick = () => {

                        const targetNode = graph.nodes.find(
                          (node) =>
                            node.id === targetNodeId
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

                          type: targetNode.type,

                          position: {
                            x: 0,
                            y: 0,
                          },

                          data: {
                            label: targetNode.label,
                          },
                        });
                      };

                      return (
                        <button
                          key={relationship.id}
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
                    })
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

            <div className="entity-section">

              <h3>Actors</h3>

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


            <div className="entity-section">

              <h3>Devices</h3>

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


            <div className="entity-section">

              <h3>Files</h3>

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

    </div>
  );
}


export default App;