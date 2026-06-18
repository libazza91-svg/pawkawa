import { pool } from '../../db/client';
import { calculateEffectivePrice } from '../../price-comparison/effective-price';
import { canonicalProducts } from '../../price-comparison/fixture-data';
import { matchCanonicalProduct } from '../../price-comparison/canonical-matcher';
import { RetailOffer } from '../../price-comparison/types';
import { insertSnapshotIfMissing, upsertRetailOffer } from '../../scripts/backfill-retail-offers';
import { ParsedRetailOffer, RetailIngestionReport } from './types';

interface Queryable {
  query: (text: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;
}

function metadataFor(parsed: ParsedRetailOffer, matchConfidence: number) {
  return {
    source: `${parsed.retailer_slug}_ingestion_pilot_v1`,
    image_url: parsed.image_url,
    source_url: parsed.product_url,
    source_type: 'retailer',
    retailer_name: parsed.retailer_name,
    match_confidence: matchConfidence,
  };
}

export function buildRetailOfferFromParsed(parsed: ParsedRetailOffer, canonicalSlug: string): RetailOffer {
  return calculateEffectivePrice({
    product_id: canonicalSlug,
    product_slug: canonicalSlug,
    product_name: parsed.product_name,
    brand_name: parsed.brand_name,
    retailer_name: parsed.retailer_name,
    retailer_slug: parsed.retailer_slug,
    market: parsed.market,
    currency: parsed.currency,
    product_url: parsed.product_url,
    pack_size_g: parsed.pack_size_g,
    base_price: parsed.base_price,
    sale_price: parsed.sale_price,
    member_price: parsed.member_price,
    coupon_price: parsed.coupon_price,
    stock_status: parsed.stock_status,
    promotion_text: parsed.promotion_text,
    promotion_type: parsed.promotion_type,
    last_checked_at: parsed.captured_at,
    primary_image_url: parsed.image_url,
  });
}

export async function writeMatchedRetailOffer(
  parsed: ParsedRetailOffer,
  client: Queryable = pool,
  minimumWriteConfidence = 0.8,
): Promise<RetailIngestionReport> {
  if (!parsed.base_price) {
    return {
      status: 'PRICE_MISSING',
      product_url: parsed.product_url,
      retailer_slug: parsed.retailer_slug,
      retailer_product_title: parsed.retailer_product_title,
      parsed_brand: parsed.brand_name,
      parsed_pack_size_g: parsed.pack_size_g,
      parsed_price: parsed.base_price,
      parsed_successfully: true,
      canonical_matched: false,
      offer_written: false,
      snapshot_written: false,
      message: 'No usable base price found',
      parsed,
    };
  }
  if (parsed.stock_status === 'UNKNOWN') {
    return {
      status: 'STOCK_UNKNOWN',
      product_url: parsed.product_url,
      retailer_slug: parsed.retailer_slug,
      retailer_product_title: parsed.retailer_product_title,
      parsed_brand: parsed.brand_name,
      parsed_pack_size_g: parsed.pack_size_g,
      parsed_price: parsed.base_price,
      parsed_successfully: true,
      canonical_matched: false,
      offer_written: false,
      snapshot_written: false,
      message: 'Stock status unknown',
      parsed,
    };
  }

  const match = matchCanonicalProduct(
    {
      brand_name: parsed.brand_name,
      product_name: parsed.product_name,
      pack_size_g: parsed.pack_size_g,
      primary_image_url: parsed.image_url,
    },
    canonicalProducts,
  );

  if (match.match_warnings.some((warning) => warning.toLowerCase().includes('pack size differed'))) {
    return {
      status: 'PACK_SIZE_CONFLICT',
      product_url: parsed.product_url,
      retailer_slug: parsed.retailer_slug,
      retailer_product_title: parsed.retailer_product_title,
      parsed_brand: parsed.brand_name,
      parsed_pack_size_g: parsed.pack_size_g,
      parsed_price: parsed.base_price,
      parsed_successfully: true,
      canonical_matched: false,
      offer_written: false,
      snapshot_written: false,
      canonical_slug: match.canonical_product.slug,
      match_confidence: match.match_confidence,
      match_reasons: match.match_reasons,
      match_warnings: match.match_warnings,
      message: 'Pack size differed from nearest canonical product',
      parsed,
      canonical_match: match,
    };
  }

  if (match.match_reasons.some((reason) => reason.includes('Created new canonical'))) {
    return {
      status: 'CANONICAL_MISSING',
      product_url: parsed.product_url,
      retailer_slug: parsed.retailer_slug,
      retailer_product_title: parsed.retailer_product_title,
      parsed_brand: parsed.brand_name,
      parsed_pack_size_g: parsed.pack_size_g,
      parsed_price: parsed.base_price,
      parsed_successfully: true,
      canonical_matched: false,
      offer_written: false,
      snapshot_written: false,
      canonical_slug: match.canonical_product.slug,
      match_confidence: match.match_confidence,
      match_reasons: match.match_reasons,
      match_warnings: match.match_warnings,
      message: 'No approved canonical product exists for this parsed retailer product',
      parsed,
      canonical_match: match,
    };
  }

  if (match.match_confidence < minimumWriteConfidence) {
    return {
      status: 'LOW_CONFIDENCE_MATCH',
      product_url: parsed.product_url,
      retailer_slug: parsed.retailer_slug,
      retailer_product_title: parsed.retailer_product_title,
      parsed_brand: parsed.brand_name,
      parsed_pack_size_g: parsed.pack_size_g,
      parsed_price: parsed.base_price,
      parsed_successfully: true,
      canonical_matched: false,
      offer_written: false,
      snapshot_written: false,
      canonical_slug: match.canonical_product.slug,
      match_confidence: match.match_confidence,
      match_reasons: match.match_reasons,
      match_warnings: match.match_warnings,
      message: `Match confidence ${match.match_confidence} below write threshold ${minimumWriteConfidence}`,
      parsed,
      canonical_match: match,
    };
  }

  const offer = buildRetailOfferFromParsed(parsed, match.canonical_product.slug);
  const metadata = metadataFor(parsed, match.match_confidence);
  const retailOfferId = await upsertRetailOffer(client, offer, metadata);
  await insertSnapshotIfMissing(client, retailOfferId, offer, metadata);

  return {
    status: 'INGESTED',
    product_url: parsed.product_url,
    retailer_slug: parsed.retailer_slug,
    retailer_product_title: parsed.retailer_product_title,
    parsed_brand: parsed.brand_name,
    parsed_pack_size_g: parsed.pack_size_g,
    parsed_price: parsed.base_price,
    canonical_slug: match.canonical_product.slug,
    match_confidence: match.match_confidence,
    match_reasons: match.match_reasons,
    match_warnings: match.match_warnings,
    parsed_successfully: true,
    canonical_matched: true,
    offer_written: true,
    snapshot_written: true,
    message: 'Retail offer ingested',
    parsed,
    canonical_match: match,
    retail_offer_id: retailOfferId,
    snapshot_created: true,
  };
}
