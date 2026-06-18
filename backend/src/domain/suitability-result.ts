import { EvidenceRef } from './evidence';

export type SuitabilityGrade = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';

export interface SuitabilityResult {
  product_id: string;
  product_slug: string;
  need_code: string;
  score: number;
  grade: SuitabilityGrade;
  matched_reasons: string[];
  caution_reasons: string[];
  missing_data: string[];
  evidence_refs: EvidenceRef[];
  disclaimer_required: boolean;
}

export function gradeSuitabilityScore(score: number): SuitabilityGrade {
  if (score >= 90) return 'EXCELLENT';
  if (score >= 75) return 'GOOD';
  if (score >= 55) return 'FAIR';
  return 'POOR';
}
