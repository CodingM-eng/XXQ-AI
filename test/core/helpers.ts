import type { BootstrapRepo, AuditEntry } from "../../src/core/bootstrap";
import type { UserRecord } from "../../src/core/types";

export const NOW = new Date("2026-10-10T12:00:00Z");

export function makeUser(over: Partial<UserRecord> = {}): UserRecord {
  return {
    id: "u-" + Math.random().toString(36).slice(2, 8),
    email: "user@example.com",
    googleSub: null,
    status: "active",
    expiresAt: null,
    rankKey: "member",
    isProtectedSuperAdmin: false,
    grants: [],
    ...over,
  };
}

export class MemoryRepo implements BootstrapRepo {
  users = new Map<string, UserRecord>();
  audits: AuditEntry[] = [];
  revoked: string[] = [];
  async findByEmail(email: string) {
    return [...this.users.values()].find((u) => u.email === email);
  }
  async findProtectedSuperAdmin() {
    return [...this.users.values()].find((u) => u.isProtectedSuperAdmin);
  }
  async save(user: UserRecord) { this.users.set(user.id, user); }
  async revokeSessions(userId: string) { this.revoked.push(userId); }
  async audit(entry: AuditEntry) { this.audits.push(entry); }
}
