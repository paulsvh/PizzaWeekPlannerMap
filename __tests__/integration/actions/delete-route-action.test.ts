import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/auth/dal', () => ({
  verifySession: vi.fn(),
  verifyAdminSession: vi.fn(),
  verifySessionOrNull: vi.fn(),
}));

vi.mock('@/lib/firebase/routes', () => ({
  getRouteById: vi.fn(),
  deleteRouteById: vi.fn(),
}));

vi.mock('@/lib/firebase/votes', () => ({
  deleteAllVotesForRoute: vi.fn(),
}));

const redirectMock = vi.fn();
vi.mock('next/navigation', () => ({
  redirect: (...args: unknown[]) => {
    redirectMock(...args);
    throw new Error('NEXT_REDIRECT');
  },
  notFound: vi.fn(),
}));

import { verifySession } from '@/lib/auth/dal';
import { getRouteById, deleteRouteById } from '@/lib/firebase/routes';
import { deleteAllVotesForRoute } from '@/lib/firebase/votes';
import { deleteRouteAction } from '@/app/routes/[routeId]/actions';
import { USER_SESSION, ADMIN_SESSION } from '../../helpers/fixtures';
import type { Route } from '@/lib/types';

const mockedVerifySession = vi.mocked(verifySession);
const mockedGetRouteById = vi.mocked(getRouteById);
const mockedDeleteRouteById = vi.mocked(deleteRouteById);
const mockedDeleteAllVotes = vi.mocked(deleteAllVotesForRoute);

const EXISTING_ROUTE: Route = {
  id: 'route-1',
  creatorUserId: 'user-1',
  creatorDisplayName: 'Test User',
  name: null,
  stopRestaurantIds: ['rest-a', 'rest-b'],
  originLat: 45.5,
  originLng: -122.6,
  totalDistanceMeters: 1000,
  totalDurationSeconds: 300,
  encodedPolyline: 'abc',
  travelMode: 'BICYCLING',
  voteCount: 0,
  createdAt: Date.now(),
  legDistancesMeters: [1000],
  legDurationsSeconds: [300],
};

function makeFormData(routeId: string): FormData {
  const fd = new FormData();
  fd.set('routeId', routeId);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('deleteRouteAction', () => {
  it('no-ops for empty routeId', async () => {
    mockedVerifySession.mockResolvedValue(USER_SESSION);
    const fd = new FormData();
    await deleteRouteAction(fd);
    expect(mockedGetRouteById).not.toHaveBeenCalled();
  });

  it('redirects to /routes when route does not exist', async () => {
    mockedVerifySession.mockResolvedValue(USER_SESSION);
    mockedGetRouteById.mockResolvedValue(null);

    await expect(deleteRouteAction(makeFormData('nonexistent'))).rejects.toThrow('NEXT_REDIRECT');
    expect(redirectMock).toHaveBeenCalledWith('/routes');
  });

  it('silently no-ops when user is not creator or admin', async () => {
    mockedVerifySession.mockResolvedValue({
      ...USER_SESSION,
      userId: 'other-user',
    });
    mockedGetRouteById.mockResolvedValue(EXISTING_ROUTE);

    await deleteRouteAction(makeFormData('route-1'));
    expect(mockedDeleteRouteById).not.toHaveBeenCalled();
  });

  it('deletes route and votes when user is creator, then redirects', async () => {
    mockedVerifySession.mockResolvedValue(USER_SESSION);
    mockedGetRouteById.mockResolvedValue(EXISTING_ROUTE);
    mockedDeleteRouteById.mockResolvedValue(undefined);
    mockedDeleteAllVotes.mockResolvedValue(undefined);

    await expect(deleteRouteAction(makeFormData('route-1'))).rejects.toThrow('NEXT_REDIRECT');
    expect(mockedDeleteRouteById).toHaveBeenCalledWith('route-1');
    expect(mockedDeleteAllVotes).toHaveBeenCalledWith('route-1');
    expect(redirectMock).toHaveBeenCalledWith('/routes');
  });

  it('deletes when user is admin (not creator)', async () => {
    mockedVerifySession.mockResolvedValue(ADMIN_SESSION);
    mockedGetRouteById.mockResolvedValue(EXISTING_ROUTE);
    mockedDeleteRouteById.mockResolvedValue(undefined);
    mockedDeleteAllVotes.mockResolvedValue(undefined);

    await expect(deleteRouteAction(makeFormData('route-1'))).rejects.toThrow('NEXT_REDIRECT');
    expect(mockedDeleteRouteById).toHaveBeenCalledWith('route-1');
  });
});
