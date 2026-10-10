import { test } from "node:test";
import assert from "node:assert/strict";
import { authorizeAdminOperation } from "../../src/core/admin-guard";
import { DomainError, type DomainErrorCode } from "../../src/core/errors";
import { makeUser, NOW } from "./helpers";

const superAdmin = makeUser({ id: "super", email: "codingdevelopia@gmail.com", rankKey: "super_admin", isProtectedSuperAdmin: true });
const grant = (...p: string[]) => p.map((permission) => ({ permission, expiresAt: null }));
const admin = makeUser({ id: "admin", rankKey: "admin", grants: grant("users.suspend", "users.revoke", "users.invite", "ranks.assign", "quota.manage", "users.delete", "users.edit") });
const member = makeUser({ id: "member" });

function expectCode(fn: () => void, code: DomainErrorCode) {
  assert.throws(fn, (e: unknown) => e instanceof DomainError && e.code === code);
}

test("ordinary admin operations cannot touch the protected super administrator", () => {
  for (const op of ["suspend", "revoke", "delete", "disable", "demote", "change_email", "change_rank", "expire", "remove_invitation"] as const) {
    expectCode(() => authorizeAdminOperation(admin, superAdmin, op, NOW), "protected_account");
  }
});

test("even the super administrator cannot demote or delete themselves", () => {
  expectCode(() => authorizeAdminOperation(superAdmin, superAdmin, "demote", NOW), "protected_account");
  expectCode(() => authorizeAdminOperation(superAdmin, superAdmin, "delete", NOW), "protected_account");
});

test("only the super administrator appoints or removes administrators", () => {
  expectCode(() => authorizeAdminOperation(admin, member, "appoint_admin", NOW), "super_admin_only");
  expectCode(() => authorizeAdminOperation(admin, member, "remove_admin", NOW), "super_admin_only");
  assert.doesNotThrow(() => authorizeAdminOperation(superAdmin, member, "appoint_admin", NOW));
});

test("users cannot change their own rank, quota, permissions, or status", () => {
  const dev = makeUser({ id: "dev", rankKey: "developer", grants: grant("ranks.assign", "quota.manage", "permissions.manage", "users.suspend") });
  for (const op of ["change_rank", "assign_rank", "set_quota", "grant_permission", "suspend"] as const) {
    expectCode(() => authorizeAdminOperation(dev, dev, op, NOW), "self_modification");
  }
});

test("an ordinary member has no administrative permissions (deny by default)", () => {
  expectCode(() => authorizeAdminOperation(member, makeUser(), "set_quota", NOW), "permission_denied");
  expectCode(() => authorizeAdminOperation(member, makeUser(), "invite", NOW), "permission_denied");
});

test("delegated admin may invite but never assign the Admin or Super Admin rank", () => {
  assert.doesNotThrow(() => authorizeAdminOperation(admin, makeUser(), "invite", NOW, { newRank: "member" }));
  expectCode(() => authorizeAdminOperation(admin, makeUser(), "invite", NOW, { newRank: "admin" }), "super_admin_only");
  expectCode(() => authorizeAdminOperation(admin, makeUser(), "assign_rank", NOW, { newRank: "super_admin" }), "rank_not_assignable");
  expectCode(() => authorizeAdminOperation(superAdmin, makeUser(), "assign_rank", NOW, { newRank: "super_admin" }), "rank_not_assignable");
});

test("temporary permission grants stop applying when they expire", () => {
  const temp = makeUser({ id: "temp", grants: [{ permission: "quota.manage", expiresAt: new Date(NOW.getTime() + 1000) }] });
  assert.doesNotThrow(() => authorizeAdminOperation(temp, makeUser(), "set_quota", NOW));
  expectCode(() => authorizeAdminOperation(temp, makeUser(), "set_quota", new Date(NOW.getTime() + 2000)), "permission_denied");
});

test("a suspended or revoked actor loses all permissions immediately", () => {
  expectCode(() => authorizeAdminOperation({ ...admin, status: "suspended" }, makeUser(), "invite", NOW), "not_authenticated");
  expectCode(() => authorizeAdminOperation({ ...admin, status: "revoked" }, makeUser(), "invite", NOW), "not_authenticated");
});
