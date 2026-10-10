# Decisions

| ID | Decision | Reason |
|---|---|---|
| D1 | Greenfield repository | Nothing existed to preserve |
| D2 | Security rules live in a dependency-free domain core with repository ports | No network: Next.js/Prisma/Zod cannot be installed here, so core logic is tested with `node:test` + in-memory repos. Adapters must still be installed and verified on a networked machine |
| D3 | Job queue = PostgreSQL job table with `FOR UPDATE SKIP LOCKED`, not Redis | Fewer services; Redis is optional per spec |
| D4 | Quota day/month windows use `Europe/Istanbul` by default (configurable) | Turkish-language product |
| D5 | One protected Super Admin; no path creates another; admin appointment is not delegable | Spec: only the super administrator appoints admins |
| D6 | Admins hold only explicitly delegated permissions; may invite but never assign Admin/Super Admin | Resolves spec ambiguity |
| D7 | Email identity = trim + lowercase; Google `sub` bound at first login and checked afterwards | Prevents alias/recycled-email takeover |
| D8 | Bootstrapped account starts as `invited` and activates only via verified Google login | No password, no public admin route |
| D9 | Test runner = `node:test` through `tsx` | Available offline |
