import { describe, expect, it } from 'vitest';
import { buildProductKey, dedupeDiscoveredProducts } from '../src/discovery/normalizer';
import { evaluateRobotsTxt } from '../src/discovery/robots';
import { parseProductsFromJsonLd, p0Retailers } from '../src/discovery/retailers';
import { runAustralianRetailDiscovery } from '../src/discovery/service';
import { DiscoveredProduct } from '../src/discovery/types';

function jsonLdProduct(index: number, retailerUrl: string, offset = 0) {
  const productIndex = index + offset;
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `Test Cat Food ${productIndex} 1.5kg`,
    brand: { '@type': 'Brand', name: `Brand ${productIndex % 20}` },
    image: `${retailerUrl}/images/test-cat-food-${productIndex}.jpg`,
    url: `${retailerUrl}/product/test-cat-food-${productIndex}`,
    offers: {
      '@type': 'Offer',
      price: `${20 + productIndex / 10}`,
      availability: 'https://schema.org/InStock',
    },
  };
}

function htmlWithProducts(count: number, retailerUrl: string, offset = 0) {
  const products = Array.from({ length: count }, (_, index) => jsonLdProduct(index, retailerUrl, offset));
  return `<html><head><script type="application/ld+json">${JSON.stringify(products)}</script></head><body></body></html>`;
}

describe('Australian retail product discovery', () => {
  it('evaluates robots.txt allow and disallow rules', () => {
    expect(evaluateRobotsTxt('User-agent: *\nDisallow: /checkout\nAllow: /cat', 'https://example.test/cat/food').allowed).toBe(true);
    expect(evaluateRobotsTxt('User-agent: *\nDisallow: /cat', 'https://example.test/cat/food').allowed).toBe(false);
  });

  it('extracts product metadata and image URLs from retailer JSON-LD', () => {
    const config = p0Retailers[0];
    const products = parseProductsFromJsonLd(htmlWithProducts(1, config.base_url), config.category_urls[0], config);

    expect(products).toHaveLength(1);
    expect(products[0]).toMatchObject({
      product_name: 'Test Cat Food 0 1.5kg',
      brand: 'Brand 0',
      species: 'CAT',
      pack_size: '1.5kg',
      pack_size_g: 1500,
      source_type: 'retailer',
      market_availability: 'ACTIVE',
    });
    expect(products[0].image_url).toContain('/images/test-cat-food-0.jpg');
    expect(products[0].images[0].source_url).toContain('/product/test-cat-food-0');
  });

  it('discovers at least 100 Australian cat food products across P0 retailers', async () => {
    const fetcher = async (url: string | URL | Request) => {
      const urlString = String(url);
      if (urlString.endsWith('/robots.txt')) {
        return new Response('User-agent: *\nAllow: /', { status: 200 });
      }

      const retailerIndex = p0Retailers.findIndex((item) => urlString.startsWith(item.base_url));
      const retailer = p0Retailers[retailerIndex] ?? p0Retailers[0];
      return new Response(htmlWithProducts(30, retailer.base_url, Math.max(retailerIndex, 0) * 100), { status: 200 });
    };

    const result = await runAustralianRetailDiscovery({ fetcher: fetcher as typeof fetch });

    expect(result.robots.every((item) => item.allowed)).toBe(true);
    expect(result.total_discovered).toBeGreaterThanOrEqual(100);
    expect(result.products.every((product) => product.species === 'CAT')).toBe(true);
    expect(result.products.every((product) => product.image_url)).toBe(true);
    expect(result.products.every((product) => product.source_type === 'retailer')).toBe(true);
  });

  it('deduplicates products by brand, product name and pack size', () => {
    const baseProduct: DiscoveredProduct = {
      external_id: 'one',
      product_key: buildProductKey('Brand A', 'Indoor Cat Food', '2kg'),
      product_name: 'Indoor Cat Food',
      brand: 'Brand A',
      species: 'CAT',
      life_stage: 'ADULT',
      pack_size: '2kg',
      pack_size_g: 2000,
      price_aud: 30,
      source_url: 'https://retailer-one.test/product',
      source_type: 'retailer',
      retailer: 'Retailer One',
      market_availability: 'ACTIVE',
      image_url: 'https://retailer-one.test/image.jpg',
      images: [
        {
          image_url: 'https://retailer-one.test/image.jpg',
          source_url: 'https://retailer-one.test/product',
          source_type: 'retailer',
          retailer: 'Retailer One',
        },
      ],
      metadata: {},
      discovered_at: new Date().toISOString(),
    };

    const result = dedupeDiscoveredProducts([
      baseProduct,
      {
        ...baseProduct,
        external_id: 'two',
        source_url: 'https://retailer-two.test/product',
        retailer: 'Retailer Two',
        images: [
          {
            image_url: 'https://retailer-two.test/image.jpg',
            source_url: 'https://retailer-two.test/product',
            source_type: 'retailer',
            retailer: 'Retailer Two',
          },
        ],
      },
    ]);

    expect(result.products).toHaveLength(1);
    expect(result.duplicatesRemoved).toBe(1);
    expect(result.products[0].images).toHaveLength(2);
  });
});
