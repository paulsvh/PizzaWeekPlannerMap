'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { FieldValue } from 'firebase-admin/firestore';
import { getDb } from '@/lib/firebase/admin';
import { createSession, deleteSession } from '@/lib/auth/session';
import { verifyPassword } from '@/lib/auth/password';
import type { UserRole } from '@/lib/types';

/**
 * Login Server Action — email + password flow.
 *
 * Looks up the user by a lowercased email (stored as `emailLower` on
 * the user doc), verifies the password hash with argon2id, updates
 * lastLoginAt, and signs a JWT session. Generic "invalid credentials"
 * errors for both missing-email and wrong-password cases so attackers
 * can't enumerate valid emails.
 */

const LoginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email({ error: 'Enter a valid email address.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
});

export type LoginState =
  | {
      errors?: {
        email?: string[];
        password?: string[];
        form?: string[];
      };
    }
  | undefined;

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const { email, password } = parsed.data;

  let userId: string;
  let displayName: string;
  let role: UserRole;

  try {
    const db = getDb();
    const snap = await db
      .collection('users')
      .where('emailLower', '==', email)
      .limit(1)
      .get();

    if (snap.empty) {
      // Deliberately vague — don't leak whether the email exists.
      return { errors: { form: ['Incorrect email or password.'] } };
    }

    const doc = snap.docs[0];
    const data = doc.data();

    if (typeof data.passwordHash !== 'string' || data.passwordHash.length === 0) {
      return { errors: { form: ['This account has no password set. Ask an admin to re-invite you.'] } };
    }

    const valid = await verifyPassword(password, data.passwordHash);
    if (!valid) {
      return { errors: { form: ['Incorrect email or password.'] } };
    }

    userId = doc.id;
    displayName = data.displayName ?? email;
    role = data.role === 'admin' ? 'admin' : 'user';

    // Stamp lastLoginAt — fire-and-forget, don't block the login flow.
    doc.ref.set({ lastLoginAt: FieldValue.serverTimestamp() }, { merge: true }).catch((err) => {
      console.error('[login] failed to update lastLoginAt:', err);
    });
  } catch (err) {
    console.error('[login] firestore error:', err);
    return {
      errors: {
        form: ['Could not reach the database. Check Firebase config and try again.'],
      },
    };
  }

  await createSession(userId, displayName, role);
  redirect('/');
}

export async function logout(): Promise<void> {
  await deleteSession();
  redirect('/login');
}
