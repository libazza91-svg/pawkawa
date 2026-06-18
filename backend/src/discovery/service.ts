import { dedupeDiscoveredProducts } from './normalizer';
import { checkRobotsCompliance } from './robots';
import { discoverRetailerProducts, p0Retailers } from './retailers';
import { DiscoveryRunResult, RetailerDiscoveryConfig } from './types';

export async function runAustralianRetailDiscovery(options?: {
  retailers?: RetailerDiscoveryConfig[];
  fetcher?: typeof fetch;
}): Promise<DiscoveryRunResult> {
  const retailers = options?.retailers ?? p0Retailers;
  const fetcher = options?.fetcher ?? fetch;
  const robots = [];
  const discovered = [];

  for (const retailer of retailers) {
    for (const categoryUrl of retailer.category_urls) {
      const compliance = await checkRobotsCompliance(retailer, categoryUrl, fetcher);
      robots.push(compliance);
      if (!compliance.allowed) continue;
    }

    discovered.push(...(await discoverRetailerProducts(retailer, fetcher)));
  }

  const deduped = dedupeDiscoveredProducts(discovered);

  return {
    products: deduped.products,
    robots,
    total_discovered: deduped.products.length,
    duplicates_removed: deduped.duplicatesRemoved,
    sources_checked: retailers.map((retailer) => retailer.name),
  };
}
