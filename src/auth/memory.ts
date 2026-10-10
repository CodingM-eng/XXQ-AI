import { createHash, randomBytes } from "node:crypto";
import type { AuditEntry } from "../core/bootstrap";
import type { UserRecord } from "../core/types";
import type { SessionStore, UserStore } from "./ports";

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

/** Development store. Data is lost on restart; the PostgreSQL adapter replaces it in Phase 2. */
export class MemorySessionStore implements SessionStore {
  private rows = new Map<string, { userId: string; expires: number }>();
  async create(userId: string, ttlMs: number, now: Date) {
    const token = randomBytes(32).toString("base64url");
    this.rows.set(sha256(token), { userId, expires: now.getTime() + ttlMs });
    return token; // only the hash is stored
  }
  async resolve(token: string, now: Date) {
    const row = this.rows.get(sha256(token));
    if (!row || row.expires <= now.getTime()) return undefined;
    return row.userId;
  }
  async revoke(token: string) { this.rows.delete(sha256(token)); }
  async revokeAllForUser(userId: string) {
    for (const [k, v] of this.rows) if (v.userId === userId) this.rows.delete(k);
  }
}

export class MemoryUserStore implements UserStore {
  users = new Map<string, UserRecord>();
  audits: AuditEntry[] = [];
  constructor(private sessions?: SessionStore) {}
  async findByEmail(email: string) { return [...this.users.values()].find((u) => u.email === email); }
  async findById(id: string) { return this.users.get(id); }
  async findProtectedSuperAdmin() { return [...this.users.values()].find((u) => u.isProtectedSuperAdmin); }
  async save(user: UserRecord) { this.users.set(user.id, user); }
  async revokeSessions(userId: string) { await this.sessions?.revokeAllForUser(userId); }
  async audit(entry: AuditEntry) { this.audits.push(entry); }
}
