# Security

## Authentication model

This app uses invite-only registration with individual user accounts:

- **Passwords** are hashed with argon2id (OWASP 2024 recommended parameters: 19 MiB memory, 2 iterations).
- **Sessions** are stateless JWTs signed with HS256, stored in HttpOnly / Secure / SameSite=Lax cookies (30-day expiry).
- **Roles** (user/admin) are sealed inside the JWT — they cannot be tampered with client-side.
- **Invites** use 32-byte random tokens; only the SHA-256 hash is stored in the database.

## Google Maps API key

The `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY` is a client-side key that is intentionally public (it ships to every browser that loads the app). To prevent abuse, restrict it in the Google Cloud Console:

1. **Application restriction**: HTTP referrer — add your production domain(s) and `http://localhost:3000/*`.
2. **API restriction**: allow only "Maps JavaScript API" and "Directions API".

The server-side `GOOGLE_PLACES_SERVER_KEY` must never be exposed to the client. It is protected by the `server-only` module boundary.

## Known audit findings

`npm audit` reports low-severity findings in `@tootallnate/once`, a transitive dependency of `firebase-admin`. These are DoS-class issues in an HTTP proxy agent used only for server-side Firestore connections and are not exploitable from user input. They will be resolved when `firebase-admin` updates its dependency tree.

## Rate limiting

In production behind Vercel, the Edge Network provides baseline DDoS protection. For self-hosted deployments, consider adding an in-memory or Redis-backed rate limiter on the login and invite-claim endpoints (5 attempts per IP per 15 minutes is a reasonable starting point).

## Reporting a vulnerability

If you discover a security issue, please open a GitHub issue or email the maintainer directly. Do not disclose publicly until a fix is available.
