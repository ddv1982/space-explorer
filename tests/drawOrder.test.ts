import { describe, expect, test } from 'bun:test';

import { BOMB_DEPTH, ENEMY_BULLET_DEPTH, ENEMY_DEPTH, MINE_DEPTH, textureGroupedDepth } from '../src/utils/drawOrder';

describe('gameplay draw order', () => {
  test('sprites that share a texture share a depth, so they stay adjacent and batch together', () => {
    const swarm = textureGroupedDepth(ENEMY_DEPTH, 'swarm-texture');
    const fighter = textureGroupedDepth(ENEMY_DEPTH, 'fighter-texture');

    expect(textureGroupedDepth(ENEMY_DEPTH, 'swarm-texture')).toBe(swarm);
    expect(fighter).not.toBe(swarm);
  });

  test('every ship stays inside the enemy layer, under its projectiles and the pickup layer', () => {
    const depths = Array.from({ length: 40 }, (_, index) => textureGroupedDepth(ENEMY_DEPTH, `hull-${index}`));

    for (const depth of depths) {
      expect(depth).toBeGreaterThan(ENEMY_DEPTH);
      expect(depth).toBeLessThan(MINE_DEPTH);
    }
    expect(MINE_DEPTH).toBeLessThan(BOMB_DEPTH);
    expect(BOMB_DEPTH).toBeLessThan(ENEMY_BULLET_DEPTH);
    expect(ENEMY_BULLET_DEPTH).toBeLessThan(4);
  });
});
