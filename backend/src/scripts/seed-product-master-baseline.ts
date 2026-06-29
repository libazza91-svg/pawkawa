import { pool } from '../db/client';
import { canonicalProducts } from '../price-comparison/fixture-data';
import { CanonicalProduct } from '../price-comparison/types';

const BASELINE_BATCH_PREFIX = 'product_master_baseline_v1';

interface Queryable {
  query: (text: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[]; rowCount: number | null }>;
}

interface SeedSummary {
  canonical_products_considered: number;
  brands_created: number;
  brands_existing: number;
  products_created: number;
  products_existing: number;
}

function brandCountry(brandName: string): string | null {
  if (brandName === 'Royal Canin') return 'France';
  if (brandName === "Hill's Science Diet") return 'United States';
  if (brandName === 'Black Hawk') return 'Australia';
  if (brandName === 'Ziwi Peak') return 'New Zealand';
  return null;
}

function productFormat(product: CanonicalProduct): string {
  if (product.slug.includes('air-dried')) return 'air_dried';
  return 'dry';
}

function productLifeStage(product: CanonicalProduct): string {
  if (product.slug.includes('kitten')) return 'kitten';
  if (product.slug.includes('senior')) return 'senior';
  return 'adult';
}

async function upsertBrand(client: Queryable, brandName: string): Promise<{ brandId: number; created: boolean }> {
  const existing = await client.query('SELECT brand_id FROM brands WHERE name = $1 LIMIT 1', [brandName]);
  if (existing.rows[0]?.brand_id) {
    return { brandId: Number(existing.rows[0].brand_id), created: false };
  }

  const inserted = await client.query(
    `
      INSERT INTO brands (name, country, notes, updated_at)
      VALUES ($1, $2, $3, now())
      ON CONFLICT (name)
      DO UPDATE SET
        country = COALESCE(brands.country, EXCLUDED.country),
        notes = COALESCE(brands.notes, EXCLUDED.notes),
        updated_at = now()
      RETURNING brand_id
    `,
    [brandName, brandCountry(brandName), 'Created by product master baseline seed for admin image binding.'],
  );

  return { brandId: Number(inserted.rows[0].brand_id), created: true };
}

async function seedProduct(client: Queryable, product: CanonicalProduct, brandId: number): Promise<'created' | 'existing'> {
  const importedBatchId = `${BASELINE_BATCH_PREFIX}:${product.slug}`;
  const existing = await client.query(
    `
      SELECT product_id
      FROM products
      WHERE imported_batch_id = $1
         OR (
          brand_id = $2
          AND name = $3
          AND species = $4
          AND package_size_g = $5
        )
      LIMIT 1
    `,
    [importedBatchId, brandId, product.product_name, product.species, product.pack_size_g],
  );

  if (existing.rows[0]?.product_id) {
    await client.query(
      `
        UPDATE products
        SET
          imported_batch_id = COALESCE(imported_batch_id, $1),
          product_type = COALESCE(product_type, 'cat_food'),
          format = COALESCE(format, $2),
          life_stage = COALESCE(life_stage, $3),
          market_availability = COALESCE(market_availability, 'ACTIVE'),
          updated_at = now()
        WHERE product_id = $4
      `,
      [importedBatchId, productFormat(product), productLifeStage(product), Number(existing.rows[0].product_id)],
    );
    return 'existing';
  }

  await client.query(
    `
      INSERT INTO products (
        brand_id,
        name,
        species,
        life_stage,
        product_type,
        format,
        package_size_g,
        status,
        source_count,
        confidence_score,
        verification_status,
        imported_batch_id,
        market_availability,
        verification_tier,
        verification_count,
        updated_at
      )
      VALUES (
        $1, $2, $3, $4, 'cat_food', $5, $6, 'active', 0, 0, 'UNVERIFIED',
        $7, 'ACTIVE', 'UNVERIFIED', 0, now()
      )
    `,
    [
      brandId,
      product.product_name,
      product.species,
      productLifeStage(product),
      productFormat(product),
      product.pack_size_g,
      importedBatchId,
    ],
  );

  return 'created';
}

export async function seedProductMasterBaseline(client: Queryable = pool): Promise<SeedSummary> {
  const summary: SeedSummary = {
    canonical_products_considered: canonicalProducts.length,
    brands_created: 0,
    brands_existing: 0,
    products_created: 0,
    products_existing: 0,
  };

  const brandIds = new Map<string, number>();

  for (const product of canonicalProducts) {
    let brandId = brandIds.get(product.brand_name);
    if (!brandId) {
      const brand = await upsertBrand(client, product.brand_name);
      brandId = brand.brandId;
      brandIds.set(product.brand_name, brandId);
      if (brand.created) summary.brands_created += 1;
      else summary.brands_existing += 1;
    }

    const productResult = await seedProduct(client, product, brandId);
    if (productResult === 'created') summary.products_created += 1;
    else summary.products_existing += 1;
  }

  return summary;
}

async function main(): Promise<void> {
  const summary = await seedProductMasterBaseline();
  console.log(JSON.stringify(summary, null, 2));
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await pool.end();
    });
}
