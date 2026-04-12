import { z } from 'zod';

/**
 * Admin invite creation form validation schema.
 * Extracted from app/admin/actions.ts for testability.
 */
export const CreateInviteSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email({ error: 'Enter a valid email address.' }),
});
