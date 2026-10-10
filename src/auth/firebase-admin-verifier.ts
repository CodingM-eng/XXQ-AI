import type { IdentityVerifier, VerifiedIdentity } from "./ports";

/**
 * Verifies Firebase ID tokens with the Firebase Admin SDK (signature, issuer, audience,
 * expiry). Only the project id is needed for verification. firebase-admin is loaded lazily
 * so the rest of the code base (and the unit tests) run without it installed.
 */
export async function createFirebaseVerifier(projectId: string): Promise<IdentityVerifier> {
  const { initializeApp, getApps } = await import("firebase-admin/app");
  const { getAuth } = await import("firebase-admin/auth");
  const app = getApps()[0] ?? initializeApp({ projectId });
  const auth = getAuth(app);
  return {
    async verify(idToken: string): Promise<VerifiedIdentity> {
      const d = await auth.verifyIdToken(idToken);
      return {
        uid: d.uid,
        email: d.email ?? "",
        emailVerified: d.email_verified === true,
        provider: d.firebase?.sign_in_provider ?? "",
      };
    },
  };
}
