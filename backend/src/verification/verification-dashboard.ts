/**
 * Verification Dashboard Metrics — Sprint 1.3C-P2
 *
 * Exposes verification KPIs as a type-safe metrics aggregator.
 * Consumed by Data Quality Dashboard V2.
 */

import { VerifiedProductProfile, VerificationSummary } from '../verified-profile';
import { buildVerificationSummary, verifyAllProducts, SeedNutrition } from '../product-verifier';

export interface VerificationDashboardMetrics {
  /** Overall summary */
  summary: VerificationSummary;

  /** Confidence distribution */
  confidence_distribution: {
    high: number;     // ≥0.9
    medium: number;   // 0.75-0.89
    low: number;      // <0.75
  };

  /** Per-brand verification coverage */
  brand_coverage: {
    brand: string;
    verified: number;
    total: number;
    avg_confidence: number;
    gold: number;
    silver: number;
    bronze: number;
  }[];

  /** Source utilization — how many products each source contributes to */
  source_utilization: {
    source_name: string;
    source_type: string;
    products_covered: number;
    fields_covered: string[];
  }[];

  /** Field-level reliability */
  field_reliability: {
    field: string;
    avg_confidence: number;
    avg_sources: number;
    verified_pct: number;
    conflict_pct: number;
  }[];

  /** Products with conflicts */
  conflict_products: {
    product_id: string;
    product_name: string;
    brand: string;
    conflict_count: number;
    highest_severity: string;
    fields_affected: string[];
  }[];
}

export function buildVerificationDashboardMetrics(
  profiles: VerifiedProductProfile[],
): VerificationDashboardMetrics {
  const summary = buildVerificationSummary(profiles);

  // Confidence distribution
  let high = 0, medium = 0, low = 0;
  for (const p of profiles) {
    if (p.overall_confidence >= 0.9) high++;
    else if (p.overall_confidence >= 0.75) medium++;
    else low++;
  }

  // Per-brand coverage
  const brandMap = new Map<string, VerifiedProductProfile[]>();
  for (const p of profiles) {
    const list = brandMap.get(p.brand) || [];
    list.push(p);
    brandMap.set(p.brand, list);
  }

  const brandCoverage = Array.from(brandMap.entries()).map(([brand, prods]) => ({
    brand,
    verified: prods.filter(p => p.verification_status === 'verified').length,
    total: prods.length,
    avg_confidence: Math.round(
      prods.reduce((s, p) => s + p.overall_confidence, 0) / prods.length * 1000,
    ) / 1000,
    gold: prods.filter(p => p.tier === 'GOLD').length,
    silver: prods.filter(p => p.tier === 'SILVER').length,
    bronze: prods.filter(p => p.tier === 'BRONZE').length,
  })).sort((a, b) => b.avg_confidence - a.avg_confidence);

  // Source utilization
  const sourceMap = new Map<string, { source_type: string; products: Set<string>; fields: Set<string> }>();
  for (const p of profiles) {
    for (const fn of ['protein', 'fat', 'fiber', 'moisture', 'calories'] as const) {
      for (const sv of p.fields[fn].source_values) {
        if (sv.source_name === 'seed_data') continue;
        let entry = sourceMap.get(sv.source_name);
        if (!entry) {
          entry = { source_type: sv.source_type, products: new Set(), fields: new Set() };
          sourceMap.set(sv.source_name, entry);
        }
        entry.products.add(p.product_id);
        entry.fields.add(fn);
      }
    }
  }

  const sourceUtilization = Array.from(sourceMap.entries()).map(([name, util]) => ({
    source_name: name,
    source_type: util.source_type,
    products_covered: util.products.size,
    fields_covered: Array.from(util.fields),
  }));

  // Field reliability
  const fieldReliability = ['protein', 'fat', 'fiber', 'moisture', 'calories', 'ingredients'].map(field => {
    let totalConf = 0, totalSrc = 0, verified = 0, conflict = 0;
    for (const p of profiles) {
      if (field === 'ingredients') {
        const ing = p.fields.ingredients;
        totalConf += ing.overlap_percentage / 100;
        if (ing.status === 'verified') verified++;
        if (ing.status === 'conflict') conflict++;
        totalSrc += ing.agreeing_sources + ing.conflicting_sources;
      } else {
        const f = (p.fields as any)[field];
        totalConf += f.confidence;
        totalSrc += f.sources;
        if (f.status === 'verified') verified++;
        if (f.status === 'conflict') conflict++;
      }
    }
    return {
      field,
      avg_confidence: Math.round(totalConf / profiles.length * 1000) / 1000,
      avg_sources: Math.round(totalSrc / profiles.length * 10) / 10,
      verified_pct: Math.round(verified / profiles.length * 1000) / 10,
      conflict_pct: Math.round(conflict / profiles.length * 1000) / 10,
    };
  });

  // Conflict products
  const conflictProducts = profiles
    .filter(p => p.conflicts.length > 0)
    .map(p => ({
      product_id: p.product_id,
      product_name: p.product_name,
      brand: p.brand,
      conflict_count: p.conflicts.length,
      highest_severity: p.conflicts.reduce(
        (max, c) => {
          const rank: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
          return rank[c.severity] > rank[max] ? c.severity : max;
        },
        'LOW',
      ),
      fields_affected: p.conflicts.map(c => c.field),
    }));

  return {
    summary,
    confidence_distribution: { high, medium, low },
    brand_coverage: brandCoverage,
    source_utilization: sourceUtilization,
    field_reliability: fieldReliability,
    conflict_products: conflictProducts,
  };
}
