import { describe, expect, test } from 'bun:test';
import { CINEMATIC_DENSITY } from '../src/config/cinematicAssets';
import { V2_SHIPS, bankToFrame, sheetLayout, v2AssetUrl } from '../src/config/v2Ships';

const player = V2_SHIPS.find((ship) => ship.file === 'player')!;
const fighter = V2_SHIPS.find((ship) => ship.file === 'fighter')!;

describe('v2 ship sheets', () => {
  test('player sheet is 9 frames of 144x176 in one row', () => {
    const layout = sheetLayout(player, CINEMATIC_DENSITY);
    expect(layout).toMatchObject({ frameWidth: 144, frameHeight: 176, sheetWidth: 1296, sheetHeight: 176 });
    expect(layout.frameBankDeg[0]).toBe(-35);
    expect(layout.frameBankDeg[4]).toBe(0);
    expect(layout.frameBankDeg[8]).toBe(35);
  });

  test('single-frame ships have one level frame', () => {
    expect(sheetLayout(fighter, CINEMATIC_DENSITY)).toMatchObject({
      frameWidth: 144,
      frameHeight: 144,
      sheetWidth: 144,
      frameBankDeg: [0],
    });
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
    expect(v2AssetUrl('player')).toBe('assets/v2/player.webp');
    expect(v2AssetUrl('player', true)).toBe('assets/v2/player_n.webp');
  });
});
