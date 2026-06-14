// ── Pet Barn Connector (Placeholder — Epic B5) ───────────────────

import { BaseConnector } from './base';
import { RawProduct } from './interface';

export class PetBarnConnector extends BaseConnector {
  name = 'PetBarn';
  sourceType = 'retailer';

  async fetchProducts(): Promise<RawProduct[]> {
    // TODO: Implement Pet Barn website scraping or API integration
    return [];
  }
}
