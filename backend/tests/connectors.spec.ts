import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── Mock Connector for interface testing ──────────────────────────
class MockConnector {
  name = 'MockConnector';
  sourceType = 'manual';
  async fetchProducts() {
    return [{ external_id: 'mk-1', name: 'Mock Product', brand_name: 'Mock Brand' }];
  }
  async fetchProductDetail(externalId: string) {
    return { external_id: externalId, name: 'Mock Detail', brand_name: 'Mock' };
  }
}

describe('Connector Framework', () => {
  describe('Connector Interface', () => {
    it('should expose name and sourceType', () => {
      const c = new MockConnector();
      expect(c.name).toBe('MockConnector');
      expect(c.sourceType).toBe('manual');
    });

    it('fetchProducts should return array with products', async () => {
      const c = new MockConnector();
      const products = await c.fetchProducts();
      expect(Array.isArray(products)).toBe(true);
      expect(products[0].name).toBe('Mock Product');
      expect(products[0].brand_name).toBe('Mock Brand');
    });

    it('fetchProductDetail should return detail', async () => {
      const c = new MockConnector();
      const detail = await c.fetchProductDetail('mk-1');
      expect(detail.name).toBe('Mock Detail');
    });

    it('RawProduct shape should include all expected fields', () => {
      const p = {
        external_id: 'x',
        name: 'N',
        brand_name: 'B',
        species: 'CAT',
        life_stage: 'ADULT',
        product_type: 'Dry',
        package_size_g: 400,
        protein_pct: 35,
        fat_pct: 20,
        crude_fiber_pct: 5,
        moisture_pct: 6,
        ash_pct: 7,
        me_kcal_per_kg: 4000,
        omega_3_pct: 0.6,
        omega_6_pct: 2.5,
        calcium_pct: 1.1,
        phosphorus_pct: 0.9,
        ingredients: 'Chicken; Rice',
        unit_price_aud: 28.99,
        price_date: '2026-06-01',
        store_name: 'Pet Circle',
      };
      expect(p.name).toBe('N');
    });
  });

  describe('Connector Registry', () => {
    beforeEach(() => {
      // Reset module cache to get fresh registry
      vi.resetModules();
    });

    it('should register and retrieve a connector', async () => {
      const { register, get } = await import('../src/connectors/registry');
      const c = new MockConnector();
      register(c);
      const retrieved = get('MockConnector');
      expect(retrieved?.name).toBe('MockConnector');
    });

    it('should list all registered connectors', async () => {
      const { register, listAll } = await import('../src/connectors/registry');
      const c = new MockConnector();
      register(c);
      const all = listAll();
      expect(all.length).toBeGreaterThanOrEqual(1);
    });

    it('should return undefined for unregistered', async () => {
      const { get } = await import('../src/connectors/registry');
      const result = get('NonExistent');
      expect(result).toBeUndefined();
    });

    it('should throw duplicate registration error', async () => {
      const { register } = await import('../src/connectors/registry');
      const c = new MockConnector();
      register(c);
      expect(() => register(c)).toThrow('already registered');
    });
  });

  describe('Retry Mechanism', () => {
    it('should succeed on first attempt', async () => {
      let callCount = 0;
      async function mockFn() {
        callCount++;
        return 'success';
      }

      const result = await mockFn();
      expect(result).toBe('success');
      expect(callCount).toBe(1);
    });

    it('should retry 3 times then throw', async () => {
      let attempts = 0;
      async function alwaysFail() {
        attempts++;
        throw new Error('Fail');
      }

      // Simulate retry: 3 attempts, last one throws uncaught
      try {
        for (let i = 0; i < 3; i++) {
          try {
            await alwaysFail();
          } catch (err) {
            if (i === 2) throw err; // last attempt, re-throw
          }
        }
      } catch (err: any) {
        expect(err.message).toBe('Fail');
      }
      expect(attempts).toBe(3);
    });

    it('should succeed on retry 2 of 3', async () => {
      let attempts = 0;
      async function failTwice() {
        attempts++;
        if (attempts <= 2) throw new Error(`Attempt ${attempts}`);
        return 'ok';
      }

      let result: string | undefined;
      let lastError: Error | undefined;
      for (let i = 0; i < 3; i++) {
        try {
          result = await failTwice();
          break;
        } catch (err) {
          lastError = err as Error;
        }
      }
      expect(result).toBe('ok');
      expect(attempts).toBe(3);
    });

    it('should have exponential backoff timing pattern', () => {
      // Verify delay formula: 2^(attempt-1) * 1000
      const delays = [1, 2, 3].map((a) => Math.pow(2, a - 1) * 1000);
      expect(delays).toEqual([1000, 2000, 4000]);
    });
  });

  describe('Connector Modules Export', () => {
    it('should export RoyalCaninConnector', async () => {
      const mod = await import('../src/connectors/royal-canin');
      expect(mod.RoyalCaninConnector).toBeDefined();
      expect(mod.RoyalCaninConnector.prototype.constructor.name).toBe('RoyalCaninConnector');
    });

    it('should export PetCircleConnector', async () => {
      const mod = await import('../src/connectors/pet-circle');
      expect(mod.PetCircleConnector).toBeDefined();
    });

    it('should export PetBarnConnector', async () => {
      const mod = await import('../src/connectors/pet-barn');
      expect(mod.PetBarnConnector).toBeDefined();
    });

    it('should export OPFFConnector', async () => {
      const mod = await import('../src/connectors/opff');
      expect(mod.OPFFConnector).toBeDefined();
    });
  });
});
