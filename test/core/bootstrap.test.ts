import { test } from "node:test";
import assert from "node:assert/strict";
import { ensureSuperAdmin, recoverSuperAdmin, DEFAULT_SUPER_ADMIN_EMAIL } from "../../src/core/bootstrap";
import { DomainError } from "../../src/core/errors";
import { MemoryRepo, NOW } from "./helpers";

test("default super administrator email is the required one", () => {
  assert.equal(DEFAULT_SUPER_ADMIN_EMAIL, "codingdevelopia@gmail.com");
});

test("bootstrap is idempotent: running it repeatedly yields exactly one protected super admin", async () => {
  const repo = new MemoryRepo();
  assert.equal(await ensureSuperAdmin(repo, "CodingDevelopia@gmail.com", NOW), "created");
  assert.equal(await ensureSuperAdmin(repo, undefined, NOW), "unchanged");
  assert.equal(await ensureSuperAdmin(repo, undefined, NOW), "unchanged");
  const protectedUsers = [...repo.users.values()].filter((u) => u.isProtectedSuperAdmin);
  assert.equal(protectedUsers.length, 1);
  assert.equal(protectedUsers[0]!.email, "codingdevelopia@gmail.com");
  assert.equal(protectedUsers[0]!.rankKey, "super_admin");
});

test("bootstrapped account starts as an invitation, not as an authenticated session", async () => {
  const repo = new MemoryRepo();
  await ensureSuperAdmin(repo, undefined, NOW);
  const u = (await repo.findByEmail("codingdevelopia@gmail.com"))!;
  assert.equal(u.status, "invited");
  assert.equal(u.googleSub, null);
});

test("bootstrap repairs a tampered account", async () => {
  const repo = new MemoryRepo();
  await ensureSuperAdmin(repo, undefined, NOW);
  const u = (await repo.findByEmail("codingdevelopia@gmail.com"))!;
  repo.users.set(u.id, { ...u, status: "suspended", rankKey: "member", googleSub: "g-1" });
  assert.equal(await ensureSuperAdmin(repo, undefined, NOW), "repaired");
  const fixed = repo.users.get(u.id)!;
  assert.equal(fixed.status, "active");
  assert.equal(fixed.rankKey, "super_admin");
});

test("bootstrap refuses to create a second protected super administrator", async () => {
  const repo = new MemoryRepo();
  await ensureSuperAdmin(repo, undefined, NOW);
  await assert.rejects(ensureSuperAdmin(repo, "someone.else@example.com", NOW),
    (e: unknown) => e instanceof DomainError && e.code === "bootstrap_conflict");
});

test("emergency recovery is disabled unless explicitly enabled by the environment", async () => {
  const repo = new MemoryRepo();
  await assert.rejects(recoverSuperAdmin(repo, {}, undefined, NOW),
    (e: unknown) => e instanceof DomainError && e.code === "recovery_disabled");
  await assert.rejects(recoverSuperAdmin(repo, { XXQ_ENABLE_RECOVERY: "yes" }, undefined, NOW),
    (e: unknown) => e instanceof DomainError && e.code === "recovery_disabled");
});

test("recovery restores the account, revokes its sessions, and writes an audit entry", async () => {
  const repo = new MemoryRepo();
  await ensureSuperAdmin(repo, undefined, NOW);
  const u = (await repo.findByEmail("codingdevelopia@gmail.com"))!;
  repo.users.set(u.id, { ...u, status: "revoked", googleSub: "g-1" });
  await recoverSuperAdmin(repo, { XXQ_ENABLE_RECOVERY: "true" }, undefined, NOW);
  assert.equal(repo.users.get(u.id)!.status, "active");
  assert.deepEqual(repo.revoked, [u.id]);
  assert.ok(repo.audits.some((a) => a.action === "bootstrap.recovered"));
});
