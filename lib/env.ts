import 'server-only';

/**
 * Typed, validated access to server-side environment variables.
 *
 * Required variables throw a clear error at first use (not at import
 * time) so `next dev` can still start and render error pages when
 * config is incomplete. Optional variables return null or an empty
 * string without throwing.
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

function optional(name: string): string | null {
  const value = process.env[name];
  return value && value.length > 0 ? value : null;
}

export const env = {
  // Session signing
  get sessionSecret() {
    return required('SESSION_SECRET');
  },
  // App URL — used to build absolute invite links for emails
  get appUrl() {
    return required('APP_URL');
  },
  // Firebase Admin
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
  // Google Places (server-side scraper)
  get googlePlacesServerKey() {
    return required('GOOGLE_PLACES_SERVER_KEY');
  },
  // Resend — optional. When both are set, invite emails are sent
  // automatically; otherwise the admin panel shows a copy-link.
  get resendApiKey(): string | null {
    return optional('RESEND_API_KEY');
  },
  get resendFromEmail(): string | null {
    return optional('RESEND_FROM_EMAIL');
  },
  get isEmailConfigured(): boolean {
    return this.resendApiKey !== null && this.resendFromEmail !== null;
  },
};

export const publicEnv = {
  googleMapsBrowserKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY ?? '',
};
