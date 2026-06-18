import { ParsedRetailOffer } from '../types';

function htmlDecode(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function normalizePackSizeToG(value: string | number | undefined): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return Math.round(value * 1000);
  if (!value) return null;
  const text = String(value).toLowerCase().replace(/\s+/g, '');
  const kg = text.match(/(\d+(?:\.\d+)?)kg/);
  if (kg) return Math.round(Number(kg[1]) * 1000);
  const grams = text.match(/(\d+(?:\.\d+)?)g/);
  if (grams) return Math.round(Number(grams[1]));
  return null;
}

function parseMoney(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return Math.round(value * 100) / 100;
  if (typeof value !== 'string') return undefined;
  const match = value.replace(/,/g, '').match(/(\d+(?:\.\d{1,2})?)/);
  if (!match) return undefined;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed * 100) / 100 : undefined;
}

function stripPackSizeSuffix(value: string): string {
  return value.replace(/\s+\d+(?:\.\d+)?\s*(kg|g)\b/gi, '').trim();
}

function offerAvailabilityToStock(value: unknown): ParsedRetailOffer['stock_status'] {
  const text = String(value ?? '').toLowerCase();
  if (text.includes('outofstock') || text.includes('out of stock')) return 'OUT_OF_STOCK';
  if (text.includes('instock') || text.includes('in stock')) return 'IN_STOCK';
  if (text.includes('limitedavailability') || text.includes('lowstock')) return 'LOW_STOCK';
  return 'UNKNOWN';
}

function extractJsonLdNodes(html: string): any[] {
  const nodes: any[] = [];
  const regex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html))) {
    try {
      const parsed = JSON.parse(htmlDecode(match[1]).trim());
      if (Array.isArray(parsed)) {
        nodes.push(...parsed);
      } else {
        nodes.push(parsed);
      }
    } catch {
      // Ignore malformed third-party structured data.
    }
  }
  return nodes;
}

function extractMemberPrice(priceSpecification: unknown): number | undefined {
  if (!Array.isArray(priceSpecification)) return undefined;
  const memberSpec = priceSpecification.find(
    (entry) => entry && typeof entry === 'object' && 'validForMemberTier' in entry,
  ) as Record<string, unknown> | undefined;
  return parseMoney(memberSpec?.price);
}

function buildOfferFromVariant(
  variant: any,
  productUrl: string,
  capturedAt: string,
): ParsedRetailOffer | null {
  const offer = Array.isArray(variant?.offers) ? variant.offers[0] : variant?.offers;
  const packSizeG = normalizePackSizeToG(variant?.size ?? variant?.name);
  const basePrice = parseMoney(offer?.price);
  if (!packSizeG || !basePrice) return null;

  const memberPrice = extractMemberPrice(offer?.priceSpecification);
  const brandName =
    typeof variant?.brand === 'object'
      ? String(variant.brand?.name ?? '').trim()
      : String(variant?.brand ?? '').trim();
  const productName = stripPackSizeSuffix(String(variant?.name ?? '').trim());

  return {
    retailer_name: 'Petbarn',
    retailer_slug: 'petbarn',
    product_url: String(offer?.url ?? variant?.url ?? productUrl),
    retailer_product_title: String(variant?.name ?? productName).trim(),
    brand_name: brandName,
    product_name: productName,
    pack_size_g: packSizeG,
    base_price: basePrice,
    member_price: memberPrice && memberPrice < basePrice ? memberPrice : undefined,
    promotion_text: memberPrice && memberPrice < basePrice ? 'Member price available' : undefined,
    promotion_type: memberPrice && memberPrice < basePrice ? 'MEMBER_PRICE' : undefined,
    stock_status: offerAvailabilityToStock(offer?.availability),
    image_url: typeof variant?.image === 'string' ? variant.image : undefined,
    captured_at: capturedAt,
    market: 'AU',
    currency: 'AUD',
  };
}

function parseJsonLdProductGroupOffers(
  html: string,
  productUrl: string,
  capturedAt: string,
): ParsedRetailOffer[] {
  return extractJsonLdNodes(html)
    .filter((node) => node?.['@type'] === 'ProductGroup')
    .flatMap((group) => {
      const variants = Array.isArray(group?.hasVariant) ? group.hasVariant : [];
      return variants
        .map((variant: any) => buildOfferFromVariant(variant, productUrl, capturedAt))
        .filter((offer: ParsedRetailOffer | null): offer is ParsedRetailOffer => offer !== null);
    });
}

function parseJsonLdSingleProducts(
  html: string,
  productUrl: string,
  capturedAt: string,
): ParsedRetailOffer[] {
  return extractJsonLdNodes(html)
    .filter((node) => node?.['@type'] === 'Product')
    .map((variant) => buildOfferFromVariant(variant, productUrl, capturedAt))
    .filter((offer): offer is ParsedRetailOffer => offer !== null);
}

function parseHtmlFallback(html: string, productUrl: string, capturedAt: string): ParsedRetailOffer[] {
  const titleMatch = html.match(/<title>(.*?)<\/title>/i);
  const productNameMatch = html.match(/data-productname="([^"]+)"/i);
  const productBrandMatch = html.match(/data-productbrand="([^"]+)"/i);
  const priceMatch = html.match(/Regular Price[\s\S]*?<span[^>]*>\$([0-9]+(?:\.[0-9]{1,2})?)/i);
  const imageMatch = html.match(/<link rel="preload" as="image" href="([^"]+)"/i);
  const sizeMatch = html.match(/([0-9]+(?:\.[0-9]+)?)\s*(kg|g)\b/i);
  const basePrice = parseMoney(priceMatch?.[1]);
  const packSizeG = normalizePackSizeToG(sizeMatch?.[0]);
  if (!titleMatch || !productNameMatch || !productBrandMatch || !basePrice || !packSizeG) {
    return [];
  }

  const retailerProductTitle = htmlDecode(titleMatch[1]).replace(/\s+Petbarn$/i, '').trim();
  const productName = stripPackSizeSuffix(htmlDecode(productNameMatch[1]).trim());
  const brandName = htmlDecode(productBrandMatch[1]).trim();

  return [
    {
      retailer_name: 'Petbarn',
      retailer_slug: 'petbarn',
      product_url: productUrl,
      retailer_product_title: retailerProductTitle,
      brand_name: brandName,
      product_name: productName,
      pack_size_g: packSizeG,
      base_price: basePrice,
      stock_status: /aria-disabled="true"|disabled=""[^>]*role="button"/i.test(html) ? 'OUT_OF_STOCK' : 'IN_STOCK',
      image_url: imageMatch?.[1],
      captured_at: capturedAt,
      market: 'AU',
      currency: 'AUD',
    },
  ];
}

export function parsePetbarnProductPage(
  html: string,
  productUrl: string,
  capturedAt = new Date().toISOString(),
): ParsedRetailOffer[] {
  const productGroupOffers = parseJsonLdProductGroupOffers(html, productUrl, capturedAt);
  if (productGroupOffers.length > 0) return productGroupOffers;

  const productOffers = parseJsonLdSingleProducts(html, productUrl, capturedAt);
  if (productOffers.length > 0) return productOffers;

  return parseHtmlFallback(html, productUrl, capturedAt);
}
