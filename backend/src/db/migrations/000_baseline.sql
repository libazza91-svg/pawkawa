-- Sprint 2.0C: Official integer database baseline
-- Source of truth: backend/src/db/schema/*
-- This replaces the deprecated legacy UUID schema file as the active baseline.

CREATE TABLE IF NOT EXISTS brands (
    brand_id SERIAL PRIMARY KEY,
    name VARCHAR NOT NULL UNIQUE,
    country VARCHAR,
    official_url TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
    product_id SERIAL PRIMARY KEY,
    brand_id INTEGER REFERENCES brands(brand_id),
    name VARCHAR NOT NULL,
    species VARCHAR,
    life_stage VARCHAR,
    product_type VARCHAR,
    format VARCHAR,
    package_size_g INTEGER,
    origin VARCHAR,
    status VARCHAR DEFAULT 'active',
    source_count INTEGER DEFAULT 0,
    confidence_score REAL DEFAULT 0.0,
    verification_status TEXT DEFAULT 'UNVERIFIED',
    imported_batch_id TEXT,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_nutrition (
    product_id INTEGER PRIMARY KEY REFERENCES products(product_id),
    protein_pct NUMERIC,
    fat_pct NUMERIC,
    fiber_pct NUMERIC,
    crude_fiber_pct NUMERIC,
    moisture_pct NUMERIC,
    ash_pct NUMERIC,
    phosphorus_pct NUMERIC,
    calcium_pct NUMERIC,
    omega_3_pct NUMERIC,
    omega_6_pct NUMERIC,
    calories_kcal NUMERIC,
    me_kcal_per_kg NUMERIC
);

CREATE TABLE IF NOT EXISTS product_ingredients (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(product_id),
    raw_ingredient TEXT,
    normalized_ingredient VARCHAR,
    ingredient_order INTEGER,
    category VARCHAR
);

CREATE TABLE IF NOT EXISTS product_prices (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(product_id),
    retailer VARCHAR,
    price_aud NUMERIC,
    pack_size NUMERIC,
    unit_price_aud_per_kg NUMERIC,
    affiliate_url TEXT,
    captured_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sources (
    source_id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(product_id),
    source_url TEXT,
    source_type VARCHAR,
    captured_at TIMESTAMP DEFAULT now(),
    confidence_score NUMERIC DEFAULT 0
);

CREATE TABLE IF NOT EXISTS health_rules (
    id SERIAL PRIMARY KEY,
    need_code VARCHAR,
    rule_type VARCHAR,
    field_name VARCHAR,
    operator VARCHAR,
    threshold NUMERIC,
    explanation TEXT
);

CREATE TABLE IF NOT EXISTS recommendation_logs (
    request_id SERIAL PRIMARY KEY,
    user_input JSONB,
    product_ids INTEGER[],
    rationale TEXT,
    model VARCHAR,
    created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ingredient_dictionary (
    id SERIAL PRIMARY KEY,
    raw_name VARCHAR,
    normalized_name VARCHAR,
    category VARCHAR
);

CREATE TABLE IF NOT EXISTS crawler_jobs (
    job_id SERIAL PRIMARY KEY,
    source VARCHAR,
    status VARCHAR DEFAULT 'pending',
    started_at TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS import_batches (
    batch_id TEXT PRIMARY KEY,
    source_type TEXT NOT NULL,
    connector_name TEXT,
    rows_total INTEGER DEFAULT 0,
    rows_success INTEGER DEFAULT 0,
    rows_failed INTEGER DEFAULT 0,
    failed_details JSONB DEFAULT '[]',
    started_at TIMESTAMP DEFAULT now(),
    completed_at TIMESTAMP,
    status TEXT DEFAULT 'running'
);
