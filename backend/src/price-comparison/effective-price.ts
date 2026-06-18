import { RetailOffer, RetailOfferInput } from './types';

function isValidPrice(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function calculateUnitPricePerKg(price: number, packSizeG: number): number {
  if (!Number.isFinite(packSizeG) || packSizeG <= 0) return 0;
  return roundMoney((price / packSizeG) * 1000);
}

function getConditionalBestPrice(input: RetailOfferInput): { price?: number; reason?: string } {
  const conditionalPrices: Array<{ price: number; reason: string }> = [];

  if (isValidPrice(input.member_price) && !input.member_price_unconditional) {
    conditionalPrices.push({ price: input.member_price, reason: 'Requires membership' });
  }

  if (isValidPrice(input.coupon_price) && !input.coupon_unconditional) {
    conditionalPrices.push({
      price: input.coupon_price,
      reason: input.minimum_spend ? `Requires coupon and minimum spend of ${input.currency} ${input.minimum_spend}` : 'Requires coupon',
    });
  }

  const best = conditionalPrices.sort((a, b) => a.price - b.price)[0];
  return best ? { price: roundMoney(best.price), reason: best.reason } : {};
}

export function calculateEffectivePrice(input: RetailOfferInput): RetailOffer {
  const unconditionalCandidates = [input.base_price];

  if (isValidPrice(input.sale_price) && input.sale_price < input.base_price) {
    unconditionalCandidates.push(input.sale_price);
  }

  if (input.member_price_unconditional && isValidPrice(input.member_price)) {
    unconditionalCandidates.push(input.member_price);
  }

  if (input.coupon_unconditional && isValidPrice(input.coupon_price) && !input.minimum_spend) {
    unconditionalCandidates.push(input.coupon_price);
  }

  const effectivePrice = roundMoney(Math.min(...unconditionalCandidates));
  const conditional = getConditionalBestPrice(input);

  return {
    ...input,
    effective_price: effectivePrice,
    unit_price_per_kg: calculateUnitPricePerKg(effectivePrice, input.pack_size_g),
    conditional_best_price: conditional.price,
    conditional_price_reason: conditional.reason,
  };
}
