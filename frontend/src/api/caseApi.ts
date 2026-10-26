import axios from "axios";

const API_BASE_URL = "http://127.0.0.1:8000";

export const api = axios.create({
  baseURL: API_BASE_URL,
});

export interface CaseRecord {
  id: number;
  case_number: string;
  title: string;
  description: string | null;
  status: string;
  created_at: string;
}

export async function getCases(): Promise<CaseRecord[]> {
  const response = await api.get<CaseRecord[]>("/cases");
  return response.data;
}

/* =========================================================
   CASE SUMMARY
========================================================= */

export interface CaseSummary {
  case_id: number;
  evidence_count: number;
  entity_count: number;
  event_count: number;
  relationship_count: number;

  actors: string[];
  devices: string[];
  files: string[];

  event_types: Record<string, number>;
}

/* =========================================================
   INVESTIGATION GRAPH
========================================================= */

export interface GraphNode {
  id: string;
  type: string;
  label: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relationship: string;
  evidence_id: number;
  event_id: number | null;
}

export interface CaseGraph {
  case_id: number;

  nodes: GraphNode[];
  edges: GraphEdge[];

  node_count: number;
  edge_count: number;
}

/* =========================================================
   ENTITY DETAILS
========================================================= */

export interface EntityDetails {
  entity: {
    id: number;
    evidence_id: number;
    entity_type: string;
    value: string;

    start_position: number | null;
    end_position: number | null;

    extracted_at: string | null;
  };

  evidence: {
    id: number;
    case_id: number;

    original_filename: string;
    stored_filename: string | null;

    file_type: string | null;
    file_size: number | null;

    sha256_hash: string | null;

    extraction_status: string | null;

    uploaded_at: string | null;
  } | null;

  events: {
    id: number;
    evidence_id: number;

    event_type: string;

    timestamp: string | null;

    description: string | null;

    source_text: string | null;
  }[];

  relationships: {
    id: number;
    evidence_id: number;

    source_type: string;
    source_value: string;

    relationship_type: string;

    target_type: string;
    target_value: string;

    event_id: number | null;
  }[];
}

/* =========================================================
   GRAPH NODE INVESTIGATION DETAILS
========================================================= */

export interface GraphNodeDetails {
  node: {
    type: string;
    value: string;
    id: string;
  };

  entities: {
    id: number;
    evidence_id: number;

    entity_type: string;
    value: string;

    start_position: number | null;
    end_position: number | null;

    extracted_at: string | null;
  }[];

  events: {
    id: number;
    evidence_id: number;

    event_type: string;

    timestamp: string | null;

    description: string | null;

    source_text: string | null;
  }[];

  relationships: {
    id: number;
    evidence_id: number;

    source_type: string;
    source_value: string;

    relationship_type: string;

    target_type: string;
    target_value: string;

    event_id: number | null;
  }[];

  evidence: {
    id: number;
    case_id: number;

    original_filename: string;
    stored_filename: string | null;

    file_type: string | null;
    file_size: number | null;

    sha256_hash: string | null;

    extraction_status: string | null;

    uploaded_at: string | null;
  }[];

  counts: {
    entities: number;
    events: number;
    relationships: number;
    evidence: number;
  };
}

export interface EvidenceDetails {
  id: number;
  case_id: number;

  original_filename: string;
  stored_filename: string | null;

  file_type: string | null;
  file_size: number | null;

  sha256_hash: string | null;

  uploaded_at: string | null;
  extraction_status: string | null;

  extracted_text: string;
}

/* =========================================================
   GET CASE SUMMARY
========================================================= */

export async function getCaseSummary(
  caseId: number
): Promise<CaseSummary> {
  const response = await api.get<CaseSummary>(
    `/cases/${caseId}/summary`
  );

  return response.data;
}

/* =========================================================
   GET CASE GRAPH
========================================================= */

export async function getCaseGraph(
  caseId: number
): Promise<CaseGraph> {
  const response = await api.get<CaseGraph>(
    `/cases/${caseId}/graph`
  );

  return response.data;
}

/* =========================================================
   GET ENTITY DETAILS
========================================================= */

export async function getEntityDetails(
  caseId: number,
  entityId: number
): Promise<EntityDetails> {
  const response = await api.get<EntityDetails>(
    `/cases/${caseId}/entities/${entityId}/details`
  );

  return response.data;
}

/* =========================================================
   GET GRAPH NODE DETAILS
========================================================= */

export async function getGraphNodeDetails(
  caseId: number,
  nodeType: string,
  nodeValue: string
): Promise<GraphNodeDetails> {
  const response = await api.get<GraphNodeDetails>(
    `/cases/${caseId}/graph-node/details`,
    {
      params: {
        node_type: nodeType,
        node_value: nodeValue,
      },
    }
  );

  return response.data;
}

export async function getEvidenceDetails(
  caseId: number,
  evidenceId: number
): Promise<EvidenceDetails> {
  const response = await api.get<EvidenceDetails>(
    `/cases/${caseId}/evidence/${evidenceId}`
  );

  return response.data;
}
export async function getOriginalEvidenceContent(
  caseId: number,
  evidenceId: number
): Promise<string> {
  const response = await api.get<string>(
    `/cases/${caseId}/evidence/${evidenceId}/content`,
    { responseType: "text" }
  );

  return response.data;
}
export function getOriginalEvidenceImageUrl(
  caseId: number,
  evidenceId: number
): string {
  return `http://127.0.0.1:8000/cases/${caseId}/evidence/${evidenceId}/image`;
}
export interface OriginalEvidenceFile {
  id: number;
  original_filename: string;
  file_type: string | null;
  file_size: number | null;
  sha256_hash: string | null;
  uploaded_at: string | null;
  extraction_status: string | null;
  available_on_disk: boolean;
}

export interface CaseEvidenceFilesResponse {
  case_id: number;
  count: number;
  files: OriginalEvidenceFile[];
}

export async function getCaseEvidenceFiles(
  caseId: number
): Promise<CaseEvidenceFilesResponse> {
  const response = await api.get<CaseEvidenceFilesResponse>(
    `/cases/${caseId}/evidence`
  );

  return response.data;
}
/* =========================================================
   EVIDENCE INTEGRITY
========================================================= */

export type IntegrityStatus =
  | "verified"
  | "mismatch"
  | "missing"
  | "unverified";

export interface IntegrityResult {
  case_id: number;
  evidence_id: number;
  filename: string;
  status: IntegrityStatus;
  recorded_sha256: string | null;
  calculated_sha256: string | null;
  message: string;
}

export interface CaseIntegrityResponse {
  case_id: number;
  total_files: number;
  verified: number;
  mismatch: number;
  missing: number;
  unverified: number;
  results: IntegrityResult[];
}

export async function verifyCaseIntegrity(
  caseId: number
): Promise<CaseIntegrityResponse> {
  const response = await api.post<CaseIntegrityResponse>(
    `/cases/${caseId}/evidence/verify-integrity`
  );

  return response.data;
}

/* =========================================================
   CHAIN OF CUSTODY
========================================================= */

export interface CustodyRecord {
  id: number;
  evidence_id: number;
  filename: string;
  action: string;
  actor: string;
  details: string | null;
  sha256_hash: string | null;
  recorded_at: string;
}

export interface CaseCustodyHistoryResponse {
  case_id: number;
  count: number;
  records: CustodyRecord[];
}

export async function getCaseCustodyHistory(
  caseId: number
): Promise<CaseCustodyHistoryResponse> {
  const response = await api.get<CaseCustodyHistoryResponse>(
    `/cases/${caseId}/custody/history`
  );

  return response.data;
}

/* =========================================================
   ANOMALY DETECTION
========================================================= */

export interface AnomalySupportingEvidence {
  evidence_id: number;
  filename: string;
  event_id: number;
}

export interface AnomalyFinding {
  rule: string;
  severity: string;
  title: string;
  reason: string;
  timestamp: string | null;
  event_id: number;
  evidence_id: number;
  filename: string;
  event_type: string;
  description: string;
  supporting_evidence: AnomalySupportingEvidence[];
}

export interface CaseAnomaliesResponse {
  case_id: number;
  events_analyzed: number;
  finding_count: number;
  findings: AnomalyFinding[];
  notice: string;
}

export async function getCaseAnomalies(
  caseId: number
): Promise<CaseAnomaliesResponse> {
  const response = await api.get<CaseAnomaliesResponse>(
    `/cases/${caseId}/anomalies`
  );

  return response.data;
}
// =========================================================
// CASE MANAGEMENT
// =========================================================

export interface CreateCasePayload {
  case_number: string;
  title: string;
  description?: string;
}

export async function createCase(
  payload: CreateCasePayload
): Promise<CaseRecord> {
  const response = await api.post<CaseRecord>("/cases", payload);
  return response.data;
}

export async function deleteCase(caseId: number): Promise<void> {
  await api.delete(`/cases/${caseId}`);
}

// =========================================================
// EVIDENCE UPLOAD
// =========================================================

export interface EvidenceUploadResponse {
  id: number;
  case_id: number;
  filename: string;
  file_type: string;
  file_size: number;
  sha256_hash: string;
  uploaded_at: string;

  // Text extraction results
  extraction_status: string;
  extraction_error: string | null;
  extracted_characters: number;

  // Event extraction results
  events_found: number;
  event_extraction_error: string | null;
}

export async function uploadEvidence(
  caseId: number,
  file: File
): Promise<EvidenceUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post<EvidenceUploadResponse>(
    `/cases/${caseId}/evidence`,
    formData
  );

  return response.data;
}
// =========================================================
// EVIDENCE MANAGEMENT
// =========================================================

export async function deleteEvidence(
  caseId: number,
  evidenceId: number
): Promise<void> {
  await api.delete(`/cases/${caseId}/evidence/${evidenceId}`);
}