-- Sprint 1.5A: Australian Retail Product Discovery

CREATE TABLE IF NOT EXISTS retailer_product_mappings (
    mapping_id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(product_id),
    retailer VARCHAR NOT NULL,
    retailer_product_id VARCHAR NOT NULL,
    product_key TEXT NOT NULL,
    product_name TEXT NOT NULL,
    brand_name VARCHAR NOT NULL,
    species VARCHAR NOT NULL,
    life_stage VARCHAR,
    pack_size VARCHAR NOT NULL,
    pack_size_g INTEGER,
    price_aud NUMERIC,
    source_url TEXT NOT NULL,
    source_type VARCHAR NOT NULL,
    image_url TEXT,
    market_availability VARCHAR NOT NULL,
    metadata JSONB DEFAULT '{}',
    captured_at TIMESTAMP DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_retailer_product_mapping_unique
ON retailer_product_mappings (retailer, retailer_product_id);

CREATE INDEX IF NOT EXISTS idx_retailer_product_mapping_product_key
ON retailer_product_mappings (product_key);

CREATE TABLE IF NOT EXISTS product_images (
    image_id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(product_id),
    image_url TEXT NOT NULL,
    source_url TEXT NOT NULL,
    source_type VARCHAR NOT NULL,
    retailer VARCHAR,
    alt_text TEXT,
    width INTEGER,
    height INTEGER,
    metadata JSONB DEFAULT '{}',
    captured_at TIMESTAMP DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_images_source_image
ON product_images (source_url, image_url);

CREATE INDEX IF NOT EXISTS idx_product_images_product
ON product_images (product_id);
