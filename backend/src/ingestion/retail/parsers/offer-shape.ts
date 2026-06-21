import { RetailConditionalFlag, RetailOfferType, RetailPriceBasis } from '../types';

export interface ParsedOfferShape {
  pack_size_g: number | null;
  single_pack_size_g?: number;
  unit_count?: number;
  total_pack_size_g?: number;
  offer_type: RetailOfferType;
}

function roundPositive(value: number): number | null {
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value);
}

export function normalizePackSizeToG(value: string | number | undefined): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return Math.round(value * 1000);
  if (!value) return null;
  const text = String(value).toLowerCase().replace(/\s+/g, '');
  const kg = text.match(/(\d+(?:\.\d+)?)kg/);
  if (kg) return Math.round(Number(kg[1]) * 1000);
  const grams = text.match(/(\d+(?:\.\d+)?)g/);
  if (grams) return Math.round(Number(grams[1]));
  return null;
}

function extractPackComponentToG(value: string): number | null {
  return normalizePackSizeToG(value);
}

export function parseOfferShape(value: string | number | undefined): ParsedOfferShape {
  if (typeof value === 'number') {
    const packSizeG = normalizePackSizeToG(value);
    return {
      pack_size_g: packSizeG,
      single_pack_size_g: packSizeG ?? undefined,
      unit_count: packSizeG ? 1 : undefined,
      total_pack_size_g: packSizeG ?? undefined,
      offer_type: packSizeG ? 'single_pack' : 'unknown',
    };
  }

  const raw = String(value ?? '').trim();
  if (!raw) {
    return {
      pack_size_g: null,
      offer_type: 'unknown',
    };
  }

  const text = raw.toLowerCase();
  const compact = text.replace(/\s+/g, '');

  const packThenCount = compact.match(/(\d+(?:\.\d+)?(?:kg|g))x(\d+)/i);
  if (packThenCount) {
    const singlePackSizeG = extractPackComponentToG(packThenCount[1]);
    const unitCount = roundPositive(Number(packThenCount[2]));
    const totalPackSizeG =
      singlePackSizeG !== null && unitCount !== null ? roundPositive(singlePackSizeG * unitCount) : null;

    return {
      pack_size_g: totalPackSizeG,
      single_pack_size_g: singlePackSizeG ?? undefined,
      unit_count: unitCount ?? undefined,
      total_pack_size_g: totalPackSizeG ?? undefined,
      offer_type: singlePackSizeG && unitCount && unitCount > 1 ? 'multi_pack' : 'unknown',
    };
  }

  const countThenPack = compact.match(/(\d+)x(\d+(?:\.\d+)?(?:kg|g))/i);
  if (countThenPack) {
    const unitCount = roundPositive(Number(countThenPack[1]));
    const singlePackSizeG = extractPackComponentToG(countThenPack[2]);
    const totalPackSizeG =
      singlePackSizeG !== null && unitCount !== null ? roundPositive(singlePackSizeG * unitCount) : null;

    return {
      pack_size_g: totalPackSizeG,
      single_pack_size_g: singlePackSizeG ?? undefined,
      unit_count: unitCount ?? undefined,
      total_pack_size_g: totalPackSizeG ?? undefined,
      offer_type: singlePackSizeG && unitCount && unitCount > 1 ? 'multi_pack' : 'unknown',
    };
  }

  const packSizeG = normalizePackSizeToG(raw);
  return {
    pack_size_g: packSizeG,
    single_pack_size_g: packSizeG ?? undefined,
    unit_count: packSizeG ? 1 : undefined,
    total_pack_size_g: packSizeG ?? undefined,
    offer_type: packSizeG ? 'single_pack' : 'unknown',
  };
}

export function detectBundleUrl(productUrl: string): boolean {
  return /\/bundle[-/]/i.test(productUrl) || /\/p\/bundle-/i.test(productUrl);
}

export function detectOfferType(input: {
  productUrl?: string;
  title?: string;
  variantName?: string;
  sizeText?: string;
}): RetailOfferType {
  if (detectBundleUrl(input.productUrl ?? '')) return 'bundle';
  const joined = [input.title, input.variantName, input.sizeText].filter(Boolean).join(' ').toLowerCase();
  if (/\bbundle\b/.test(joined)) return 'bundle';
  const shape = parseOfferShape(joined);
  if (shape.offer_type === 'multi_pack') return 'multi_pack';
  if (shape.offer_type === 'single_pack') return 'single_pack';
  return 'unknown';
}

export function detectPriceBasis(text: string | undefined): RetailPriceBasis {
  const value = String(text ?? '').toLowerCase();
  if (!value) return 'unknown';
  if (/\bper\s+bag\b/.test(value)) return 'per_bag';
  if (/\bper\s+unit\b/.test(value)) return 'per_unit';
  return 'total';
}

export function extractConditionalFlags(values: Array<string | undefined>): RetailConditionalFlag[] {
  const joined = values.filter(Boolean).join(' ').toLowerCase();
  const flags = new Set<RetailConditionalFlag>();
  if (!joined) return [];
  if (joined.includes('member')) flags.add('member_price');
  if (joined.includes('repeat delivery') || joined.includes('subscription')) flags.add('repeat_delivery');
  if (joined.includes('coupon')) flags.add('coupon');
  if (joined.includes('minimum spend')) flags.add('minimum_spend');
  return [...flags];
}
