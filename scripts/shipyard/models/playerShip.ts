import * as THREE from 'three';
import { MATERIALS, PALETTE, box, ellipsoid, mirrored, podY, slab } from './kit';

/** Player interceptor: twin-fork nose, pale ceramic armour over titanium, cyan engines. 36×44 logical. */
export function buildPlayerShip(): THREE.Group {
  const ship = new THREE.Group();
  const titanium = MATERIALS.titanium();
  const ceramic = MATERIALS.ceramic();
  const recess = MATERIALS.recess();
  const edge = MATERIALS.edge();
  const engineGlow = MATERIALS.glow(PALETTE.playerAccent, 3.2);
  const accent = MATERIALS.glow(PALETTE.playerAccent, 1.6);

  // Broad swept titanium wing.
  ship.add(
    slab(
      mirrored([
        [3.5, 9],
        [16, -7.5],
        [16, -11],
        [12, -11.5],
        [3.5, -9],
      ]),
      1.2,
      0.3,
      titanium
    )
  );

  for (const side of [1, -1]) {
    const s = (points: Array<[number, number]>) => points.map(([x, y]) => [side * x, y] as const);
    // Ceramic wing armour inset from the titanium edge, split by a dark seam.
    ship.add(
      slab(
        s([
          [5, 5.4],
          [10.2, -1.6],
          [9.6, -4],
          [5, -2],
        ]),
        0.4,
        0.12,
        ceramic,
        1.5
      )
    );
    ship.add(
      slab(
        s([
          [10.9, -2.6],
          [14.6, -7.6],
          [14.2, -9.6],
          [10.2, -5],
        ]),
        0.4,
        0.12,
        ceramic,
        1.5
      )
    );
    // Cyan leading-edge light and wingtip cannon.
    const strip = box(side * 9.4, 1.4, 2.05, 9.5, 0.4, 0.2, accent);
    strip.rotation.z = side * -0.86;
    ship.add(strip);
    ship.add(podY(side * 15.6, -7.4, 1.0, 0.8, 8, titanium));
    ship.add(podY(side * 15.6, -2.8, 1.0, 0.42, 1.4, edge));
    // Intake scoops beside the cockpit.
    ship.add(box(side * 3.6, 3.5, 2.4, 1.2, 4.5, 1.1, recess));
  }

  // Titanium fuselage base with the twin-fork nose.
  ship.add(
    slab(
      [
        [-3.9, 19],
        [-2.7, 19],
        [-1.7, 12.5],
        [1.7, 12.5],
        [2.7, 19],
        [3.9, 19],
        [4.4, 8],
        [4.6, -14],
        [3.2, -18],
        [-3.2, -18],
        [-4.6, -14],
        [-4.4, 8],
      ],
      2.2,
      0.6,
      titanium,
      0.4
    )
  );
  // Ceramic dorsal armour over the fuselage, leaving titanium flanks visible.
  ship.add(
    slab(
      mirrored([
        [0, 11.5],
        [2.8, 9],
        [3, -12],
        [2, -15.5],
      ]),
      0.8,
      0.3,
      ceramic,
      2.9
    )
  );
  // Ceramic tips on the nose forks.
  for (const side of [1, -1]) ship.add(box(side * 3.25, 16.5, 3.1, 1.3, 4.6, 0.7, ceramic));

  // Recessed spine seams.
  ship.add(box(0, -4.5, 4.25, 0.9, 12, 0.25, recess));
  for (const y of [-2, -10]) ship.add(box(0, y, 4.2, 5.2, 0.3, 0.25, recess));

  // Canopy.
  ship.add(ellipsoid(0, 6.4, 4.1, 1.7, 3.4, 1.1, MATERIALS.glass(PALETTE.playerAccent)));

  // Twin engines whose exhausts extend past the tail so the glow reads from above.
  for (const side of [1, -1]) {
    ship.add(podY(side * 2.5, -16.5, 2, 1.6, 4, titanium));
    ship.add(ellipsoid(side * 2.5, -19.4, 2, 1.35, 1.6, 1.25, engineGlow));
  }

  return ship;
}
