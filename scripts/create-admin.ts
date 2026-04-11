/**
 * create-admin.ts
 *
 * Bootstrap script to create the first admin user. Prompts for email,
 * display name, and password, hashes the password with argon2id, and
 * writes a user doc with role='admin' to Firestore.
 *
 * Also wipes any pre-existing user docs from the shared-passcode era
 * (any user doc without an `email` field) so the rebuild starts clean.
 *
 * Run:  npm run create-admin
 * Env:  loaded from .env.local via --env-file in the npm script
 */

import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { hash } from '@node-rs/argon2';

// ---- env loading (required vars) --------------------------------------

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. Run via \`npm run create-admin\`.`,
    );
  }
  return value;
}

// ---- password hashing (inlined so this script has no local imports
//      from lib/, which would require TypeScript transpilation) --------

const ARGON2_OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

async function hashPassword(plaintext: string): Promise<string> {
  return hash(plaintext, ARGON2_OPTIONS);
}

// ---- helpers ----------------------------------------------------------

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

async function promptHidden(
  rl: readline.Interface,
  question: string,
): Promise<string> {
  // Note: node:readline doesn't natively mask input. For a small
  // bootstrap script run once on your own machine this is acceptable;
  // the password will briefly appear on your own screen. If you want
  // true masking, install `read` or similar.
  return rl.question(question);
}

// ---- main -------------------------------------------------------------

async function main(): Promise<void> {
  console.log('');
  console.log('╔════════════════════════════════════════════╗');
  console.log('║  Pizza Week Planner — Admin Bootstrap      ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log('');

  // Initialize Firebase Admin
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

  // Wipe legacy user docs from the shared-passcode era (no email field)
  console.log('[1/4] Checking for legacy user docs…');
  const allUsers = await db.collection('users').get();
  const legacyDocs = allUsers.docs.filter((d) => {
    const data = d.data();
    return typeof data.email !== 'string';
  });

  if (legacyDocs.length > 0) {
    console.log(`      Found ${legacyDocs.length} legacy user doc(s) without an email field.`);
    for (const doc of legacyDocs) {
      console.log(
        `      Deleting: ${doc.id} (displayName: ${doc.data().displayName ?? '???'})`,
      );
      await doc.ref.delete();
    }
    console.log('      Done.');
  } else {
    console.log('      No legacy docs to clean up.');
  }

  const rl = readline.createInterface({ input, output });

  try {
    console.log('');
    console.log('[2/4] Enter admin account details.');
    console.log('');

    // Email
    let email = '';
    while (!email) {
      const raw = (await rl.question('Email:         ')).trim();
      if (!isValidEmail(raw)) {
        console.log('      ↳ Invalid email format. Try again.');
        continue;
      }
      const emailLower = raw.toLowerCase();
      // Uniqueness check
      const existing = await db
        .collection('users')
        .where('emailLower', '==', emailLower)
        .limit(1)
        .get();
      if (!existing.empty) {
        console.log('      ↳ A user with that email already exists. Aborting.');
        process.exit(1);
      }
      email = raw;
    }

    // Display name
    let displayName = '';
    while (!displayName) {
      const raw = (await rl.question('Display name:  ')).trim();
      if (raw.length === 0) {
        console.log('      ↳ Display name is required.');
        continue;
      }
      if (raw.length > 40) {
        console.log('      ↳ Display name must be 40 characters or less.');
        continue;
      }
      displayName = raw;
    }

    // Password
    let password = '';
    while (!password) {
      const raw = await promptHidden(rl, 'Password:      ');
      if (raw.length < 8) {
        console.log('      ↳ Password must be at least 8 characters.');
        continue;
      }
      const confirm = await promptHidden(rl, 'Confirm:       ');
      if (raw !== confirm) {
        console.log('      ↳ Passwords do not match.');
        continue;
      }
      password = raw;
    }

    console.log('');
    console.log('[3/4] Hashing password…');
    const passwordHash = await hashPassword(password);

    console.log('[4/4] Writing admin user doc to Firestore…');
    const newUserRef = db.collection('users').doc();
    await newUserRef.set({
      email,
      emailLower: email.toLowerCase(),
      displayName,
      displayNameLower: displayName.toLowerCase(),
      passwordHash,
      role: 'admin',
      createdAt: FieldValue.serverTimestamp(),
      claimedAt: FieldValue.serverTimestamp(),
      lastLoginAt: null,
    });

    console.log('');
    console.log('────────────────────────────────────────');
    console.log('   ✓ Admin user created!');
    console.log(`   ✓ Email:       ${email}`);
    console.log(`   ✓ Display:     ${displayName}`);
    console.log(`   ✓ User ID:     ${newUserRef.id}`);
    console.log('   ✓ Role:        admin');
    console.log('────────────────────────────────────────');
    console.log('');
    console.log('Next: run `npm run dev` and log in with these credentials.');
    console.log('Visit /admin to start inviting friends.');
    console.log('');
  } finally {
    rl.close();
  }
}

main().catch((err) => {
  console.error('');
  console.error('Fatal:', err instanceof Error ? err.message : err);
  process.exit(1);
});
