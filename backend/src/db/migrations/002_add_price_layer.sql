-- Migration 002: Price Data Acquisition Layer
-- Sprint 1.3C - P1
-- Date: 2026-06-13
--
-- Adds:
-- 1. market_availability enum + column on products
-- 2. source_url + last_checked on product_prices
-- 3. price_verification_status on product_prices
-- 4. verified_unit_price on products (consensus price)

-- ============================================================
-- 1. market_availability type
-- ============================================================
DO $$ BEGIN
    CREATE TYPE market_availability AS ENUM ('ACTIVE', 'LIMITED', 'DISCONTINUED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE products
ADD COLUMN IF NOT EXISTS market_availability market_availability NOT NULL DEFAULT 'LIMITED';

COMMENT ON COLUMN products.market_availability IS
'ACTIVE: 在澳洲主要零售商有售 (PetCircle+Petbarn);
 LIMITED: 仅单一渠道或偶尔有货;
 DISCONTINUED: 停产/退市产品';

-- ============================================================
-- 2. product_prices enhancements
-- ============================================================
ALTER TABLE product_prices
ADD COLUMN IF NOT EXISTS source_url TEXT,
ADD COLUMN IF NOT EXISTS last_checked TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS pack_size_g INT,
ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('verified', 'review_required', 'unverified')),
ADD COLUMN IF NOT EXISTS verified_against_price_id UUID REFERENCES product_prices(price_id);

COMMENT ON COLUMN product_prices.source_url IS '零售商产品页面 URL';
COMMENT ON COLUMN product_prices.last_checked IS '价格最后检查时间';
COMMENT ON COLUMN product_prices.pack_size_g IS '包装规格克数 (如 2500 = 2.5kg)';
COMMENT ON COLUMN product_prices.verification_status IS 'verified: 两源一致; review_required: 价差>5%; unverified: 单源';

-- ============================================================
-- 3. Indexes for price layer
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_prices_verification ON product_prices (verification_status);
CREATE INDEX IF NOT EXISTS idx_prices_last_checked ON product_prices (last_checked);
CREATE INDEX IF NOT EXISTS idx_products_availability ON products (market_availability);

-- ============================================================
-- 4. Update market_availability based on existing data
-- ============================================================
-- Products with prices from multiple retailers → ACTIVE
-- Products with 1 price source → LIMITED
-- Products with no prices → LIMITED (default)
UPDATE products p
SET market_availability = CASE
    WHEN (
        SELECT COUNT(DISTINCT pp.retailer)
        FROM product_prices pp
        WHERE pp.product_id = p.product_id
    ) >= 2
    THEN 'ACTIVE'::market_availability
    ELSE 'LIMITED'::market_availability
END
WHERE EXISTS (
    SELECT 1 FROM product_prices pp WHERE pp.product_id = p.product_id
);
