import * as THREE from 'three';
import { MATERIALS, box, ellipsoid, mirrored, slab } from './kit';
import { bar, disc, engine, gunmetal, hinge, noseDown, paint, plating, side, vents } from './heavyParts';

const VIOLET = '#b45dff';
/** Deep emissive violet: tone mapping keeps the hue instead of washing it to white. */
const VIOLET_GLOW = '#7a1cff';
const VIOLET_HOT = '#c98cff';

/**
 * Sower: bulbous minelayer with a domed forward hull, violet shoulder armour and a rear mine bay of
 * two glowing launch hatches, each holding a primed mine. 34×34 logical, nose down.
 */
export function buildSower(): THREE.Group {
  const hull = new THREE.Group();
  const metal = gunmetal();
  const titanium = MATERIALS.titanium();
  const plate = plating();
  const recess = MATERIALS.recess();
  const armour = paint(VIOLET, 0.32);
  const glow = MATERIALS.glow(VIOLET_GLOW, 3);
  const hot = MATERIALS.glow(VIOLET_HOT, 2.6);

  // Rounded pod hull (heavy bevel gives the bulbous edge a soft falloff).
  hull.add(
    slab(
      mirrored([
        [0, 14.4],
        [5.6, 12.4],
        [9.6, 8.4],
        [12.4, 1],
        [11.8, -5],
        [7.6, -11.4],
        [3.2, -13.8],
        [0, -14],
      ]),
      1.8,
      1.0,
      metal
    )
  );

  // Domed forward shell.
  hull.add(ellipsoid(0, 5.4, 2.0, 6.4, 7.6, 2.2, plate));
  hull.add(box(0, 5.6, 4.0, 0.7, 12, 0.6, recess));
  hull.add(ellipsoid(0, 7.4, 3.9, 2.0, 3.0, 0.8, MATERIALS.glass(VIOLET)));
  hull.add(ellipsoid(0, 8.2, 4.5, 0.7, 1.2, 0.3, hot));

  for (const s of [1, -1]) {
    // Shoulder armour (the old ceramic triangles), sloping off the dome.
    hull.add(
      hinge(
        slab(
          side(
            [
              [3.2, 12.6],
              [7.8, 10.2],
              [11, 2.6],
              [7.8, 3.6],
            ],
            s
          ),
          0.6,
          0.2,
          armour,
          2.8
        ),
        s * 3.2,
        3.2,
        s * 0.14
      )
    );
    // Violet edge strip and a flank sponson with vents.
    hull.add(bar(s * 4.4, 12.9, s * 8.8, 10.4, 0.7, 3.2, 0.6, glow));
    hull.add(
      slab(
        side(
          [
            [9.8, 1.2],
            [12.2, 0.6],
            [11.6, -5.2],
            [9.4, -6.6],
          ],
          s
        ),
        1.2,
        0.3,
        titanium,
        1.8
      )
    );
    hull.add(vents(s * 10.6, -0.6, s * 10.6, -4.8, 3, 1.4, 3.35));
  }

  // Nose sensor slot.
  hull.add(box(0, 11.6, 3.0, 3.2, 2.4, 1.2, recess));
  hull.add(box(0, 11.8, 3.5, 2.0, 0.9, 0.4, hot));

  // Mine bay: recessed well across the rear deck with two launch hatches.
  hull.add(
    slab(
      mirrored([
        [0, 1],
        [8, 1],
        [9.2, -0.2],
        [9.2, -7.8],
        [8, -9],
        [0, -9],
      ]),
      0.6,
      0.2,
      recess,
      2.8
    )
  );
  hull.add(bar(-9.6, 1.4, 9.6, 1.4, 0.7, 3.5, 0.4, plate));
  for (const s of [1, -1]) {
    const x = s * 5.2;
    hull.add(disc(x, -3.6, 3.4, 3.4, 0.5, titanium));
    hull.add(disc(x, -3.6, 3.65, 2.7, 0.3, glow));
    hull.add(disc(x, -3.6, 3.8, 2.1, 0.3, recess));
    // The primed mine sitting in the hatch.
    hull.add(ellipsoid(x, -3.6, 3.9, 1.4, 1.4, 1.0, armour));
    hull.add(ellipsoid(x, -3.6, 4.5, 0.65, 0.65, 0.5, hot));
  }
  hull.add(box(0, -3.6, 3.5, 1.2, 7, 0.6, plate));

  // Rear deck plate and twin engines.
  hull.add(
    slab(
      mirrored([
        [0, -9.8],
        [6.6, -9.8],
        [3, -12.6],
        [0, -12.8],
      ]),
      0.5,
      0.15,
      armour,
      2.8
    )
  );
  for (const s of [1, -1]) hull.add(engine(s * 3.6, -13.2, 1.6, 1.4, glow));

  return noseDown(hull);
}
