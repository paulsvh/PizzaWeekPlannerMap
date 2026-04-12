import { describe, it, expect } from 'vitest';
import { PostSchema, PatchSchema, MAX_STOPS } from '@/lib/validation/route-schemas';
import { VALID_ROUTE_PAYLOAD, MINIMAL_ROUTE_PAYLOAD } from '../../helpers/fixtures';

describe('RoutePayloadSchema (PostSchema / PatchSchema)', () => {
  it('accepts a valid 3-stop payload', () => {
    const result = PostSchema.safeParse(VALID_ROUTE_PAYLOAD);
    expect(result.success).toBe(true);
  });

  it('accepts a minimal 2-stop payload', () => {
    const result = PostSchema.safeParse(MINIMAL_ROUTE_PAYLOAD);
    expect(result.success).toBe(true);
  });

  it('rejects fewer than 2 stops', () => {
    const result = PostSchema.safeParse({
      ...VALID_ROUTE_PAYLOAD,
      stopRestaurantIds: ['only-one'],
      legDistancesMeters: [],
      legDurationsSeconds: [],
    });
    expect(result.success).toBe(false);
  });

  it(`rejects more than ${MAX_STOPS} stops`, () => {
    const tooMany = Array.from({ length: MAX_STOPS + 1 }, (_, i) => `rest-${i}`);
    const result = PostSchema.safeParse({
      ...VALID_ROUTE_PAYLOAD,
      stopRestaurantIds: tooMany,
      legDistancesMeters: Array(tooMany.length - 1).fill(100),
      legDurationsSeconds: Array(tooMany.length - 1).fill(60),
    });
    expect(result.success).toBe(false);
  });

  it('rejects latitude out of range', () => {
    expect(
      PostSchema.safeParse({ ...VALID_ROUTE_PAYLOAD, originLat: 91 }).success,
    ).toBe(false);
    expect(
      PostSchema.safeParse({ ...VALID_ROUTE_PAYLOAD, originLat: -91 }).success,
    ).toBe(false);
  });

  it('rejects longitude out of range', () => {
    expect(
      PostSchema.safeParse({ ...VALID_ROUTE_PAYLOAD, originLng: 181 }).success,
    ).toBe(false);
  });

  it('rejects legDistancesMeters length mismatch (must be stops - 1)', () => {
    const result = PostSchema.safeParse({
      ...VALID_ROUTE_PAYLOAD,
      legDistancesMeters: [1000], // should be 2 for 3 stops
    });
    expect(result.success).toBe(false);
  });

  it('rejects legDurationsSeconds length mismatch (must be stops - 1)', () => {
    const result = PostSchema.safeParse({
      ...VALID_ROUTE_PAYLOAD,
      legDurationsSeconds: [300], // should be 2 for 3 stops
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty encodedPolyline', () => {
    expect(
      PostSchema.safeParse({ ...VALID_ROUTE_PAYLOAD, encodedPolyline: '' }).success,
    ).toBe(false);
  });

  it('rejects negative totalDistanceMeters', () => {
    expect(
      PostSchema.safeParse({ ...VALID_ROUTE_PAYLOAD, totalDistanceMeters: -1 }).success,
    ).toBe(false);
  });

  it('PatchSchema accepts the same payloads', () => {
    expect(PatchSchema.safeParse(VALID_ROUTE_PAYLOAD).success).toBe(true);
    expect(PatchSchema.safeParse(MINIMAL_ROUTE_PAYLOAD).success).toBe(true);
  });
});
