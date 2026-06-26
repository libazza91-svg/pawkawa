ALTER TABLE sources
ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'active',
ADD COLUMN IF NOT EXISTS needs_review BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS expected_pack_size_g INTEGER,
ADD COLUMN IF NOT EXISTS expected_offer_type VARCHAR,
ADD COLUMN IF NOT EXISTS expected_unit_count INTEGER,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

CREATE TABLE IF NOT EXISTS admin_dictionary_terms (
    id SERIAL PRIMARY KEY,
    category VARCHAR NOT NULL,
    raw_term TEXT NOT NULL,
    normalized_value TEXT,
    pattern TEXT,
    retailer_slug VARCHAR,
    notes TEXT,
    status VARCHAR NOT NULL DEFAULT 'active',
    needs_review BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_dictionary_terms_unique
ON admin_dictionary_terms (category, raw_term, retailer_slug);

CREATE INDEX IF NOT EXISTS idx_admin_dictionary_terms_category_status
ON admin_dictionary_terms (category, status, updated_at);
