import { useCallback, useEffect, useState } from "react";
import {
  getCaseCustodyHistory,
  verifyCaseIntegrity,
  type CaseCustodyHistoryResponse,
  type CaseIntegrityResponse,
  type IntegrityResult,
} from "../../api/caseApi";

interface IntegrityCustodyPanelProps {
  caseId: number;
}

function formatTimestamp(value: string): string {
  return new Date(value).toLocaleString();
}

function statusLabel(status: IntegrityResult["status"]): string {
  switch (status) {
    case "verified":
      return "Verified";
    case "mismatch":
      return "Hash mismatch";
    case "missing":
      return "Missing file";
    case "unverified":
      return "Unverified";
  }
}

export default function IntegrityCustodyPanel({
  caseId,
}: IntegrityCustodyPanelProps) {
  const [integrity, setIntegrity] =
    useState<CaseIntegrityResponse | null>(null);
  const [custody, setCustody] =
    useState<CaseCustodyHistoryResponse | null>(null);

  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCustody = useCallback(async () => {
    const result = await getCaseCustodyHistory(caseId);
    setCustody(result);
  }, [caseId]);

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      setLoading(true);
      setError(null);

      try {
        const result = await getCaseCustodyHistory(caseId);
        if (!cancelled) {
          setCustody(result);
        }
      } catch {
        if (!cancelled) {
          setError("Unable to load custody history.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadHistory();

    return () => {
      cancelled = true;
    };
  }, [caseId]);

  async function handleVerifyAll() {
    setVerifying(true);
    setError(null);

    try {
      const result = await verifyCaseIntegrity(caseId);
      setIntegrity(result);
      await loadCustody();
    } catch {
      setError("Integrity verification failed. Check the backend logs.");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <section className="integrity-panel">
      <header className="integrity-panel__header">
        <div>
          <h2>Integrity &amp; Custody</h2>
          <p>
            Verify evidence hashes and review evidence-handling history.
          </p>
        </div>

        <button
          type="button"
          onClick={handleVerifyAll}
          disabled={verifying}
        >
          {verifying ? "Verifying..." : "Verify all evidence"}
        </button>
      </header>

      {error && (
        <div className="integrity-panel__error" role="alert">
          {error}
        </div>
      )}

      {integrity && (
        <div className="integrity-panel__summary">
          <div className="integrity-panel__stat">
            <span>Total files</span>
            <strong>{integrity.total_files}</strong>
          </div>
          <div className="integrity-panel__stat">
            <span>Verified</span>
            <strong>{integrity.verified}</strong>
          </div>
          <div className="integrity-panel__stat">
            <span>Mismatches</span>
            <strong>{integrity.mismatch}</strong>
          </div>
          <div className="integrity-panel__stat">
            <span>Missing</span>
            <strong>{integrity.missing}</strong>
          </div>
          <div className="integrity-panel__stat">
            <span>Unverified</span>
            <strong>{integrity.unverified}</strong>
          </div>
        </div>
      )}

      {integrity && (
        <div className="integrity-panel__section">
          <h3>File integrity results</h3>

          <div className="integrity-panel__table-wrapper">
            <table className="integrity-panel__table">
              <thead>
                <tr>
                  <th>Evidence</th>
                  <th>Status</th>
                  <th>Recorded SHA-256</th>
                  <th>Calculated SHA-256</th>
                </tr>
              </thead>
              <tbody>
                {integrity.results.map((item) => (
                  <tr key={item.evidence_id}>
                    <td>
                      <strong>{item.filename}</strong>
                      <small>Evidence #{item.evidence_id}</small>
                    </td>
                    <td>
                      <span
                        className={`integrity-status integrity-status--${item.status}`}
                      >
                        {statusLabel(item.status)}
                      </span>
                    </td>
                    <td>
                      <code>{item.recorded_sha256 ?? "Not recorded"}</code>
                    </td>
                    <td>
                      <code>{item.calculated_sha256 ?? "Unavailable"}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="integrity-panel__section">
        <h3>Chain-of-custody history</h3>

        {loading && <p>Loading custody records...</p>}

        {!loading && custody && custody.records.length === 0 && (
          <p>No custody records have been recorded for this case.</p>
        )}

        {!loading && custody && custody.records.length > 0 && (
          <div className="integrity-panel__table-wrapper">
            <table className="integrity-panel__table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Evidence</th>
                  <th>Action</th>
                  <th>Actor</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {custody.records.map((record) => (
                  <tr key={record.id}>
                    <td>{formatTimestamp(record.recorded_at)}</td>
                    <td>
                      {record.filename}
                      <small>Evidence #{record.evidence_id}</small>
                    </td>
                    <td>{record.action}</td>
                    <td>{record.actor}</td>
                    <td>{record.details || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="integrity-panel__notice">
        A matching hash establishes consistency with the recorded hash; it
        does not independently prove evidence authenticity. Custody records
        are not yet protected against direct database modification.
      </p>
    </section>
  );
}