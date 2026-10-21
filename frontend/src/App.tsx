import { useEffect, useState } from "react";

import {
  getCaseSummary,
  getCaseGraph,
  getGraphNodeDetails,
  getEvidenceDetails,
  getOriginalEvidenceContent,
  getOriginalEvidenceImageUrl,
  api,
  getCaseEvidenceFiles,
} from "./api/caseApi";

import type {
  CaseSummary,
  CaseGraph,
  GraphNodeDetails,
  EvidenceDetails,
  OriginalEvidenceFile,
  CaseEvidenceFilesResponse,
} from "./api/caseApi";

import type { Node } from "@xyflow/react";

import "./App.css";

import type {
  CaseTimelineEvent,
  CaseTimelineResponse,
  EvidenceEvent,
  EvidenceEventsResponse,
  CaseAnalysisResponse,
  PossibleTransfer,
} from "./types";

import CaseSummaryPanel from "./components/panels/CaseSummaryPanel";
import InvestigationDetailsPanel from "./components/panels/InvestigationDetailsPanel";
import KeyEntitiesPanel from "./components/panels/KeyEntitiesPanel";
import FindingsPanel from "./components/panels/FindingsPanel";
import CorrelationPanel from "./components/panels/CorrelationPanel";
import TimelinePanel from "./components/panels/TimelinePanel";
import IntegrityCustodyPanel from "./components/panels/IntegrityCustodyPanel";
import AnomaliesPanel from "./components/panels/AnomaliesPanel";
import EvidenceViewer from "./components/EvidenceViewer";
import OriginalFilesModal from "./components/OriginalFilesModal";


interface CaseRecord {
  id: number;
  case_number: string;
  title: string;
  description: string | null;
  status: string;
  created_at: string;
}

type PanelId =
  | "overview"
  | "graph"
  | "entities"
  | "findings"
  | "correlation"
  | "anomalies"
  | "timeline"
  | "files"
  | "integrity-custody";

interface NavItem {
  id: PanelId;
  label: string;
  icon: string;
  description: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: "overview",
    label: "Overview",
    icon: "⬡",
    description: "Case summary & stats",
  },
  {
    id: "graph",
    label: "Graph",
    icon: "◈",
    description: "Investigation graph",
  },
  {
    id: "entities",
    label: "Entities",
    icon: "◎",
    description: "Actors, devices & files",
  },
  {
    id: "findings",
    label: "Findings",
    icon: "⚑",
    description: "Investigation findings",
  },
  {
    id: "correlation",
    label: "Correlation",
    icon: "⟺",
    description: "Evidence cross-reference",
  },
  {
  id: "anomalies",
  label: "Anomalies",
  icon: "🔍︎",
  description: "Detect and investigate suspicious activity",
  },
  {
    id: "timeline",
    label: "Timeline",
    icon: "⏲",
    description: "Chronological events",
  },
  {
    id: "files",
    label: "Files",
    icon: "⊟",
    description: "Original evidence files",
  },
  {
  id: "integrity-custody",
  label: "Integrity & Custody",
  icon: "🛡",
  description: "Evidence integrity and custody history",
  },
];

function App() {
  /* =========================================================
     NAVIGATION STATE
  ========================================================= */

  const [activePanel, setActivePanel] = useState<PanelId>("overview");

  /* =========================================================
     CASE STATE
  ========================================================= */
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(null);
  const [casesLoading, setCasesLoading] = useState(true);
  const [casesError, setCasesError] = useState<string | null>(null);
  const [summary, setSummary] = useState<CaseSummary | null>(null);
  const [graph, setGraph] = useState<CaseGraph | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* =========================================================
     TIMELINE STATE
  ========================================================= */

  const [timelineEvents, setTimelineEvents] = useState<CaseTimelineEvent[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(true);
  const [timelineError, setTimelineError] = useState<string | null>(null);
  const [timelineSearch, setTimelineSearch] = useState("");
  const [timelineTypeFilter, setTimelineTypeFilter] = useState("all");
  const [usbOnly, setUsbOnly] = useState(false);
  const [activeFinding, setActiveFinding] = useState<PossibleTransfer | null>(null);

  /* =========================================================
     ANALYSIS STATE
  ========================================================= */

  const [analysis, setAnalysis] = useState<CaseAnalysisResponse | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(true);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  /* =========================================================
     ORIGINAL EVIDENCE FILES STATE
  ========================================================= */

  const [caseFiles, setCaseFiles] = useState<OriginalEvidenceFile[]>([]);
  const [caseFilesLoading, setCaseFilesLoading] = useState(true);
  const [caseFilesError, setCaseFilesError] = useState<string | null>(null);
  const [fileSearch, setFileSearch] = useState("");
  const [originalFilesPanelOpen, setOriginalFilesPanelOpen] = useState(false);

  /* =========================================================
     GRAPH NODE STATE
  ========================================================= */

  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [nodeDetails, setNodeDetails] = useState<GraphNodeDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  /* =========================================================
     EVIDENCE VIEWER STATE
  ========================================================= */

  const [selectedEvidenceId, setSelectedEvidenceId] = useState<number | null>(null);
  const [evidenceDetails, setEvidenceDetails] = useState<EvidenceDetails | null>(null);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);
  const [evidenceEvents, setEvidenceEvents] = useState<EvidenceEvent[]>([]);
  const [evidenceEventsLoading, setEvidenceEventsLoading] = useState(false);
  const [evidenceEventsError, setEvidenceEventsError] = useState<string | null>(null);
  const [originalFileOpen, setOriginalFileOpen] = useState(false);
  const [originalFileContent, setOriginalFileContent] = useState("");
  const [originalFileLoading, setOriginalFileLoading] = useState(false);
  const [originalFileError, setOriginalFileError] = useState<string | null>(null);

  /* =========================================================
     LOAD AVAILABLE CASES
  ========================================================= */

  useEffect(() => {
    let cancelled = false;

    async function loadCases() {
      setCasesLoading(true);
      setCasesError(null);

      try {
        const response = await api.get<CaseRecord[]>("/cases");
        const data = response.data;
        if (cancelled) return;

        setCases(data);
        setSelectedCaseId((currentId) => {
          if (currentId !== null && data.some((item) => item.id === currentId)) {
            return currentId;
          }
          return data.length > 0 ? data[0].id : null;
        });

        if (data.length === 0) setLoading(false);
      } catch (err) {
        console.error("Failed to load cases:", err);
        if (!cancelled) {
          setCasesError("Unable to load available cases.");
          setLoading(false);
        }
      } finally {
        if (!cancelled) setCasesLoading(false);
      }
    }

    void loadCases();
    return () => { cancelled = true; };
  }, []);

  /* =========================================================
     LOAD SELECTED CASE (summary + graph)
  ========================================================= */

  useEffect(() => {
    if (selectedCaseId === null) {
      setSummary(null);
      setGraph(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const caseId = selectedCaseId; // narrowed to number here

    async function loadCase() {
      setLoading(true);
      setError(null);
      setSummary(null);
      setGraph(null);

      try {
        const [summaryData, graphData] = await Promise.all([
          getCaseSummary(caseId),
          getCaseGraph(caseId),
        ]);
        if (cancelled) return;
        setSummary(summaryData);
        setGraph(graphData);
      } catch (err) {
        console.error("Failed to load case:", err);
        if (!cancelled) setError("Unable to load the selected case.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadCase();
    return () => { cancelled = true; };
  }, [selectedCaseId]);

  /* =========================================================
     LOAD ORIGINAL EVIDENCE FILES
  ========================================================= */

  useEffect(() => {
    if (selectedCaseId === null) {
      setCaseFiles([]);
      setCaseFilesLoading(false);
      return;
    }
    let cancelled = false;
    async function loadCaseFiles() {
      setCaseFilesLoading(true);
      setCaseFilesError(null);
      try {
        const response: CaseEvidenceFilesResponse = await getCaseEvidenceFiles(selectedCaseId!);
        if (!cancelled) setCaseFiles(response.files);
      } catch (err) {
        console.error("Failed to load original evidence files:", err);
        if (!cancelled) setCaseFilesError("Unable to load the original evidence file list.");
      } finally {
        if (!cancelled) setCaseFilesLoading(false);
      }
    }
    void loadCaseFiles();
    return () => { cancelled = true; };
  }, [selectedCaseId]);

  /* =========================================================
     LOAD TIMELINE
  ========================================================= */

  useEffect(() => {
    if (selectedCaseId === null) {
      setTimelineEvents([]);
      setTimelineLoading(false);
      return;
    }
    let cancelled = false;
    async function loadTimeline() {
      setTimelineLoading(true);
      setTimelineError(null);
      try {
        const response = await api.get<CaseTimelineResponse>(
          `/evidence/cases/${selectedCaseId}/events`
        );
        if (!cancelled) {
          const events = Array.isArray(response.data.events) ? response.data.events : [];
          setTimelineEvents(
            [...events].sort((a, b) => {
              if (!a.timestamp) return 1;
              if (!b.timestamp) return -1;
              return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
            })
          );
        }
      } catch (err) {
        console.error("Failed to load case timeline:", err);
        if (!cancelled) setTimelineError("Unable to load the investigation timeline.");
      } finally {
        if (!cancelled) setTimelineLoading(false);
      }
    }
    void loadTimeline();
    return () => { cancelled = true; };
  }, [selectedCaseId]);

  /* =========================================================
     LOAD ANALYSIS
  ========================================================= */

  useEffect(() => {
    if (selectedCaseId === null) {
      setAnalysis(null);
      setAnalysisLoading(false);
      return;
    }
    let cancelled = false;
    async function loadAnalysis() {
      setAnalysisLoading(true);
      setAnalysisError(null);
      try {
        const response = await api.get<CaseAnalysisResponse>(
          `/evidence/cases/${selectedCaseId}/analysis`
        );
        if (!cancelled) setAnalysis(response.data);
      } catch (err) {
        console.error("Failed to load investigation analysis:", err);
        if (!cancelled) setAnalysisError("Unable to load investigation findings.");
      } finally {
        if (!cancelled) setAnalysisLoading(false);
      }
    }
    void loadAnalysis();
    return () => { cancelled = true; };
  }, [selectedCaseId]);

  /* =========================================================
     LOAD SELECTED GRAPH NODE DETAILS
  ========================================================= */

  useEffect(() => {
    if (selectedCaseId === null || !selectedNode) {
      setNodeDetails(null);
      setDetailsError(null);
      return;
    }
    const caseId = selectedCaseId;
    const nodeId = selectedNode.id;
    const separatorIndex = nodeId.indexOf(":");
    if (separatorIndex === -1) {
      setNodeDetails(null);
      setDetailsError("Unable to determine graph node type.");
      return;
    }
    const nodeType = nodeId.substring(0, separatorIndex);
    const nodeValue = nodeId.substring(separatorIndex + 1);
    

    async function loadNodeDetails() {
      setDetailsLoading(true);
      setDetailsError(null);
      setNodeDetails(null);
      try {
        const details = await getGraphNodeDetails(caseId, nodeType, nodeValue);
        setNodeDetails(details);
      } catch (err) {
        console.error("Failed to load graph node details:", err);
        setDetailsError("Unable to load investigation details.");
      } finally {
        setDetailsLoading(false);
      }
    }
    loadNodeDetails();
  }, [selectedNode, selectedCaseId]);

  /* =========================================================
     LOAD SELECTED EVIDENCE
  ========================================================= */

  useEffect(() => {
    if (selectedCaseId === null || selectedEvidenceId === null) {
      setEvidenceDetails(null);
      setEvidenceError(null);
      setEvidenceEvents([]);
      setEvidenceEventsError(null);
      return;
    }
    const caseId = selectedCaseId;
    const evidenceId = selectedEvidenceId;
    let cancelled = false;

    async function loadEvidence() {
      setEvidenceLoading(true);
      setEvidenceError(null);
      setEvidenceDetails(null);
      try {
        const details = await getEvidenceDetails(caseId, evidenceId);
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
          setEvidenceEvents(
            Array.isArray(response.data.events) ? response.data.events : []
          );
        }
      } catch (err) {
        console.error("Failed to load evidence-related events:", err);
        if (!cancelled) setEvidenceEventsError("Related events are not available yet.");
      } finally {
        if (!cancelled) setEvidenceEventsLoading(false);
      }
    }

    void loadEvidence();
    void loadEvidenceEvents();
    return () => { cancelled = true; };
  }, [selectedEvidenceId, selectedCaseId]);

  /* =========================================================
     HANDLERS
  ========================================================= */

  const closeOriginalFile = () => {
    setOriginalFileOpen(false);
    setOriginalFileContent("");
    setOriginalFileError(null);
  };

  const closeEvidenceViewer = () => {
    setSelectedEvidenceId(null);
    setEvidenceDetails(null);
    setEvidenceError(null);
    setEvidenceEvents([]);
    setEvidenceEventsError(null);
    setOriginalFileOpen(false);
    setOriginalFileContent("");
    setOriginalFileError(null);
  };

  const openOriginalFile = async () => {
    if (selectedCaseId === null || selectedEvidenceId === null || !evidenceDetails) return;
    setOriginalFileOpen(true);
    setOriginalFileLoading(true);
    setOriginalFileError(null);
    setOriginalFileContent("");
    try {
      const isImage = /\.(png|jpe?g|webp)$/i.test(evidenceDetails.original_filename ?? "");
      if (!isImage) {
        const content = await getOriginalEvidenceContent(selectedCaseId!, selectedEvidenceId);
        setOriginalFileContent(content);
      }
    } catch (err) {
      console.error("Failed to open original evidence file:", err);
      setOriginalFileError("Unable to open the original evidence file.");
    } finally {
      setOriginalFileLoading(false);
    }
  };

  const handleViewTimeline = (transfer: PossibleTransfer) => {
    setActiveFinding(transfer);
    setTimelineSearch(transfer.filename);
    setTimelineTypeFilter("all");
    setUsbOnly(false);
    setActivePanel("timeline");
  };

  const handleOpenEvidenceFromFiles = (id: number) => {
    setOriginalFilesPanelOpen(false);
    setSelectedEvidenceId(id);
  };

  /* =========================================================
     DERIVED VALUES
  ========================================================= */

  const filteredTimelineEvents = timelineEvents.filter((event) => {
    const searchableText = [
      event.event_type,
      event.description ?? "",
      event.source_text ?? "",
      event.evidence_filename,
    ]
      .join(" ")
      .toLowerCase();

    const matchesSearch = searchableText.includes(timelineSearch.trim().toLowerCase());
    const matchesType =
      timelineTypeFilter === "all" || event.event_type === timelineTypeFilter;
    const matchesUsb = !usbOnly || /usb|removable|flash drive/i.test(searchableText);

    return matchesSearch && matchesType && matchesUsb;
  });

  const timelineEventTypes = [
    ...new Set(timelineEvents.map((event) => event.event_type)),
  ].sort();

  const groupedTransferFinding = analysis?.findings.find(
    (finding) => finding.rule === "multiple_usb_writes"
  );
  const possibleTransfers = groupedTransferFinding?.transfers ?? [];

  const originalImageUrl =
    selectedCaseId !== null && selectedEvidenceId !== null && evidenceDetails
      ? getOriginalEvidenceImageUrl(selectedCaseId, selectedEvidenceId)
      : "";

  /* =========================================================
     EARLY RETURNS
  ========================================================= */

  if (casesLoading || (selectedCaseId !== null && loading)) {
    return (
      <div className="app-loading">
        <div className="app-loading-spinner" />
        <p>Loading CaseLens…</p>
      </div>
    );
  }

  if (casesError) {
    return <div className="error-screen">{casesError}</div>;
  }

  if (selectedCaseId === null || cases.length === 0) {
    return <div className="error-screen">No cases found. Create a case before starting an investigation.</div>;
  }

  if (error) {
    return <div className="error-screen">{error}</div>;
  }

  if (!summary || !graph) {
    return <div className="error-screen">No case data available.</div>;
  }

  /* =========================================================
     UI
  ========================================================= */

  return (
    <div className="app app-shell">

      {/* ── SIDEBAR ── */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="sidebar-brand-icon">⬡</span>
          <div>
            <div className="sidebar-brand-name">CaseLens</div>
            <div className="sidebar-brand-sub">Digital Investigation</div>
          </div>
        </div>

        <div className="sidebar-case-badge">
          <label className="sidebar-case-label" htmlFor="case-selector">ACTIVE CASE</label>
          <select
            id="case-selector"
            className="sidebar-case-select"
            value={selectedCaseId}
            onChange={(event) => {
              const nextCaseId = Number(event.target.value);
              setSelectedCaseId(nextCaseId);
              setSelectedNode(null);
              setSelectedEvidenceId(null);
              setActiveFinding(null);
              setOriginalFilesPanelOpen(false);
              setOriginalFileOpen(false);
              setOriginalFileContent("");
              setTimelineSearch("");
              setTimelineTypeFilter("all");
              setUsbOnly(false);
              setFileSearch("");
            }}
            aria-label="Select active investigation case"
          >
            {cases.map((item) => (
              <option key={item.id} value={item.id}>
                {item.case_number} — {item.title}
              </option>
            ))}
          </select>
        </div>

        <nav className="sidebar-nav" aria-label="Dashboard navigation">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`sidebar-nav-item ${activePanel === item.id ? "active" : ""}`}
              onClick={() => setActivePanel(item.id)}
              aria-current={activePanel === item.id ? "page" : undefined}
            >
              <span className="sidebar-nav-icon" aria-hidden="true">
                {item.icon}
              </span>
              <span className="sidebar-nav-text">
                <span className="sidebar-nav-label">{item.label}</span>
                <span className="sidebar-nav-desc">{item.description}</span>
              </span>
              {item.id === "findings" && possibleTransfers.length > 0 && (
                <span className="sidebar-badge">{possibleTransfers.length}</span>
              )}
              {item.id === "timeline" && (
                <span className="sidebar-badge sidebar-badge-neutral">
                  {timelineEvents.length}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-stat">
            <span>{summary.evidence_count}</span>
            <label>Evidence</label>
          </div>
          <div className="sidebar-stat">
            <span>{summary.event_count}</span>
            <label>Events</label>
          </div>
          <div className="sidebar-stat">
            <span>{summary.entity_count}</span>
            <label>Entities</label>
          </div>
        </div>
      </aside>

      {/* ── MAIN PANEL AREA ── */}
      <main className="panel-area">

        {/* ── PANEL: OVERVIEW ── */}
        {activePanel === "overview" && (
          <div className="panel-view">
            <div className="panel-view-header">
              <div>
                <h1 className="panel-view-title">Overview</h1>
                <p className="panel-view-sub">Case summary and statistics</p>
              </div>
            </div>

            <CaseSummaryPanel summary={summary} />

            {/* Quick-access tiles */}
            <div className="quick-access-grid">
              {NAV_ITEMS.filter((n) => n.id !== "overview").map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="quick-access-tile"
                  onClick={() => setActivePanel(item.id)}
                >
                  <span className="quick-tile-icon">{item.icon}</span>
                  <span className="quick-tile-label">{item.label}</span>
                  <span className="quick-tile-desc">{item.description}</span>
                  <span className="quick-tile-arrow">→</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── PANEL: GRAPH ── */}
        {activePanel === "graph" && (
          <div className="panel-view panel-view-fullheight">
            <div className="panel-view-header">
              <div>
                <h1 className="panel-view-title">Investigation Graph</h1>
                <p className="panel-view-sub">
                  {graph.node_count} nodes · {graph.edge_count} edges
                </p>
              </div>
            </div>
            <InvestigationDetailsPanel
              graph={graph}
              selectedNode={selectedNode}
              nodeDetails={nodeDetails}
              detailsLoading={detailsLoading}
              detailsError={detailsError}
              selectedEvidenceId={selectedEvidenceId}
              onNodeSelect={setSelectedNode}
              onSelectEvidence={setSelectedEvidenceId}
            />
          </div>
        )}

        {/* ── PANEL: ENTITIES ── */}
        {activePanel === "entities" && (
          <div className="panel-view">
            <div className="panel-view-header">
              <div>
                <h1 className="panel-view-title">Key Entities</h1>
                <p className="panel-view-sub">{summary.entity_count} entities detected across all evidence</p>
              </div>
            </div>
            <KeyEntitiesPanel summary={summary} />
          </div>
        )}

        {/* ── PANEL: FINDINGS ── */}
        {activePanel === "findings" && (
          <div className="panel-view">
            <div className="panel-view-header">
              <div>
                <h1 className="panel-view-title">Investigation Findings</h1>
                <p className="panel-view-sub">Potential incidents identified from evidence records</p>
              </div>
              {possibleTransfers.length > 0 && (
                <span className="panel-view-badge">
                  {possibleTransfers.length} to review
                </span>
              )}
            </div>
            <FindingsPanel
              possibleTransfers={possibleTransfers}
              analysisLoading={analysisLoading}
              analysisError={analysisError}
              onViewTimeline={handleViewTimeline}
              onSelectEvidence={setSelectedEvidenceId}
            />
          </div>
        )}

        {/* ── PANEL: CORRELATION ── */}
        {activePanel === "correlation" && (
          <div className="panel-view">
            <div className="panel-view-header">
              <div>
                <h1 className="panel-view-title">Evidence Correlation</h1>
                <p className="panel-view-sub">Compare records associated with each suspected transfer</p>
              </div>
            </div>
            <CorrelationPanel
              possibleTransfers={possibleTransfers}
              timelineEvents={timelineEvents}
              analysisLoading={analysisLoading}
              analysisError={analysisError}
              onSelectEvidence={setSelectedEvidenceId}
            />
          </div>
        )}

        {/* ── PANEL: ANOMALIES ── */}
        {activePanel === "anomalies" && (
          <div className="panel-view">
            <div className="panel-view-header">
              <div>
                <h1 className="panel-view-title">Anomalies</h1>
                <p className="panel-view-sub">
                  Rule-based detection of potentially suspicious activity
                </p>
              </div>
            </div>

            {selectedCaseId !== null && (
            <AnomaliesPanel caseId={selectedCaseId} />
          )}
          </div>
        )}

        {/* ── PANEL: TIMELINE ── */}
        {activePanel === "timeline" && (
          <div className="panel-view">
            <div className="panel-view-header">
              <div>
                <h1 className="panel-view-title">Event Timeline</h1>
                <p className="panel-view-sub">
                  {filteredTimelineEvents.length} of {timelineEvents.length} events shown
                </p>
              </div>
            </div>
            <TimelinePanel
              timelineEvents={timelineEvents}
              filteredTimelineEvents={filteredTimelineEvents}
              timelineEventTypes={timelineEventTypes}
              timelineLoading={timelineLoading}
              timelineError={timelineError}
              timelineSearch={timelineSearch}
              timelineTypeFilter={timelineTypeFilter}
              usbOnly={usbOnly}
              activeFinding={activeFinding}
              onSearchChange={setTimelineSearch}
              onTypeFilterChange={setTimelineTypeFilter}
              onUsbOnlyChange={setUsbOnly}
              onClearFilters={() => {
                setTimelineSearch("");
                setTimelineTypeFilter("all");
                setUsbOnly(false);
              }}
              onSelectEvidence={setSelectedEvidenceId}
            />
          </div>
        )}

        {/* ── PANEL: FILES ── */}
        {activePanel === "files" && (
          <div className="panel-view">
            <div className="panel-view-header">
              <div>
                <h1 className="panel-view-title">Original Evidence Files</h1>
                <p className="panel-view-sub">
                  {caseFiles.length} files collected for this case
                </p>
              </div>
              <button
                type="button"
                className="panel-view-action"
                onClick={() => setOriginalFilesPanelOpen(true)}
              >
                Browse all files →
              </button>
            </div>

            {/* Inline file list preview */}
            <div className="files-inline-list">
              {caseFilesLoading && (
                <p className="timeline-message">Loading files…</p>
              )}
              {caseFilesError && (
                <p className="timeline-message timeline-error">{caseFilesError}</p>
              )}
              {!caseFilesLoading && !caseFilesError &&
                caseFiles.map((file) => (
                  <article className="original-files-item" key={file.id}>
                    <div className="original-files-info">
                      <strong>{file.original_filename}</strong>
                      <span>
                        Evidence #{file.id}
                        {" · "}
                        {file.file_type || "Unknown type"}
                        {" · "}
                        {file.available_on_disk ? "Available" : "Missing on disk"}
                      </span>
                      {file.file_size != null && (
                        <span>{(file.file_size / 1024).toFixed(1)} KB</span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="finding-timeline-button"
                      disabled={!file.available_on_disk}
                      onClick={() => setSelectedEvidenceId(file.id)}
                    >
                      Open evidence →
                    </button>
                  </article>
                ))}
            </div>
          </div>
        )}
        {/* ── PANEL: INTEGRITY & CUSTODY ── */}
        {activePanel === "integrity-custody" && (
          <div className="panel-view">
            <div className="panel-view-header">
              <div>
                <h1 className="panel-view-title">
                  Integrity &amp; Custody
                </h1>
                <p className="panel-view-sub">
                  Verify evidence hashes and review custody history
                </p>
              </div>
            </div>

            {selectedCaseId !== null && (
            <IntegrityCustodyPanel caseId={selectedCaseId} />
          )}
          </div>
        )}
      </main>

      {/* ── ORIGINAL FILES MODAL ── */}
      {originalFilesPanelOpen && (
        <OriginalFilesModal
          caseFiles={caseFiles}
          caseFilesLoading={caseFilesLoading}
          caseFilesError={caseFilesError}
          fileSearch={fileSearch}
          onFileSearchChange={setFileSearch}
          onClose={() => setOriginalFilesPanelOpen(false)}
          onOpenEvidence={handleOpenEvidenceFromFiles}
        />
      )}

      {/* ── EVIDENCE VIEWER ── */}
      {selectedEvidenceId !== null && (
        <EvidenceViewer
          evidenceDetails={evidenceDetails}
          evidenceLoading={evidenceLoading}
          evidenceError={evidenceError}
          evidenceEvents={evidenceEvents}
          evidenceEventsLoading={evidenceEventsLoading}
          evidenceEventsError={evidenceEventsError}
          originalFileOpen={originalFileOpen}
          originalFileContent={originalFileContent}
          originalFileLoading={originalFileLoading}
          originalFileError={originalFileError}
          originalImageUrl={originalImageUrl}
          graph={graph}
          onClose={closeEvidenceViewer}
          onOpenOriginalFile={openOriginalFile}
          onCloseOriginalFile={closeOriginalFile}
          onNavigateToNode={setSelectedNode}
        />
      )}
    </div>
  );
}

export default App;