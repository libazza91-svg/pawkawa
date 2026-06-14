-- ============================================================
-- Migration 003 — Sprint 1.3C-P2: Product Verification Layer
-- ============================================================

-- 1. product_verifications — per-field verification snapshots
CREATE TABLE IF NOT EXISTS product_verifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id TEXT NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
  verified_at TEXT NOT NULL DEFAULT (datetime('now')),

  -- Per-field verification results
  protein_value REAL,
  protein_confidence REAL,
  protein_sources INTEGER DEFAULT 0,
  protein_status TEXT CHECK(protein_status IN ('verified','minor_variance','conflict','unverified')),

  fat_value REAL,
  fat_confidence REAL,
  fat_sources INTEGER DEFAULT 0,
  fat_status TEXT CHECK(fat_status IN ('verified','minor_variance','conflict','unverified')),

  fiber_value REAL,
  fiber_confidence REAL,
  fiber_sources INTEGER DEFAULT 0,
  fiber_status TEXT CHECK(fiber_status IN ('verified','minor_variance','conflict','unverified')),

  moisture_value REAL,
  moisture_confidence REAL,
  moisture_sources INTEGER DEFAULT 0,
  moisture_status TEXT CHECK(moisture_status IN ('verified','minor_variance','conflict','unverified')),

  calories_value REAL,
  calories_confidence REAL,
  calories_sources INTEGER DEFAULT 0,
  calories_status TEXT CHECK(calories_status IN ('verified','minor_variance','conflict','unverified')),

  -- Ingredient verification
  ingredient_overlap_pct REAL,
  ingredient_agreeing_sources INTEGER DEFAULT 0,
  ingredient_conflicting_sources INTEGER DEFAULT 0,
  ingredient_status TEXT CHECK(ingredient_status IN ('verified','partial','conflict','unverified')),

  -- Composite
  overall_confidence REAL NOT NULL DEFAULT 0,
  total_sources INTEGER NOT NULL DEFAULT 0,
  verification_status TEXT NOT NULL CHECK(verification_status IN ('verified','partial','conflict','unverified')),
  tier TEXT NOT NULL CHECK(tier IN ('GOLD','SILVER','BRONZE','UNVERIFIED')) DEFAULT 'UNVERIFIED',

  -- Full profile JSON snapshot (for audit trail)
  profile_json TEXT, -- JSON blob of VerifiedProductProfile

  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(product_id, verified_at)
);

CREATE INDEX IF NOT EXISTS idx_pv_product ON product_verifications(product_id);
CREATE INDEX IF NOT EXISTS idx_pv_tier ON product_verifications(tier);
CREATE INDEX IF NOT EXISTS idx_pv_status ON product_verifications(verification_status);

-- 2. Add verification_tier to products (latest tier)
ALTER TABLE products ADD COLUMN verification_tier TEXT CHECK(verification_tier IN ('GOLD','SILVER','BRONZE','UNVERIFIED')) DEFAULT 'UNVERIFIED';

-- 3. Add verification_count to products (how many times verified)
ALTER TABLE products ADD COLUMN verification_count INTEGER DEFAULT 0;

-- 4. Updated confidence_score formula — now incorporates verification_tier
-- This is a virtual/application-layer formula, documented here:
-- 
-- Confidence Score V3 (incorporating verification):
--   confidence = source_weight×0.20 + field_completeness×0.20 + validation_penalty×0.15
--              + cross_validation×0.10 + normalization_bonus×0.10 + freshness×0.05
--              + verification_multiplier
--
-- Where verification_multiplier is:
--   GOLD:   ×1.20
--   SILVER: ×1.10
--   BRONZE: ×1.05
--   UNVERIFIED: ×1.00
-- 
-- Overall Quality Score remains:
--   quality = nutrition×0.25 + price×0.20 + verified×0.20 + normalization×0.20 + confidence×0.15

-- 5. Seed initial verification data for existing 20 products
-- (Handled by pipeline, this migration just creates the schema)
