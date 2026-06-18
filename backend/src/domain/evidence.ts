export type EvidenceSourceType = 'OFFICIAL' | 'RETAILER' | 'OPFF' | 'MANUAL';

export type EvidenceConflictStatus = 'NONE' | 'MINOR' | 'MAJOR' | 'REVIEW_REQUIRED';

export interface Evidence {
  evidence_id: string;
  product_id: string;
  field: string;
  value: string | number | boolean;
  source_type: EvidenceSourceType;
  source_name: string;
  source_url?: string;
  captured_at?: string;
  confidence_contribution: number;
  conflict_status: EvidenceConflictStatus;
}

export type EvidenceRef = {
  evidence_id: string;
  field: string;
  source_name: string;
};

export function toEvidenceRef(evidence: Evidence): EvidenceRef {
  return {
    evidence_id: evidence.evidence_id,
    field: evidence.field,
    source_name: evidence.source_name,
  };
}
