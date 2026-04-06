const hasWindow = typeof window !== 'undefined';

function matchesMedia(query: string): boolean {
  return hasWindow && typeof window.matchMedia === 'function'
    ? window.matchMedia(query).matches
    : false;
}

export function isTouchMobileDevice(): boolean {
  if (!hasWindow || typeof navigator === 'undefined') {
    return false;
  }

  return navigator.maxTouchPoints > 0 && matchesMedia('(pointer: coarse)');
}

export function isPortraitTouchViewport(): boolean {
  if (!isTouchMobileDevice()) {
    return false;
  }

  return matchesMedia('(orientation: portrait)') || window.innerHeight > window.innerWidth;
}
