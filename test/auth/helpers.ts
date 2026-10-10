import { randomUUID } from "node:crypto";
import type { IdentityVerifier, VerifiedIdentity } from "../../src/auth/ports";
import { MemorySessionStore, MemoryUserStore } from "../../src/auth/memory";
import { ensureSuperAdmin } from "../../src/core/bootstrap";

/** TEST DOUBLE ONLY: maps fake token strings to identities. Never used by server/main.ts. */
export class FakeVerifier implements IdentityVerifier {
  tokens = new Map<string, VerifiedIdentity>();
  async verify(t: string) {
    const id = this.tokens.get(t);
    if (!id) throw new Error("invalid token");
    return id;
  }
}
export const ident = (email: string, over: Partial<VerifiedIdentity> = {}): VerifiedIdentity =>
  ({ uid: "uid-" + email, email, emailVerified: true, provider: "google.com", ...over });

export async function setup() {
  const sessions = new MemorySessionStore();
  const users = new MemoryUserStore(sessions);
  const verifier = new FakeVerifier();
  await ensureSuperAdmin(users);
  const invite = (email: string, status: "invited" | "active" = "invited") =>
    users.save({ id: randomUUID(), email, googleSub: null, status, expiresAt: null, rankKey: "member", isProtectedSuperAdmin: false, grants: [] });
  const deps = { verifier, users, sessions, sessionTtlMs: 3600_000 };
  return { sessions, users, verifier, invite, deps };
}
