/**
 * Pure utility functions shared across the codebase.
 * No server-only import — safe to use in tests and client code.
 */

/**
 * Escape HTML special characters to prevent XSS in email templates
 * and other raw HTML contexts.
 */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Convert a Firestore Timestamp (or plain number) to milliseconds.
 * Returns 0 for unrecognized types — safe default for display.
 */
export function timestampToMillis(value: unknown): number {
  if (typeof value === 'number') return value;
  if (
    typeof value === 'object' &&
    value !== null &&
    'toMillis' in value &&
    typeof (value as { toMillis: () => number }).toMillis === 'function'
  ) {
    return (value as { toMillis: () => number }).toMillis();
  }
  return 0;
}

/**
 * Type guard: checks if a value is an array of numbers.
 */
export function isNumberArray(value: unknown): value is number[] {
  return (
    Array.isArray(value) && value.every((v) => typeof v === 'number')
  );
}
