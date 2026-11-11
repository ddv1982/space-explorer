import { describe, expect, test } from 'bun:test';
import {
  ASTEROID_VARIANTS,
  BOSS_STYLES,
  SHIPYARD_SPRITES,
  SPRITE_DENSITY,
  bankToFrame,
  bossTextureKey,
  restingFrame,
  sheetLayout,
} from '../src/config/shipyardSprites';

const sprite = (file: string) => SHIPYARD_SPRITES.find((candidate) => candidate.file === file)!;

describe('shipyard sprite sheets', () => {
  test('asteroid variants are unrolled distinct frames that rest on the first rock', () => {
    const asteroid = sprite('asteroid');
    expect(asteroid.frames).toBe(ASTEROID_VARIANTS);
    expect(sheetLayout(asteroid, SPRITE_DENSITY).frameBankDeg).toEqual([0, 0, 0, 0]);
    expect(restingFrame(asteroid)).toBe(0);
  });

  test('every boss style has its own sheet and every key and file is unique', () => {
    for (const style of BOSS_STYLES) expect(sprite(`boss-${style}`).key).toBe(bossTextureKey(style));
    expect(new Set(SHIPYARD_SPRITES.map((candidate) => candidate.key)).size).toBe(SHIPYARD_SPRITES.length);
    expect(new Set(SHIPYARD_SPRITES.map((candidate) => candidate.file)).size).toBe(SHIPYARD_SPRITES.length);
  });

  test('bankToFrame maps -1, 0 and 1 to the edge and centre frames and clamps', () => {
    expect(bankToFrame(-1, 9)).toBe(0);
    expect(bankToFrame(0, 9)).toBe(4);
    expect(bankToFrame(1, 9)).toBe(8);
    expect(bankToFrame(5, 9)).toBe(8);
    expect(bankToFrame(-5, 9)).toBe(0);
    expect(bankToFrame(Number.NaN, 9)).toBe(4);
    expect(bankToFrame(0.3, 1)).toBe(0);
  });
});
