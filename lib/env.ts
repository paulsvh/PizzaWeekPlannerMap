import 'server-only';

/**
 * Typed, validated access to server-side environment variables.
 *
 * Throws a clear error at first use (not at import time) when a required
 * variable is missing, so `next dev` can still start and render error pages.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Set it in .env.local (see .env.local.example).`,
    );
  }
  return value;
}

export const env = {
  get appPasscode() {
    return required('APP_PASSCODE');
  },
  get sessionSecret() {
    return required('SESSION_SECRET');
  },
  get firebaseProjectId() {
    return required('FIREBASE_PROJECT_ID');
  },
  get firebaseClientEmail() {
    return required('FIREBASE_CLIENT_EMAIL');
  },
  get firebasePrivateKey() {
    // Support both literal newlines (Vercel UI paste) and escaped \n (.env.local)
    return required('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n');
  },
};

export const publicEnv = {
  googleMapsBrowserKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY ?? '',
};
