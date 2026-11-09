import { describe, expect, test } from 'bun:test';
import probe from '../assets/source/shipyard/_probe_normals.json';

/**
 * Phaser decodes normal maps as `rgb * 2 - 1` against gl_FragCoord (y up), so a surface facing the
 * top of the sprite must encode high green. Regenerate with `bun run art:shipyard --probe`.
 */
describe('shipyard normal-map convention', () => {
  test('a dome facing the camera encodes +X red, +Y (top of sprite) green, +Z blue', () => {
    expect(probe.centre[2]).toBeGreaterThan(240);
    expect(Math.abs(probe.centre[0]! - 128)).toBeLessThan(8);
    expect(Math.abs(probe.centre[1]! - 128)).toBeLessThan(8);
    expect(probe.right[0]).toBeGreaterThan(200);
    expect(probe.left[0]).toBeLessThan(56);
    expect(probe.top[1]).toBeGreaterThan(200);
  });
});
