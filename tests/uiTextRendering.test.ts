import { describe, expect, test } from 'bun:test';
import { getUiTextResolution } from '../src/utils/uiTextRendering';

describe('getUiTextResolution', () => {
  test('uses Retina text on desktop without exceeding 2x', () => {
    expect(getUiTextResolution(2, false)).toBe(2);
    expect(getUiTextResolution(3, false)).toBe(2);
  });

  test('limits compact devices and preserves standard resolution', () => {
    expect(getUiTextResolution(3, true)).toBe(1.5);
    expect(getUiTextResolution(1, false)).toBe(1);
  });
});
