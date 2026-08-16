export type IntermissionViewportMode = 'desktop' | 'landscape' | 'portrait' | 'ultra-compact';

export interface ViewportDimensions {
  width: number;
  height: number;
}

export function isShortViewport(viewport: ViewportDimensions, breakpoint: number): boolean {
  return viewport.height <= breakpoint;
}

export function isNarrowViewport(viewport: ViewportDimensions, breakpoint: number): boolean {
  return viewport.width < breakpoint;
}

export function classifyIntermissionViewport(viewport: ViewportDimensions): IntermissionViewportMode {
  if (viewport.height < 370 && viewport.width < 560) return 'ultra-compact';
  if (viewport.width < 700 && viewport.height >= viewport.width * 1.12) return 'portrait';
  if (viewport.width >= 900 && viewport.height >= 560) return 'desktop';
  return 'landscape';
}
