import type { BootstrapRepo } from "../core/bootstrap";
import type { UserRecord } from "../core/types";

/** Claims from a Firebase ID token that the BACKEND verified (signature, audience, expiry). */
export interface VerifiedIdentity {
  /** Firebase uid: stable per Firebase project; bound to the account at first login. */
  uid: string;
  email: string;
  emailVerified: boolean;
  /** e.g. "google.com". Only Google sign-in is accepted. */
  provider: string;
}

export interface IdentityVerifier {
  verify(idToken: string): Promise<VerifiedIdentity>;
}

export interface UserStore extends BootstrapRepo {
  findById(id: string): Promise<UserRecord | undefined>;
}

export interface SessionStore {
  create(userId: string, ttlMs: number, now: Date): Promise<string>;
  resolve(token: string, now: Date): Promise<string | undefined>;
  revoke(token: string): Promise<void>;
  revokeAllForUser(userId: string): Promise<void>;
}
