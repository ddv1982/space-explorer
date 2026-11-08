export type FlightMode = 'momentum' | 'legacy';

/**
 * v2 momentum flight is the default. `?flight=legacy` restores v1 movement and the v1
 * joystick for side-by-side comparison in every build until v2 Phase 5 removes it.
 */
export function getFlightMode(search?: string): FlightMode {
  const query = search ?? (typeof window !== 'undefined' ? window.location.search : '');
  return new URLSearchParams(query).get('flight') === 'legacy' ? 'legacy' : 'momentum';
}
