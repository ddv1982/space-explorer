/**
 * v2 ships are code-built 3D models rendered by `scripts/shipyard` into one-row sprite sheets
 * (albedo with baked key light, plus a matching normal map). Logical sizes and Arcade bodies
 * match the v1 ships; sheets are authored at `CINEMATIC_DENSITY`.
 */
export interface V2ShipSpec {
  key: string;
  file: string;
  width: number;
  height: number;
  bankFrames: number;
  maxBankDeg: number;
}

export const V2_SHIPS = [
  { key: 'v2-player', file: 'player', width: 36, height: 44, bankFrames: 9, maxBankDeg: 35 },
  { key: 'v2-fighter', file: 'fighter', width: 36, height: 36, bankFrames: 1, maxBankDeg: 0 },
] as const satisfies readonly V2ShipSpec[];

export function v2AssetUrl(file: string, normal = false): string {
  return `assets/v2/${file}${normal ? '_n' : ''}.webp`;
}

export interface SheetLayout {
  frameWidth: number;
  frameHeight: number;
  sheetWidth: number;
  sheetHeight: number;
  frameBankDeg: number[];
}

export function sheetLayout(spec: V2ShipSpec, density: number): SheetLayout {
  const frameWidth = spec.width * density;
  const frameHeight = spec.height * density;
  const frameBankDeg = Array.from({ length: spec.bankFrames }, (_, index) =>
    spec.bankFrames === 1 ? 0 : -spec.maxBankDeg + (index * 2 * spec.maxBankDeg) / (spec.bankFrames - 1)
  );
  return { frameWidth, frameHeight, sheetWidth: frameWidth * spec.bankFrames, sheetHeight: frameHeight, frameBankDeg };
}

/** Maps a bank in [-1, 1] to the nearest sheet frame; non-finite input shows the level frame. */
export function bankToFrame(bank: number, frames: number): number {
  if (frames <= 1) return 0;
  const centre = (frames - 1) / 2;
  if (!Number.isFinite(bank)) return centre;
  const clamped = Math.max(-1, Math.min(1, bank));
  return Math.round(centre + clamped * centre);
}
