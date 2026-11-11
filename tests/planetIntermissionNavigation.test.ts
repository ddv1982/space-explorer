import { describe, expect, test } from 'bun:test';
import {
  findArrowFocusIndex,
  findLinearFocusIndex,
  findNextPurchasableAfter,
} from '../src/scenes/planetIntermission/navigation';

// The refit bay's five cards in two columns: hull, weapons / fire rate, shield / picket.
const FIRST_TWO = [true, true, false, false, false];
const ALL = [true, true, true, true, true];

describe('refit bay grid focus', () => {
  test('arrows enter the grid at the first purchasable card, and skip cards that cannot be bought', () => {
    expect(findArrowFocusIndex('ArrowDown', FIRST_TWO, 2, -1)).toBe(0);
    expect(findArrowFocusIndex('ArrowLeft', FIRST_TWO, 2, -1)).toBe(1);
    expect(findArrowFocusIndex('ArrowRight', FIRST_TWO, 2, 0)).toBe(1);
    expect(findArrowFocusIndex('ArrowRight', FIRST_TWO, 2, 1)).toBe(0);
    expect(findArrowFocusIndex('ArrowDown', FIRST_TWO, 2, 1)).toBe(0);
    expect(findArrowFocusIndex('KeyA', FIRST_TWO, 2, 0)).toBeNull();
  });

  test('rows and columns wrap, and the lone last card is reachable from either column', () => {
    expect(findArrowFocusIndex('ArrowRight', ALL, 2, 1)).toBe(2);
    expect(findArrowFocusIndex('ArrowLeft', ALL, 2, 0)).toBe(4);
    expect(findArrowFocusIndex('ArrowDown', ALL, 2, 3)).toBe(4);
    expect(findArrowFocusIndex('ArrowUp', ALL, 2, 0)).toBe(4);
    expect(findArrowFocusIndex('ArrowDown', ALL, 2, 4)).toBe(0);
    expect(findArrowFocusIndex('ArrowDown', ALL, 1, 2)).toBe(3);
  });

  test('nothing to buy leaves focus nowhere', () => {
    const none = [false, false, false];
    expect(findLinearFocusIndex(none, -1, 1)).toBe(-1);
    expect(findArrowFocusIndex('ArrowUp', none, 2, -1)).toBe(-1);
    expect(findNextPurchasableAfter(none, 0)).toBe(-1);
  });

  test('a card that just capped hands focus to the next one that can still buy', () => {
    expect(findNextPurchasableAfter([false, true, false, true], 1)).toBe(3);
    expect(findNextPurchasableAfter([true, false, false, false], 3)).toBe(0);
  });
});
