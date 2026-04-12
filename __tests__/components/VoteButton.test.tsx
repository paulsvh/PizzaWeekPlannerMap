// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VoteButton } from '@/app/routes/[routeId]/VoteButton';

// Mock next/navigation useRouter
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  })),
}));

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('VoteButton', () => {
  it('renders vote count and "Vote" when not voted', () => {
    render(
      <VoteButton routeId="route-1" initialVoted={false} initialVoteCount={3} />,
    );
    expect(screen.getByText('Vote')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders "Voted" when already voted', () => {
    render(
      <VoteButton routeId="route-1" initialVoted={true} initialVoteCount={5} />,
    );
    expect(screen.getByText('Voted')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('optimistically toggles to voted on click', async () => {
    const user = userEvent.setup();

    // Fetch that never resolves — we just want to test the optimistic state
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));

    render(
      <VoteButton routeId="route-1" initialVoted={false} initialVoteCount={3} />,
    );

    await user.click(screen.getByRole('button'));

    // Optimistic: should now show "Voted" and count 4
    expect(screen.getByText('Voted')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('reconciles with server response on success', async () => {
    const user = userEvent.setup();

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ voted: true, voteCount: 10 }),
    });

    render(
      <VoteButton routeId="route-1" initialVoted={false} initialVoteCount={3} />,
    );

    await user.click(screen.getByRole('button'));

    // Should reconcile to server's count of 10
    expect(await screen.findByText('10')).toBeInTheDocument();
    expect(screen.getByText('Voted')).toBeInTheDocument();
  });

  it('reverts on fetch error and shows error message', async () => {
    const user = userEvent.setup();

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Server error' }),
    });

    render(
      <VoteButton routeId="route-1" initialVoted={false} initialVoteCount={3} />,
    );

    await user.click(screen.getByRole('button'));

    // Should revert back to original state
    expect(await screen.findByText('Vote')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();

    // Error alert should be visible
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('button is disabled while pending', async () => {
    const user = userEvent.setup();

    // Fetch that never resolves to keep the button in pending state
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));

    render(
      <VoteButton routeId="route-1" initialVoted={false} initialVoteCount={3} />,
    );

    await user.click(screen.getByRole('button'));

    expect(screen.getByRole('button')).toBeDisabled();
  });
});
