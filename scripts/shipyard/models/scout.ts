import * as THREE from 'three';
import { MATERIALS, mirrored, podY, slab } from './kit';
import { SIDES, canopy, engine, gunmetal, noseDown, onSide, plate, strip, vents } from './lightCraftParts';

const ACCENT = '#9e1d35';
const GLOW = '#d8183a';
const HOT = '#ffd7de';

/** Scout: narrow red-armoured dart with swept fins and a single hot engine. 26×28 logical, nose down. */
export function buildScout(): THREE.Group {
  const hull = new THREE.Group();
  const metal = gunmetal();
  const titanium = MATERIALS.titanium();
  const recess = MATERIALS.recess();
  const armour = MATERIALS.armour(ACCENT);
  const glow = MATERIALS.glow(GLOW, 2.8);

  for (const side of SIDES) {
    // Swept fin: titanium blade, red armour panel, glowing leading edge and a tip pod.
    hull.add(
      slab(
        onSide(
          [
            [2, 4.4],
            [10, -6],
            [10, -8.4],
            [7.4, -8.2],
            [2, -5],
          ],
          side
        ),
        1,
        0.25,
        titanium
      )
    );
    hull.add(
      plate(
        onSide(
          [
            [3.3, -0.2],
            [7.9, -5.9],
            [7.3, -7.3],
            [3.3, -4.6],
          ],
          side
        ),
        1.2,
        armour
      )
    );
    hull.add(strip(side * 2.8, 2, side * 9.3, -6.1, 0.7, 1.35, glow));
    hull.add(podY(side * 9.8, -6.6, 1.1, 0.75, 4.2, metal));
    hull.add(podY(side * 9.8, -4.1, 1.1, 0.4, 1, MATERIALS.edge()));
    // Fin-root cannon.
    hull.add(podY(side * 3.4, 4.4, 1.5, 0.5, 4.4, metal));
    hull.add(podY(side * 3.4, 6.9, 1.5, 0.32, 0.8, MATERIALS.edge()));
  }

  // Gunmetal fuselage with a red nose cowl.
  hull.add(
    slab(
      mirrored([
        [0, 11.4],
        [1.9, 7],
        [2.9, 1],
        [2.9, -7],
        [1.9, -10],
        [0, -10.4],
      ]),
      2,
      0.5,
      metal
    )
  );
  hull.add(
    plate(
      mirrored([
        [0, 10.2],
        [1.5, 6.6],
        [2, 4.2],
        [0, 5],
      ]),
      2.5,
      armour,
      0.5
    )
  );
  // Rear deck plates either side of a dark spine seam.
  for (const side of SIDES) {
    hull.add(
      plate(
        onSide(
          [
            [0.7, -2],
            [2.1, -2.4],
            [2.1, -7.4],
            [0.7, -8.6],
          ],
          side
        ),
        2.5,
        titanium,
        0.35
      )
    );
  }
  hull.add(vents(0, -5.2, 2.95, 1.1, 4.4, 4, recess));

  hull.add(canopy(0, 1.2, 2.75, 1.25, 2.3, 0.8, GLOW));
  hull.add(engine(0, -10.2, 1.2, 1.3, metal, GLOW, HOT));

  return noseDown(hull);
}
