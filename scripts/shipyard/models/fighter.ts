import * as THREE from 'three';
import { MATERIALS, PALETTE, box, mirrored, podY, slab } from './kit';
import { canopy, engine, strip, vents } from './lightCraftParts';

const HOT = '#ffe2c4';
/** Strip glow: deeper than the engine glow so tone mapping keeps the orange. */
const STRIP_GLOW = '#e8601c';

/** Enemy fighter: broad angular titanium arrowhead with red-orange armour. 36×36 logical, nose down. */
export function buildFighter(): THREE.Group {
  const hull = new THREE.Group();
  const titanium = MATERIALS.titanium();
  const ceramic = MATERIALS.ceramic();
  const recess = MATERIALS.recess();
  const armour = MATERIALS.armour(PALETTE.enemyAccent);
  const stripGlow = MATERIALS.glow(STRIP_GLOW, 2.8);

  hull.add(
    slab(
      mirrored([
        [0, 15],
        [5, 6],
        [15.6, -4],
        [14.8, -9],
        [6, -6.4],
        [4, -13.6],
      ]),
      1.8,
      0.45,
      titanium
    )
  );

  for (const side of [1, -1]) {
    hull.add(
      slab(
        [
          [side * 5.4, 3.6],
          [side * 13, -4.2],
          [side * 12.2, -6.6],
          [side * 5.4, -3.6],
        ].map(([x, y]) => [x, y] as const),
        0.5,
        0.15,
        armour,
        2.2
      )
    );
    // Armour seam, glowing leading-edge strip and a titanium panel line behind the armour.
    hull.add(strip(side * 8.4, 0.3, side * 8.4, -4.7, 0.55, 2.9, recess));
    hull.add(strip(side * 6, 4, side * 13.8, -3.4, 0.65, 2.3, stripGlow));
    hull.add(strip(side * 7.2, -5.6, side * 13.4, -7.6, 0.5, 2.3, recess));
    hull.add(podY(side * 8.2, 3, 2.2, 0.7, 7.5, recess));
    hull.add(podY(side * 8.2, 7, 2.2, 0.4, 1.4, ceramic));
  }

  // Ceramic spine plate with a dark seam.
  hull.add(
    slab(
      mirrored([
        [0, 13.2],
        [3, 5],
        [3, -10.5],
      ]),
      1.2,
      0.35,
      ceramic,
      2
    )
  );
  hull.add(box(0, -1, 3.9, 0.9, 7, 0.3, recess));
  hull.add(vents(0, -7.6, 3.85, 3, 3, 3, recess));

  // Narrow glowing canopy slit and three tail engines.
  hull.add(canopy(0, 7, 3.7, 1.3, 2.6, 0.7, PALETTE.enemyGlow));
  hull.add(engine(0, -13.4, 1.6, 1.15, titanium, PALETTE.enemyGlow, HOT, 2.6));
  for (const side of [1, -1]) hull.add(engine(side * 3.2, -12.8, 1.4, 0.85, titanium, PALETTE.enemyGlow, HOT, 2));

  // Enemies fly toward the player, so the nose points down the screen.
  const ship = new THREE.Group();
  hull.rotation.z = Math.PI;
  ship.add(hull);
  return ship;
}
