
import { useEffect, useMemo, useState } from "react";
import {
  getCaseAnomalies,
  type AnomalyFinding,
  type CaseAnomaliesResponse,
} from "../../api/caseApi";

interface AnomaliesPanelProps {
  caseId: number;
}

const formatTimestamp = (timestamp: string | null) => {
  if (!timestamp) return "Unknown time";

  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) return timestamp;

  return `${date.toLocaleString()} (local time)`;
};

export default function AnomaliesPanel({
  caseId,
}: AnomaliesPanelProps) {
  const [data, setData] = useState<CaseAnomaliesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [ruleFilter, setRuleFilter] = useState("all");
  const [expandedFinding, setExpandedFinding] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAnomalies() {
      setLoading(true);
      setError("");

      try {
        const result = await getCaseAnomalies(caseId);
        if (!cancelled) setData(result);
      } catch {
        if (!cancelled) {
          setError("Could not load anomaly findings. Check that the backend is running.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadAnomalies();

    return () => {
      cancelled = true;
    };
  }, [caseId]);

  const findings = data?.findings ?? [];

  const rules = useMemo(
    () => [...new Set(findings.map((finding) => finding.rule))].sort(),
    [findings],
  );

  const filteredFindings = useMemo(
    () =>
      findings.filter((finding) => {
        const matchesSeverity =
          severityFilter === "all" || finding.severity === severityFilter;
        const matchesRule =
          ruleFilter === "all" || finding.rule === ruleFilter;

        return matchesSeverity && matchesRule;
      }),
    [findings, severityFilter, ruleFilter],
  );

  const highCount = findings.filter(
    (finding) => finding.severity === "high",
  ).length;

  const mediumCount = findings.filter(
    (finding) => finding.severity === "medium",
  ).length;

  if (loading) {
    return <div className="anomalies-state">Analyzing case events…</div>;
  }

  if (error) {
    return (
      <div className="anomalies-state anomalies-error" role="alert">
        {error}
      </div>
    );
  }

  if (!data) {
    return <div className="anomalies-state">No anomaly data available.</div>;
  }

  return (
    <section className="anomalies-panel">
      <div className="anomalies-summary">
        <article className="anomaly-stat">
          <span>Events analyzed</span>
          <strong>{data.events_analyzed}</strong>
        </article>
        <article className="anomaly-stat">
          <span>Total findings</span>
          <strong>{data.finding_count}</strong>
        </article>
        <article className="anomaly-stat">
          <span>High severity</span>
          <strong>{highCount}</strong>
        </article>
        <article className="anomaly-stat">
          <span>Medium severity</span>
          <strong>{mediumCount}</strong>
        </article>
      </div>

      <div className="anomalies-filters">
        <label>
          Severity
          <select
            value={severityFilter}
            onChange={(event) => setSeverityFilter(event.target.value)}
          >
            <option value="all">All severities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </label>

        <label>
          Detection rule
          <select
            value={ruleFilter}
            onChange={(event) => setRuleFilter(event.target.value)}
          >
            <option value="all">All rules</option>
            {rules.map((rule) => (
              <option key={rule} value={rule}>
                {rule.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>

        <span className="anomalies-result-count">
          Showing {filteredFindings.length} of {data.finding_count}
        </span>
      </div>

      {filteredFindings.length === 0 ? (
        <div className="anomalies-state">
          No findings match the selected filters.
        </div>
      ) : (
        <div className="anomalies-list">
          {filteredFindings.map((finding: AnomalyFinding) => {
            const isExpanded = expandedFinding === finding.event_id;
            const supportingEvidence = finding.supporting_evidence ?? [];

            return (
              <article
                className="anomaly-card"
                key={`${finding.rule}-${finding.timestamp}-${finding.event_id}`}
              >
                <div className="anomaly-card-top">
                  <span
                    className={`anomaly-severity severity-${finding.severity}`}
                  >
                    {finding.severity}
                  </span>
                  <span className="anomaly-rule">
                    {finding.rule.replaceAll("_", " ")}
                  </span>
                </div>

                <h3>{finding.title}</h3>
                <p className="anomaly-reason">{finding.reason}</p>

                <dl className="anomaly-metadata">
                  <div>
                    <dt>Timestamp</dt>
                    <dd>{formatTimestamp(finding.timestamp)}</dd>
                  </div>
                  <div>
                    <dt>Source file</dt>
                    <dd>{finding.filename}</dd>
                  </div>
                  <div>
                    <dt>Event ID</dt>
                    <dd>{finding.event_id}</dd>
                  </div>
                </dl>

                {finding.description && (
                  <details className="anomaly-description">
                    <summary>View event description</summary>
                    <p>{finding.description}</p>
                  </details>
                )}

                <button
                  type="button"
                  className="anomaly-evidence-toggle"
                  aria-expanded={isExpanded}
                  onClick={() =>
                    setExpandedFinding(isExpanded ? null : finding.event_id)
                  }
                >
                  {isExpanded ? "Hide supporting evidence" : "View supporting evidence"}
                  <span>{supportingEvidence.length}</span>
                </button>

                {isExpanded && (
                  <div className="anomaly-supporting-evidence">
                    {supportingEvidence.length === 0 ? (
                      <p>No additional supporting evidence was returned.</p>
                    ) : (
                      supportingEvidence.map((source) => (
                        <div
                          className="anomaly-evidence-item"
                          key={`${source.evidence_id}-${source.event_id}`}
                        >
                          <strong>{source.filename}</strong>
                          <span>Evidence ID: {source.evidence_id}</span>
                          <span>Event ID: {source.event_id}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      <p className="anomalies-notice">
        {data.notice}
      </p>
    </section>
  );
}
