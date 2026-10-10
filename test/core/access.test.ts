import { test } from "node:test";
import assert from "node:assert/strict";
import { decideLogin, isSessionUsable } from "../../src/core/access";
import { normalizeEmail } from "../../src/core/email";
import { DomainError } from "../../src/core/errors";
import { makeUser, NOW } from "./helpers";

const ident = (over = {}) => ({ sub: "g-1", email: "User@Example.com ", emailVerified: true, ...over });

test("invited, verified user is allowed and activated; sub gets bound", () => {
  const d = decideLogin(makeUser({ status: "invited" }), ident(), NOW);
  assert.deepEqual(d, { allowed: true, activate: true, bindSub: true });
});

test("unknown email is denied even with a valid Google identity", () => {
  assert.deepEqual(decideLogin(undefined, ident(), NOW), { allowed: false, reason: "not_invited" });
});

test("email on record that differs from the token email is denied", () => {
  const d = decideLogin(makeUser({ email: "other@example.com" }), ident(), NOW);
  assert.deepEqual(d, { allowed: false, reason: "not_invited" });
});

test("unverified Google email is rejected", () => {
  const d = decideLogin(makeUser(), ident({ emailVerified: false }), NOW);
  assert.deepEqual(d, { allowed: false, reason: "unverified_email" });
});

test("bound Google sub must match", () => {
  const d = decideLogin(makeUser({ googleSub: "g-other" }), ident(), NOW);
  assert.deepEqual(d, { allowed: false, reason: "sub_mismatch" });
});

test("suspended, revoked, and expired accounts are denied", () => {
  assert.equal((decideLogin(makeUser({ status: "suspended" }), ident(), NOW) as any).reason, "suspended");
  assert.equal((decideLogin(makeUser({ status: "revoked" }), ident(), NOW) as any).reason, "revoked");
  assert.equal((decideLogin(makeUser({ status: "expired" }), ident(), NOW) as any).reason, "expired");
  const past = new Date(NOW.getTime() - 1000);
  assert.equal((decideLogin(makeUser({ expiresAt: past }), ident(), NOW) as any).reason, "expired");
});

test("a pending invitation is not a usable session; active, unexpired is", () => {
  assert.equal(isSessionUsable(makeUser({ status: "invited" }), NOW), false);
  assert.equal(isSessionUsable(makeUser(), NOW), true);
  assert.equal(isSessionUsable(undefined, NOW), false);
});

test("revocation and expiry take effect on the very next request", () => {
  const u = makeUser({ expiresAt: new Date(NOW.getTime() + 60_000) });
  assert.equal(isSessionUsable(u, NOW), true);
  assert.equal(isSessionUsable(u, new Date(NOW.getTime() + 61_000)), false);
  assert.equal(isSessionUsable({ ...u, status: "revoked" }, NOW), false);
});

test("normalizeEmail trims, lowercases, and rejects malformed input", () => {
  assert.equal(normalizeEmail("  CodingDevelopia@Gmail.com "), "codingdevelopia@gmail.com");
  assert.throws(() => normalizeEmail("not-an-email"), (e: unknown) => e instanceof DomainError && e.code === "invalid_email");
});
