import * as THREE from 'three';
import { MATERIALS, ellipsoid, mirrored, podY, slab } from './kit';
import { SIDES, canopy, engine, gunmetal, noseDown, onSide, plate, strip } from './lightCraftParts';

const ACCENT = '#9fb0c6';
const GLOW = '#8fc4ff';
const HOT = '#f2f8ff';

/** Lancer: long needle hull with pale steel armour, a charged lance emitter and tail fins. 22×40, nose down. */
export function buildLancer(): THREE.Group {
  const hull = new THREE.Group();
  const metal = gunmetal();
  const titanium = MATERIALS.titanium();
  const recess = MATERIALS.recess();
  const armour = new THREE.MeshStandardMaterial({ color: ACCENT, metalness: 0.45, roughness: 0.3 });
  const glow = MATERIALS.glow(GLOW, 2.8);

  for (const side of SIDES) {
    // Swept stabiliser fins at the tail with a glowing trailing edge.
    hull.add(
      slab(
        onSide(
          [
            [2.6, -1],
            [8.2, -10.2],
            [8.2, -12],
            [2.6, -9.6],
          ],
          side
        ),
        0.9,
        0.25,
        titanium
      )
    );
    hull.add(
      plate(
        onSide(
          [
            [3.4, -3.4],
            [6.8, -9],
            [6.8, -10.4],
            [3.4, -8.6],
          ],
          side
        ),
        1.1,
        armour,
        0.3
      )
    );
    hull.add(strip(side * 3.4, -10.2, side * 7.9, -12.1, 0.65, 1.2, glow));
  }

  // Needle fuselage.
  hull.add(
    slab(
      mirrored([
        [0, 17],
        [1.2, 13.6],
        [3.4, 8],
        [3.4, -2],
        [2.9, -10],
        [1.7, -15.2],
        [0, -16],
      ]),
      2,
      0.5,
      metal
    )
  );

  // Pale steel armour: a forward cowl and long flank plates either side of the glowing spine.
  hull.add(
    plate(
      mirrored([
        [0, 13.6],
        [1.4, 11.6],
        [2.6, 7.8],
        [0, 8.6],
      ]),
      2.5,
      armour,
      0.5
    )
  );
  for (const side of SIDES) {
    hull.add(
      plate(
        onSide(
          [
            [0.75, 2.8],
            [2.7, 2.6],
            [2.5, -9],
            [0.75, -10.2],
          ],
          side
        ),
        2.5,
        armour,
        0.45
      )
    );
    hull.add(strip(side * 1.7, -1.6, side * 2.4, -1.6, 0.5, 3.1, recess));
    hull.add(strip(side * 1.6, -6, side * 2.4, -6, 0.5, 3.1, recess));
  }
  hull.add(strip(0, 2.4, 0, -10.4, 1.4, 2.75, recess));
  hull.add(strip(0, 2.2, 0, -10.2, 0.7, 2.95, glow, 0.3));

  // Lance emitter: twin rails cradling a charged crystal at the nose.
  for (const side of SIDES) {
    hull.add(podY(side * 1.3, 14.2, 2.6, 0.6, 6.4, titanium));
    hull.add(podY(side * 1.3, 17.6, 2.6, 0.38, 0.8, MATERIALS.edge()));
  }
  hull.add(ellipsoid(0, 15.6, 2.7, 0.85, 2.6, 0.8, MATERIALS.glow(GLOW, 3)));
  hull.add(ellipsoid(0, 16, 3.2, 0.42, 1.4, 0.5, MATERIALS.glow(HOT, 3.2)));

  hull.add(canopy(0, 5.2, 3.05, 1, 1.9, 0.7, GLOW));
  hull.add(engine(0, -15.4, 1.2, 1.25, titanium, GLOW, HOT));

  return noseDown(hull);
}
