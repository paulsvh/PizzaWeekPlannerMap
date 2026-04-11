'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { FieldValue } from 'firebase-admin/firestore';
import { getDb } from '@/lib/firebase/admin';
import { createSession } from '@/lib/auth/session';
import { hashPassword, validatePasswordPolicy } from '@/lib/auth/password';
import { hashInviteToken, isInviteExpired } from '@/lib/auth/invites';

/**
 * Claim-invite Server Action.
 *
 * Flow:
 *   1. Hash the URL token, look up the invite doc by hashed ID
 *   2. Check expiry + un-claimed status
 *   3. Validate display name + password
 *   4. Hash password with argon2id
 *   5. Create the user doc (with role='user' — admins only come via CLI)
 *   6. Mark the invite as claimed (transaction: user doc + invite doc)
 *   7. Sign a session JWT and redirect to `/`
 */

const ClaimSchema = z.object({
  token: z.string().min(1),
  displayName: z
    .string()
    .trim()
    .min(1, { message: 'Display name is required.' })
    .max(40, { message: 'Display name must be 40 characters or less.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
  passwordConfirm: z.string().min(1),
});

export type ClaimState =
  | {
      errors?: {
        displayName?: string[];
        password?: string[];
        passwordConfirm?: string[];
        form?: string[];
      };
    }
  | undefined;

export async function claimInvite(
  _prev: ClaimState,
  formData: FormData,
): Promise<ClaimState> {
  const parsed = ClaimSchema.safeParse({
    token: formData.get('token'),
    displayName: formData.get('displayName'),
    password: formData.get('password'),
    passwordConfirm: formData.get('passwordConfirm'),
  });

  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const { token, displayName, password, passwordConfirm } = parsed.data;

  if (password !== passwordConfirm) {
    return { errors: { passwordConfirm: ['Passwords do not match.'] } };
  }

  const policyError = validatePasswordPolicy(password);
  if (policyError) {
    return { errors: { password: [policyError] } };
  }

  const db = getDb();
  const inviteHashId = hashInviteToken(token);
  const inviteRef = db.collection('invites').doc(inviteHashId);

  let userId: string;
  let email: string;
  let userRole: 'user' | 'admin' = 'user';

  try {
    // Use a transaction to atomically: read invite, verify it, create
    // the user, mark the invite claimed. Prevents double-claim races.
    const result = await db.runTransaction(async (tx) => {
      const inviteSnap = await tx.get(inviteRef);

      if (!inviteSnap.exists) {
        throw new ClaimError('This invite link is invalid or has already been revoked.');
      }

      const invite = inviteSnap.data()!;
      if (invite.claimedAt) {
        throw new ClaimError('This invite has already been claimed. Try logging in instead.');
      }
      if (typeof invite.expiresAt !== 'number' || isInviteExpired(invite.expiresAt)) {
        throw new ClaimError('This invite has expired. Ask an admin for a new one.');
      }
      if (typeof invite.email !== 'string') {
        throw new ClaimError('This invite is malformed. Ask an admin for a new one.');
      }

      const inviteEmail = invite.email as string;
      const emailLower = inviteEmail.toLowerCase();

      // Check no existing user with this email. We do this inside the
      // transaction so a concurrent claim can't beat us to it.
      const existing = await db
        .collection('users')
        .where('emailLower', '==', emailLower)
        .limit(1)
        .get();

      if (!existing.empty) {
        throw new ClaimError('An account with this email already exists. Try logging in instead.');
      }

      const passwordHash = await hashPassword(password);
      const newUserRef = db.collection('users').doc();

      tx.set(newUserRef, {
        email: inviteEmail,
        emailLower,
        displayName,
        displayNameLower: displayName.toLowerCase(),
        passwordHash,
        role: 'user',
        createdAt: FieldValue.serverTimestamp(),
        claimedAt: FieldValue.serverTimestamp(),
        lastLoginAt: FieldValue.serverTimestamp(),
      });

      tx.update(inviteRef, {
        claimedAt: FieldValue.serverTimestamp(),
        claimedByUserId: newUserRef.id,
      });

      return { userId: newUserRef.id, email: inviteEmail };
    });

    userId = result.userId;
    email = result.email;
  } catch (err) {
    if (err instanceof ClaimError) {
      return { errors: { form: [err.message] } };
    }
    console.error('[claim] transaction error:', err);
    return {
      errors: {
        form: ['Could not create your account. Please try again.'],
      },
    };
  }

  await createSession(userId, displayName, userRole);
  redirect('/');
}

class ClaimError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ClaimError';
  }
}
