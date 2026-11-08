// The player ship and Fighter moved to code-built v2 sheets (see `v2Ships.ts`).
export const CINEMATIC_SHIPS = [
  { key: 'scout-texture', file: 'scout', width: 26, height: 28 },
  { key: 'bomber-texture', file: 'bomber', width: 44, height: 38 },
  { key: 'cinematic-pyre-herald', file: 'boss', width: 88, height: 56 },
] as const;

export const CINEMATIC_DENSITY = 4;

export function cinematicAssetUrl(file: string): string {
  return `assets/cinematic/${file}.webp`;
}

export function usesCinematicArt(): boolean {
  return !(
    import.meta.env.DEV &&
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('art') === 'neon'
  );
}
