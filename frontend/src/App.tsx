import { useEffect, useState } from "react";
import {
  getCaseSummary,
  getCaseGraph,
} from "./api/caseApi";

import type {
  CaseSummary,
  CaseGraph,
} from "./api/caseApi";

function App() {
  const [summary, setSummary] =
    useState<CaseSummary | null>(null);

  const [graph, setGraph] =
    useState<CaseGraph | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    async function loadCase() {
      try {
        const [summaryData, graphData] =
          await Promise.all([
            getCaseSummary(1),
            getCaseGraph(1),
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

  if (loading) {
    return <h2>Loading CaseLens...</h2>;
  }

  if (error) {
    return <h2>{error}</h2>;
  }

  if (!summary || !graph) {
    return <h2>No case data available.</h2>;
  }

  return (
    <div>
      <h1>CaseLens</h1>

      <h2>Case #{summary.case_id}</h2>

      <p>
        Evidence: {summary.evidence_count}
      </p>

      <p>
        Entities: {summary.entity_count}
      </p>

      <p>
        Events: {summary.event_count}
      </p>

      <p>
        Relationships: {summary.relationship_count}
      </p>

      <hr />

      <h3>Graph</h3>

      <p>
        Nodes: {graph.node_count}
      </p>

      <p>
        Edges: {graph.edge_count}
      </p>

      <h3>Actors</h3>

      {summary.actors.map((actor) => (
        <p key={actor}>{actor}</p>
      ))}

      <h3>Devices</h3>

      {summary.devices.map((device) => (
        <p key={device}>{device}</p>
      ))}

      <h3>Files</h3>

      {summary.files.map((file) => (
        <p key={file}>{file}</p>
      ))}
    </div>
  );
}

export default App;