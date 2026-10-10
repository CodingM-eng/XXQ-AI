# Feature Status (after Phase 1 and the Phase 2 domain core)

Vocabulary: **Working** (verified by an executed test or run here) · **Partial** · **Needs external configuration** · **Not implemented**

| Feature | Status | Evidence / what is missing |
|---|---|---|
| Phase 1 plan and toolchain detection | Working | `docs/ARCHITECTURE.md`, `docs/DECISIONS.md` |
| Login decision logic (invitation, verified email, sub binding, suspended/revoked/expired) | Working | `test/core/access.test.ts` — 9 tests pass |
| Per-request session usability (pending invite is not a session; revocation/expiry immediate) | Working | same file |
| Admin operation guard (protected super admin, self-modification block, delegation, temp grants, rank limits) | Working | `test/core/admin-guard.test.ts` — 8 tests pass |
| Idempotent super-admin bootstrap and env-gated recovery (against an in-memory repo) | Working | `test/core/bootstrap.test.ts` — 7 tests pass |
| Turkish message catalog (auth/admin errors, quota labels) | Partial | Strings exist; no UI renders them yet |
| Typecheck | Needs external configuration | `@types/node` unavailable offline; `tsc` exited with TS2688 |
| Firebase Google login: token exchange, invitation check, server session cookie, logout, per-request status check (service + HTTP layer, fake verifier) | Working | `test/auth/*.test.ts` — 14 tests pass |
| Real Firebase token verification (`firebase-admin`) and browser popup sign-in | Needs external configuration | Needs `npm install`, a Firebase project, and filling `public/firebase-config.js`; not run here |
| PostgreSQL schema, migrations, DB-level super-admin protection | Not implemented | Next in Phase 2 |
| Google OAuth (token validation, sessions, cookies) | Not implemented | Needs Google credentials to verify live |
| Next.js UI, admin dashboard, AI workspace, quotas, projects, builders, Website-to-APK | Not implemented | Phases 2–6 |
| `.env.example`, setup docs, security checklist | Not implemented | Phases 2 and 7 |

Phase 2 exit criteria are **not yet met** (no migrations, no OAuth, no running app).
