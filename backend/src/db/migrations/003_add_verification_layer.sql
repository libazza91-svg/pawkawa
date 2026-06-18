-- ============================================================
-- Migration 003 — Sprint 1.3C-P2: Product Verification Layer
-- PostgreSQL / integer-baseline compatible.
-- ============================================================

CREATE TABLE IF NOT EXISTS product_verifications (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
  verified_at TIMESTAMP NOT NULL DEFAULT now(),

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

  ingredient_overlap_pct REAL,
  ingredient_agreeing_sources INTEGER DEFAULT 0,
  ingredient_conflicting_sources INTEGER DEFAULT 0,
  ingredient_status TEXT CHECK(ingredient_status IN ('verified','partial','conflict','unverified')),

  overall_confidence REAL NOT NULL DEFAULT 0,
  total_sources INTEGER NOT NULL DEFAULT 0,
  verification_status TEXT NOT NULL CHECK(verification_status IN ('verified','partial','conflict','unverified')),
  tier TEXT NOT NULL CHECK(tier IN ('GOLD','SILVER','BRONZE','UNVERIFIED')) DEFAULT 'UNVERIFIED',

  profile_json TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE(product_id, verified_at)
);

CREATE INDEX IF NOT EXISTS idx_pv_product ON product_verifications(product_id);
CREATE INDEX IF NOT EXISTS idx_pv_tier ON product_verifications(tier);
CREATE INDEX IF NOT EXISTS idx_pv_status ON product_verifications(verification_status);

ALTER TABLE products
ADD COLUMN IF NOT EXISTS verification_tier TEXT CHECK(verification_tier IN ('GOLD','SILVER','BRONZE','UNVERIFIED')) DEFAULT 'UNVERIFIED';

ALTER TABLE products
ADD COLUMN IF NOT EXISTS verification_count INTEGER DEFAULT 0;

-- Confidence Score V3 remains application-owned and is documented here:
-- confidence = source_weight x 0.20 + field_completeness x 0.20 + validation_penalty x 0.15
--            + cross_validation x 0.10 + normalization_bonus x 0.10 + freshness x 0.05
--            + verification_multiplier
