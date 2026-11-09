import * as THREE from 'three';
import { MATERIALS, mirrored, podY, slab } from './kit';
import { SIDES, canopy, engine, gunmetal, noseDown, onSide, plate, strip } from './lightCraftParts';

const ACCENT = '#13778f';
const GLOW = '#0fb8d6';
const HOT = '#d8fbff';

/** Dodger: wide, slim evasion wing with cyan armour, lateral thrusters and twin engines. 30×24, nose down. */
export function buildDodger(): THREE.Group {
  const hull = new THREE.Group();
  const metal = gunmetal();
  const titanium = MATERIALS.titanium();
  const recess = MATERIALS.recess();
  const armour = MATERIALS.armour(ACCENT);
  const glow = MATERIALS.glow(GLOW, 2.8);

  // Thin flying wing.
  hull.add(
    slab(
      mirrored([
        [0, 9.4],
        [3.4, 4.2],
        [12.4, -1.4],
        [12.4, -3.2],
        [7.2, -6.6],
        [3.4, -4.8],
        [0, -5],
      ]),
      0.9,
      0.3,
      metal
    )
  );

  for (const side of SIDES) {
    hull.add(
      plate(
        onSide(
          [
            [3.9, 2.6],
            [10.6, -1.6],
            [10.2, -2.9],
            [7.2, -4.9],
            [3.9, -2.4],
          ],
          side
        ),
        1.2,
        armour
      )
    );
    hull.add(strip(side * 5.2, 1.4, side * 7.6, -4.2, 0.5, 1.75, recess));
    hull.add(strip(side * 3.8, 3.8, side * 11.6, -1, 0.7, 1.35, glow));
    // Lateral thruster blocks on the wingtips.
    hull.add(podY(side * 12, -2.3, 0.9, 0.8, 3.4, titanium));
    hull.add(strip(side * 12.75, -1.2, side * 12.75, -3.4, 0.6, 0.9, glow, 0.8));
    // Wing-root guns.
    hull.add(podY(side * 3.3, 4.6, 1.3, 0.48, 3.6, titanium));
    hull.add(podY(side * 3.3, 6.6, 1.3, 0.3, 0.8, MATERIALS.edge()));
    // Twin engine nacelles.
    hull.add(engine(side * 4.3, -6.3, 1.2, 1.05, titanium, GLOW, HOT, 4));
  }

  // Raised fuselage pod.
  hull.add(
    slab(
      mirrored([
        [0, 8.6],
        [1.9, 5],
        [2.6, -2],
        [1.8, -5.4],
        [0, -5.8],
      ]),
      1.3,
      0.35,
      titanium,
      1.2
    )
  );
  hull.add(strip(0, -1.4, 0, -4.8, 0.65, 2.9, recess));
  hull.add(canopy(0, 3, 2.85, 1.1, 2.1, 0.7, GLOW));

  return noseDown(hull);
}
