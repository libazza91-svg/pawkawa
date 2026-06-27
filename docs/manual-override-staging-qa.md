# Sprint 3.1G - Manual Override Staging QA

## Scope

This QA pass validates manual offer overrides in the staging environment without changing the public API shape, public navigation, retailer coverage, SKU coverage, or ingestion behavior.

## Staging DB Migration Status

The staging database was migrated with the current backend migration chain.

Applied migrations:

- `000_baseline.sql`
- `002_add_price_layer.sql`
- `003_add_verification_layer.sql`
- `004_add_product_discovery_layer.sql`
- `005_add_price_comparison_core.sql`
- `006_add_admin_auth_foundation.sql`
- `007_add_admin_write_foundation.sql`
- `008_add_manual_offer_overrides_and_image_admin.sql`

Verified staging tables relevant to this QA:

- `admin_users`
- `admin_sessions`
- `admin_audit_logs`
- `manual_offer_overrides`

## QA Overrides Used

### Safe public override

Purpose:

- Confirm that a safe, ordinary-price-eligible manual override can appear on exactly one intended public price page.

Key characteristics:

- product slug: `royal-canin-indoor-adult-2000g`
- retailer slug: `qa-safe-manual`
- market: `AU`
- currency: `AUD`
- offer type: `single_pack`
- price basis: `total`
- conditional flags: none
- ordinary best price eligible: `true`
- active: `true`

### Unsafe admin-only override

Purpose:

- Confirm that a non-ordinary override remains admin-only and does not leak into the public comparison path.

Key characteristics:

- product slug: `royal-canin-fit-adult-2000g`
- retailer slug: `qa-unsafe-manual`
- market: `AU`
- currency: `AUD`
- offer type: `multi_pack`
- price basis: `total`
- conditional flags: `member_only`
- ordinary best price eligible: `false`
- active: `true`

## Public QA Result

### Safe override result

Checked public page:

- `/price/royal-canin-indoor-adult-2000g`

Expected result:

- safe override is included in public price comparison
- best price wording remains restrained
- override only affects the intended product page

Observed result:

- page showed `Best price found from tracked retailers`
- best price resolved to the safe override value
- best retailer resolved to `QA Manual Retailer`
- tracked offer count increased to include the safe override
- public offer table included the manual override row with retained `source_url`

Conclusion:

- PASS

### Unsafe override result

Checked public page:

- `/price/royal-canin-fit-adult-2000g`

Expected result:

- unsafe override does not appear in public price comparison
- public best price continues to come from tracked retailer data only

Observed result:

- best retailer remained one of the tracked retailers
- public offer count did not include the unsafe override
- no bundle/member-only override row appeared publicly

Conclusion:

- PASS

## Admin QA Result

Checked admin data path:

- authenticated `GET /api/admin/offers/overrides`

Observed result:

- safe override was visible in admin responses
- unsafe override was also visible in admin responses
- admin data preserved eligibility metadata, offer type, conditional flags, notes, and source URL

Note:

- The admin UI route was also checked in-browser, but the in-app browser session stayed on the admin session loading state without a persisted authenticated browser cookie. The authenticated admin API confirmed the override records were available for admin review.

Conclusion:

- PASS for admin data visibility
- browser-session persistence still depends on completing an authenticated admin browser session in staging

## Approval Workflow For Public-Safe Manual Overrides

Use this workflow before marking a manual override as eligible for ordinary public comparison:

1. Confirm exact product binding by canonical product slug or product id.
2. Confirm `source_url` points to the exact retailer product page being represented.
3. Confirm `offer_type = single_pack`.
4. Confirm `price_basis = total`.
5. Confirm there are no conditional flags for member, subscription, coupon, or minimum-spend pricing.
6. Confirm the public-facing price is a valid non-conditional base or sale price.
7. Confirm market and currency are correct for the target public page.
8. Record a clear `reason` and reviewer-facing `notes`.
9. Set `ordinary_best_price_eligible = true` only after review.
10. Spot-check the target public page after activation.

## Guardrail Summary

Safe overrides may enter public price comparison only when all eligibility checks pass.

Unsafe override types remain admin-only, including:

- `bundle`
- `multi_pack`
- `per_bag`
- `per_unit`
- member-only
- subscription
- coupon
- minimum-spend
- unknown offer type
- unknown price basis

## Remaining Risks

- QA override records are synthetic staging data and should be removed or replaced before broader external staging review if they are no longer needed.
- Admin browser-session QA is weaker than API QA until a stable authenticated browser session is preserved end-to-end in staging.
- Approval remains operational rather than role-based; a second-reviewer workflow is not yet enforced by the product.
