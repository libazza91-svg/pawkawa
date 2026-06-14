/**
 * Price Connectors — unified exports
 * Sprint 1.3C - P1
 */

export { BasePriceConnector, PriceResult, ConnectorConfig, SearchQuery } from './base-price-connector';
export { PetCircleConnector, PETCIRCLE_MOCK_PRICES } from './petcircle';
export { PetbarnConnector, PETBARN_MOCK_PRICES } from './petbarn';
export { PriceNormalizer, NormalizedPrice, NormalizationConfig } from './price-normalizer';
export { PriceVerifier, VerificationResult, VerificationConfig, BatchVerificationResult } from './price-verifier';
export { PricePipeline, SeedProduct, PipelineResult, SEED_PRODUCTS } from './price-pipeline';
export { computePriceMetrics, generateDashboardPayload, PriceMetrics } from './price-dashboard';
