// ─────────────────────────────────────────────
// Evidence event types
// ─────────────────────────────────────────────

export type EvidenceEvent = {
  id: number;
  evidence_id: number;
  event_type: string;
  timestamp: string | null;
  description: string | null;
  source_text: string | null;
};

export type EvidenceEventsResponse = {
  evidence_id: number;
  events: EvidenceEvent[];
};

// ─────────────────────────────────────────────
// Timeline types
// ─────────────────────────────────────────────

export type CaseTimelineEvent = {
  id: number;
  evidence_id: number;
  evidence_filename: string;
  event_type: string;
  timestamp: string | null;
  description: string | null;
  source_text: string | null;
};

export type CaseTimelineResponse = {
  case_id: number;
  event_count: number;
  events: CaseTimelineEvent[];
};

// ─────────────────────────────────────────────
// Investigation analysis / findings types
// ─────────────────────────────────────────────

export type TransferEvidence = {
  event_id: number;
  evidence_id: number;
  evidence_filename: string;
};

export type PossibleTransfer = {
  timestamp: string | null;
  filename: string;
  supporting_evidence: TransferEvidence[];
};

export type InvestigationFinding = {
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

export type CaseAnalysisResponse = {
  case_id: number;
  event_count: number;
  finding_count: number;
  findings: InvestigationFinding[];
};

// ─────────────────────────────────────────────
// Source-consistency assessment
// ─────────────────────────────────────────────

export type SourceAssessment = {
  label: "Supporting" | "Consistent" | "Inconclusive";
  explanation: string;
};

export function assessSourceConsistency(
  sourceText: string,
  filename: string,
  transferTimestamp: string | null
): SourceAssessment {
  const text = sourceText.toLowerCase();
  const targetFilename = filename.toLowerCase();

  const mentionsFilename = text.includes(targetFilename);
  const mentionsRemovableMedia =
    /\b(usb|removable media|flash drive|external drive)\b/i.test(text);
  const describesTransfer =
    /\b(write|writes|wrote|written|copy|copies|copied|transfer|transfers|transferred|export|exports|exported)\b/i.test(
      text
    );
  const hasTransferTimestamp =
    transferTimestamp !== null && text.includes(transferTimestamp);

  if (mentionsFilename && mentionsRemovableMedia && describesTransfer) {
    return {
      label: "Supporting",
      explanation:
        "The source explicitly mentions the file, removable media, and a transfer-related action.",
    };
  }

  if (mentionsFilename || hasTransferTimestamp || mentionsRemovableMedia) {
    return {
      label: "Consistent",
      explanation:
        "The source contains a relevant detail but does not independently establish the suspected transfer.",
    };
  }

  return {
    label: "Inconclusive",
    explanation:
      "The available source text does not contain enough relevant detail to assess this transfer.",
  };
}
