import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

const ADMIN_CSRF_DURATION_MS = 60 * 60 * 1000;

type AdminCsrfPayload = {
  sid: number;
  uid: number;
  exp: number;
  nonce: string;
};

function getAdminCsrfSecret(): string {
  const secret = process.env.ADMIN_CSRF_SECRET || process.env.SESSION_SECRET;
  if (secret) return secret;

  if (process.env.NODE_ENV === 'production') {
    throw new Error('ADMIN_CSRF_SECRET is required in production.');
  }

  return 'pawkawa-dev-admin-csrf-secret';
}

function encodeBase64Url(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function decodeBase64Url(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function signPayload(payload: string): string {
  return createHmac('sha256', getAdminCsrfSecret()).update(payload).digest('base64url');
}

function signaturesMatch(expected: string, actual: string): boolean {
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);
  return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
}

export function createAdminCsrfToken(input: { sessionId: number; adminUserId: number }): string {
  const payload: AdminCsrfPayload = {
    sid: input.sessionId,
    uid: input.adminUserId,
    exp: Date.now() + ADMIN_CSRF_DURATION_MS,
    nonce: randomBytes(16).toString('base64url'),
  };
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  return `${encodedPayload}.${signPayload(encodedPayload)}`;
}

export function validateAdminCsrfToken(
  token: string | undefined,
  input: { sessionId: number; adminUserId: number },
): boolean {
  if (!token) return false;

  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) return false;

  const expectedSignature = signPayload(encodedPayload);
  if (!signaturesMatch(expectedSignature, signature)) return false;

  try {
    const payload = JSON.parse(decodeBase64Url(encodedPayload)) as AdminCsrfPayload;
    return payload.sid === input.sessionId && payload.uid === input.adminUserId && payload.exp > Date.now();
  } catch {
    return false;
  }
}
