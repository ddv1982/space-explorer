import * as THREE from 'three';
import { MATERIALS, ellipsoid, mirrored, slab } from './kit';
import { SIDES, gunmetal, noseDown, onSide, plate } from './lightCraftParts';

const ACCENT = '#b8226e';
const GLOW = '#e02a8a';
const HOT = '#ffd8ec';

/** Swarmling: tiny pink shard shed by the splitter, two armour vanes around a hot core. 14×14, nose down. */
export function buildSwarmling(): THREE.Group {
  const hull = new THREE.Group();
  const armour = MATERIALS.armour(ACCENT);

  hull.add(
    slab(
      mirrored([
        [0, 4.8],
        [4.4, -4],
        [3.2, -4.4],
        [0, -2.2],
      ]),
      0.9,
      0.25,
      gunmetal()
    )
  );
  for (const side of SIDES) {
    hull.add(
      plate(
        onSide(
          [
            [0.9, 2],
            [3.4, -3.3],
            [0.9, -1.8],
          ],
          side
        ),
        1.1,
        armour,
        0.35
      )
    );
  }
  hull.add(ellipsoid(0, 0.4, 1.5, 0.75, 1.3, 0.6, MATERIALS.glow(GLOW, 3)));
  hull.add(ellipsoid(0, 0.6, 1.9, 0.38, 0.6, 0.35, MATERIALS.glow(HOT, 3.2)));

  return noseDown(hull);
}
