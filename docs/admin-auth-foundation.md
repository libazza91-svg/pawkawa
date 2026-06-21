# Sprint 3.1A Admin Auth Foundation

This document records the minimum internal security and session rules introduced in Sprint 3.1A.

## Scope

Implemented:

- `POST /api/admin/auth/login`
- `POST /api/admin/auth/logout`
- `GET /api/admin/auth/me`
- admin session cookie
- admin auth middleware
- admin user creation CLI
- admin audit log foundation

Not implemented yet:

- admin UI
- broad admin write APIs
- CSRF token enforcement for future write routes

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

Sprint 3.1A only introduces auth endpoints.

Before enabling broad admin write routes such as product, offer, source, dictionary, image, or job mutations, the project must add CSRF protection for cookie-based authenticated requests.

Recommended options:

- double-submit CSRF token
- server-issued CSRF token with custom header validation

This is required before Admin Console write actions are exposed in a real internal environment.
