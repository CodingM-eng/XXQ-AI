export type AccountStatus = "invited" | "active" | "suspended" | "revoked" | "expired";

export interface PermissionGrant {
  permission: string;
  /** null = permanent; otherwise a temporary grant that stops applying at this instant. */
  expiresAt: Date | null;
}

export interface UserRecord {
  id: string;
  /** Normalized (trimmed, lowercased). */
  email: string;
  /** Stable Google subject; null until first successful login. */
  googleSub: string | null;
  status: AccountStatus;
  expiresAt: Date | null;
  rankKey: string;
  /** True only for the single bootstrap-provisioned super administrator. */
  isProtectedSuperAdmin: boolean;
  grants: PermissionGrant[];
}

/** Claims taken from an ID token that the BACKEND has already cryptographically validated. */
export interface GoogleIdentity {
  sub: string;
  email: string;
  emailVerified: boolean;
}
