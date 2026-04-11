'use client';

import { useEffect } from 'react';
import { useMap } from '@vis.gl/react-google-maps';

type RoutePolylineProps = {
  path: google.maps.LatLngLiteral[];
};

/**
 * Renders a google.maps.Polyline on the map instance via the
 * useMap() hook from @vis.gl/react-google-maps.
 *
 * The polyline is created imperatively in an effect because
 * @vis.gl/react-google-maps doesn't wrap Polyline as a React
 * component (only markers). The effect cleans up by calling
 * setMap(null) on unmount or path change, so the polyline doesn't
 * leak when the user exits plot mode or unstars a pin.
 *
 * Styling: pizza-sauce red, thick stroke, rounded caps — matches
 * the broadsheet accent color and reads clearly against the default
 * Google Maps basemap.
 */
export function RoutePolyline({ path }: RoutePolylineProps) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    if (path.length === 0) return;

    const polyline = new google.maps.Polyline({
      path,
      strokeColor: '#b32113', // --color-sauce
      strokeOpacity: 0.92,
      strokeWeight: 5,
      clickable: false,
      zIndex: 10,
    });

    polyline.setMap(map);

    return () => {
      polyline.setMap(null);
    };
  }, [map, path]);

  return null;
}
