import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/auth/dal', () => ({
  verifySession: vi.fn(),
  verifyAdminSession: vi.fn(),
  verifySessionOrNull: vi.fn(),
}));

vi.mock('@/lib/firebase/votes', () => ({
  toggleVote: vi.fn(),
}));

import { verifySessionOrNull } from '@/lib/auth/dal';
import { toggleVote } from '@/lib/firebase/votes';
import { POST } from '@/app/api/routes/[routeId]/vote/route';
import { USER_SESSION } from '../../helpers/fixtures';

const mockedVerifySessionOrNull = vi.mocked(verifySessionOrNull);
const mockedToggleVote = vi.mocked(toggleVote);

function makeContext(routeId: string) {
  return { params: Promise.resolve({ routeId }) };
}

const req = new Request('http://localhost/api/routes/route-1/vote', {
  method: 'POST',
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/routes/[routeId]/vote', () => {
  it('returns 401 when unauthenticated', async () => {
    mockedVerifySessionOrNull.mockResolvedValue(null);
    const res = await POST(req, makeContext('route-1'));
    expect(res.status).toBe(401);
  });

  it('toggles vote on and returns voted + voteCount', async () => {
    mockedVerifySessionOrNull.mockResolvedValue(USER_SESSION);
    mockedToggleVote.mockResolvedValue({ voted: true, voteCount: 5 });
    const res = await POST(req, makeContext('route-1'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.voted).toBe(true);
    expect(body.voteCount).toBe(5);
  });

  it('toggles vote off', async () => {
    mockedVerifySessionOrNull.mockResolvedValue(USER_SESSION);
    mockedToggleVote.mockResolvedValue({ voted: false, voteCount: 4 });
    const res = await POST(req, makeContext('route-1'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.voted).toBe(false);
  });

  it('returns 404 when route does not exist', async () => {
    mockedVerifySessionOrNull.mockResolvedValue(USER_SESSION);
    mockedToggleVote.mockRejectedValue(new Error('Route xyz not found'));
    const res = await POST(req, makeContext('xyz'));
    expect(res.status).toBe(404);
  });

  it('returns 500 on generic Firestore error', async () => {
    mockedVerifySessionOrNull.mockResolvedValue(USER_SESSION);
    mockedToggleVote.mockRejectedValue(new Error('Transaction failed'));
    const res = await POST(req, makeContext('route-1'));
    expect(res.status).toBe(500);
  });
});
