import { and, eq } from 'drizzle-orm';
import { db } from '../db/client';
import {
  brands,
  productImages,
  productPrices,
  products,
  retailerProductMappings,
  sources,
} from '../db/schema';
import { DiscoveredProduct } from './types';

async function upsertBrand(name: string): Promise<number> {
  const existing = await db
    .select({ brand_id: brands.brand_id })
    .from(brands)
    .where(eq(brands.name, name))
    .limit(1);

  if (existing.length > 0) return existing[0].brand_id;

  const inserted = await db.insert(brands).values({ name }).returning({ brand_id: brands.brand_id });
  return inserted[0].brand_id;
}

async function upsertProduct(product: DiscoveredProduct, brandId: number): Promise<number> {
  const existing = await db
    .select({ product_id: products.product_id, source_count: products.source_count })
    .from(products)
    .where(
      and(
        eq(products.brand_id, brandId),
        eq(products.name, product.product_name),
        eq(products.package_size_g, product.pack_size_g ?? 0),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(products)
      .set({
        source_count: (existing[0].source_count ?? 0) + 1,
        status: product.market_availability,
        updated_at: new Date(),
      })
      .where(eq(products.product_id, existing[0].product_id));
    return existing[0].product_id;
  }

  const inserted = await db
    .insert(products)
    .values({
      brand_id: brandId,
      name: product.product_name,
      species: product.species,
      life_stage: product.life_stage,
      package_size_g: product.pack_size_g ?? null,
      status: product.market_availability,
      source_count: 1,
      confidence_score: 65,
      verification_status: 'BRONZE',
    })
    .returning({ product_id: products.product_id });

  return inserted[0].product_id;
}

async function insertMapping(product: DiscoveredProduct, productId: number): Promise<void> {
  const existing = await db
    .select({ mapping_id: retailerProductMappings.mapping_id })
    .from(retailerProductMappings)
    .where(
      and(
        eq(retailerProductMappings.retailer, product.retailer),
        eq(retailerProductMappings.retailer_product_id, product.external_id),
      ),
    )
    .limit(1);

  const values = {
    product_id: productId,
    retailer: product.retailer,
    retailer_product_id: product.external_id,
    product_key: product.product_key,
    product_name: product.product_name,
    brand_name: product.brand,
    species: product.species,
    life_stage: product.life_stage,
    pack_size: product.pack_size,
    pack_size_g: product.pack_size_g ?? null,
    price_aud: product.price_aud?.toString() ?? null,
    source_url: product.source_url,
    source_type: product.source_type,
    image_url: product.image_url ?? null,
    market_availability: product.market_availability,
    metadata: product.metadata,
    captured_at: new Date(product.discovered_at),
  };

  if (existing.length > 0) {
    await db
      .update(retailerProductMappings)
      .set(values)
      .where(eq(retailerProductMappings.mapping_id, existing[0].mapping_id));
    return;
  }

  await db.insert(retailerProductMappings).values(values);
}

async function insertImages(product: DiscoveredProduct, productId: number): Promise<void> {
  for (const image of product.images) {
    const existing = await db
      .select({ image_id: productImages.image_id })
      .from(productImages)
      .where(and(eq(productImages.source_url, image.source_url), eq(productImages.image_url, image.image_url)))
      .limit(1);

    const values = {
      product_id: productId,
      image_url: image.image_url,
      source_url: image.source_url,
      source_type: image.source_type,
      retailer: image.retailer ?? product.retailer,
      alt_text: image.alt_text ?? null,
      width: image.width ?? null,
      height: image.height ?? null,
      metadata: image.metadata ?? {},
    };

    if (existing.length > 0) {
      await db.update(productImages).set(values).where(eq(productImages.image_id, existing[0].image_id));
      continue;
    }

    await db.insert(productImages).values(values);
  }
}

async function insertSource(product: DiscoveredProduct, productId: number): Promise<void> {
  await db.insert(sources).values({
    product_id: productId,
    source_url: product.source_url,
    source_type: product.source_type,
    confidence_score: '0.65',
  });
}

async function insertPrice(product: DiscoveredProduct, productId: number): Promise<void> {
  if (!product.price_aud) return;

  await db.insert(productPrices).values({
    product_id: productId,
    retailer: product.retailer,
    price_aud: product.price_aud.toString(),
    pack_size: product.pack_size_g?.toString() ?? null,
    affiliate_url: product.source_url,
    captured_at: new Date(product.discovered_at),
  });
}

export async function persistDiscoveredProducts(discoveredProducts: DiscoveredProduct[]): Promise<{
  products_processed: number;
  images_processed: number;
}> {
  let imagesProcessed = 0;

  for (const product of discoveredProducts) {
    const brandId = await upsertBrand(product.brand);
    const productId = await upsertProduct(product, brandId);
    await insertMapping(product, productId);
    await insertImages(product, productId);
    await insertSource(product, productId);
    await insertPrice(product, productId);
    imagesProcessed += product.images.length;
  }

  return {
    products_processed: discoveredProducts.length,
    images_processed: imagesProcessed,
  };
}
