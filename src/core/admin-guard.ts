import { isSessionUsable } from "./access";
import { DomainError } from "./errors";
import { hasPermission } from "./permissions";
import type { UserRecord } from "./types";

export type AdminOp =
  | "invite"
  | "remove_invitation"
  | "suspend"
  | "reactivate"
  | "revoke"
  | "expire"
  | "delete"
  | "disable"
  | "demote"
  | "change_email"
  | "change_rank"
  | "assign_rank"
  | "set_quota"
  | "grant_permission"
  | "appoint_admin"
  | "remove_admin";

/** Operations that may never be applied to the protected super administrator. */
const PROTECTED_TARGET_OPS: ReadonlySet<AdminOp> = new Set([
  "remove_invitation", "suspend", "revoke", "expire", "delete", "disable",
  "demote", "change_email", "change_rank", "assign_rank",
]);

/** Operations only the protected super administrator may perform (not delegable). */
const SUPER_ONLY_OPS: ReadonlySet<AdminOp> = new Set(["appoint_admin", "remove_admin"]);

/** Operations nobody may apply to their own account. */
const SELF_FORBIDDEN_OPS: ReadonlySet<AdminOp> = new Set([
  "change_rank", "assign_rank", "set_quota", "grant_permission",
  "reactivate", "suspend", "revoke", "expire", "demote",
]);

const REQUIRED_PERMISSION: Record<Exclude<AdminOp, "appoint_admin" | "remove_admin">, string> = {
  invite: "users.invite",
  remove_invitation: "users.invite",
  suspend: "users.suspend",
  reactivate: "users.suspend",
  revoke: "users.revoke",
  expire: "users.revoke",
  delete: "users.delete",
  disable: "users.suspend",
  demote: "ranks.assign",
  change_email: "users.edit",
  change_rank: "ranks.assign",
  assign_rank: "ranks.assign",
  set_quota: "quota.manage",
  grant_permission: "permissions.manage",
};

/** Ranks that only the protected super administrator may hand out. */
const SUPER_ONLY_RANKS: ReadonlySet<string> = new Set(["admin"]);
/** Ranks nobody can be assigned in this release (single protected super administrator). */
const UNASSIGNABLE_RANKS: ReadonlySet<string> = new Set(["super_admin"]);

/**
 * Throws a DomainError unless `actor` may perform `op` on `target`.
 * Called from the service layer on every administrative endpoint; the database
 * additionally protects the super administrator row (see migrations).
 */
export function authorizeAdminOperation(
  actor: UserRecord,
  target: UserRecord,
  op: AdminOp,
  now: Date,
  opts: { newRank?: string } = {},
): void {
  if (!isSessionUsable(actor, now)) {
    throw new DomainError("not_authenticated", "Actor session is not usable");
  }
  if (target.isProtectedSuperAdmin && PROTECTED_TARGET_OPS.has(op)) {
    throw new DomainError("protected_account", `Operation '${op}' is not allowed on the protected account`);
  }
  if (SUPER_ONLY_OPS.has(op)) {
    if (!actor.isProtectedSuperAdmin) {
      throw new DomainError("super_admin_only", `Only the super administrator may '${op}'`);
    }
    return;
  }
  if (actor.id === target.id && SELF_FORBIDDEN_OPS.has(op)) {
    throw new DomainError("self_modification", `Users cannot '${op}' their own account`);
  }
  const permission = REQUIRED_PERMISSION[op as keyof typeof REQUIRED_PERMISSION];
  if (!hasPermission(actor, permission, now)) {
    throw new DomainError("permission_denied", `Missing permission '${permission}'`);
  }
  if ((op === "assign_rank" || op === "change_rank" || op === "invite") && opts.newRank !== undefined) {
    if (UNASSIGNABLE_RANKS.has(opts.newRank)) {
      throw new DomainError("rank_not_assignable", "The Super Admin rank cannot be assigned");
    }
    if (SUPER_ONLY_RANKS.has(opts.newRank) && !actor.isProtectedSuperAdmin) {
      throw new DomainError("super_admin_only", "Only the super administrator may assign the Admin rank");
    }
  }
}
