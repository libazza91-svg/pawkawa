# Sprint 3.1A Admin Auth Foundation

This document records the minimum internal security and session rules introduced in Sprint 3.1A.

## Scope

Implemented:

- `POST /api/admin/auth/login`
- `POST /api/admin/auth/logout`
- `GET /api/admin/auth/me`
- `GET /api/admin/auth/csrf`
- admin session cookie
- admin auth middleware
- admin CSRF helper/middleware foundation
- admin user creation CLI
- admin audit log foundation

Not implemented yet:

- broad admin write APIs
- product, offer, source, dictionary, image, or job admin screens

## Session Model

- Admin login uses email + password.
- Passwords are stored as hashes only.
- The server generates a random raw session token.
- Only the session token hash is stored in DB.
- The raw token is returned only in an HttpOnly cookie.

Cookie policy:

- `HttpOnly`
- `SameSite=Lax`
- `Secure` in production
- server-controlled expiry

## Login Safety

- Login failure uses the same generic message for unknown email, wrong password, and disabled users.
- A lightweight in-memory login rate limit is applied in 3.1A.
- This rate limit must move to a shared store before multi-instance production deployment.

## CSRF Requirement Before Broader Admin Writes

Sprint 3.1B introduces the CSRF foundation for cookie-based admin sessions.

Current CSRF flow:

- `GET /api/admin/auth/csrf` requires a valid admin session.
- The backend returns a signed CSRF token.
- The frontend should send the token in the `X-CSRF-Token` header for future admin write requests.
- The reusable `requireAdminCsrf` middleware validates the token against the authenticated admin session.

Before enabling broad admin write routes such as product, offer, source, dictionary, image, or job mutations, each mutation route must require both:

- `requireAdminAuth`
- `requireAdminCsrf`

The Sprint 3.1B admin shell fetches a CSRF token to verify the foundation is wired, but there are still no broad admin write APIs.

Security notes:

- `ADMIN_CSRF_SECRET` should be configured for staging/production.
- The development fallback secret is only for local development and tests.
- The in-memory login rate limit still needs a shared store before multi-instance production deployment.

## Product Image Storage

Sprint 3.1I adds backend-owned product image upload for the Admin Console.

Storage model:

- Supabase Storage bucket: `product-images`
- bucket mode: public-read for product image display
- upload actor: backend only, using Supabase service role credentials
- frontend receives only normal admin API responses and public image URLs
- `SUPABASE_SERVICE_ROLE_KEY` must never be exposed to frontend code

Required backend environment variables:

```env
SUPABASE_URL=https://PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=SUPABASE_SERVICE_ROLE_KEY_PLACEHOLDER
SUPABASE_STORAGE_BUCKET_PRODUCT_IMAGES=product-images
```

Upload behavior:

- `POST /api/admin/images/upload` requires `requireAdminAuth` and `requireAdminCsrf`.
- Accepted file types are JPEG, PNG, and WebP.
- Maximum upload size is 5MB.
- Product binding is required.
- Uploaded files are saved under `products/{product_id}/...`.
- `product_images` stores the public image URL and storage metadata.
- Upload, image creation, image update, and primary-image changes are recorded in `admin_audit_logs`.
