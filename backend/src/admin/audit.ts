import { db } from '../db/client';
import { adminAuditLogs } from '../db/schema';

export interface AdminAuditEvent {
  actorAdminUserId?: number | null;
  action: string;
  entityType: string;
  entityId: string;
  beforeJson?: unknown;
  afterJson?: unknown;
  reason?: string | null;
}

export async function recordAdminAuditEvent(event: AdminAuditEvent): Promise<void> {
  const normalizeJson = (value: unknown) => {
    if (value === undefined || value === null) return null;
    return JSON.stringify(value);
  };

  await db.insert(adminAuditLogs).values({
    actor_admin_user_id: event.actorAdminUserId ?? null,
    action: event.action,
    entity_type: event.entityType,
    entity_id: event.entityId,
    before_json: normalizeJson(event.beforeJson) as unknown as Record<string, unknown> | null,
    after_json: normalizeJson(event.afterJson) as unknown as Record<string, unknown> | null,
    reason: event.reason ?? null,
  });
}
