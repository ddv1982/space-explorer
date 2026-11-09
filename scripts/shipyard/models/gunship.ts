import * as THREE from 'three';
import { MATERIALS, box, ellipsoid, mirrored, podY, slab } from './kit';
import { bar, disc, engine, gunmetal, hinge, noseDown, paint, plating, side, taperY, vents } from './heavyParts';

const BLUE = '#63a4ff';
/** Deep emissive blue: tone mapping keeps the hue instead of washing it to white. */
const BLUE_GLOW = '#0a5cff';
const BLUE_HOT = '#5c9cff';

/**
 * Gunship: twin long cannon nacelles braced to a central command pod, blue armour, glowing muzzles,
 * a cross-strut light bar and twin pod engines. 40×40 logical, nose down.
 */
export function buildGunship(): THREE.Group {
  const hull = new THREE.Group();
  const metal = gunmetal();
  const titanium = MATERIALS.titanium();
  const plate = plating();
  const recess = MATERIALS.recess();
  const armour = paint(BLUE, 0.3);
  const glow = MATERIALS.glow(BLUE_GLOW, 3);
  const hot = MATERIALS.glow(BLUE_HOT, 2.6);

  // Cross struts bracing the nacelles to the pod.
  hull.add(
    slab(
      mirrored([
        [0, 4],
        [10, 2.6],
        [10, -5.4],
        [0, -4.4],
      ]),
      1.2,
      0.3,
      metal,
      0.6
    )
  );
  hull.add(bar(-9.4, -1.4, 9.4, -1.4, 0.8, 2.25, 0.3, glow));

  for (const s of [1, -1]) {
    const x = s * 11;
    // Nacelle body: bevelled titanium block with a blue armour cap that slopes outward.
    hull.add(
      slab(
        side(
          [
            [8, 11],
            [9, 12.4],
            [13, 12.4],
            [14, 11],
            [14, -10],
            [13, -12],
            [9, -12],
            [8, -10],
          ],
          s
        ),
        2.2,
        0.45,
        metal
      )
    );
    hull.add(
      hinge(
        slab(
          side(
            [
              [9.2, 10.4],
              [12.8, 10.4],
              [12.8, -2.6],
              [9.2, -2.6],
            ],
            s
          ),
          0.6,
          0.2,
          armour,
          2.8
        ),
        x,
        3.1,
        s * 0.12
      )
    );
    hull.add(
      hinge(
        slab(
          side(
            [
              [9.2, -4],
              [12.8, -4],
              [12.8, -10.2],
              [9.2, -10.2],
            ],
            s
          ),
          0.6,
          0.2,
          armour,
          2.8
        ),
        x,
        3.1,
        s * 0.12
      )
    );
    // Dark inner rail, outer ceramic trim and a vent block.
    hull.add(box(s * 8.6, -0.5, 2.75, 0.8, 20, 0.6, recess));
    hull.add(box(s * 13.7, 0, 2.6, 0.7, 19, 0.5, plate));
    hull.add(vents(x, -5.6, x, -8.6, 3, 2.8, 3.75));

    // Cannon barrel: shroud, barrel and glowing muzzle.
    hull.add(podY(x, 13.6, 2.2, 1.5, 3, titanium));
    hull.add(podY(x, 16, 2.2, 0.9, 3.4, plate));
    hull.add(podY(x, 15.2, 2.2, 1.15, 0.6, recess));
    hull.add(ellipsoid(x, 17.7, 2.2, 1.25, 1.0, 1.25, glow));
    hull.add(ellipsoid(x, 17.9, 2.9, 0.6, 0.55, 0.5, hot));
    // Breech light where the old neon core sat.
    hull.add(disc(x, 8.6, 3.75, 0.9, 0.3, hot, 18));

    // Nacelle exhaust.
    hull.add(engine(x, -12.6, 1.6, 1.7, glow));
  }

  // Central command pod: elongated hex with a stepped armour spine and a glass canopy.
  hull.add(
    slab(
      mirrored([
        [0, 17],
        [5, 10],
        [5.4, -6],
        [2.8, -12.4],
        [0, -12.8],
      ]),
      2.8,
      0.5,
      metal
    )
  );
  for (const s of [1, -1]) {
    hull.add(
      hinge(
        slab(
          side(
            [
              [0.9, 14.4],
              [3.9, 9.6],
              [4.2, 2.6],
              [0.9, 2.6],
            ],
            s
          ),
          0.5,
          0.15,
          armour,
          3.4
        ),
        s * 0.9,
        3.6,
        s * 0.16
      )
    );
    hull.add(
      hinge(
        slab(
          side(
            [
              [0.9, 1.4],
              [4.3, 1.4],
              [4.4, -5.6],
              [2.4, -10.4],
              [0.9, -10.4],
            ],
            s
          ),
          0.5,
          0.15,
          plate,
          3.4
        ),
        s * 0.9,
        3.6,
        s * 0.16
      )
    );
  }
  hull.add(box(0, 2, 3.75, 0.8, 23, 0.4, recess));
  hull.add(ellipsoid(0, 9.4, 4.0, 1.6, 3.4, 1.0, MATERIALS.glass(BLUE)));
  hull.add(ellipsoid(0, 10.4, 4.6, 0.6, 1.4, 0.3, hot));
  hull.add(taperY(0, -3.5, 4.0, 1.2, 1.2, 2.2, titanium));
  hull.add(disc(0, -3.5, 5.15, 0.75, 0.3, hot, 16));

  // Twin pod engines.
  for (const s of [1, -1]) hull.add(engine(s * 2.2, -13.6, 2.2, 1.45, glow));

  return noseDown(hull);
}
