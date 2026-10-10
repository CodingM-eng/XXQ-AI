import { randomUUID } from "node:crypto";
import { normalizeEmail } from "./email";
import { DomainError } from "./errors";
import type { UserRecord } from "./types";

export const DEFAULT_SUPER_ADMIN_EMAIL = "codingdevelopia@gmail.com";

export interface AuditEntry {
  action: string;
  actorId: string | null;
  targetId: string | null;
  at: Date;
  detail?: Record<string, unknown>;
}

/** Persistence port. The PostgreSQL adapter implements it; tests use an in-memory one. */
export interface BootstrapRepo {
  findByEmail(email: string): Promise<UserRecord | undefined>;
  findProtectedSuperAdmin(): Promise<UserRecord | undefined>;
  save(user: UserRecord): Promise<void>;
  revokeSessions(userId: string): Promise<void>;
  audit(entry: AuditEntry): Promise<void>;
}

export type BootstrapResult = "created" | "repaired" | "unchanged";

/**
 * Idempotent: running it any number of times yields exactly one protected super
 * administrator. No password is created and no HTTP route calls this. The account
 * only becomes usable after the owner signs in with the matching verified Google account.
 */
export async function ensureSuperAdmin(
  repo: BootstrapRepo,
  rawEmail: string = DEFAULT_SUPER_ADMIN_EMAIL,
  now: Date = new Date(),
): Promise<BootstrapResult> {
  const email = normalizeEmail(rawEmail);
  const existingProtected = await repo.findProtectedSuperAdmin();
  if (existingProtected && existingProtected.email !== email) {
    throw new DomainError(
      "bootstrap_conflict",
      "A different protected super administrator already exists; use the recovery procedure",
    );
  }
  const existing = existingProtected ?? (await repo.findByEmail(email));
  if (!existing) {
    await repo.save({
      id: randomUUID(), email, googleSub: null, status: "invited", expiresAt: null,
      rankKey: "super_admin", isProtectedSuperAdmin: true, grants: [],
    });
    await repo.audit({ action: "bootstrap.created", actorId: null, targetId: null, at: now });
    return "created";
  }
  const healthy =
    existing.isProtectedSuperAdmin && existing.rankKey === "super_admin" &&
    existing.status !== "suspended" && existing.status !== "revoked" &&
    existing.status !== "expired" && existing.expiresAt === null;
  if (healthy) return "unchanged";
  await repo.save({
    ...existing, isProtectedSuperAdmin: true, rankKey: "super_admin", expiresAt: null,
    status: existing.googleSub === null ? "invited" : "active",
  });
  await repo.audit({ action: "bootstrap.repaired", actorId: null, targetId: existing.id, at: now });
  return "repaired";
}

/**
 * Environment-gated emergency recovery (command line only, disabled by default).
 * Restores the configured account's super-admin role and active status, revokes
 * its sessions, and writes an audit entry.
 */
export async function recoverSuperAdmin(
  repo: BootstrapRepo,
  env: { XXQ_ENABLE_RECOVERY?: string },
  rawEmail: string = DEFAULT_SUPER_ADMIN_EMAIL,
  now: Date = new Date(),
): Promise<void> {
  if (env.XXQ_ENABLE_RECOVERY !== "true") {
    throw new DomainError("recovery_disabled", "Recovery is disabled; set XXQ_ENABLE_RECOVERY=true on the server");
  }
  const email = normalizeEmail(rawEmail);
  const user = (await repo.findProtectedSuperAdmin()) ?? (await repo.findByEmail(email));
  if (!user) {
    await ensureSuperAdmin(repo, email, now);
  } else {
    await repo.save({
      ...user, email, isProtectedSuperAdmin: true, rankKey: "super_admin", expiresAt: null,
      status: user.googleSub === null ? "invited" : "active",
    });
    await repo.revokeSessions(user.id);
  }
  await repo.audit({ action: "bootstrap.recovered", actorId: null, targetId: user?.id ?? null, at: now });
}
