# XXQ AI — Architecture and Plan (Phase 1)

## 1. Repository and environment inspection

- Repository: empty (greenfield). Nothing existing to preserve.
- Build environment: Ubuntu 24.04, 1 CPU, ~4 GB RAM, **no outbound network** (npm registry unreachable).

| Tool | Detected | Consequence |
|---|---|---|
| Node 22, npm 10, Python 3.12, git | yes | Core TypeScript can be developed and tested |
| TypeScript 6.0.3, tsx 4.21, React 19 (global) | yes | Test runner = `node:test` via `tsx` |
| Next.js, Prisma, pg, Zod, Tailwind, `@types/node` | **no (cannot be installed offline)** | Web app, ORM adapters, and typecheck cannot be verified in this environment |
| PostgreSQL, Redis, Docker | no | DB-backed behavior (migrations, row locking) cannot be verified here |
| JDK 21 (runtime only; no `javac`), Gradle, Android SDK | partial / no | Android and Website-to-APK builds cannot run here |
| Godot, .NET, Rust (Tauri), Windows toolchain | no | EXE and Godot builds cannot run here |

These results drive the status labels in `docs/STATUS.md`.

## 2. Architecture

Ports-and-adapters. Security-critical rules live in a dependency-free TypeScript **domain core** (`src/core`) that is unit-testable without a database or network. The Next.js app, Prisma/PostgreSQL repositories, and workers are adapters over that core and must call it on every protected request.

```
Browser (Turkish UI, no authority)
   │  cookie session (HttpOnly/Secure/SameSite)
Next.js routes ──► Zod validation ──► service layer ──► domain core (access, admin-guard, quota, verification)
                                              │
                                  PostgreSQL (sessions, users, ledger, audit; DB-level super-admin protection)
                                              │
                          job table (SKIP LOCKED) ──► isolated build workers (no network by default)
```

## 3. Deliverables mapped to phases

| # | Deliverable | Phase |
|---|---|---|
| 1 | Application source codebase | 2–6 |
| 2 | Turkish UI | 2 (catalog), 3–6 |
| 3 | Google OAuth flow | 2 |
| 4 | Super administrator bootstrap | 2 |
| 5 | Invitation-only authorization | 2 |
| 6 | Protected admin dashboard | 3 |
| 7 | Rank, permission, quota management | 3 |
| 8 | Secure Gemini configuration | 3–4 |
| 9 | AI chat workspace and provider adapters | 4 |
| 10 | Project library and editor | 5 |
| 11 | AI game and website generation | 5–6 |
| 12 | EXE/APK build pipelines | 6 |
| 13 | Website-to-APK | 6 |
| 14 | Migrations and seed/bootstrap scripts | 2 |
| 15 | `.env.example` | 2 |
| 16 | Automated tests | 2–7 |
| 17 | Setup and deployment docs | 7 |
| 18 | Security checklist | 7 |
| 19 | Feature status report | every gate, final in 7 |
