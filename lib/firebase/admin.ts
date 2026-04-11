import 'server-only';
import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { env } from '@/lib/env';

/**
 * Firebase Admin SDK singleton.
 *
 * Initialization is lazy: it only runs the first time `getDb()` is called,
 * so `next dev` can start cleanly even when env vars haven't been filled in
 * yet. The client/server boundary is enforced by `server-only`.
 */

let app: App | undefined;
let db: Firestore | undefined;

function getApp(): App {
  if (app) return app;

  const existing = getApps();
  if (existing.length > 0) {
    app = existing[0];
    return app;
  }

  app = initializeApp({
    credential: cert({
      projectId: env.firebaseProjectId,
      clientEmail: env.firebaseClientEmail,
      privateKey: env.firebasePrivateKey,
    }),
  });
  return app;
}

export function getDb(): Firestore {
  if (db) return db;
  db = getFirestore(getApp());
  return db;
}
