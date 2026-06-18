import { slugifyProductName } from '../lib/product-slug';
import { CanonicalMatchResult, CanonicalProduct } from './types';

const FORMULA_TOKENS = [
  'indoor',
  'sterilised',
  'sterilized',
  'kitten',
  'senior',
  'hairball',
  'urinary',
  'sensitive',
  'fit',
  'original',
  'light',
  'weight',
  'stomach',
  'skin',
];
const FLAVOUR_TOKENS = ['chicken', 'salmon', 'lamb', 'mackerel', 'tuna', 'beef', 'turkey', 'fish'];
const NOISE_TOKENS = ['cat', 'food', 'dry', 'wet', 'feline', 'adult', 'for', 'the', 'with', 'and'];
const PHRASE_MAPPINGS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /\bin\s*\/\s*out\s+fit\b/g, replacement: 'fit' },
  { pattern: /\bin\s+and\s+out\s+fit\b/g, replacement: 'fit' },
  { pattern: /\bin\s+out\s+fit\b/g, replacement: 'fit' },
];

function applyPhraseMappings(value: string): string {
  return PHRASE_MAPPINGS.reduce((current, mapping) => current.replace(mapping.pattern, mapping.replacement), value);
}

export function normalizeText(value: string): string {
  return applyPhraseMappings(value.toLowerCase().replace(/&/g, ' and '))
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function uniqueTokens(tokens: string[]): string[] {
  return [...new Set(tokens)];
}

function brandTokens(value: string): string[] {
  return normalizeText(value)
    .split(' ')
    .filter((token) => token.length > 1);
}

export function extractTokens(value: string, options?: { stripBrand?: string }): string[] {
  const ignoredBrandTokens = options?.stripBrand ? new Set(brandTokens(options.stripBrand)) : null;
  return uniqueTokens(
    normalizeText(value)
    .split(' ')
      .filter((token) => {
        if (token.length <= 1) return false;
        if (NOISE_TOKENS.includes(token)) return false;
        if (ignoredBrandTokens?.has(token)) return false;
        return true;
      }),
  );
}

export function extractFormulaTokens(value: string, options?: { stripBrand?: string }): string[] {
  const tokens = extractTokens(value, options);
  return FORMULA_TOKENS.filter((token) => tokens.includes(token));
}

export function extractFlavourTokens(value: string, options?: { stripBrand?: string }): string[] {
  const tokens = extractTokens(value, options);
  return FLAVOUR_TOKENS.filter((token) => tokens.includes(token));
}

function tokenOverlap(left: string[], right: string[]): number {
  if (left.length === 0 && right.length === 0) return 1;
  const shared = left.filter((token) => right.includes(token)).length;
  return shared / Math.max(left.length, right.length, 1);
}

function equivalentFormulaTokens(left: string[], right: string[]): boolean {
  const normalize = (tokens: string[]) => tokens.map((token) => (token === 'sterilized' ? 'sterilised' : token)).sort().join('|');
  return normalize(left) === normalize(right);
}

function flavourEvidenceScore(left: string[], right: string[]): number {
  if (left.length === 0 && right.length === 0) return 1;
  if (left.length === 0 || right.length === 0) return 0.5;
  return tokenOverlap(left, right);
}

export function buildCanonicalProduct(input: {
  brand_name: string;
  product_name: string;
  pack_size_g: number;
  primary_image_url?: string;
}): CanonicalProduct {
  const formulaTokens = extractFormulaTokens(input.product_name);
  const flavourTokens = extractFlavourTokens(input.product_name);
  const productNameWithoutPack = input.product_name.replace(/\b\d+(?:\.\d+)?\s*(kg|g)\b/gi, '').trim();
  const slug = slugifyProductName(`${input.brand_name} ${productNameWithoutPack} ${input.pack_size_g}g`);

  return {
    product_id: slug,
    slug,
    product_name: productNameWithoutPack,
    brand_name: input.brand_name,
    species: 'CAT',
    pack_size_g: input.pack_size_g,
    primary_image_url: input.primary_image_url,
    formula_tokens: formulaTokens,
    flavour_tokens: flavourTokens,
  };
}

export function matchCanonicalProduct(
  listing: { brand_name: string; product_name: string; pack_size_g: number; primary_image_url?: string },
  candidates: CanonicalProduct[],
): CanonicalMatchResult {
  const normalizedBrand = normalizeText(listing.brand_name);
  const listingTokens = extractTokens(listing.product_name, { stripBrand: listing.brand_name });
  const listingFormula = extractFormulaTokens(listing.product_name, { stripBrand: listing.brand_name });
  const listingFlavour = extractFlavourTokens(listing.product_name, { stripBrand: listing.brand_name });
  const reasons: string[] = [];
  const warnings: string[] = [];

  let best: { product: CanonicalProduct; score: number; reasons: string[]; warnings: string[] } | null = null;

  for (const candidate of candidates) {
    if (normalizeText(candidate.brand_name) !== normalizedBrand) continue;
    if (candidate.pack_size_g !== listing.pack_size_g) continue;

    const candidateTokens = extractTokens(candidate.product_name, { stripBrand: candidate.brand_name });
    const nameScore = tokenOverlap(listingTokens, candidateTokens);
    const formulaMatches = equivalentFormulaTokens(listingFormula, candidate.formula_tokens);
    const flavourScore = flavourEvidenceScore(listingFlavour, candidate.flavour_tokens);
    let score = 0.45 + nameScore * 0.3 + flavourScore * 0.15 + (formulaMatches ? 0.1 : 0);
    const candidateReasons = ['Brand matched', 'Pack size matched'];
    const candidateWarnings: string[] = [];

    if (nameScore >= 0.5) candidateReasons.push('Product name tokens overlap');
    if (formulaMatches) candidateReasons.push('Formula tokens matched');
    if (flavourScore >= 0.5) candidateReasons.push('Flavour tokens overlap');
    if (!formulaMatches) {
      score -= 0.25;
      candidateWarnings.push('Formula tokens differ or are incomplete');
    }
    if (listingFlavour.length > 0 && candidate.flavour_tokens.length > 0 && flavourScore < 1) {
      score -= 0.2;
      candidateWarnings.push('Flavour tokens differ');
    }

    const boundedScore = Math.max(0, Math.min(1, Math.round(score * 100) / 100));
    if (!best || boundedScore > best.score) {
      best = { product: candidate, score: boundedScore, reasons: candidateReasons, warnings: candidateWarnings };
    }
  }

  if (best && best.score >= 0.72) {
    return {
      canonical_product: best.product,
      match_confidence: best.score,
      match_reasons: best.reasons,
      match_warnings: best.warnings,
    };
  }

  const canonical = buildCanonicalProduct(listing);
  reasons.push('Created new canonical product because no safe existing match was found');
  if (candidates.some((candidate) => normalizeText(candidate.brand_name) === normalizedBrand && candidate.pack_size_g !== listing.pack_size_g)) {
    warnings.push('Pack size differed from nearest brand candidate');
  }
  if (best) warnings.push('Closest match was below confidence threshold');

  return {
    canonical_product: canonical,
    match_confidence: best ? best.score : 0.6,
    match_reasons: reasons,
    match_warnings: warnings,
  };
}
