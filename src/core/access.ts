import { normalizeEmail } from "./email";
import type { GoogleIdentity, UserRecord } from "./types";

export type DenyReason =
  | "unverified_email"
  | "not_invited"
  | "sub_mismatch"
  | "suspended"
  | "revoked"
  | "expired";

export type LoginDecision =
  | { allowed: true; activate: boolean; bindSub: boolean }
  | { allowed: false; reason: DenyReason };

function isExpired(user: UserRecord, now: Date): boolean {
  // The protected super administrator never expires.
  if (user.isProtectedSuperAdmin) return false;
  return user.expiresAt !== null && user.expiresAt.getTime() <= now.getTime();
}

/**
 * Decides whether a Google sign-in may create a session.
 * Google authentication alone never grants access: an administrator-created
 * record must exist, match the verified email, and be in an admissible status.
 */
export function decideLogin(
  user: UserRecord | undefined,
  identity: GoogleIdentity,
  now: Date,
): LoginDecision {
  if (!identity.emailVerified) return { allowed: false, reason: "unverified_email" };
  if (!user || user.email !== normalizeEmail(identity.email)) {
    return { allowed: false, reason: "not_invited" };
  }
  if (user.googleSub !== null && user.googleSub !== identity.sub) {
    return { allowed: false, reason: "sub_mismatch" };
  }
  if (user.status === "suspended") return { allowed: false, reason: "suspended" };
  if (user.status === "revoked") return { allowed: false, reason: "revoked" };
  if (user.status === "expired" && !user.isProtectedSuperAdmin) {
    return { allowed: false, reason: "expired" };
  }
  if (isExpired(user, now)) return { allowed: false, reason: "expired" };
  return {
    allowed: true,
    activate: user.status === "invited",
    bindSub: user.googleSub === null,
  };
}

/**
 * Re-checked on EVERY protected request using the user row freshly loaded from the
 * database. Role and status are never taken from the client. A pending invitation
 * ("invited") is not an authenticated session.
 */
export function isSessionUsable(user: UserRecord | undefined, now: Date): boolean {
  if (!user) return false;
  if (user.status !== "active") return false;
  return !isExpired(user, now);
}
