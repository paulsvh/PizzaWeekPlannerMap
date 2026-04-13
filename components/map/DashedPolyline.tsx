'use client';

import { useEffect } from 'react';
import { useMap } from '@vis.gl/react-google-maps';

type DashedPolylineProps = {
  path: google.maps.LatLngLiteral[];
};

/**
 * Renders a dashed polyline on the map for personal travel legs
 * (home → first stop, last stop → home). Visually distinct from the
 * main route's solid sauce-red polyline: thinner, dashed, muted ink
 * color. Communicates "this is your personal addition, not part of
 * the shared route."
 *
 * Same imperative google.maps.Polyline approach as RoutePolyline.
 */
export function DashedPolyline({ path }: DashedPolylineProps) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    if (path.length === 0) return;

    const polyline = new google.maps.Polyline({
      path,
      strokeColor: '#3a3530', // --color-ink-soft
      strokeOpacity: 0,
      strokeWeight: 3,
      clickable: false,
      zIndex: 8,
      icons: [
        {
          icon: {
            path: 'M 0,-1 0,1',
            strokeOpacity: 0.6,
            strokeWeight: 3,
            scale: 3,
          },
          offset: '0',
          repeat: '16px',
        },
      ],
    });

    polyline.setMap(map);

    return () => {
      polyline.setMap(null);
    };
  }, [map, path]);

  return null;
}
