CREATE TABLE IF NOT EXISTS manual_offer_overrides (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(product_id),
    product_slug VARCHAR,
    retailer_name VARCHAR NOT NULL,
    retailer_slug VARCHAR NOT NULL,
    source_id INTEGER REFERENCES sources(source_id),
    source_url TEXT NOT NULL,
    market VARCHAR NOT NULL DEFAULT 'AU',
    currency VARCHAR NOT NULL,
    base_price NUMERIC,
    sale_price NUMERIC,
    member_price NUMERIC,
    subscription_price NUMERIC,
    coupon_price NUMERIC,
    minimum_spend NUMERIC,
    stock_status VARCHAR NOT NULL DEFAULT 'UNKNOWN',
    pack_size_g INTEGER NOT NULL,
    unit_count INTEGER NOT NULL DEFAULT 1,
    total_pack_size_g INTEGER,
    offer_type VARCHAR NOT NULL DEFAULT 'single_pack',
    price_basis VARCHAR NOT NULL DEFAULT 'total',
    conditional_flags JSONB NOT NULL DEFAULT '[]',
    ordinary_best_price_eligible BOOLEAN NOT NULL DEFAULT FALSE,
    reason TEXT NOT NULL,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_manual_offer_overrides_product_slug
ON manual_offer_overrides (product_slug, market, is_active);

CREATE INDEX IF NOT EXISTS idx_manual_offer_overrides_retailer
ON manual_offer_overrides (retailer_slug, market, is_active);

ALTER TABLE product_images
ADD COLUMN IF NOT EXISTS source_note TEXT,
ADD COLUMN IF NOT EXISTS status VARCHAR NOT NULL DEFAULT 'active',
ADD COLUMN IF NOT EXISTS is_primary BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_product_images_primary
ON product_images (product_id, is_primary);
