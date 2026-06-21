import bcrypt from 'bcryptjs';
import { ADMIN_PASSWORD_MIN_LENGTH } from './constants';

export function normalizeAdminEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateAdminPassword(password: string): void {
  if (password.length < ADMIN_PASSWORD_MIN_LENGTH) {
    throw new Error(`Password must be at least ${ADMIN_PASSWORD_MIN_LENGTH} characters long.`);
  }
}

export async function hashAdminPassword(password: string): Promise<string> {
  validateAdminPassword(password);
  return bcrypt.hash(password, 12);
}

export async function verifyAdminPassword(password: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}
