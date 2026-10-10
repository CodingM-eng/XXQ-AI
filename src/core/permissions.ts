import { isSessionUsable } from "./access";
import type { UserRecord } from "./types";

/** Deny-by-default. Only active, unexpired accounts can hold permissions. */
export function hasPermission(actor: UserRecord, permission: string, now: Date): boolean {
  if (!isSessionUsable(actor, now)) return false;
  if (actor.isProtectedSuperAdmin) return true;
  return actor.grants.some(
    (g) =>
      g.permission === permission &&
      (g.expiresAt === null || g.expiresAt.getTime() > now.getTime()),
  );
}
