/**
 * Ingredient Normalization Engine — 4-Stage Pipeline
 *
 * Stage 1: PREPROCESS  — Clean raw text (R1-R10)
 * Stage 2: NORMALIZE   — Exact match → Fuzzy (Levenshtein) → Unmatched
 * Stage 3: CLASSIFY    — Map to category + is_controversial
 * Stage 4: HEALTH MAP  — Map to health needs (deferred to health-mapper.ts)
 *
 * Based on: Ingredient Normalization Strategy V1
 */

import {
  INGREDIENT_DICTIONARY,
  IngredientDictEntry,
  buildAliasIndex,
} from './ingredient-dictionary';

// ============================================================
// Types
// ============================================================

export type MatchMethod = 'exact_match' | 'fuzzy_match' | 'unmatched';

export interface NormalizedIngredient {
  raw_text: string;
  normalized_term: string;
  ingredient_id: string | null;
  match_method: MatchMethod;
  confidence: number;
  category: string | null;
  is_controversial: boolean;
  health_impact: string | null;
  warnings: string[];
}

export interface NormalizationResult {
  ingredients: NormalizedIngredient[];
  stats: {
    total: number;
    exact_matches: number;
    fuzzy_matches: number;
    unmatched: number;
    normalization_ratio: number;
    controversial_count: number;
  };
}

// ============================================================
// Stage 1: PREPROCESSING (R1-R10)
// ============================================================

/**
 * R1: Trim whitespace + lowercase
 */
function r1_clean(text: string): string {
  return text.trim().toLowerCase();
}

/**
 * R2: Remove parenthetical content (non-percentage)
 * R3: Keep parenthetical percentages like "(min. 4%)"
 */
function r2_r3_handleParentheticals(text: string): string {
  // Keep "(min. X%)" patterns
  return text.replace(/\((?!(?:min\.?\s*)?\d+[%％]\s*\))[^)]*\)/gi, '').trim();
}

/**
 * R4: Split comma-separated compounds
 */
function r4_splitComma(text: string): string[] {
  if (text.includes(',') && !text.match(/,\s*(llc|ltd|inc|pty)/i)) {
    return text.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [text];
}

/**
 * R5: Split "/" separated terms, but only if both sides are distinct words
 */
function r5_splitSlash(text: string): string[] {
  if (text.includes('/') && !text.includes('://') && !text.match(/^\d+\/\d+$/)) {
    return text.split('/').map(s => s.trim()).filter(Boolean);
  }
  return [text];
}

/**
 * R6: Remove brand prefixes
 */
function r6_removeBrandPrefix(text: string): string {
  const brandPatterns = [
    /^hill'?s\s+/i, /^royal\s+canin\s+/i, /^advance\s+/i,
    /^black\s+hawk\s+/i, /^ziwi\s+/i, /^iams\s+/i, /^purina\s+/i,
    /^eukanuba\s+/i, /^science\s+diet\s+/i,
  ];
  for (const pattern of brandPatterns) {
    text = text.replace(pattern, '');
  }
  return text.trim();
}

/**
 * R8: Remove ordinal/positional prefixes
 */
function r8_removeOrdinals(text: string): string {
  return text.replace(/^(?:first|1st|second|2nd|third|3rd)\s+(?:ingredient[:\s]*)/i, '')
    .replace(/^(?:ingredient[:\s]*)/i, '')
    .trim();
}

/**
 * R9: Normalize hyphens to spaces
 */
function r9_normalizeHyphens(text: string): string {
  return text.replace(/[-–—]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * R10: Remove empty strings
 */
function r10_rejectEmpty(tokens: string[]): string[] {
  return tokens.filter(t => t.length > 0 && !/^\s*$/.test(t));
}

/**
 * Full preprocessing pipeline — returns array of cleaned tokens
 */
export function preprocess(raw_text: string): string[] {
  let text = r1_clean(raw_text);
  text = r2_r3_handleParentheticals(text);
  text = r6_removeBrandPrefix(text);
  text = r8_removeOrdinals(text);
  text = r9_normalizeHyphens(text);

  // Split strategies
  let tokens: string[] = [];
  const commaSplit = r4_splitComma(text);
  for (const part of commaSplit) {
    const slashSplit = r5_splitSlash(part);
    tokens.push(...slashSplit);
  }

  tokens = r10_rejectEmpty(tokens);
  return tokens;
}

// ============================================================
// Stage 2: NORMALIZATION
// ============================================================

const aliasIndex = buildAliasIndex();

/**
 * Phase 1: Exact match against alias index
 */
function phase1_exactMatch(token: string): { entry: IngredientDictEntry | null; confidence: number } {
  const entry = aliasIndex.get(token);
  return entry
    ? { entry, confidence: 1.0 }
    : { entry: null, confidence: 0 };
}

/**
 * Levenshtein distance
 */
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/**
 * Word overlap ratio — how many words from input appear in candidate
 */
function wordOverlap(input: string, candidate: string): number {
  const inputWords = new Set(input.split(/\s+/));
  const candidateWords = new Set(candidate.split(/\s+/));
  let overlap = 0;
  for (const w of inputWords) {
    if (candidateWords.has(w)) overlap++;
  }
  return overlap / inputWords.size;
}

/**
 * Phase 2: Fuzzy match — levenshtein < 3 AND word overlap ≥ 0.70
 */
function phase2_fuzzyMatch(token: string): { entry: IngredientDictEntry | null; confidence: number } {
  let bestEntry: IngredientDictEntry | null = null;
  let bestScore = Infinity;

  for (const entry of INGREDIENT_DICTIONARY) {
    for (const alias of entry.aliases) {
      const lowerAlias = alias.toLowerCase().trim();
      const dist = levenshtein(token, lowerAlias);
      const overlap = wordOverlap(token, lowerAlias);

      if (dist < 3 && overlap >= 0.70 && dist < bestScore) {
        bestScore = dist;
        bestEntry = entry;
      }
    }
  }

  if (bestEntry) {
    const confidence = bestScore === 0 ? 1.0 : bestScore === 1 ? 0.90 : 0.85;
    return { entry: bestEntry, confidence };
  }

  return { entry: null, confidence: 0 };
}

/**
 * Full normalization for a single token
 */
export function normalizeToken(token: string): {
  entry: IngredientDictEntry | null;
  match_method: MatchMethod;
  confidence: number;
} {
  // Phase 1: Exact
  const exact = phase1_exactMatch(token);
  if (exact.entry) {
    return { entry: exact.entry, match_method: 'exact_match', confidence: exact.confidence };
  }

  // Phase 2: Fuzzy
  const fuzzy = phase2_fuzzyMatch(token);
  if (fuzzy.entry) {
    return { entry: fuzzy.entry, match_method: 'fuzzy_match', confidence: fuzzy.confidence };
  }

  // Phase 3: Unmatched
  return { entry: null, match_method: 'unmatched', confidence: 0 };
}

// ============================================================
// Stage 3: CLASSIFY
// ============================================================

export function classify(entry: IngredientDictEntry | null): {
  category: string | null;
  is_controversial: boolean;
  health_impact: string | null;
} {
  if (!entry) {
    return { category: null, is_controversial: false, health_impact: null };
  }
  return {
    category: entry.category,
    is_controversial: entry.is_controversial,
    health_impact: entry.health_impact,
  };
}

// ============================================================
// FULL PIPELINE
// ============================================================

/**
 * Run the complete 4-stage pipeline on a single raw ingredient text
 */
export function normalizeIngredient(raw_text: string): NormalizedIngredient {
  const tokens = preprocess(raw_text);
  const warnings: string[] = [];

  // If preprocessing split into multiple tokens, normalize the primary one
  // (first token is presumed to be the main ingredient)
  const primaryToken = tokens[0] || raw_text.toLowerCase().trim();

  if (tokens.length > 1) {
    warnings.push(`Compound ingredient split into ${tokens.length} parts: ${tokens.join(' | ')} — using primary token "${primaryToken}"`);
  }

  const { entry, match_method, confidence } = normalizeToken(primaryToken);
  const { category, is_controversial, health_impact } = classify(entry);

  if (match_method === 'unmatched') {
    warnings.push(`"${primaryToken}" not found in ingredient dictionary — flag for manual review`);
  } else if (match_method === 'fuzzy_match') {
    warnings.push(`"${primaryToken}" matched via fuzzy algorithm to "${entry?.canonical_name}" (confidence: ${confidence})`);
  }

  if (is_controversial) {
    warnings.push(`Controversial ingredient: ${entry?.canonical_name} — ${entry?.evidence || 'review recommended'}`);
  }

  return {
    raw_text,
    normalized_term: entry ? entry.canonical_name : primaryToken,
    ingredient_id: entry ? entry.term_id : null,
    match_method,
    confidence,
    category,
    is_controversial,
    health_impact,
    warnings,
  };
}

/**
 * Batch normalize — runs full pipeline on an array of raw ingredients
 */
export function normalizeIngredients(raw_texts: string[]): NormalizationResult {
  const ingredients = raw_texts.map(normalizeIngredient);

  const exact_matches = ingredients.filter(i => i.match_method === 'exact_match').length;
  const fuzzy_matches = ingredients.filter(i => i.match_method === 'fuzzy_match').length;
  const unmatched = ingredients.filter(i => i.match_method === 'unmatched').length;

  return {
    ingredients,
    stats: {
      total: ingredients.length,
      exact_matches,
      fuzzy_matches,
      unmatched,
      normalization_ratio: (exact_matches + fuzzy_matches) / ingredients.length,
      controversial_count: ingredients.filter(i => i.is_controversial).length,
    },
  };
}
