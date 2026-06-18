import { CurrencyCode, MarketConfig, MarketRegion } from './types';

export const DEFAULT_MARKET: MarketRegion = 'AU';

export const marketConfigs: MarketConfig[] = [
  {
    market: 'AU',
    currency: 'AUD',
    enabled: true,
    default_retailers: ['Pet Circle', 'Petbarn', 'Petstock', 'My Pet Warehouse'],
    status: 'ENABLED',
  },
  {
    market: 'NZ',
    currency: 'NZD',
    enabled: false,
    default_retailers: [],
    status: 'PENDING',
  },
];

export function isMarketRegion(value: unknown): value is MarketRegion {
  return value === 'AU' || value === 'NZ';
}

export function getMarketConfig(market: MarketRegion): MarketConfig {
  return marketConfigs.find((config) => config.market === market) ?? marketConfigs[0];
}

export function currencyForMarket(market: MarketRegion): CurrencyCode {
  return getMarketConfig(market).currency;
}

export function parseMarket(value: unknown): MarketRegion {
  return isMarketRegion(value) ? value : DEFAULT_MARKET;
}
