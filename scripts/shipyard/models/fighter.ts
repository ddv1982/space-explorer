import * as THREE from 'three';
import { MATERIALS, PALETTE, box, ellipsoid, mirrored, podY, slab } from './kit';

/** Enemy fighter: broad angular titanium arrowhead with red-orange armour. 36×36 logical, nose down. */
export function buildFighter(): THREE.Group {
  const hull = new THREE.Group();
  const titanium = MATERIALS.titanium();
  const ceramic = MATERIALS.ceramic();
  const recess = MATERIALS.recess();
  const armour = MATERIALS.armour(PALETTE.enemyAccent);
  const glow = MATERIALS.glow(PALETTE.enemyGlow, 3);

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
  hull.add(box(0, -3, 3.9, 0.9, 11, 0.3, recess));

  // Narrow glowing canopy slit and three tail engines.
  hull.add(ellipsoid(0, 7, 3.7, 1.3, 2.6, 0.7, MATERIALS.glass(PALETTE.enemyGlow)));
  hull.add(ellipsoid(0, -14.4, 1.6, 1.5, 0.9, 1.3, glow));
  for (const side of [1, -1]) hull.add(ellipsoid(side * 3.2, -13.4, 1.4, 1.05, 0.7, 1, glow));

  // Enemies fly toward the player, so the nose points down the screen.
  const ship = new THREE.Group();
  hull.rotation.z = Math.PI;
  ship.add(hull);
  return ship;
}
