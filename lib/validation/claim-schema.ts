import { z } from 'zod';

/**
 * Invite claim form validation schema.
 * Extracted from app/invite/[token]/actions.ts for testability.
 */
export const ClaimSchema = z.object({
  token: z.string().min(1),
  displayName: z
    .string()
    .trim()
    .min(1, { message: 'Display name is required.' })
    .max(40, { message: 'Display name must be 40 characters or less.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
  passwordConfirm: z.string().min(1),
});
