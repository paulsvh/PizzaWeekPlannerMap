// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { StarsProvider, useStars } from '@/components/context/StarsProvider';

// Helper component that exposes context values for testing.
function TestConsumer({ onRender }: { onRender: (ctx: ReturnType<typeof useStars>) => void }) {
  const ctx = useStars();
  onRender(ctx);
  return null;
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('StarsProvider', () => {
  it('provides initial starred IDs', () => {
    let ctx!: ReturnType<typeof useStars>;
    render(
      <StarsProvider initialStarredIds={['rest-a', 'rest-b']}>
        <TestConsumer onRender={(c) => { ctx = c; }} />
      </StarsProvider>,
    );
    expect(ctx.isStarred('rest-a')).toBe(true);
    expect(ctx.isStarred('rest-b')).toBe(true);
    expect(ctx.isStarred('rest-c')).toBe(false);
  });

  it('optimistically adds a star on toggle', async () => {
    // Mock fetch to resolve successfully
    global.fetch = vi.fn().mockResolvedValue({ ok: true });

    let ctx!: ReturnType<typeof useStars>;
    render(
      <StarsProvider initialStarredIds={[]}>
        <TestConsumer onRender={(c) => { ctx = c; }} />
      </StarsProvider>,
    );

    expect(ctx.isStarred('rest-a')).toBe(false);

    await act(async () => {
      await ctx.toggle('rest-a');
    });

    expect(ctx.isStarred('rest-a')).toBe(true);
  });

  it('optimistically removes a star on toggle', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true });

    let ctx!: ReturnType<typeof useStars>;
    render(
      <StarsProvider initialStarredIds={['rest-a']}>
        <TestConsumer onRender={(c) => { ctx = c; }} />
      </StarsProvider>,
    );

    expect(ctx.isStarred('rest-a')).toBe(true);

    await act(async () => {
      await ctx.toggle('rest-a');
    });

    expect(ctx.isStarred('rest-a')).toBe(false);
  });

  it('reverts star on fetch failure', async () => {
    // Suppress console.error for the expected revert log
    vi.spyOn(console, 'error').mockImplementation(() => {});
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });

    let ctx!: ReturnType<typeof useStars>;
    render(
      <StarsProvider initialStarredIds={[]}>
        <TestConsumer onRender={(c) => { ctx = c; }} />
      </StarsProvider>,
    );

    await act(async () => {
      await ctx.toggle('rest-a');
    });

    // Should have reverted back to not-starred
    expect(ctx.isStarred('rest-a')).toBe(false);
  });

  it('reverts star on network error', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    let ctx!: ReturnType<typeof useStars>;
    render(
      <StarsProvider initialStarredIds={['rest-a']}>
        <TestConsumer onRender={(c) => { ctx = c; }} />
      </StarsProvider>,
    );

    await act(async () => {
      await ctx.toggle('rest-a');
    });

    // Should have reverted back to starred
    expect(ctx.isStarred('rest-a')).toBe(true);
  });

  it('throws when useStars is used outside provider', () => {
    // Suppress error boundary console output
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      render(<TestConsumer onRender={() => {}} />);
    }).toThrow('useStars must be used inside a <StarsProvider>');
  });
});
