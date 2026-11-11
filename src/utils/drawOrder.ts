/**
 * Draw-order depths for the gameplay layer. Sprites that share a texture must sit next to each other
 * in the draw order to share a batch: a lit sprite cannot share a batch with a different texture, so
 * ships interleaved by spawn order cost one draw call each. Every texture therefore gets its own thin
 * depth slice inside its layer, and enemy projectiles draw in their own slices above the ships.
 */
export const ENEMY_DEPTH = 3;
export const MINE_DEPTH = 3.2;
export const BOMB_DEPTH = 3.3;
export const ENEMY_BULLET_DEPTH = 3.4;

const SLICE = 0.001;
const sliceByTexture = new Map<string, number>();

/** Depth for a sprite in `layer` that keeps it adjacent to every other sprite with the same texture. */
export function textureGroupedDepth(layer: number, textureKey: string): number {
  let slice = sliceByTexture.get(textureKey);
  if (slice === undefined) {
    slice = sliceByTexture.size + 1;
    sliceByTexture.set(textureKey, slice);
  }
  return layer + slice * SLICE;
}
