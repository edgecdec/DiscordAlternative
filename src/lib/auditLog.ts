import { prisma } from "@/lib/db";

export type AuditAction =
  | "member_kick"
  | "member_role_change"
  | "channel_create"
  | "channel_delete"
  | "message_delete"
  | "server_update";

export function logAudit(
  serverId: string,
  userId: string,
  action: AuditAction,
  targetId?: string,
  details?: Record<string, unknown>
): Promise<unknown> {
  return prisma.auditLog.create({
    data: {
      serverId,
      userId,
      action,
      targetId: targetId ?? null,
      details: details ? JSON.stringify(details) : null,
    },
  });
}
