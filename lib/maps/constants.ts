/**
 * Shared map-related constants.
 *
 * Deliberately NOT marked `'use client'` so Route Handlers and
 * Server Components can import from this module. If a plain number
 * like MAX_WAYPOINTS lives inside a client-only module, importing it
 * server-side produces a React Server Components "client reference"
 * wrapper — calling the "value" as a function throws a confusing
 * runtime error ("Attempted to call MAX_WAYPOINTS from the server").
 */

/**
 * Google Directions API caps total waypoints at 25 (including origin
 * and destination) on the current plan. We use 23 as a conservative
 * ceiling for the waypoints array we pass to the client hook — that
 * leaves room for origin + destination without hitting the limit.
 *
 * If Google raises this limit in the future, bump it here and the
 * hook + Route Handler + Zod schema all pick up the new value.
 */
export const MAX_WAYPOINTS = 23;
