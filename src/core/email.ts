import { DomainError } from "./errors";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Normalizes an email for identity comparison: trim + lowercase only.
 * Provider-specific alias folding (e.g. Gmail dots) is deliberately NOT applied;
 * after first login the stable Google `sub` is bound and checked as well.
 */
export function normalizeEmail(raw: string): string {
  const email = raw.trim().toLowerCase();
  if (email.length > 254 || !EMAIL_RE.test(email)) {
    throw new DomainError("invalid_email", "Invalid email address");
  }
  return email;
}
