import { describe, expect, it } from 'vitest';
import { findDiameterPair } from '@/lib/maps/geometry';

describe('findDiameterPair', () => {
  it('returns [0, 0] for fewer than 2 points', () => {
    expect(findDiameterPair([])).toEqual([0, 0]);
    expect(findDiameterPair([{ lat: 45.5, lng: -122.6 }])).toEqual([0, 0]);
  });

  it('returns [0, 1] for exactly 2 points', () => {
    const points = [
      { lat: 45.5, lng: -122.6 },
      { lat: 45.6, lng: -122.7 },
    ];
    expect(findDiameterPair(points)).toEqual([0, 1]);
  });

  it('picks the two endpoints of a line of 3 points', () => {
    const points = [
      { lat: 45.50, lng: -122.60 }, // middle
      { lat: 45.55, lng: -122.65 }, // north-west
      { lat: 45.45, lng: -122.55 }, // south-east
    ];
    // Farthest apart: index 1 (NW) and index 2 (SE)
    expect(findDiameterPair(points)).toEqual([1, 2]);
  });

  it('picks the outlier pair in a cluster with one far point', () => {
    const points = [
      { lat: 45.50, lng: -122.65 }, // cluster
      { lat: 45.51, lng: -122.66 }, // cluster
      { lat: 45.50, lng: -122.64 }, // cluster
      { lat: 45.70, lng: -122.40 }, // outlier — far NE
      { lat: 45.51, lng: -122.65 }, // cluster
    ];
    // The outlier (index 3) paired with the farthest cluster point
    const [i, j] = findDiameterPair(points);
    expect(i).toBeLessThan(j);
    expect([i, j]).toContain(3); // outlier must be one of the pair
  });

  it('handles all identical points without crashing', () => {
    const points = Array.from({ length: 5 }, () => ({
      lat: 45.5,
      lng: -122.6,
    }));
    const [i, j] = findDiameterPair(points);
    expect(i).toBeGreaterThanOrEqual(0);
    expect(j).toBeGreaterThanOrEqual(0);
    expect(i).toBeLessThanOrEqual(4);
    expect(j).toBeLessThanOrEqual(4);
  });

  it('returns i < j (sorted indices)', () => {
    const points = [
      { lat: 45.40, lng: -122.50 }, // SE — will be one endpoint
      { lat: 45.50, lng: -122.60 }, // middle
      { lat: 45.60, lng: -122.70 }, // NW — will be other endpoint
    ];
    const [i, j] = findDiameterPair(points);
    expect(i).toBeLessThan(j);
    expect([i, j]).toEqual([0, 2]);
  });

  it('works with Portland-scale coordinates', () => {
    // Real-ish Portland locations
    const points = [
      { lat: 45.5231, lng: -122.6765 }, // downtown
      { lat: 45.5535, lng: -122.6500 }, // NE Alberta
      { lat: 45.4878, lng: -122.6482 }, // SE Sellwood
      { lat: 45.5318, lng: -122.6947 }, // NW Slabtown
      { lat: 45.5141, lng: -122.6810 }, // SW
    ];
    // Farthest: NE Alberta (idx 1) and SE Sellwood (idx 2)
    const [i, j] = findDiameterPair(points);
    expect([i, j]).toEqual([1, 2]);
  });
});
