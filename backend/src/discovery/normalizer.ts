import { createHash } from 'crypto';
import { DiscoveredProduct, DiscoveryMarketAvailability } from './types';

const PACK_SIZE_RE = /(\d+(?:\.\d+)?)\s*(kg|g|gram|grams|x\s*\d+\s*g|x\s*\d+\s*gram|x\s*\d+\s*grams)/i;

export function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function normalizeProductName(value: string): string {
  return normalizeWhitespace(value)
    .replace(/\s+-\s+Cat Food$/i, '')
    .replace(/\s+Cat Food$/i, '')
    .replace(/\s+Dry Cat Food$/i, '')
    .replace(/\s+Wet Cat Food$/i, '');
}

export function normalizePackSize(value?: string): string {
  if (!value) return 'unknown';
  return normalizeWhitespace(value).toLowerCase().replace(/\s+/g, '');
}

export function extractPackSize(text: string): { label: string; grams?: number } {
  const match = text.match(PACK_SIZE_RE);
  if (!match) return { label: 'unknown' };

  const raw = normalizeWhitespace(match[0]);
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();

  if (unit === 'kg') return { label: raw, grams: Math.round(amount * 1000) };
  if (unit === 'g' || unit === 'gram' || unit === 'grams') return { label: raw, grams: Math.round(amount) };

  const multi = unit.match(/x\s*(\d+)\s*g/i);
  if (multi) return { label: raw, grams: Math.round(amount * Number(multi[1])) };
  return { label: raw };
}

export function buildProductKey(brand: string, productName: string, packSize: string): string {
  return [brand, productName, normalizePackSize(packSize)]
    .map((part) => normalizeWhitespace(part).toLowerCase())
    .join('|');
}

export function buildExternalId(retailer: string, sourceUrl: string, productKey: string): string {
  return createHash('sha1').update(`${retailer}|${sourceUrl}|${productKey}`).digest('hex');
}

export function parsePrice(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return undefined;
  const parsed = Number(value.replace(/[^0-9.]/g, ''));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

export function inferLifeStage(text: string): string {
  const value = text.toLowerCase();
  if (value.includes('kitten')) return 'KITTEN';
  if (value.includes('senior') || value.includes('mature')) return 'SENIOR';
  if (value.includes('all life')) return 'ALL_LIFE_STAGES';
  return 'ADULT';
}

export function inferMarketAvailability(text: string, price?: number): DiscoveryMarketAvailability {
  const value = text.toLowerCase();
  if (/(discontinued|no longer available|not available permanently)/.test(value)) return 'DISCONTINUED';
  if (/(out of stock|sold out|temporarily unavailable|back soon|notify me)/.test(value)) return 'LIMITED';
  return price && price > 0 ? 'ACTIVE' : 'LIMITED';
}

export function dedupeDiscoveredProducts(products: DiscoveredProduct[]): {
  products: DiscoveredProduct[];
  duplicatesRemoved: number;
} {
  const byKey = new Map<string, DiscoveredProduct>();

  for (const product of products) {
    const existing = byKey.get(product.product_key);
    if (!existing) {
      byKey.set(product.product_key, product);
      continue;
    }

    const mergedImages = [...existing.images];
    for (const image of product.images) {
      if (!mergedImages.some((item) => item.image_url === image.image_url)) {
        mergedImages.push(image);
      }
    }

    byKey.set(product.product_key, {
      ...existing,
      price_aud: existing.price_aud ?? product.price_aud,
      image_url: existing.image_url ?? product.image_url,
      images: mergedImages,
      market_availability: existing.market_availability === 'ACTIVE' ? existing.market_availability : product.market_availability,
      metadata: {
        ...existing.metadata,
        duplicate_sources: [
          ...((existing.metadata.duplicate_sources as string[] | undefined) ?? []),
          product.source_url,
        ],
      },
    });
  }

  return {
    products: Array.from(byKey.values()),
    duplicatesRemoved: products.length - byKey.size,
  };
}
