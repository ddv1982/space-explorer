import { describe, expect, test } from 'bun:test';
import { createGameOverLayout } from '../src/scenes/gameOverScene/layout';

describe('Game over action layout', () => {
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 844, height: 390 },
    { width: 320, height: 568 },
    { width: 568, height: 320 },
  ]) {
    test(`keeps both 48px actions within ${viewport.width}x${viewport.height}`, () => {
      const plan = createGameOverLayout(viewport);
      expect(plan.width).toBeLessThanOrEqual(viewport.width);
      expect(plan.height).toBeLessThanOrEqual(viewport.height);
      for (const button of [plan.retry, plan.menu]) {
        expect(button.x).toBeGreaterThanOrEqual(0);
        expect(button.x + plan.buttonWidth).toBeLessThanOrEqual(plan.width);
        expect(button.y + plan.buttonHeight).toBeLessThan(plan.height);
      }
      expect(plan.buttonHeight).toBeGreaterThanOrEqual(44);
      expect(plan.retry.x !== plan.menu.x || plan.retry.y !== plan.menu.y).toBe(true);
    });
  }
});
