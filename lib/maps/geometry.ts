/**
 * Pure geometry helpers for route planning.
 *
 * These operate on plain { lat, lng } objects with no dependency on
 * Google Maps or React, so they're trivially unit-testable.
 */

/**
 * Find the "diameter pair" — the two points farthest apart from each
 * other by squared Euclidean distance on lat/lng.
 *
 * At Portland's latitude (~45°N) the difference between Euclidean and
 * Haversine distance is negligible for a city-scale point set, so we
 * skip the trig and use (dlat² + dlng²) for speed and simplicity.
 *
 * Returns the indices [i, j] of the two farthest points (i < j).
 * For n < 2, returns [0, 0] — callers gate on length before calling.
 */
export function findDiameterPair(
  points: readonly { lat: number; lng: number }[],
): [number, number] {
  if (points.length < 2) return [0, 0];

  let maxDist = -1;
  let bestI = 0;
  let bestJ = 1;

  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const dlat = points[i].lat - points[j].lat;
      const dlng = points[i].lng - points[j].lng;
      const dist = dlat * dlat + dlng * dlng;
      if (dist > maxDist) {
        maxDist = dist;
        bestI = i;
        bestJ = j;
      }
    }
  }

  return [bestI, bestJ];
}
