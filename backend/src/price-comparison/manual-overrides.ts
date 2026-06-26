import { ManualOfferOverride } from '../db/schema/manual_offer_overrides';

const FORBIDDEN_CONDITIONAL_FLAGS = new Set(['member_only', 'subscription', 'coupon', 'minimum_spend']);
const SAFE_OFFER_TYPE = 'single_pack';
const SAFE_PRICE_BASIS = 'total';

type OverrideEligibilityInput = {
  offer_type: string;
  price_basis: string;
  conditional_flags?: string[];
  base_price?: number | null;
  sale_price?: number | null;
  member_price?: number | null;
  subscription_price?: number | null;
  coupon_price?: number | null;
  minimum_spend?: number | null;
};

function conditionalFlagsFromUnknown(value: unknown): string[] {
  return Array.isArray(value) ? normalizeConditionalFlags(value.filter((entry): entry is string => typeof entry === 'string')) : [];
}

function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeConditionalFlags(value: string[] | undefined): string[] {
  if (!value) return [];
  return [...new Set(value.map((flag) => flag.trim().toLowerCase()).filter(Boolean))];
}

export function isOrdinaryBestPriceEligible(input: OverrideEligibilityInput): boolean {
  const conditionalFlags = new Set(normalizeConditionalFlags(input.conditional_flags));
  if (input.offer_type.trim().toLowerCase() !== SAFE_OFFER_TYPE) return false;
  if (input.price_basis.trim().toLowerCase() !== SAFE_PRICE_BASIS) return false;
  if ([...conditionalFlags].some((flag) => FORBIDDEN_CONDITIONAL_FLAGS.has(flag))) return false;
  if (numberOrNull(input.member_price) !== null) return false;
  if (numberOrNull(input.subscription_price) !== null) return false;
  if (numberOrNull(input.coupon_price) !== null) return false;
  if (numberOrNull(input.minimum_spend) !== null) return false;
  return numberOrNull(input.sale_price) !== null || numberOrNull(input.base_price) !== null;
}

export function manualOverrideEffectivePrice(override: Pick<ManualOfferOverride, 'sale_price' | 'base_price'>): number | null {
  return numberOrNull(override.sale_price) ?? numberOrNull(override.base_price);
}

export function isSafePublicManualOverride(
  override: Pick<
    ManualOfferOverride,
    | 'is_active'
    | 'ordinary_best_price_eligible'
    | 'offer_type'
    | 'price_basis'
    | 'conditional_flags'
    | 'member_price'
    | 'subscription_price'
    | 'coupon_price'
    | 'minimum_spend'
    | 'source_url'
    | 'product_slug'
    | 'pack_size_g'
    | 'total_pack_size_g'
    | 'base_price'
    | 'sale_price'
  >,
): boolean {
  if (!override.is_active) return false;
  if (!override.ordinary_best_price_eligible) return false;
  if (!override.source_url || override.source_url.trim().length === 0) return false;
  if (!override.product_slug || override.product_slug.trim().length === 0) return false;
  if (!Number.isFinite(override.pack_size_g) || override.pack_size_g <= 0) return false;
  const totalPackSize = override.total_pack_size_g ?? override.pack_size_g;
  if (!Number.isFinite(totalPackSize) || totalPackSize <= 0) return false;
  if (
    !isOrdinaryBestPriceEligible({
      offer_type: override.offer_type,
      price_basis: override.price_basis,
      conditional_flags: conditionalFlagsFromUnknown(override.conditional_flags),
      base_price: numberOrNull(override.base_price),
      sale_price: numberOrNull(override.sale_price),
      member_price: numberOrNull(override.member_price),
      subscription_price: numberOrNull(override.subscription_price),
      coupon_price: numberOrNull(override.coupon_price),
      minimum_spend: numberOrNull(override.minimum_spend),
    })
  ) {
    return false;
  }
  return manualOverrideEffectivePrice(override) !== null;
}

export function manualOverridePublicMetadata(override: Pick<ManualOfferOverride, 'id' | 'source_id' | 'source_url'>): Record<string, unknown> {
  return {
    source: 'manual_override_v1',
    source_type: 'manual_override',
    override_id: override.id,
    source_id: override.source_id ?? null,
    source_url: override.source_url,
  };
}
