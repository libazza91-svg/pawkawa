import { pool } from '../db/client';
import { fixtureRetailOffers } from '../price-comparison/fixture-data';
import { RetailOffer } from '../price-comparison/types';

export interface BackfillRetailOffersResult {
  offers_processed: number;
  snapshots_processed: number;
}

interface Queryable {
  query: (text: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;
}

function nullableNumber(value: number | undefined): number | null {
  return value === undefined ? null : value;
}

function nullableString(value: string | undefined): string | null {
  return value === undefined ? null : value;
}

export async function upsertRetailOffer(
  client: Queryable,
  offer: RetailOffer,
  metadata: Record<string, unknown> = { source: 'fixture_backfill_v1' },
): Promise<number> {
  const result = await client.query(
    `
      INSERT INTO retail_offers (
        product_slug,
        retailer_name,
        retailer_slug,
        market,
        currency,
        product_url,
        pack_size_g,
        base_price,
        sale_price,
        member_price,
        coupon_price,
        conditional_best_price,
        conditional_price_reason,
        effective_price,
        unit_price_per_kg,
        stock_status,
        promotion_text,
        promotion_type,
        coupon_code,
        minimum_spend,
        shipping_threshold,
        last_checked_at,
        metadata,
        updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
        $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, now()
      )
      ON CONFLICT (product_slug, retailer_slug, market, currency, pack_size_g)
      DO UPDATE SET
        retailer_name = EXCLUDED.retailer_name,
        product_url = EXCLUDED.product_url,
        base_price = EXCLUDED.base_price,
        sale_price = EXCLUDED.sale_price,
        member_price = EXCLUDED.member_price,
        coupon_price = EXCLUDED.coupon_price,
        conditional_best_price = EXCLUDED.conditional_best_price,
        conditional_price_reason = EXCLUDED.conditional_price_reason,
        effective_price = EXCLUDED.effective_price,
        unit_price_per_kg = EXCLUDED.unit_price_per_kg,
        stock_status = EXCLUDED.stock_status,
        promotion_text = EXCLUDED.promotion_text,
        promotion_type = EXCLUDED.promotion_type,
        coupon_code = EXCLUDED.coupon_code,
        minimum_spend = EXCLUDED.minimum_spend,
        shipping_threshold = EXCLUDED.shipping_threshold,
        last_checked_at = EXCLUDED.last_checked_at,
        metadata = EXCLUDED.metadata,
        updated_at = now()
      RETURNING retail_offer_id
    `,
    [
      offer.product_slug,
      offer.retailer_name,
      offer.retailer_slug,
      offer.market,
      offer.currency,
      offer.product_url,
      offer.pack_size_g,
      offer.base_price,
      nullableNumber(offer.sale_price),
      nullableNumber(offer.member_price),
      nullableNumber(offer.coupon_price),
      nullableNumber(offer.conditional_best_price),
      nullableString(offer.conditional_price_reason),
      offer.effective_price,
      offer.unit_price_per_kg,
      offer.stock_status,
      nullableString(offer.promotion_text),
      nullableString(offer.promotion_type),
      nullableString(offer.coupon_code),
      nullableNumber(offer.minimum_spend),
      nullableNumber(offer.shipping_threshold),
      offer.last_checked_at,
      JSON.stringify(metadata),
    ],
  );

  return Number(result.rows[0].retail_offer_id);
}

export async function insertSnapshotIfMissing(
  client: Queryable,
  retailOfferId: number,
  offer: RetailOffer,
  metadata: Record<string, unknown> = { source: 'fixture_backfill_v1' },
): Promise<void> {
  await client.query(
    `
      INSERT INTO price_snapshots (
        retail_offer_id,
        product_slug,
        retailer_slug,
        market,
        currency,
        base_price,
        sale_price,
        member_price,
        coupon_price,
        conditional_best_price,
        conditional_price_reason,
        effective_price,
        unit_price_per_kg,
        stock_status,
        promotion_text,
        promotion_type,
        source_url,
        captured_at,
        metadata
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19
      )
      ON CONFLICT (retail_offer_id, captured_at) DO NOTHING
    `,
    [
      retailOfferId,
      offer.product_slug,
      offer.retailer_slug,
      offer.market,
      offer.currency,
      offer.base_price,
      nullableNumber(offer.sale_price),
      nullableNumber(offer.member_price),
      nullableNumber(offer.coupon_price),
      nullableNumber(offer.conditional_best_price),
      nullableString(offer.conditional_price_reason),
      offer.effective_price,
      offer.unit_price_per_kg,
      offer.stock_status,
      nullableString(offer.promotion_text),
      nullableString(offer.promotion_type),
      offer.product_url,
      offer.last_checked_at,
      JSON.stringify(metadata),
    ],
  );
}

export async function backfillRetailOffers(client: Queryable = pool, offers: RetailOffer[] = fixtureRetailOffers): Promise<BackfillRetailOffersResult> {
  for (const offer of offers) {
    const retailOfferId = await upsertRetailOffer(client, offer);
    await insertSnapshotIfMissing(client, retailOfferId, offer);
  }

  return {
    offers_processed: offers.length,
    snapshots_processed: offers.length,
  };
}

if (require.main === module) {
  backfillRetailOffers()
    .then((result) => {
      console.log('Retail offer backfill completed:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Retail offer backfill failed:', error);
      process.exit(1);
    });
}
