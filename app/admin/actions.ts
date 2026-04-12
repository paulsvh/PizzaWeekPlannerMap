'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { FieldValue } from 'firebase-admin/firestore';
import { getDb } from '@/lib/firebase/admin';
import { verifyAdminSession } from '@/lib/auth/dal';
import { env } from '@/lib/env';
import {
  buildInviteUrl,
  computeInviteExpiry,
  generateInviteToken,
  hashInviteToken,
} from '@/lib/auth/invites';
import { sendInviteEmail } from '@/lib/email/sender';
import { CreateInviteSchema } from '@/lib/validation/invite-schema';

/**
 * Admin Server Actions — all gated by verifyAdminSession() which 404s
 * non-admin callers. No client-side can invoke these without a valid
 * admin JWT cookie.
 */

export type CreateInviteState =
  | {
      errors?: {
        email?: string[];
        form?: string[];
      };
      success?: {
        email: string;
        inviteUrl: string;
        emailSent: boolean;
      };
    }
  | undefined;

export async function createInvite(
  _prev: CreateInviteState,
  formData: FormData,
): Promise<CreateInviteState> {
  const admin = await verifyAdminSession();

  const parsed = CreateInviteSchema.safeParse({
    email: formData.get('email'),
  });

  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const { email } = parsed.data;

  const db = getDb();

  // Fast-fail if a user already exists for this email.
  const existingUser = await db
    .collection('users')
    .where('emailLower', '==', email)
    .limit(1)
    .get();

  if (!existingUser.empty) {
    return {
      errors: {
        form: ['A user with that email already exists. No invite needed.'],
      },
    };
  }

  // Generate token + compute hashed doc ID
  const token = generateInviteToken();
  const hashedId = hashInviteToken(token);

  const expiresAt = computeInviteExpiry();
  const inviteUrl = buildInviteUrl(env.appUrl, token);

  try {
    await db.collection('invites').doc(hashedId).set({
      email,
      createdByUserId: admin.userId,
      createdByDisplayName: admin.displayName,
      createdAt: FieldValue.serverTimestamp(),
      expiresAt,
      claimedAt: null,
      claimedByUserId: null,
    });
  } catch (err) {
    console.error('[admin/createInvite] firestore error:', err);
    return {
      errors: { form: ['Failed to create the invite. Please try again.'] },
    };
  }

  // Try to send the email via Resend. If email isn't configured, this
  // returns { sent: false } without erroring — the admin panel will
  // show the copy-link button as the fallback.
  const result = await sendInviteEmail({
    toEmail: email,
    inviteUrl,
    inviterDisplayName: admin.displayName,
    expiresAt,
  });

  // Refresh the admin page so the new invite appears in the list.
  revalidatePath('/admin');

  return {
    success: {
      email,
      inviteUrl,
      emailSent: result.sent,
    },
  };
}

export async function revokeInvite(formData: FormData): Promise<void> {
  await verifyAdminSession();

  const inviteId = formData.get('inviteId');
  if (typeof inviteId !== 'string' || inviteId.length === 0) {
    return;
  }

  const db = getDb();
  const ref = db.collection('invites').doc(inviteId);
  const snap = await ref.get();

  if (!snap.exists) {
    return;
  }

  const data = snap.data()!;
  if (data.claimedAt) {
    // Refuse to delete claimed invites — they're historical records of
    // who was invited and when. Revoking a claimed user is a separate
    // action (not implemented yet).
    return;
  }

  await ref.delete();
  revalidatePath('/admin');
}
