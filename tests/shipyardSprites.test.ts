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
  shipyardAssetUrl,
} from '../src/config/shipyardSprites';

const sprite = (file: string) => SHIPYARD_SPRITES.find((candidate) => candidate.file === file)!;

describe('shipyard sprite sheets', () => {
  test('player sheet is 9 frames of 144x176 in one row', () => {
    const layout = sheetLayout(sprite('player'), SPRITE_DENSITY);
    expect(layout).toMatchObject({ frameWidth: 144, frameHeight: 176, sheetWidth: 1296, sheetHeight: 176 });
    expect(layout.frameBankDeg[0]).toBe(-35);
    expect(layout.frameBankDeg[4]).toBe(0);
    expect(layout.frameBankDeg[8]).toBe(35);
    expect(restingFrame(sprite('player'))).toBe(4);
  });

  test('single-frame ships have one level frame', () => {
    expect(sheetLayout(sprite('fighter'), SPRITE_DENSITY)).toMatchObject({
      frameWidth: 144,
      frameHeight: 144,
      sheetWidth: 144,
      frameBankDeg: [0],
    });
  });

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

  test('asset urls name albedo and normal sheets', () => {
    expect(shipyardAssetUrl('player')).toBe('assets/shipyard/player.webp');
    expect(shipyardAssetUrl('player', true)).toBe('assets/shipyard/player_n.webp');
  });
});
