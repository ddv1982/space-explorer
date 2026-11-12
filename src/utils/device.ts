const hasWindow = typeof window !== 'undefined';

function matchesMedia(query: string): boolean {
  return hasWindow && typeof window.matchMedia === 'function' ? window.matchMedia(query).matches : false;
}

export function isTouchMobileDevice(): boolean {
  if (!hasWindow || typeof navigator === 'undefined') {
    return false;
  }

  return navigator.maxTouchPoints > 0 && matchesMedia('(pointer: coarse)');
}

/** True when the system asks for reduced motion. */
export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}
