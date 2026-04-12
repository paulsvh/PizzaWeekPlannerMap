import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock session before importing the route handler.
vi.mock('@/lib/auth/dal', () => ({
  verifySession: vi.fn(),
  verifyAdminSession: vi.fn(),
  verifySessionOrNull: vi.fn(),
}));

vi.mock('@/lib/firebase/stars', () => ({
  getStarredRestaurantIds: vi.fn(),
  toggleStar: vi.fn(),
}));

import { verifySessionOrNull } from '@/lib/auth/dal';
import { getStarredRestaurantIds, toggleStar } from '@/lib/firebase/stars';
import { GET, POST } from '@/app/api/stars/route';
import { USER_SESSION } from '../../helpers/fixtures';

const mockedVerifySessionOrNull = vi.mocked(verifySessionOrNull);
const mockedGetStarred = vi.mocked(getStarredRestaurantIds);
const mockedToggle = vi.mocked(toggleStar);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/stars', () => {
  it('returns 401 when unauthenticated', async () => {
    mockedVerifySessionOrNull.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Not authenticated');
  });

  it('returns starred restaurant IDs when authenticated', async () => {
    mockedVerifySessionOrNull.mockResolvedValue(USER_SESSION);
    mockedGetStarred.mockResolvedValue(['rest-a', 'rest-b']);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.starred).toEqual(['rest-a', 'rest-b']);
  });
});

describe('POST /api/stars', () => {
  it('returns 401 when unauthenticated', async () => {
    mockedVerifySessionOrNull.mockResolvedValue(null);
    const req = new Request('http://localhost/api/stars', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ restaurantId: 'rest-a' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid JSON', async () => {
    mockedVerifySessionOrNull.mockResolvedValue(USER_SESSION);
    const req = new Request('http://localhost/api/stars', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for missing restaurantId', async () => {
    mockedVerifySessionOrNull.mockResolvedValue(USER_SESSION);
    const req = new Request('http://localhost/api/stars', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('toggles star on successfully', async () => {
    mockedVerifySessionOrNull.mockResolvedValue(USER_SESSION);
    mockedToggle.mockResolvedValue({ starred: true });
    const req = new Request('http://localhost/api/stars', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ restaurantId: 'rest-a' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.starred).toBe(true);
  });

  it('toggles star off successfully', async () => {
    mockedVerifySessionOrNull.mockResolvedValue(USER_SESSION);
    mockedToggle.mockResolvedValue({ starred: false });
    const req = new Request('http://localhost/api/stars', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ restaurantId: 'rest-a' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.starred).toBe(false);
  });

  it('returns 500 on Firestore error', async () => {
    mockedVerifySessionOrNull.mockResolvedValue(USER_SESSION);
    mockedToggle.mockRejectedValue(new Error('Firestore down'));
    const req = new Request('http://localhost/api/stars', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ restaurantId: 'rest-a' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});
