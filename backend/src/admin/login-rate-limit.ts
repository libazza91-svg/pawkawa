import { ADMIN_LOGIN_MAX_ATTEMPTS, ADMIN_LOGIN_WINDOW_MS } from './constants';

type LoginAttemptState = {
  attempts: number;
  firstAttemptAt: number;
};

const attempts = new Map<string, LoginAttemptState>();

function nowMs() {
  return Date.now();
}

function getBucketKey(email: string, ip: string): string {
  return `${email}::${ip}`;
}

export function assertAdminLoginAllowed(email: string, ip: string): void {
  const key = getBucketKey(email, ip);
  const state = attempts.get(key);
  if (!state) return;

  const age = nowMs() - state.firstAttemptAt;
  if (age > ADMIN_LOGIN_WINDOW_MS) {
    attempts.delete(key);
    return;
  }

  if (state.attempts >= ADMIN_LOGIN_MAX_ATTEMPTS) {
    throw new Error('Too many login attempts. Please try again later.');
  }
}

export function registerAdminLoginFailure(email: string, ip: string): void {
  const key = getBucketKey(email, ip);
  const state = attempts.get(key);
  if (!state) {
    attempts.set(key, { attempts: 1, firstAttemptAt: nowMs() });
    return;
  }

  const age = nowMs() - state.firstAttemptAt;
  if (age > ADMIN_LOGIN_WINDOW_MS) {
    attempts.set(key, { attempts: 1, firstAttemptAt: nowMs() });
    return;
  }

  attempts.set(key, { ...state, attempts: state.attempts + 1 });
}

export function clearAdminLoginFailures(email: string, ip: string): void {
  attempts.delete(getBucketKey(email, ip));
}

export function resetAdminLoginRateLimitForTests(): void {
  attempts.clear();
}
