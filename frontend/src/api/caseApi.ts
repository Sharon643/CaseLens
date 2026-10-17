import axios from "axios";

const API_BASE_URL = "http://127.0.0.1:8000";

export const api = axios.create({
  baseURL: API_BASE_URL,
});

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