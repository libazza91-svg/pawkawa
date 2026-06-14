/**
 * Price Normalizer — Phase 3
 *
 * Converts raw retailer prices into standardized price fields:
 *   - price_aud (nominal AUD price)
 *   - pack_size_g (grams, parsed from pack_size string)
 *   - unit_price_per_kg (price_aud / pack_size_g * 1000)
 *
 * Handles edge cases:
 *   - Multi-pack: "12x85g" → 1020g
 *   - Mixed units: "1.2kg" → 1200g
 *   - Zero/negative prices → rejected
 */

import { PriceResult } from './base-price-connector';

export interface NormalizedPrice {
  /** Original retailer price */
  price_aud: number;
  /** Pack size in grams */
  pack_size_g: number;
  /** Unit price AUD per kg */
  unit_price_per_kg: number;
  /** Normalization status */
  status: NormalizationStatus;
  /** Warnings raised during normalization */
  warnings: string[];
}

export type NormalizationStatus = 'ok' | 'warning' | 'rejected';

export interface NormalizationConfig {
  /** Minimum acceptable price (to catch scraping errors) */
  minPriceAud: number;
  /** Maximum acceptable unit price per kg */
  maxUnitPricePerKg: number;
  /** Audit trail enabled */
  auditTrail: boolean;
}

const DEFAULT_CONFIG: NormalizationConfig = {
  minPriceAud: 5.00,
  maxUnitPricePerKg: 200.00, // Ziwi Peak ~$63/kg is the ceiling
  auditTrail: true,
};

export class PriceNormalizer {
  private config: NormalizationConfig;

  constructor(config?: Partial<NormalizationConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Normalize a single PriceResult from a connector.
   * Returns null if price is invalid/unnormalizable.
   */
  normalize(price: PriceResult): NormalizedPrice | null {
    const warnings: string[] = [];

    // --- Gate 1: Price validity ---
    if (isNaN(price.price_aud) || price.price_aud <= 0) {
      return null; // invalid price, reject silently
    }
    if (price.price_aud < this.config.minPriceAud) {
      warnings.push(`price_aud ${price.price_aud} below minimum ${this.config.minPriceAud}`);
    }

    // --- Gate 2: Pack size parsing ---
    let packSizeG = price.pack_size_g;
    if (packSizeG <= 0) {
      // Attempt parse from pack_size string
      packSizeG = this.parsePackSize(price.pack_size);
      if (packSizeG <= 0) {
        warnings.push(`could not parse pack_size: "${price.pack_size}"`);
      }
    }

    // --- Gate 3: Unit price calculation ---
    let unitPricePerKg = price.unit_price_per_kg;
    if (unitPricePerKg <= 0 && packSizeG > 0) {
      unitPricePerKg = Math.round((price.price_aud / packSizeG * 1000) * 100) / 100;
    }
    if (unitPricePerKg > this.config.maxUnitPricePerKg) {
      warnings.push(
        `unit_price_per_kg ${unitPricePerKg} exceeds max ${this.config.maxUnitPricePerKg}`
      );
    }
    if (unitPricePerKg <= 0) {
      warnings.push('could not compute unit_price_per_kg');
    }

    // --- Gate 4: Determine status ---
    const status: NormalizationStatus =
      price.price_aud < this.config.minPriceAud ||
      unitPricePerKg > this.config.maxUnitPricePerKg
        ? 'rejected'
        : warnings.length > 0
        ? 'warning'
        : 'ok';

    if (status === 'rejected') {
      return null;
    }

    return {
      price_aud: price.price_aud,
      pack_size_g: packSizeG,
      unit_price_per_kg: unitPricePerKg,
      status,
      warnings,
    };
  }

  /**
   * Batch normalize a list of PriceResults.
   * Returns { ok: [...], rejected: [...] }
   */
  normalizeBatch(prices: PriceResult[]): {
    ok: NormalizedPrice[];
    rejected: { price: PriceResult; reason: string }[];
  } {
    const ok: NormalizedPrice[] = [];
    const rejected: { price: PriceResult; reason: string }[] = [];

    for (const p of prices) {
      const result = this.normalize(p);
      if (result) {
        ok.push(result);
      } else {
        rejected.push({
          price: p,
          reason: 'normalization rejected: invalid price or pack size',
        });
      }
    }

    return { ok, rejected };
  }

  /** Parse pack size string to grams. Handles "2.5kg", "12x85g", "340g" */
  parsePackSize(packSize: string): number {
    const cleaned = packSize.toLowerCase().trim();

    // "12x85g" / "12 x 85g"
    const multiMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*g/);
    if (multiMatch) {
      return Math.round(parseFloat(multiMatch[1]) * parseFloat(multiMatch[2]));
    }

    // "2.5kg"
    const kgMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*kg/);
    if (kgMatch) {
      return Math.round(parseFloat(kgMatch[1]) * 1000);
    }

    // "340g"
    const gMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*g/);
    if (gMatch) {
      return Math.round(parseFloat(gMatch[1]));
    }

    return 0;
  }
}
