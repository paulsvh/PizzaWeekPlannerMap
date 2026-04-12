import { z } from 'zod';

/**
 * Login form validation schema.
 * Extracted from app/login/actions.ts for testability.
 */
export const LoginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email({ error: 'Enter a valid email address.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
});
