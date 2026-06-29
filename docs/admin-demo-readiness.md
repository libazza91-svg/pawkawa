# Admin Demo Readiness

Status: Sprint 3.1J cleanup note

## Scope

This note captures the admin-demo cleanup required before showing the Admin Console or public price pages to external testers.

## Storage Credential Safety

Supabase Storage upload is configured through ignored local environment variables only:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_STORAGE_BUCKET_PRODUCT_IMAGES
```

The service role key must not be committed, logged, screenshotted, or exposed to the frontend. If the key has been pasted into chat or any external tool, rotate it in Supabase before an external demo, then update `backend/.env` locally.

After rotation, verify Storage access with a small upload/delete smoke check against the `product-images` bucket.

## Staging QA Data Cleanup

Before external demo:

- QA manual offer overrides must be inactive.
- QA manual overrides must not be eligible for ordinary best-price ranking.
- QA uploaded product images must be disabled or clearly marked as internal QA.
- QA uploaded images must not remain primary product images.

Current known QA records:

```text
qa-safe-manual
qa-unsafe-manual
QA uploaded product image 3.1I
QA uploaded product image 3.1I debug
```

## Public Page Check

Before demo, spot-check public price responses for:

```text
/price/royal-canin-indoor-adult-2000g
/price/royal-canin-fit-adult-2000g
/price/royal-canin-indoor-adult-4000g
/price/black-hawk-indoor-chicken-rice-2000g
```

Expected:

- no `QA Manual Retailer`
- no `qa-safe-manual`
- no `qa-unsafe-manual`
- best price comes from tracked retailer or approved production-safe override only

## Admin Images Check

After product master baseline seed and Storage configuration:

- `/admin/images` should show product options.
- Upload should write a `product_images` row.
- Primary image selection should update `is_primary`.
- Audit log should capture image upload and primary set events.

For demo, avoid using QA image rows as primary public-facing assets unless they have been reviewed and approved.
