import { DEVICE_CONFIG } from '../config/deviceConfig';

const hasWindow = typeof window !== 'undefined';

function getViewportSize(): { width: number; height: number } {
  if (!hasWindow) {
    return { width: 0, height: 0 };
  }

  return {
    width: window.visualViewport?.width ?? window.innerWidth,
    height: window.visualViewport?.height ?? window.innerHeight,
  };
}

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

  const { width, height } = getViewportSize();

  return matchesMedia('(orientation: portrait)') || height > width;
}

export function isPhoneSizedTouchViewport(): boolean {
  if (!isTouchMobileDevice()) {
    return false;
  }

  const { width, height } = getViewportSize();
  const shortSide = Math.min(width, height);
  const longSide = Math.max(width, height);

  return (
    shortSide <= DEVICE_CONFIG.viewportPolicy.phoneMaxShortSide &&
    longSide <= DEVICE_CONFIG.viewportPolicy.phoneMaxLongSide
  );
}
