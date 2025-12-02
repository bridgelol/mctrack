import { db, auditLogs } from '@mctrack/db';

export type AuditAction =
  | 'network.created'
  | 'network.updated'
  | 'network.deleted'
  | 'member.invited'
  | 'member.joined'
  | 'member.removed'
  | 'member.role_changed'
  | 'role.created'
  | 'role.updated'
  | 'role.deleted'
  | 'api_key.created'
  | 'api_key.revoked'
  | 'campaign.created'
  | 'campaign.updated'
  | 'campaign.archived'
  | 'webhook.created'
  | 'webhook.updated'
  | 'webhook.deleted'
  | 'alert.created'
  | 'alert.updated'
  | 'alert.deleted'
  | 'payment_provider.connected'
  | 'payment_provider.updated'
  | 'payment_provider.removed'
  | 'export.created';

export type AuditTargetType =
  | 'network'
  | 'member'
  | 'role'
  | 'api_key'
  | 'campaign'
  | 'webhook'
  | 'alert'
  | 'payment_provider'
  | 'export';

interface AuditLogOptions {
  networkId: string;
  userId: string | null;
  action: AuditAction;
  targetType?: AuditTargetType;
  targetId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

export async function logAuditEvent(options: AuditLogOptions): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      networkId: options.networkId,
      userId: options.userId,
      action: options.action,
      targetType: options.targetType ?? null,
      targetId: options.targetId ?? null,
      metadata: options.metadata ?? {},
      ipAddress: options.ipAddress ?? null,
    });
  } catch (error) {
    // Log but don't throw - audit logging should not break main operations
    console.error('Failed to log audit event:', error);
  }
}

// Middleware helper to extract request info for audit logging
export function getRequestAuditInfo(req: { ip?: string; headers: Record<string, string | string[] | undefined> }) {
  return {
    ipAddress: req.ip ?? req.headers['x-forwarded-for']?.toString().split(',')[0] ?? undefined,
    userAgent: req.headers['user-agent']?.toString() ?? undefined,
  };
}
