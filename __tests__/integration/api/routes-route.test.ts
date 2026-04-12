import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/auth/dal', () => ({
  verifySession: vi.fn(),
  verifyAdminSession: vi.fn(),
  verifySessionOrNull: vi.fn(),
}));

vi.mock('@/lib/firebase/routes', () => ({
  saveRoute: vi.fn(),
}));

import { verifySessionOrNull } from '@/lib/auth/dal';
import { saveRoute } from '@/lib/firebase/routes';
import { POST } from '@/app/api/routes/route';
import { USER_SESSION, VALID_ROUTE_PAYLOAD } from '../../helpers/fixtures';

const mockedVerifySessionOrNull = vi.mocked(verifySessionOrNull);
const mockedSaveRoute = vi.mocked(saveRoute);

beforeEach(() => {
  vi.clearAllMocks();
});

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/routes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/routes', () => {
  it('returns 401 when unauthenticated', async () => {
    mockedVerifySessionOrNull.mockResolvedValue(null);
    const res = await POST(makeRequest(VALID_ROUTE_PAYLOAD));
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid JSON', async () => {
    mockedVerifySessionOrNull.mockResolvedValue(USER_SESSION);
    const req = new Request('http://localhost/api/routes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for validation failures', async () => {
    mockedVerifySessionOrNull.mockResolvedValue(USER_SESSION);
    const res = await POST(
      makeRequest({ ...VALID_ROUTE_PAYLOAD, stopRestaurantIds: ['only-one'] }),
    );
    expect(res.status).toBe(400);
  });

  it('returns routeId on success', async () => {
    mockedVerifySessionOrNull.mockResolvedValue(USER_SESSION);
    mockedSaveRoute.mockResolvedValue('new-route-id');
    const res = await POST(makeRequest(VALID_ROUTE_PAYLOAD));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.routeId).toBe('new-route-id');
  });

  it('returns 500 on Firestore error', async () => {
    mockedVerifySessionOrNull.mockResolvedValue(USER_SESSION);
    mockedSaveRoute.mockRejectedValue(new Error('DB error'));
    const res = await POST(makeRequest(VALID_ROUTE_PAYLOAD));
    expect(res.status).toBe(500);
  });
});
