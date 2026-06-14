// ── Royal Canin Connector (Placeholder — Epic B5) ───────────────

import { BaseConnector } from './base';
import { RawProduct } from './interface';

export class RoyalCaninConnector extends BaseConnector {
  name = 'RoyalCanin';
  sourceType = 'brand_site';

  async fetchProducts(): Promise<RawProduct[]> {
    // TODO: Implement Royal Canin website scraping or API integration
    return [];
  }
}
