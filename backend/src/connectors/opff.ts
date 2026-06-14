// ── Open Pet Food Facts Connector (Epic B4) ─────────────────────

import { BaseConnector } from './base';
import { RawProduct } from './interface';

const OPFF_API_BASE = 'https://world.openpetfoodfacts.org/api/v2';

export class OPFFConnector extends BaseConnector {
  name = 'OPFF';
  sourceType = 'open_pet_food_facts';

  async fetchProducts(): Promise<RawProduct[]> {
    return this.withRetry(async () => {
      const url = `${OPFF_API_BASE}/search?categories_tags_en=cat-food&countries_tags_en=australia&page_size=50&json=1`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`OPFF API returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const products = data.products || [];

      return products.map((p: any) => this.mapOPFFProduct(p));
    }, 'fetchProducts');
  }

  async fetchProductDetail(externalId: string): Promise<RawProduct> {
    return this.withRetry(async () => {
      const url = `${OPFF_API_BASE}/product/${externalId}.json`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`OPFF product detail API returned ${response.status}`);
      }

      const data = await response.json();
      if (data.status !== 1 || !data.product) {
        throw new Error(`Product ${externalId} not found in OPFF`);
      }

      return this.mapOPFFProduct(data.product);
    }, `fetchProductDetail(${externalId})`);
  }

  // ── Map OPFF fields to our schema ───────────────────────────────
  private mapOPFFProduct(p: any): RawProduct {
    const nutriments = p.nutriments || {};
    const ingredients = (p.ingredients || []).map((i: any) => i.text || i.id || '').filter(Boolean);

    return {
      external_id: p.code || p._id || '',
      name: p.product_name || p.generic_name || 'Unknown Product',
      brand_name: p.brands || p.brands_tags?.[0] || 'Unknown Brand',
      species: this.mapSpecies(p),
      life_stage: this.mapLifeStage(p),
      product_type: p.categories_tags?.[0]?.replace('en:', '') || undefined,
      package_size_g: p.product_quantity_g ? Math.round(p.product_quantity_g) : undefined,
      status: 'ACTIVE',

      // Nutrition: OPFF uses per 100g values
      protein_pct: nutriments.proteins_100g,
      fat_pct: nutriments.fat_100g,
      crude_fiber_pct: nutriments.fiber_100g,
      moisture_pct: nutriments.moisture_100g ?? nutriments.water_100g,
      ash_pct: nutriments.ash_100g,
      me_kcal_per_kg: nutriments['energy-kcal_100g']
        ? nutriments['energy-kcal_100g'] * 10
        : undefined,
      omega_3_pct: nutriments['omega-3-fat_100g'],
      omega_6_pct: nutriments['omega-6-fat_100g'],
      calcium_pct: nutriments.calcium_100g,
      phosphorus_pct: nutriments.phosphorus_100g,

      // Ingredients: join with semicolons
      ingredients: ingredients.join('; '),

      // Price not available from OPFF
      unit_price_aud: undefined,
      price_date: undefined,
      store_name: undefined,
    };
  }

  private mapSpecies(p: any): string | undefined {
    const tags = p.categories_tags || [];
    for (const tag of tags) {
      const lower = tag.toLowerCase();
      if (lower.includes('cat')) return 'CAT';
      if (lower.includes('dog')) return 'DOG';
    }
    // Default: since we searched for cat-food
    return 'CAT';
  }

  private mapLifeStage(p: any): string | undefined {
    const tags = p.categories_tags || [];
    for (const tag of tags) {
      const lower = tag.toLowerCase();
      if (lower.includes('kitten')) return 'KITTEN';
      if (lower.includes('adult')) return 'ADULT';
      if (lower.includes('senior')) return 'SENIOR';
      if (lower.includes('puppy')) return 'PUPPY';
    }
    return 'ADULT'; // default
  }
}
