import * as THREE from 'three';
import { MATERIALS, mirrored, podY, slab } from './kit';
import { SIDES, canopy, engine, gunmetal, noseDown, onSide, plate, strip } from './lightCraftParts';

const ACCENT = '#8c1f84';
const GLOW = '#d41cc4';
const HOT = '#ffd8fb';

/** Diver: swept crescent dive-bomber with magenta wing armour and a raised titanium keel. 24×30, nose down. */
export function buildDiver(): THREE.Group {
  const hull = new THREE.Group();
  const metal = gunmetal();
  const titanium = MATERIALS.titanium();
  const recess = MATERIALS.recess();
  const armour = MATERIALS.armour(ACCENT);
  const glow = MATERIALS.glow(GLOW, 2.8);

  // Crescent wing body: sharp nose, wingtips sweeping back past the notched tail.
  hull.add(
    slab(
      mirrored([
        [0, 12.6],
        [2.4, 8.6],
        [5.6, 3],
        [9.2, -9.8],
        [7.6, -10],
        [3, -5.6],
        [1.6, -8.4],
        [0, -10.6],
      ]),
      1.4,
      0.35,
      metal
    )
  );

  for (const side of SIDES) {
    hull.add(
      plate(
        onSide(
          [
            [2.6, 6],
            [5, 1.8],
            [7.9, -7.9],
            [6.7, -8.1],
            [2.8, -3.4],
          ],
          side
        ),
        1.75,
        armour
      )
    );
    // Seam splitting the armour into a fore and aft plate.
    hull.add(strip(side * 2.9, -0.4, side * 6.3, -1.6, 0.55, 2.3, recess));
    // Glowing trailing edge of the crescent.
    hull.add(strip(side * 3.3, -6.3, side * 7.4, -9.4, 0.7, 1.95, glow));
    // Underslung cannon along the wing root.
    hull.add(podY(side * 3.6, 6.2, 1.1, 0.5, 4, titanium));
    hull.add(podY(side * 3.6, 8.4, 1.1, 0.32, 0.8, MATERIALS.edge()));
    // Wingtip nav light.
    hull.add(strip(side * 8.5, -9.1, side * 8.9, -10.1, 0.8, 1.95, glow));
  }

  // Raised titanium keel down the centre.
  hull.add(
    slab(
      mirrored([
        [0, 11],
        [1.5, 7.4],
        [2.1, -1],
        [1.4, -7.4],
        [0, -9],
      ]),
      1,
      0.3,
      titanium,
      1.75
    )
  );
  for (const side of SIDES) hull.add(strip(side * 0.75, -1.6, side * 0.75, -6.8, 0.6, 3.1, recess));

  hull.add(canopy(0, 4.4, 3.05, 1.05, 2.4, 0.75, GLOW));
  hull.add(engine(0, -9.6, 1.2, 1.15, metal, GLOW, HOT));

  return noseDown(hull);
}
