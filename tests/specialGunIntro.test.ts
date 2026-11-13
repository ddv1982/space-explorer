import { describe, expect, test } from 'bun:test';

const { SPECIAL_GUN_CHARGE } = await import('../src/config/shipSystems');
const { describeSpecialGunIntro, isSpecialGunIntroDue } =
  await import('../src/scenes/planetIntermission/specialGunIntro');

describe('special gun intro card', () => {
  test('is due only at the refit bay right before the first sector with special guns', () => {
    const due = Array.from({ length: 10 }, (_, index) => index + 1).filter(isSpecialGunIntroDue);
    expect(due).toEqual([SPECIAL_GUN_CHARGE.fromLevel - 1]);
    expect(due).toEqual([2]);
  });

  test('names Q on a keyboard and the swap key on touch, and nothing else changes', () => {
    const keyboard = describeSpecialGunIntro(false);
    const touch = describeSpecialGunIntro(true);
    expect(keyboard[1]).toBe('Press Q to switch to SCATTER or SEEKERS.');
    expect(touch[1]).toBe('Tap the swap key to switch to SCATTER or SEEKERS.');
    expect(touch.filter((line, index) => line !== keyboard[index])).toEqual([touch[1]]);
    expect(keyboard[0]).toContain('LANCE');
    expect(keyboard[2]).toContain('charge');
  });
});
