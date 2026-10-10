import { decideLogin, isSessionUsable, type DenyReason } from "../core/access";
import { normalizeEmail } from "../core/email";
import type { UserRecord } from "../core/types";
import type { IdentityVerifier, SessionStore, UserStore } from "./ports";

export interface LoginDeps {
  verifier: IdentityVerifier;
  users: UserStore;
  sessions: SessionStore;
  sessionTtlMs: number;
  now?: () => Date;
}

export interface PublicUser { email: string; rankKey: string; status: string }

export type LoginFailure = DenyReason | "invalid_token" | "wrong_provider";
export type LoginResult =
  | { ok: true; token: string; user: PublicUser }
  | { ok: false; status: 401 | 403; code: LoginFailure };

export const toPublic = (u: UserRecord): PublicUser => ({ email: u.email, rankKey: u.rankKey, status: u.status });

/**
 * Exchanges a Firebase ID token for a server-side session. Firebase only proves WHO the
 * person is; whether they may enter is decided here from the invitation record.
 */
export async function loginWithIdToken(deps: LoginDeps, idToken: string): Promise<LoginResult> {
  const now = (deps.now ?? (() => new Date()))();
  let id;
  try {
    id = await deps.verifier.verify(idToken);
  } catch {
    return { ok: false, status: 401, code: "invalid_token" };
  }
  if (id.provider !== "google.com") return { ok: false, status: 403, code: "wrong_provider" };

  let email: string;
  try { email = normalizeEmail(id.email); } catch { return { ok: false, status: 403, code: "not_invited" }; }

  const user = await deps.users.findByEmail(email);
  const decision = decideLogin(user, { sub: id.uid, email, emailVerified: id.emailVerified }, now);
  if (!decision.allowed || !user) {
    const code = decision.allowed ? "not_invited" : decision.reason;
    await deps.users.audit({ action: "auth.denied", actorId: null, targetId: user?.id ?? null, at: now, detail: { reason: code } });
    return { ok: false, status: 403, code };
  }
  const updated: UserRecord = {
    ...user,
    googleSub: decision.bindSub ? id.uid : user.googleSub,
    status: decision.activate ? "active" : user.status,
  };
  await deps.users.save(updated);
  const token = await deps.sessions.create(updated.id, deps.sessionTtlMs, now);
  await deps.users.audit({ action: "auth.login", actorId: updated.id, targetId: updated.id, at: now });
  return { ok: true, token, user: toPublic(updated) };
}

/** Run on EVERY protected request: the role and status always come from the store, never the client. */
export async function getSessionUser(deps: LoginDeps, token: string | undefined): Promise<UserRecord | undefined> {
  if (!token) return undefined;
  const now = (deps.now ?? (() => new Date()))();
  const userId = await deps.sessions.resolve(token, now);
  if (!userId) return undefined;
  const user = await deps.users.findById(userId);
  return isSessionUsable(user, now) ? user : undefined;
}
