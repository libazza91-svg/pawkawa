import type { Request, Response } from 'express';
import { ADMIN_SESSION_COOKIE_NAME, ADMIN_SESSION_DURATION_MS } from './constants';

export function parseCookieHeader(headerValue?: string): Record<string, string> {
  if (!headerValue) return {};

  return headerValue
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((acc, part) => {
      const separatorIndex = part.indexOf('=');
      if (separatorIndex === -1) return acc;
      const key = decodeURIComponent(part.slice(0, separatorIndex).trim());
      const value = decodeURIComponent(part.slice(separatorIndex + 1).trim());
      acc[key] = value;
      return acc;
    }, {});
}

export function readAdminSessionToken(req: Request): string | null {
  const cookies = parseCookieHeader(req.headers.cookie);
  return cookies[ADMIN_SESSION_COOKIE_NAME] || null;
}

function buildCookieOptions(expiresAt?: Date) {
  const expires = expiresAt || new Date(Date.now() + ADMIN_SESSION_DURATION_MS);

  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    expires,
    path: '/',
  };
}

export function setAdminSessionCookie(res: Response, token: string, expiresAt?: Date): void {
  res.cookie(ADMIN_SESSION_COOKIE_NAME, token, buildCookieOptions(expiresAt));
}

export function clearAdminSessionCookie(res: Response): void {
  res.clearCookie(ADMIN_SESSION_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
}
