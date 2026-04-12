import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/auth/dal', () => ({
  verifySession: vi.fn(),
  verifyAdminSession: vi.fn(),
  verifySessionOrNull: vi.fn(),
}));

vi.mock('@/lib/firebase/routes', () => ({
  getRouteById: vi.fn(),
  updateRoute: vi.fn(),
}));

import { verifySessionOrNull } from '@/lib/auth/dal';
import { getRouteById, updateRoute } from '@/lib/firebase/routes';
import { PATCH } from '@/app/api/routes/[routeId]/route';
import {
  USER_SESSION,
  ADMIN_SESSION,
  VALID_ROUTE_PAYLOAD,
} from '../../helpers/fixtures';
import type { Route } from '@/lib/types';

const mockedVerifySessionOrNull = vi.mocked(verifySessionOrNull);
const mockedGetRouteById = vi.mocked(getRouteById);
const mockedUpdateRoute = vi.mocked(updateRoute);

const EXISTING_ROUTE: Route = {
  id: 'route-1',
  creatorUserId: 'user-1', // same as USER_SESSION.userId
  creatorDisplayName: 'Test User',
  name: null,
  stopRestaurantIds: ['rest-a', 'rest-b'],
  originLat: 45.5,
  originLng: -122.6,
  totalDistanceMeters: 1000,
  totalDurationSeconds: 300,
  encodedPolyline: 'old',
  travelMode: 'BICYCLING',
  voteCount: 2,
  createdAt: Date.now(),
  legDistancesMeters: [1000],
  legDurationsSeconds: [300],
};

function makeContext(routeId: string) {
  return { params: Promise.resolve({ routeId }) };
}

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/routes/route-1', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PATCH /api/routes/[routeId]', () => {
  it('returns 401 when unauthenticated', async () => {
    mockedVerifySessionOrNull.mockResolvedValue(null);
    const res = await PATCH(makeRequest(VALID_ROUTE_PAYLOAD), makeContext('route-1'));
    expect(res.status).toBe(401);
  });

  it('returns 404 when route does not exist', async () => {
    mockedVerifySessionOrNull.mockResolvedValue(USER_SESSION);
    mockedGetRouteById.mockResolvedValue(null);
    const res = await PATCH(makeRequest(VALID_ROUTE_PAYLOAD), makeContext('nonexistent'));
    expect(res.status).toBe(404);
  });

  it('returns 403 when user is neither creator nor admin', async () => {
    mockedVerifySessionOrNull.mockResolvedValue({
      ...USER_SESSION,
      userId: 'other-user',
    });
    mockedGetRouteById.mockResolvedValue(EXISTING_ROUTE);
    const res = await PATCH(makeRequest(VALID_ROUTE_PAYLOAD), makeContext('route-1'));
    expect(res.status).toBe(403);
  });

  it('returns 200 when user is the creator', async () => {
    mockedVerifySessionOrNull.mockResolvedValue(USER_SESSION);
    mockedGetRouteById.mockResolvedValue(EXISTING_ROUTE);
    mockedUpdateRoute.mockResolvedValue(undefined);
    const res = await PATCH(makeRequest(VALID_ROUTE_PAYLOAD), makeContext('route-1'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.routeId).toBe('route-1');
  });

  it('returns 200 when user is an admin (not creator)', async () => {
    mockedVerifySessionOrNull.mockResolvedValue(ADMIN_SESSION);
    mockedGetRouteById.mockResolvedValue(EXISTING_ROUTE);
    mockedUpdateRoute.mockResolvedValue(undefined);
    const res = await PATCH(makeRequest(VALID_ROUTE_PAYLOAD), makeContext('route-1'));
    expect(res.status).toBe(200);
  });

  it('returns 400 for invalid payload', async () => {
    mockedVerifySessionOrNull.mockResolvedValue(USER_SESSION);
    mockedGetRouteById.mockResolvedValue(EXISTING_ROUTE);
    const res = await PATCH(
      makeRequest({ ...VALID_ROUTE_PAYLOAD, originLat: 999 }),
      makeContext('route-1'),
    );
    expect(res.status).toBe(400);
  });

  it('returns 500 on Firestore update error', async () => {
    mockedVerifySessionOrNull.mockResolvedValue(USER_SESSION);
    mockedGetRouteById.mockResolvedValue(EXISTING_ROUTE);
    mockedUpdateRoute.mockRejectedValue(new Error('DB error'));
    const res = await PATCH(makeRequest(VALID_ROUTE_PAYLOAD), makeContext('route-1'));
    expect(res.status).toBe(500);
  });
});
