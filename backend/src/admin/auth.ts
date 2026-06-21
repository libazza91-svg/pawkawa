import { createHash, randomBytes } from 'crypto';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { db } from '../db/client';
import { adminSessions, adminUsers } from '../db/schema';
import {
  ADMIN_INVALID_CREDENTIALS_MESSAGE,
  ADMIN_ROLE,
  ADMIN_SESSION_DURATION_MS,
  ADMIN_STATUS_ACTIVE,
  ADMIN_STATUS_DISABLED,
} from './constants';
import { recordAdminAuditEvent } from './audit';
import { hashAdminPassword, normalizeAdminEmail, verifyAdminPassword } from './passwords';

export type AdminUserPublic = {
  id: number;
  email: string;
  name: string;
  role: string;
  status: string;
  last_login_at: Date | null;
};

export type AdminSessionContext = {
  sessionId: number;
  expiresAt: Date;
  adminUser: AdminUserPublic;
};

export function serializeAdminUser(user: typeof adminUsers.$inferSelect): AdminUserPublic {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    last_login_at: user.last_login_at ?? null,
  };
}

export function hashAdminSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function generateAdminSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

export async function createAdminUser(input: {
  email: string;
  name: string;
  password: string;
  role?: string;
  status?: string;
}): Promise<AdminUserPublic> {
  const email = normalizeAdminEmail(input.email);
  const existing = await db.select().from(adminUsers).where(eq(adminUsers.email, email));
  if (existing.length > 0) {
    throw new Error('Admin user already exists for this email.');
  }

  const passwordHash = await hashAdminPassword(input.password);
  const inserted = await db
    .insert(adminUsers)
    .values({
      email,
      name: input.name.trim(),
      password_hash: passwordHash,
      role: input.role ?? ADMIN_ROLE,
      status: input.status ?? ADMIN_STATUS_ACTIVE,
    })
    .returning({ id: adminUsers.id });

  const [createdUser] = await db.select().from(adminUsers).where(eq(adminUsers.id, inserted[0].id));
  if (!createdUser) {
    throw new Error('Failed to create admin user.');
  }

  await recordAdminAuditEvent({
    actorAdminUserId: null,
    action: 'admin_user_created_by_cli',
    entityType: 'admin_user',
    entityId: String(createdUser.id),
    afterJson: {
      email: createdUser.email,
      name: createdUser.name,
      role: createdUser.role,
      status: createdUser.status,
    },
  });

  return serializeAdminUser(createdUser);
}

export async function authenticateAdminCredentials(emailInput: string, password: string): Promise<AdminUserPublic | null> {
  const email = normalizeAdminEmail(emailInput);
  const [user] = await db.select().from(adminUsers).where(eq(adminUsers.email, email));

  if (!user || user.status !== ADMIN_STATUS_ACTIVE) {
    return null;
  }

  const matches = await verifyAdminPassword(password, user.password_hash);
  if (!matches) {
    return null;
  }

  await db.update(adminUsers).set({ last_login_at: new Date(), updated_at: new Date() }).where(eq(adminUsers.id, user.id));
  const [updatedUser] = await db.select().from(adminUsers).where(eq(adminUsers.id, user.id));
  return updatedUser ? serializeAdminUser(updatedUser) : serializeAdminUser(user);
}

export async function createAdminSession(adminUserId: number): Promise<{ token: string; expiresAt: Date }> {
  const token = generateAdminSessionToken();
  const tokenHash = hashAdminSessionToken(token);
  const expiresAt = new Date(Date.now() + ADMIN_SESSION_DURATION_MS);

  await db.insert(adminSessions).values({
    admin_user_id: adminUserId,
    session_token_hash: tokenHash,
    expires_at: expiresAt,
    last_seen_at: new Date(),
  });

  await recordAdminAuditEvent({
    actorAdminUserId: adminUserId,
    action: 'admin_login_success',
    entityType: 'admin_session',
    entityId: tokenHash,
    afterJson: { expires_at: expiresAt.toISOString() },
  });

  return { token, expiresAt };
}

export async function resolveAdminSession(token: string): Promise<AdminSessionContext | null> {
  const tokenHash = hashAdminSessionToken(token);
  const now = new Date();
  const [session] = await db
    .select()
    .from(adminSessions)
    .where(and(eq(adminSessions.session_token_hash, tokenHash), isNull(adminSessions.revoked_at), gt(adminSessions.expires_at, now)));

  if (!session) {
    return null;
  }

  const [user] = await db.select().from(adminUsers).where(eq(adminUsers.id, session.admin_user_id));
  if (!user || user.status === ADMIN_STATUS_DISABLED) {
    return null;
  }

  await db.update(adminSessions).set({ last_seen_at: now }).where(eq(adminSessions.id, session.id));

  return {
    sessionId: session.id,
    expiresAt: session.expires_at,
    adminUser: serializeAdminUser(user),
  };
}

export async function revokeAdminSession(sessionId: number, actorAdminUserId: number): Promise<void> {
  await db.update(adminSessions).set({ revoked_at: new Date(), last_seen_at: new Date() }).where(eq(adminSessions.id, sessionId));
  await recordAdminAuditEvent({
    actorAdminUserId,
    action: 'admin_logout',
    entityType: 'admin_session',
    entityId: String(sessionId),
  });
}

export function assertGenericAdminLoginFailure(): never {
  const error = new Error(ADMIN_INVALID_CREDENTIALS_MESSAGE);
  error.name = 'AdminInvalidCredentialsError';
  throw error;
}
