import {
  buildExternalId,
  buildProductKey,
  extractPackSize,
  inferLifeStage,
  inferMarketAvailability,
  normalizeProductName,
  parsePrice,
} from './normalizer';
import { DiscoveredProduct, ProductImageMetadata, RetailerDiscoveryConfig } from './types';

export const p0Retailers: RetailerDiscoveryConfig[] = [
  {
    code: 'pet-circle',
    name: 'Pet Circle',
    base_url: 'https://www.petcircle.com.au',
    robots_url: 'https://www.petcircle.com.au/robots.txt',
    source_type: 'retailer',
    category_urls: ['https://www.petcircle.com.au/cat/food'],
    product_url_patterns: [/\/product\//i, /\/cat\/food\//i],
  },
  {
    code: 'petbarn',
    name: 'Petbarn',
    base_url: 'https://www.petbarn.com.au',
    robots_url: 'https://www.petbarn.com.au/robots.txt',
    source_type: 'retailer',
    category_urls: ['https://www.petbarn.com.au/cat/food'],
    product_url_patterns: [/\/cat\/food/i, /\/product\//i],
  },
  {
    code: 'petstock',
    name: 'Petstock',
    base_url: 'https://www.petstock.com.au',
    robots_url: 'https://www.petstock.com.au/robots.txt',
    source_type: 'retailer',
    category_urls: ['https://www.petstock.com.au/cat/food'],
    product_url_patterns: [/\/products\//i, /\/cat\/food/i],
  },
  {
    code: 'my-pet-warehouse',
    name: 'My Pet Warehouse',
    base_url: 'https://www.mypetwarehouse.com.au',
    robots_url: 'https://www.mypetwarehouse.com.au/robots.txt',
    source_type: 'retailer',
    category_urls: ['https://www.mypetwarehouse.com.au/cat/food'],
    product_url_patterns: [/\/cat-food/i, /\/product\//i],
  },
];

function asArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function toAbsoluteUrl(value: string, baseUrl: string): string {
  return new URL(value, baseUrl).toString();
}

function readBrand(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && 'name' in value) {
    const name = (value as { name?: unknown }).name;
    return typeof name === 'string' ? name : undefined;
  }
  return undefined;
}

function extractJsonLdBlocks(html: string): unknown[] {
  const blocks: unknown[] = [];
  const regex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(html))) {
    try {
      blocks.push(JSON.parse(match[1].trim()));
    } catch {
      // Ignore malformed JSON-LD from retailer pages.
    }
  }

  return blocks;
}

function flattenJsonLd(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.flatMap((item) => flattenJsonLd(item));
  if (!value || typeof value !== 'object') return [];

  const objectValue = value as Record<string, unknown>;
  const graph = objectValue['@graph'];
  return [objectValue, ...flattenJsonLd(graph)];
}

function imageMetadataFromJsonLd(image: unknown, sourceUrl: string, retailer: string): ProductImageMetadata[] {
  return asArray(image)
    .map((item) => {
      if (typeof item === 'string') return { image_url: item };
      if (item && typeof item === 'object' && 'url' in item && typeof (item as { url?: unknown }).url === 'string') {
        const imageObject = item as { url: string; width?: unknown; height?: unknown };
        return {
          image_url: imageObject.url,
          width: typeof imageObject.width === 'number' ? imageObject.width : undefined,
          height: typeof imageObject.height === 'number' ? imageObject.height : undefined,
        };
      }
      return null;
    })
    .filter((item): item is { image_url: string; width?: number; height?: number } => Boolean(item))
    .map((item) => ({
      image_url: item.image_url,
      source_url: sourceUrl,
      source_type: 'retailer',
      retailer,
      width: item.width,
      height: item.height,
    }));
}

export function extractProductLinks(html: string, config: RetailerDiscoveryConfig): string[] {
  const urls = new Set<string>();
  const hrefRegex = /href=["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;

  while ((match = hrefRegex.exec(html))) {
    const href = match[1];
    if (!config.product_url_patterns.some((pattern) => pattern.test(href))) continue;
    urls.add(toAbsoluteUrl(href, config.base_url));
  }

  return Array.from(urls);
}

export function parseProductsFromJsonLd(
  html: string,
  sourceUrl: string,
  config: RetailerDiscoveryConfig,
): DiscoveredProduct[] {
  const discoveredAt = new Date().toISOString();
  const textSnapshot = html.replace(/<[^>]+>/g, ' ');
  const objects = extractJsonLdBlocks(html).flatMap((block) => flattenJsonLd(block));

  return objects
    .filter((item) => {
      const type = item['@type'];
      return type === 'Product' || (Array.isArray(type) && type.includes('Product'));
    })
    .map((item) => {
      const rawName = typeof item.name === 'string' ? item.name : '';
      const brand = readBrand(item.brand) ?? 'Unknown Brand';
      const productName = normalizeProductName(rawName);
      const pack = extractPackSize(rawName);
      const offer = Array.isArray(item.offers) ? item.offers[0] : item.offers;
      const price = parsePrice(offer && typeof offer === 'object' ? (offer as { price?: unknown }).price : undefined);
      const pageUrl =
        typeof item.url === 'string'
          ? toAbsoluteUrl(item.url, config.base_url)
          : sourceUrl;
      const images = imageMetadataFromJsonLd(item.image, pageUrl, config.name).map((image) => ({
        ...image,
        image_url: toAbsoluteUrl(image.image_url, config.base_url),
      }));
      const packSize = pack.label;
      const productKey = buildProductKey(brand, productName, packSize);

      return {
        external_id: buildExternalId(config.code, pageUrl, productKey),
        product_key: productKey,
        product_name: productName,
        brand,
        species: 'CAT',
        life_stage: inferLifeStage(rawName),
        pack_size: packSize,
        pack_size_g: pack.grams,
        price_aud: price,
        source_url: pageUrl,
        source_type: config.source_type,
        retailer: config.name,
        market_availability: inferMarketAvailability(`${rawName} ${textSnapshot}`, price),
        image_url: images[0]?.image_url,
        images,
        metadata: {
          parser: 'json_ld',
          source_retailer_code: config.code,
        },
        discovered_at: discoveredAt,
      } satisfies DiscoveredProduct;
    })
    .filter((product) => product.product_name && product.brand && product.species === 'CAT');
}

export async function discoverRetailerProducts(
  config: RetailerDiscoveryConfig,
  fetcher: typeof fetch = fetch,
): Promise<DiscoveredProduct[]> {
  const products: DiscoveredProduct[] = [];

  for (const url of config.category_urls) {
    const response = await fetcher(url, {
      headers: { 'User-Agent': 'PawkawaBot/0.1 (+https://pawkawa.local)' },
    });
    if (!response.ok) continue;
    const html = await response.text();
    products.push(...parseProductsFromJsonLd(html, url, config));
  }

  return products;
}
