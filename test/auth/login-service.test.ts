import { test } from "node:test";
import assert from "node:assert/strict";
import { getSessionUser, loginWithIdToken } from "../../src/auth/login-service";
import { ident, setup } from "./helpers";

const TOKEN = "t".repeat(30);

test("invited Google user signs in, is activated, and gets a server session", async () => {
  const { deps, verifier, invite, users } = await setup();
  await invite("ayse@example.com");
  verifier.tokens.set(TOKEN, ident("Ayse@Example.com"));
  const r = await loginWithIdToken(deps, TOKEN);
  assert.ok(r.ok);
  if (r.ok) {
    assert.equal(r.user.status, "active");
    assert.equal((await getSessionUser(deps, r.token))?.email, "ayse@example.com");
  }
  assert.equal((await users.findByEmail("ayse@example.com"))?.googleSub, "uid-Ayse@Example.com");
});

test("authenticated Google user without an invitation is denied", async () => {
  const { deps, verifier } = await setup();
  verifier.tokens.set(TOKEN, ident("stranger@example.com"));
  const r = await loginWithIdToken(deps, TOKEN);
  assert.deepEqual(r.ok ? null : [r.status, r.code], [403, "not_invited"]);
});

test("invalid or forged token is rejected with 401", async () => {
  const { deps } = await setup();
  const r = await loginWithIdToken(deps, "forged-token-forged-token-xxxx");
  assert.deepEqual(r.ok ? null : [r.status, r.code], [401, "invalid_token"]);
});

test("non-Google providers and unverified emails are rejected", async () => {
  const { deps, verifier, invite } = await setup();
  await invite("a@example.com");
  verifier.tokens.set(TOKEN, ident("a@example.com", { provider: "password" }));
  assert.equal((await loginWithIdToken(deps, TOKEN) as any).code, "wrong_provider");
  verifier.tokens.set(TOKEN, ident("a@example.com", { emailVerified: false }));
  assert.equal((await loginWithIdToken(deps, TOKEN) as any).code, "unverified_email");
});

test("a different Firebase uid for an already-bound account is denied", async () => {
  const { deps, verifier, invite } = await setup();
  await invite("a@example.com");
  verifier.tokens.set(TOKEN, ident("a@example.com"));
  assert.ok((await loginWithIdToken(deps, TOKEN)).ok);
  verifier.tokens.set(TOKEN, ident("a@example.com", { uid: "attacker" }));
  assert.equal((await loginWithIdToken(deps, TOKEN) as any).code, "sub_mismatch");
});

test("super administrator signs in through the invitation created by bootstrap", async () => {
  const { deps, verifier } = await setup();
  verifier.tokens.set(TOKEN, ident("CodingDevelopia@gmail.com"));
  const r = await loginWithIdToken(deps, TOKEN);
  assert.ok(r.ok);
  if (r.ok) assert.equal(r.user.rankKey, "super_admin");
});

test("revoking or suspending a user ends access on the very next request", async () => {
  const { deps, verifier, invite, users, sessions } = await setup();
  await invite("a@example.com");
  verifier.tokens.set(TOKEN, ident("a@example.com"));
  const r = await loginWithIdToken(deps, TOKEN);
  assert.ok(r.ok);
  if (!r.ok) return;
  const u = (await users.findByEmail("a@example.com"))!;
  await users.save({ ...u, status: "suspended" });
  assert.equal(await getSessionUser(deps, r.token), undefined);
  await users.save({ ...u, status: "active" });
  assert.ok(await getSessionUser(deps, r.token));
  await sessions.revokeAllForUser(u.id);
  assert.equal(await getSessionUser(deps, r.token), undefined);
});

test("denied attempts are written to the audit log", async () => {
  const { deps, verifier, users } = await setup();
  verifier.tokens.set(TOKEN, ident("stranger@example.com"));
  await loginWithIdToken(deps, TOKEN);
  assert.ok(users.audits.some((a) => a.action === "auth.denied"));
});
