// ── Connector Interface (Epic B1) ────────────────────────────────

export interface RawProduct {
  external_id: string;
  name: string;
  brand_name: string;
  species?: string;
  life_stage?: string;
  product_type?: string;
  package_size_g?: number;
  status?: string;
  // Nutrition
  protein_pct?: number;
  fat_pct?: number;
  crude_fiber_pct?: number;
  moisture_pct?: number;
  ash_pct?: number;
  me_kcal_per_kg?: number;
  omega_3_pct?: number;
  omega_6_pct?: number;
  calcium_pct?: number;
  phosphorus_pct?: number;
  // Ingredients
  ingredients?: string; // semicolon-separated
  // Price
  unit_price_aud?: number;
  price_date?: string;
  store_name?: string;
}

export interface RawProductDetail extends RawProduct {
  description?: string;
  feeding_guide?: string;
  guarantees?: string;
  images?: string[];
}

export interface Connector {
  name: string;
  sourceType: string;
  fetchProducts(): Promise<RawProduct[]>;
  fetchProductDetail(externalId: string): Promise<RawProductDetail>;
}
