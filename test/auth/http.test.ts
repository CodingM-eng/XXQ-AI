import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { AddressInfo } from "node:net";
import { createHandler } from "../../server/app";
import { ident, setup } from "./helpers";

let server: http.Server, base: string, ctx: Awaited<ReturnType<typeof setup>>;
const T = "t".repeat(30);

before(async () => {
  ctx = await setup();
  const dir = mkdtempSync(path.join(tmpdir(), "xxq-"));
  writeFileSync(path.join(dir, "index.html"), "<h1>ok</h1>");
  writeFileSync(path.join(dir, ".secret"), "nope");
  server = http.createServer(createHandler(ctx.deps, { publicDir: dir, secureCookies: true }));
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => server.close());

const post = (p: string, body: unknown, headers: Record<string, string> = {}) =>
  fetch(base + p, { method: "POST", headers: { "Content-Type": "application/json", Origin: base, ...headers }, body: JSON.stringify(body) });

test("login sets an HttpOnly, SameSite, Secure cookie; /me, logout, and /me again", async () => {
  await ctx.invite("a@example.com");
  ctx.verifier.tokens.set(T, ident("a@example.com"));
  const r = await post("/api/auth/login", { idToken: T });
  assert.equal(r.status, 200);
  const sc = r.headers.get("set-cookie")!;
  assert.match(sc, /HttpOnly/); assert.match(sc, /SameSite=Lax/); assert.match(sc, /Secure/);
  const cookie = sc.split(";")[0]!;
  const me = await fetch(base + "/api/auth/me", { headers: { cookie } });
  assert.equal(me.status, 200);
  assert.equal(((await me.json()) as any).user.email, "a@example.com");
  await post("/api/auth/logout", {}, { cookie });
  assert.equal((await fetch(base + "/api/auth/me", { headers: { cookie } })).status, 401);
});

test("uninvited user gets 403 and a Turkish message, and no cookie", async () => {
  ctx.verifier.tokens.set(T, ident("nobody@example.com"));
  const r = await post("/api/auth/login", { idToken: T });
  assert.equal(r.status, 403);
  assert.equal(r.headers.get("set-cookie"), null);
  assert.match(((await r.json()) as any).message, /erişim yetkisi/);
});

test("forged token gets 401; malformed body gets 400", async () => {
  assert.equal((await post("/api/auth/login", { idToken: "x".repeat(40) })).status, 401);
  assert.equal((await post("/api/auth/login", { nope: 1 })).status, 400);
});

test("cross-origin or origin-less POST is refused before any token check", async () => {
  ctx.verifier.tokens.set(T, ident("a@example.com"));
  assert.equal((await post("/api/auth/login", { idToken: T }, { Origin: "https://evil.example" })).status, 403);
  const noOrigin = await fetch(base + "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idToken: T }) });
  assert.equal(noOrigin.status, 403);
});

test("oversized login body is rejected", async () => {
  const r = await post("/api/auth/login", { idToken: "x".repeat(40_000) }).catch(() => undefined);
  assert.ok(!r || r.status === 400);
});

test("static files are served; dotfiles and path traversal are not", async () => {
  assert.equal((await fetch(base + "/")).status, 200);
  assert.equal((await fetch(base + "/.secret")).status, 404);
  const raw = await new Promise<number>((resolve) => {
    http.get({ host: "127.0.0.1", port: (server.address() as AddressInfo).port, path: "/../../etc/passwd" }, (res) => { res.resume(); resolve(res.statusCode ?? 0); });
  });
  assert.equal(raw, 404);
});
