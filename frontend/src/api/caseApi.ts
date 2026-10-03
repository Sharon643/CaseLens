import axios from "axios";

const API_BASE_URL = "http://127.0.0.1:8000";

export const api = axios.create({
  baseURL: API_BASE_URL,
});

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

export async function getCaseSummary(
  caseId: number
): Promise<CaseSummary> {
  const response = await api.get<CaseSummary>(
    `/cases/${caseId}/summary`
  );

  return response.data;
}

export async function getCaseGraph(
  caseId: number
): Promise<CaseGraph> {
  const response = await api.get<CaseGraph>(
    `/cases/${caseId}/graph`
  );

  return response.data;
}