-- ============================================================
-- DEPRECATED — legacy UUID schema.
--
-- Do not use this file for current migrations.
-- Current source of truth is the Drizzle integer schema under:
--   backend/src/db/schema/*
--
-- Active migrations are ordered SQL files under:
--   backend/src/db/migrations/*.sql
--
-- This file is preserved only as historical reference.
-- ============================================================

-- ============================================================
-- 澳新宠物食品对比平台 - 数据库 Schema v0.1
-- 启动日期: 2026-06-13
-- 数据库: PostgreSQL 16+
-- ============================================================

-- 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- 1. 品牌表
-- ============================================================
CREATE TABLE brands (
    brand_id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(200) NOT NULL,
    country         VARCHAR(100),              -- 品牌所属国家
    official_url    TEXT,
    logo_url        TEXT,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_brands_name ON brands (LOWER(name));

-- ============================================================
-- 2. 产品表
-- ============================================================
CREATE TABLE products (
    product_id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_id        UUID NOT NULL REFERENCES brands(brand_id),
    name            VARCHAR(300) NOT NULL,     -- 产品全名
    species         VARCHAR(10) NOT NULL CHECK (species IN ('cat', 'dog')),
    life_stage      VARCHAR(50) NOT NULL CHECK (life_stage IN ('kitten', 'puppy', 'adult', 'senior', 'all_life_stages')),
    format          VARCHAR(50),               -- dry, wet, raw, freeze_dried, semi_moist
    origin          VARCHAR(100),              -- 制造地 / 原料来源
    status          VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'discontinued', 'recalled', 'draft')),

    -- 数据质量字段
    source_url          TEXT,
    captured_at         TIMESTAMPTZ,
    confidence_score    NUMERIC(3,2) DEFAULT 1.0 CHECK (confidence_score BETWEEN 0 AND 1),
    parser_version      VARCHAR(20),
    manual_review_status VARCHAR(20) DEFAULT 'pending' CHECK (manual_review_status IN ('pending', 'approved', 'flagged', 'rejected')),

    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_brand    ON products (brand_id);
CREATE INDEX idx_products_species  ON products (species);
CREATE INDEX idx_products_stage    ON products (life_stage);
CREATE INDEX idx_products_status   ON products (status);

-- ============================================================
-- 3. 营养成分表
-- ============================================================
CREATE TABLE product_nutrition (
    nutrition_id    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id      UUID NOT NULL UNIQUE REFERENCES products(product_id) ON DELETE CASCADE,

    -- Guaranteed Analysis (百分比)
    protein_pct         NUMERIC(5,2),          -- 粗蛋白最低 %
    fat_pct             NUMERIC(5,2),          -- 粗脂肪最低 %
    fiber_pct           NUMERIC(5,2),          -- 粗纤维最高 %
    moisture_pct        NUMERIC(5,2),          -- 水分最高 %
    ash_pct             NUMERIC(5,2),          -- 灰分最高 %
    phosphorus_pct      NUMERIC(5,2),          -- 磷含量

    -- 能量
    calories_kcal       NUMERIC(7,2),          -- kcal/100g 或 kcal/kg (见 unit 说明)

    -- 可选扩展字段
    calcium_pct         NUMERIC(5,2),
    taurine_pct         NUMERIC(5,2),
    omega3_pct          NUMERIC(5,2),
    omega6_pct          NUMERIC(5,2),
    glucosamine_mg_kg   NUMERIC(7,1),

    unit_info           JSONB DEFAULT '{}',     -- {"calories":"kcal/100g", "note":"as-fed basis"}

    -- 数据质量
    confidence_score    NUMERIC(3,2) DEFAULT 1.0,
    source_url          TEXT,
    captured_at         TIMESTAMPTZ,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 4. 成分表
-- ============================================================
CREATE TABLE product_ingredients (
    ingredient_id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id          UUID NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
    raw_ingredient      TEXT NOT NULL,           -- 原始成分文本
    normalized_ingredient TEXT,                  -- 归一化后名称
    ingredient_order    INT,                     -- 成分列表顺序 (1-based)
    category            VARCHAR(100),            -- protein_source / fat_source / filler / supplement / preservative

    confidence_score    NUMERIC(3,2) DEFAULT 1.0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ingredients_product ON product_ingredients (product_id);
CREATE INDEX idx_ingredients_norm    ON product_ingredients (normalized_ingredient);

-- ============================================================
-- 5. 价格表
-- ============================================================
CREATE TABLE product_prices (
    price_id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id          UUID NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
    retailer            VARCHAR(200) NOT NULL,   -- Petbarn, Pet Circle, Petstock, Amazon AU
    pack_size           VARCHAR(50),             -- "2.5kg", "12x85g"
    price_aud           NUMERIC(7,2),            -- 澳元价格
    unit_price_aud_per_kg NUMERIC(10,2),         -- 单价 (澳元/kg)
    affiliate_url       TEXT,
    captured_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_prices_product  ON product_prices (product_id);
CREATE INDEX idx_prices_retailer ON product_prices (retailer);
CREATE INDEX idx_prices_captured ON product_prices (captured_at);

-- ============================================================
-- 6. 数据源追溯表
-- ============================================================
CREATE TABLE sources (
    source_id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id          UUID NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
    source_url          TEXT NOT NULL,
    source_type         VARCHAR(50) NOT NULL,    -- brand_official / retailer / open_data / manual
    captured_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    raw_html_path       TEXT,                    -- 可选: 原始 HTML 存储路径
    confidence          NUMERIC(3,2) DEFAULT 1.0,

    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sources_product ON sources (product_id);

-- ============================================================
-- 6A. 零售商产品映射表
-- ============================================================
CREATE TABLE retailer_product_mappings (
    mapping_id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id          UUID REFERENCES products(product_id) ON DELETE SET NULL,
    retailer            VARCHAR(200) NOT NULL,
    retailer_product_id VARCHAR(200) NOT NULL,
    product_key         TEXT NOT NULL,
    product_name        TEXT NOT NULL,
    brand_name          VARCHAR(200) NOT NULL,
    species             VARCHAR(20) NOT NULL,
    life_stage          VARCHAR(50),
    pack_size           VARCHAR(80) NOT NULL,
    pack_size_g         INT,
    price_aud           NUMERIC(7,2),
    source_url          TEXT NOT NULL,
    source_type         VARCHAR(50) NOT NULL,
    image_url           TEXT,
    market_availability VARCHAR(20) NOT NULL,
    metadata            JSONB DEFAULT '{}',
    captured_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_retailer_product_mapping_unique
ON retailer_product_mappings (retailer, retailer_product_id);

CREATE INDEX idx_retailer_product_mapping_product_key
ON retailer_product_mappings (product_key);

-- ============================================================
-- 6B. 产品图片元数据表
-- ============================================================
CREATE TABLE product_images (
    image_id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id     UUID REFERENCES products(product_id) ON DELETE SET NULL,
    image_url      TEXT NOT NULL,
    source_url     TEXT NOT NULL,
    source_type    VARCHAR(50) NOT NULL,
    retailer       VARCHAR(200),
    alt_text       TEXT,
    width          INT,
    height         INT,
    metadata       JSONB DEFAULT '{}',
    captured_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_product_images_source_image
ON product_images (source_url, image_url);

CREATE INDEX idx_product_images_product
ON product_images (product_id);

-- ============================================================
-- 7. 健康规则表
-- ============================================================
CREATE TABLE health_rules (
    rule_id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    need_code           VARCHAR(50) NOT NULL,    -- weight_control, kidney_support, allergy_sensitive, senior, kitten_puppy
    rule_type           VARCHAR(20) NOT NULL CHECK (rule_type IN ('include', 'exclude', 'prefer', 'avoid')),
    field_name          VARCHAR(100) NOT NULL,   -- 目标表.字段, 如 product_nutrition.protein_pct
    operator            VARCHAR(10) NOT NULL CHECK (operator IN ('>', '<', '>=', '<=', '=', '!=', 'BETWEEN', 'IN', 'CONTAINS')),
    threshold           TEXT NOT NULL,            -- 阈值 (可 JSON)
    explanation         TEXT NOT NULL,            -- 规则解释文案
    priority            INT DEFAULT 0,

    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 8. 推荐日志表
-- ============================================================
CREATE TABLE recommendation_logs (
    request_id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_inputs         JSONB NOT NULL,           -- {"species":"cat","life_stage":"adult","health_concerns":["weight_control"]}
    product_ids         UUID[] NOT NULL,          -- 推荐的产品 ID 列表
    rationale           TEXT,                     -- AI 生成的推荐理由
    model               VARCHAR(100),             -- 使用的模型名称
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 9. 成分同义词表 (知识图谱 v0.1)
-- ============================================================
CREATE TABLE ingredient_synonyms (
    synonym_id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    raw_term            VARCHAR(200) NOT NULL,    -- "Chicken Meal"
    normalized_term     VARCHAR(200) NOT NULL,    -- "鸡源蛋白粉"
    category            VARCHAR(100),             -- protein_source / fat_source / carbohydrate / supplement
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_synonyms_raw ON ingredient_synonyms (LOWER(raw_term));

-- ============================================================
-- 10. SEO 内容表
-- ============================================================
CREATE TABLE seo_content (
    content_id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug                VARCHAR(300) NOT NULL UNIQUE, -- best-cat-food-australia-2026
    title               VARCHAR(300) NOT NULL,
    content_type        VARCHAR(50) NOT NULL,         -- comparison / guide / brand_page / product_page
    body_markdown       TEXT,
    published_at        TIMESTAMPTZ,
    status              VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),

    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 触发器: 自动更新 updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_brands_updated_at    BEFORE UPDATE ON brands    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_products_updated_at  BEFORE UPDATE ON products  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_seo_content_updated_at BEFORE UPDATE ON seo_content FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 种子数据: 健康规则
-- ============================================================
INSERT INTO health_rules (need_code, rule_type, field_name, operator, threshold, explanation, priority) VALUES
-- 体重控制 (猫)
('weight_control', 'prefer',  'product_nutrition.protein_pct',   '>=', '35',   '优先推荐蛋白质≥35%的产品，帮助维持肌肉量', 10),
('weight_control', 'prefer',  'product_nutrition.fat_pct',       '<=', '12',   '优先推荐脂肪≤12%的低脂产品', 9),
('weight_control', 'prefer',  'product_nutrition.fiber_pct',     '>=', '5',    '优先推荐纤维≥5%的产品，增加饱腹感', 8),

-- 肾脏支持 (猫)
('kidney_support', 'prefer',  'product_nutrition.phosphorus_pct', '<=', '0.8', '优先推荐磷含量≤0.8%的低磷产品', 10),
('kidney_support', 'prefer',  'product_nutrition.protein_pct',   '<=', '30',  '优先推荐蛋白质≤30%的适度蛋白产品，减轻肾脏负担', 9),

-- 过敏敏感 (猫/狗通用)
('allergy_sensitive', 'avoid', 'product_ingredients.normalized_ingredient', 'IN', '["谷物蛋白","玉米","小麦","大豆","人工色素","人工防腐剂"]', '避开常见过敏原和添加剂', 10),
('allergy_sensitive', 'prefer', 'product_ingredients.normalized_ingredient', 'CONTAINS', '["单一蛋白源"]', '优先含单一蛋白源的产品，减少过敏风险', 9),

-- 幼猫/幼犬
('kitten_puppy',    'prefer',  'product_nutrition.protein_pct',   '>=', '35',   '优先推荐高蛋白产品，支持生长发育', 10),
('kitten_puppy',    'prefer',  'product_nutrition.fat_pct',       '>=', '15',   '优先推荐脂肪≥15%的高能量产品', 9),

-- 老年猫/犬
('senior',          'prefer',  'product_nutrition.protein_pct',   '>=', '28',   '优先推荐中等蛋白产品，维持肌肉不增加负担', 10),
('senior',          'prefer',  'product_nutrition.glucosamine_mg_kg', '>=', '500', '优先推荐含葡萄糖胺产品，支持关节健康', 9);
