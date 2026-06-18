import { ParsedRetailOffer } from '../types';

function htmlDecode(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

export function normalizePackSizeToG(value: string | number | undefined): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return Math.round(value * 1000);
  if (!value) return null;
  const text = String(value).toLowerCase().replace(/\s+/g, '');
  const kg = text.match(/(\d+(?:\.\d+)?)kg/);
  if (kg) return Math.round(Number(kg[1]) * 1000);
  const grams = text.match(/(\d+(?:\.\d+)?)g/);
  if (grams) return Math.round(Number(grams[1]));
  return null;
}

export function parseMoney(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return Math.round(value * 100) / 100;
  if (typeof value !== 'string') return undefined;
  const match = value.replace(/,/g, '').match(/(\d+(?:\.\d{1,2})?)/);
  if (!match) return undefined;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed * 100) / 100 : undefined;
}

function extractJsonLdProducts(html: string): any[] {
  const products: any[] = [];
  const regex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html))) {
    try {
      const parsed = JSON.parse(htmlDecode(match[1]).trim());
      const nodes = Array.isArray(parsed) ? parsed : [parsed];
      for (const node of nodes) {
        if (node?.['@type'] === 'Product') products.push(node);
      }
    } catch {
      // Ignore malformed third-party structured data.
    }
  }
  return products;
}

function extractNextData(html: string): any | null {
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!match) return null;
  try {
    return JSON.parse(htmlDecode(match[1]));
  } catch {
    return null;
  }
}

function offerAvailabilityToStock(value: unknown): ParsedRetailOffer['stock_status'] {
  const text = String(value ?? '').toLowerCase();
  if (text.includes('outofstock') || text.includes('out of stock')) return 'OUT_OF_STOCK';
  if (text.includes('instock') || text.includes('in stock')) return 'IN_STOCK';
  return 'UNKNOWN';
}

function inferBrand(product: any, jsonLdProduct?: any): string {
  return product?.vendor ?? jsonLdProduct?.brand?.name ?? jsonLdProduct?.brand ?? '';
}

function firstImage(product: any, variant: any, jsonLdProduct?: any): string | undefined {
  return variant?.images?.[0] ?? product?.images?.[0] ?? (Array.isArray(jsonLdProduct?.image) ? jsonLdProduct.image[0] : jsonLdProduct?.image);
}

function parseVariantOffersFromNextData(nextData: any, productUrl: string, capturedAt: string, jsonLdProduct?: any): ParsedRetailOffer[] {
  const product = nextData?.props?.pageProps?.product;
  if (!product?.title || !Array.isArray(product.variants)) return [];

  return product.variants.flatMap((variant: any) => {
    const size = variant?.selectedOptions?.find((option: any) => String(option?.name ?? '').toLowerCase() === 'size')?.value;
    const packSizeG = normalizePackSizeToG(size ?? variant?.dimension?.weight);
    const basePrice = parseMoney(variant?.price);
    if (!packSizeG || !basePrice) return [];
    const stock = variant?.inStockInNetwork === false || variant?.quantityAvailable === 0 ? 'OUT_OF_STOCK' : 'IN_STOCK';
    const discountPercent = product.sellingPlans?.[0]?.adjustmentPercentage;
    const promotionText = discountPercent ? `${discountPercent}% subscription discount available` : undefined;

    return [
      {
        retailer_name: 'Petstock',
        retailer_slug: 'petstock',
        product_url: productUrl,
        retailer_product_title: product.title,
        brand_name: inferBrand(product, jsonLdProduct),
        product_name: product.title,
        pack_size_g: packSizeG,
        base_price: basePrice,
        member_price: undefined,
        coupon_price: undefined,
        promotion_text: promotionText,
        promotion_type: promotionText ? 'OTHER' : undefined,
        stock_status: stock,
        image_url: firstImage(product, variant, jsonLdProduct),
        captured_at: capturedAt,
        market: 'AU',
        currency: 'AUD',
      } satisfies ParsedRetailOffer,
    ];
  });
}

function parseJsonLdOffers(html: string, productUrl: string, capturedAt: string): ParsedRetailOffer[] {
  return extractJsonLdProducts(html).flatMap((product) => {
    const offers = Array.isArray(product.offers) ? product.offers : product.offers ? [product.offers] : [];
    return offers.flatMap((offer: any) => {
      const packSizeG = normalizePackSizeToG(offer.url) ?? normalizePackSizeToG(product.name);
      const basePrice = parseMoney(offer.price);
      if (!packSizeG || !basePrice) return [];
      return [
        {
          retailer_name: 'Petstock',
          retailer_slug: 'petstock',
          product_url: productUrl,
          retailer_product_title: product.name,
          brand_name: typeof product.brand === 'object' ? product.brand.name : product.brand,
          product_name: product.name,
          pack_size_g: packSizeG,
          base_price: basePrice,
          stock_status: offerAvailabilityToStock(offer.availability),
          image_url: Array.isArray(product.image) ? product.image[0] : product.image,
          captured_at: capturedAt,
          market: 'AU',
          currency: 'AUD',
        } satisfies ParsedRetailOffer,
      ];
    });
  });
}

export function parsePetstockProductPage(html: string, productUrl: string, capturedAt = new Date().toISOString()): ParsedRetailOffer[] {
  const jsonLdProduct = extractJsonLdProducts(html)[0];
  const nextData = extractNextData(html);
  const nextOffers = parseVariantOffersFromNextData(nextData, productUrl, capturedAt, jsonLdProduct);
  if (nextOffers.length > 0) return nextOffers;
  return parseJsonLdOffers(html, productUrl, capturedAt);
}
