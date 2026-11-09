import * as THREE from 'three';
import { MATERIALS, ellipsoid, mirrored, slab } from './kit';
import { SIDES, gunmetal, noseDown, onSide, plate, strip } from './lightCraftParts';

const ACCENT = '#a88a08';
const GLOW = '#e0c010';
const HOT = '#ffffd8';

/** Swarm drone: tri-shard arrowhead with yellow armour wings and a hot reactor core. 20×20, nose down. */
export function buildSwarm(): THREE.Group {
  const hull = new THREE.Group();
  const metal = gunmetal();
  const titanium = MATERIALS.titanium();
  const armour = MATERIALS.armour(ACCENT);
  const glow = MATERIALS.glow(GLOW, 2.8);

  hull.add(
    slab(
      mirrored([
        [0, 7.4],
        [7.2, -5.4],
        [5.6, -6],
        [0, -2.6],
      ]),
      1.2,
      0.3,
      metal
    )
  );

  for (const side of SIDES) {
    hull.add(
      plate(
        onSide(
          [
            [1.3, 3.6],
            [5.6, -4.2],
            [4.8, -4.7],
            [1.3, -2.4],
          ],
          side
        ),
        1.5,
        armour
      )
    );
    // Glowing thruster slot along each trailing edge.
    hull.add(strip(side * 2, -3.7, side * 5.2, -5.6, 0.7, 1.55, glow));
  }

  // Raised titanium keel holding the reactor core.
  hull.add(
    slab(
      mirrored([
        [0, 6.4],
        [1.1, 2.4],
        [1, -2.2],
        [0, -3],
      ]),
      0.8,
      0.25,
      titanium,
      1.5
    )
  );
  hull.add(ellipsoid(0, 0.6, 2.6, 0.95, 1.35, 0.7, MATERIALS.glow(GLOW, 3)));
  hull.add(ellipsoid(0, 0.8, 3, 0.45, 0.65, 0.4, MATERIALS.glow(HOT, 3.2)));

  return noseDown(hull);
}
