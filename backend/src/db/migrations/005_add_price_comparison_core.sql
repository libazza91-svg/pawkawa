-- Sprint 1.8: Price Comparison Core
-- Additive only. Existing product_prices remains for legacy compatibility.

CREATE TABLE IF NOT EXISTS retail_offers (
    retail_offer_id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(product_id),
    product_slug VARCHAR NOT NULL,
    retailer_name VARCHAR NOT NULL,
    retailer_slug VARCHAR NOT NULL,
    market VARCHAR NOT NULL,
    currency VARCHAR NOT NULL,
    product_url TEXT NOT NULL,
    pack_size_g INTEGER NOT NULL,
    base_price NUMERIC NOT NULL,
    sale_price NUMERIC,
    member_price NUMERIC,
    coupon_price NUMERIC,
    conditional_best_price NUMERIC,
    conditional_price_reason TEXT,
    effective_price NUMERIC NOT NULL,
    unit_price_per_kg NUMERIC NOT NULL,
    stock_status VARCHAR NOT NULL,
    promotion_text TEXT,
    promotion_type VARCHAR,
    coupon_code VARCHAR,
    minimum_spend NUMERIC,
    shipping_threshold NUMERIC,
    last_checked_at TIMESTAMP NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_retail_offers_product_market
ON retail_offers (product_slug, market);

CREATE INDEX IF NOT EXISTS idx_retail_offers_retailer_market
ON retail_offers (retailer_slug, market);

CREATE INDEX IF NOT EXISTS idx_retail_offers_effective_price
ON retail_offers (market, currency, effective_price);

CREATE UNIQUE INDEX IF NOT EXISTS idx_retail_offers_unique_current_offer
ON retail_offers (product_slug, retailer_slug, market, currency, pack_size_g);

CREATE TABLE IF NOT EXISTS price_snapshots (
    snapshot_id SERIAL PRIMARY KEY,
    retail_offer_id INTEGER REFERENCES retail_offers(retail_offer_id),
    product_slug VARCHAR NOT NULL,
    retailer_slug VARCHAR NOT NULL,
    market VARCHAR NOT NULL,
    currency VARCHAR NOT NULL,
    base_price NUMERIC NOT NULL,
    sale_price NUMERIC,
    member_price NUMERIC,
    coupon_price NUMERIC,
    conditional_best_price NUMERIC,
    conditional_price_reason TEXT,
    effective_price NUMERIC NOT NULL,
    unit_price_per_kg NUMERIC NOT NULL,
    stock_status VARCHAR NOT NULL,
    promotion_text TEXT,
    promotion_type VARCHAR,
    source_url TEXT NOT NULL,
    captured_at TIMESTAMP DEFAULT now(),
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_price_snapshots_offer_time
ON price_snapshots (retail_offer_id, captured_at);

CREATE INDEX IF NOT EXISTS idx_price_snapshots_product_market
ON price_snapshots (product_slug, market, captured_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_price_snapshots_unique_offer_time
ON price_snapshots (retail_offer_id, captured_at);
