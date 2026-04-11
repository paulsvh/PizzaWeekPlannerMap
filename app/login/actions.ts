'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { timingSafeEqual } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { env } from '@/lib/env';
import { getDb } from '@/lib/firebase/admin';
import { createSession, deleteSession } from '@/lib/auth/session';

/**
 * Login Server Action.
 *
 * Flow:
 *   1. Validate passcode + display name with zod.
 *   2. Constant-time compare passcode against APP_PASSCODE env var.
 *   3. Look up (or create) a user doc in Firestore keyed by display name
 *      within the shared-passcode group — so friends get their stars/routes
 *      back when they log in from a new device.
 *   4. Sign a JWT and set the session cookie.
 *   5. Redirect to `/`.
 */

const LoginSchema = z.object({
  passcode: z.string().min(1, { message: 'Passcode is required.' }),
  displayName: z
    .string()
    .trim()
    .min(1, { message: 'Display name is required.' })
    .max(40, { message: 'Display name must be 40 characters or less.' }),
});

export type LoginState = {
  errors?: {
    passcode?: string[];
    displayName?: string[];
    form?: string[];
  };
} | undefined;

function constantTimeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, 'utf8');
  const bBuf = Buffer.from(b, 'utf8');
  if (aBuf.length !== bBuf.length) {
    // Still do a dummy compare to reduce timing leaks on length.
    timingSafeEqual(aBuf, aBuf);
    return false;
  }
  return timingSafeEqual(aBuf, bBuf);
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = LoginSchema.safeParse({
    passcode: formData.get('passcode'),
    displayName: formData.get('displayName'),
  });

  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const { passcode, displayName } = parsed.data;

  if (!constantTimeEqual(passcode, env.appPasscode)) {
    return { errors: { form: ['Incorrect passcode.'] } };
  }

  // Look up an existing user by display name (case-insensitive) or create one.
  let userId: string;
  try {
    const db = getDb();
    const normalized = displayName.toLowerCase();
    const existing = await db
      .collection('users')
      .where('displayNameLower', '==', normalized)
      .limit(1)
      .get();

    if (!existing.empty) {
      userId = existing.docs[0].id;
    } else {
      const newDoc = db.collection('users').doc();
      await newDoc.set({
        displayName,
        displayNameLower: normalized,
        createdAt: FieldValue.serverTimestamp(),
      });
      userId = newDoc.id;
    }
  } catch (err) {
    console.error('login: firestore error', err);
    return {
      errors: {
        form: ['Could not reach the database. Check Firebase config and try again.'],
      },
    };
  }

  await createSession(userId, displayName);
  redirect('/');
}

export async function logout(): Promise<void> {
  await deleteSession();
  redirect('/login');
}
