// ── Pet Circle Connector (Placeholder — Epic B5) ─────────────────

import { BaseConnector } from './base';
import { RawProduct } from './interface';

export class PetCircleConnector extends BaseConnector {
  name = 'PetCircle';
  sourceType = 'retailer';

  async fetchProducts(): Promise<RawProduct[]> {
    // TODO: Implement Pet Circle website scraping or API integration
    return [];
  }
}
