/**
 * Firebase ADMIN SDK — server-side only.
 * ONLY import this file in API routes (src/app/api/**).
 * Never import in client components, pages, or context providers.
 *
 * Lazy-initialized so Next.js build doesn't crash when env vars are placeholders.
 */
import { initializeApp, getApps, getApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

function getAdminApp() {
  if (getApps().length > 0) return getApp();

  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      // Handle both escaped \\n (from .env files) and literal newlines
      privateKey: privateKey?.includes("\\n")
        ? privateKey.replace(/\\n/g, "\n")
        : privateKey,
    }),
  });
}

// Lazy getters — only initialize when first accessed at request time
export const adminDb = new Proxy({} as ReturnType<typeof getFirestore>, {
  get(_, prop) {
    return (getFirestore(getAdminApp()) as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export const adminAuth = new Proxy({} as ReturnType<typeof getAuth>, {
  get(_, prop) {
    return (getAuth(getAdminApp()) as unknown as Record<string | symbol, unknown>)[prop];
  },
});
