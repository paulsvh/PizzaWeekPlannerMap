import { describe, it, expect } from 'vitest';
import { escapeHtml, timestampToMillis, isNumberArray } from '@/lib/utils';

describe('escapeHtml', () => {
  it('escapes ampersands', () => {
    expect(escapeHtml('a&b')).toBe('a&amp;b');
  });

  it('escapes angle brackets', () => {
    expect(escapeHtml('<div>')).toBe('&lt;div&gt;');
  });

  it('escapes double quotes', () => {
    expect(escapeHtml('a"b')).toBe('a&quot;b');
  });

  it('escapes single quotes', () => {
    expect(escapeHtml("a'b")).toBe('a&#39;b');
  });

  it('passes through strings with no special chars', () => {
    expect(escapeHtml('hello world')).toBe('hello world');
  });

  it('handles a full XSS payload', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;',
    );
  });
});

describe('timestampToMillis', () => {
  it('returns the number directly for numeric input', () => {
    expect(timestampToMillis(1234567890)).toBe(1234567890);
  });

  it('calls toMillis() on Firestore-like Timestamp objects', () => {
    const fakeTimestamp = { toMillis: () => 9999 };
    expect(timestampToMillis(fakeTimestamp)).toBe(9999);
  });

  it('returns 0 for null', () => {
    expect(timestampToMillis(null)).toBe(0);
  });

  it('returns 0 for undefined', () => {
    expect(timestampToMillis(undefined)).toBe(0);
  });

  it('returns 0 for strings', () => {
    expect(timestampToMillis('not a timestamp')).toBe(0);
  });
});

describe('isNumberArray', () => {
  it('returns true for an array of numbers', () => {
    expect(isNumberArray([1, 2, 3])).toBe(true);
  });

  it('returns true for empty array', () => {
    expect(isNumberArray([])).toBe(true);
  });

  it('returns false for mixed array', () => {
    expect(isNumberArray([1, 'two', 3])).toBe(false);
  });

  it('returns false for non-array', () => {
    expect(isNumberArray('not array')).toBe(false);
    expect(isNumberArray(null)).toBe(false);
    expect(isNumberArray(undefined)).toBe(false);
  });
});
