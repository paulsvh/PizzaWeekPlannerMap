/**
 * seed-firestore.ts
 *
 * Reads data/restaurants.json, validates each row with Zod, and upserts
 * them into the `restaurants` collection in Firestore using the Admin
 * SDK. Idempotent: re-running overwrites docs by their slug id.
 *
 * Run:   npm run seed
 */

import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { RestaurantListSchema } from './restaurant-schema';

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Run with \`npm run seed\` (which loads .env.local via --env-file).`,
    );
  }
  return value;
}

async function main(): Promise<void> {
  const jsonPath = resolve(
    dirname(fileURLToPath(import.meta.url)),
    '..',
    'data',
    'restaurants.json',
  );

  console.log(`[1/3] Reading ${jsonPath}…`);
  const raw = await readFile(jsonPath, 'utf8');
  const parsed = JSON.parse(raw);

  console.log('[2/3] Validating with Zod…');
  const result = RestaurantListSchema.safeParse(parsed);
  if (!result.success) {
    console.error('Validation failed:');
    console.error(JSON.stringify(result.error.format(), null, 2));
    process.exit(1);
  }
  const restaurants = result.data;
  console.log(`      ${restaurants.length} valid rows`);

  console.log('[3/3] Upserting into Firestore…');
  if (getApps().length === 0) {
    initializeApp({
      credential: cert({
        projectId: requiredEnv('FIREBASE_PROJECT_ID'),
        clientEmail: requiredEnv('FIREBASE_CLIENT_EMAIL'),
        privateKey: requiredEnv('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n'),
      }),
    });
  }
  const db = getFirestore();

  // Firestore batch writes are capped at 500 ops. We have ≤ 71, so one batch.
  const batch = db.batch();
  const col = db.collection('restaurants');

  for (const r of restaurants) {
    const ref = col.doc(r.id);
    batch.set(
      ref,
      {
        ...r,
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }

  await batch.commit();

  console.log();
  console.log('────────────────────────────────────────');
  console.log(`   wrote: ${restaurants.length} restaurants`);
  console.log(`   into:  restaurants/{slug}`);
  console.log('────────────────────────────────────────');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
