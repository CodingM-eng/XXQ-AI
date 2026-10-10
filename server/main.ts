import http from "node:http";
import path from "node:path";
import { createFirebaseVerifier } from "../src/auth/firebase-admin-verifier";
import { MemorySessionStore, MemoryUserStore } from "../src/auth/memory";
import { normalizeEmail } from "../src/core/email";
import { ensureSuperAdmin, DEFAULT_SUPER_ADMIN_EMAIL } from "../src/core/bootstrap";
import { createHandler } from "./app";
import { randomUUID } from "node:crypto";

const projectId = process.env.FIREBASE_PROJECT_ID;
if (!projectId) { console.error("FIREBASE_PROJECT_ID is required (see .env.example)"); process.exit(1); }

const sessions = new MemorySessionStore();
const users = new MemoryUserStore(sessions);
await ensureSuperAdmin(users, process.env.SUPER_ADMIN_EMAIL ?? DEFAULT_SUPER_ADMIN_EMAIL);

// Development invitations (comma-separated). Real invitations live in PostgreSQL (Phase 2/3).
for (const raw of (process.env.XXQ_INVITES ?? "").split(",").map((s) => s.trim()).filter(Boolean)) {
  const email = normalizeEmail(raw);
  if (!(await users.findByEmail(email))) {
    await users.save({ id: randomUUID(), email, googleSub: null, status: "invited", expiresAt: null, rankKey: "member", isProtectedSuperAdmin: false, grants: [] });
  }
}

const handler = createHandler(
  { verifier: await createFirebaseVerifier(projectId), users, sessions, sessionTtlMs: 7 * 24 * 3600 * 1000 },
  { publicDir: path.resolve("public"), secureCookies: process.env.XXQ_COOKIE_SECURE !== "false" },
);
const port = Number(process.env.PORT ?? 3000), host = process.env.HOST ?? "127.0.0.1";
http.createServer(handler).listen(port, host, () => console.log(`XXQ AI dev server: http://${host}:${port}`));
