/** Stable machine-readable error codes. UI maps codes to Turkish text via src/i18n/tr.ts. */
export type DomainErrorCode =
  | "not_authenticated"
  | "protected_account"
  | "self_modification"
  | "permission_denied"
  | "super_admin_only"
  | "rank_not_assignable"
  | "invalid_email"
  | "bootstrap_conflict"
  | "recovery_disabled";

export class DomainError extends Error {
  constructor(public readonly code: DomainErrorCode, message: string) {
    super(message);
    this.name = "DomainError";
  }
}
