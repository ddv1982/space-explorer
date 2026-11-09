import * as THREE from 'three';
import { MATERIALS, box, ellipsoid, mirrored, podY, slab } from './kit';
import { bar, disc, engine, gunmetal, hinge, noseDown, paint, plating, side, vents } from './heavyParts';

const AMBER = '#ffb14b';
/** Deep emissive amber: tone mapping keeps the hue instead of washing it to white. */
const AMBER_GLOW = '#c85200';
const AMBER_HOT = '#ff9a2a';

/**
 * Bomber: heavy armoured hex hull with amber plate armour, a horizontal visor bridge, a glowing
 * bomb bay, flank ordnance pods and a four-engine tail. 44×38 logical, nose down.
 */
export function buildBomber(): THREE.Group {
  const hull = new THREE.Group();
  const metal = gunmetal();
  const titanium = MATERIALS.titanium();
  const ceramic = plating();
  const recess = MATERIALS.recess();
  const armour = paint(AMBER, 0.3);
  const glow = MATERIALS.glow(AMBER_GLOW, 3);
  const hot = MATERIALS.glow(AMBER_HOT, 2.6);

  // Heavy hex hull (nose up while authoring).
  hull.add(
    slab(
      mirrored([
        [0, 16.6],
        [10.6, 11.8],
        [17.6, 2],
        [15, -10.6],
        [8.4, -16.4],
        [0, -16.4],
      ]),
      2.4,
      0.55,
      metal
    )
  );
  // Raised mid deck so the armour sits on a stepped base.
  hull.add(
    slab(
      mirrored([
        [0, 15],
        [9.6, 10.6],
        [15.8, 1.8],
        [13.4, -9.8],
        [7.6, -15],
        [0, -15],
      ]),
      0.6,
      0.2,
      titanium,
      2.6
    )
  );

  const deck = 3.6;
  for (const s of [1, -1]) {
    // Forward armour plate with an amber leading-edge light, sloping off the spine.
    hull.add(
      hinge(
        slab(
          side(
            [
              [2.9, 13.4],
              [9.4, 9.9],
              [14.6, 2.4],
              [13.8, -1.9],
              [2.9, -1.9],
            ],
            s
          ),
          0.7,
          0.2,
          armour,
          deck + 0.9
        ),
        s * 3,
        deck + 1.2,
        s * 0.12
      )
    );
    hull.add(bar(s * 3.4, 14.9, s * 9.9, 11.3, 0.7, deck + 0.3, 0.6, glow));
    hull.add(bar(s * 10.4, 10.4, s * 15.2, 3.4, 0.7, deck + 0.1, 0.8, glow));
    // Heat vents across the forward plate.
    hull.add(hinge(vents(s * 6, 3.6, s * 11.4, 3.6, 5, 2.6, deck + 2.0), s * 3, deck + 1.2, s * 0.12));

    // Aft flank plate.
    hull.add(
      hinge(
        slab(
          side(
            [
              [10, -4],
              [14.2, -4],
              [12.9, -9.9],
              [10, -12.6],
            ],
            s
          ),
          0.7,
          0.2,
          armour,
          deck + 0.6
        ),
        s * 10,
        deck + 0.9,
        s * 0.2
      )
    );

    // Flank ordnance pod: dark launcher tube with a glowing warhead and amber bands.
    hull.add(podY(s * 15.8, -5, 3.6, 2.5, 10.5, titanium));
    hull.add(podY(s * 15.8, -5, 3.6, 2.62, 0.7, recess));
    hull.add(podY(s * 15.8, -8.4, 3.6, 2.62, 0.7, recess));
    hull.add(ellipsoid(s * 15.8, 1.2, 3.6, 2.1, 1.9, 2.1, glow));
    hull.add(ellipsoid(s * 15.8, 2.0, 4.6, 0.9, 0.8, 0.8, hot));
    hull.add(podY(s * 15.8, -10.6, 3.6, 1.6, 1.0, recess));

    // Wing-root sensor blister.
    hull.add(ellipsoid(s * 6.4, 11.2, 3.8, 1.2, 1.2, 0.7, ceramic));
  }

  // Seams between plates (the old neon panel lines become dark grooves with a thin amber trim).
  hull.add(bar(-9.2, -3, 9.2, -3, 0.8, deck + 0.05, 0.3, recess));
  for (const s of [1, -1]) hull.add(bar(s * 9.2, -3, s * 9.2, -13.6, 0.8, deck + 0.05, 0.3, recess));

  // Bomb bay: recessed well with two armoured doors parted by a glowing slot.
  hull.add(box(0, -9.2, deck + 0.05, 16.4, 11.4, 0.5, recess));
  for (const s of [1, -1]) {
    hull.add(
      slab(
        side(
          [
            [0.9, -4.4],
            [8.2, -4.4],
            [8.2, -13.4],
            [0.9, -13.4],
          ],
          s
        ),
        0.55,
        0.15,
        titanium,
        deck
      )
    );
    hull.add(bar(s * 4.6, -5.4, s * 4.6, -12.4, 0.7, deck + 0.75, 0.25, recess));
  }
  hull.add(box(0, -8.9, deck + 0.4, 0.9, 8.6, 0.4, glow));
  for (const y of [-6, -9, -12]) hull.add(disc(0, y, deck + 0.7, 0.75, 0.3, hot, 16));

  // Central spine and the visor bridge.
  hull.add(
    slab(
      mirrored([
        [0, 15.6],
        [2.4, 12.6],
        [2.4, -2.2],
        [0, -2.2],
      ]),
      0.9,
      0.25,
      ceramic,
      deck
    )
  );
  hull.add(box(0, 5, deck + 1.2, 0.7, 12, 0.3, recess));
  hull.add(
    slab(
      mirrored([
        [0, 11.8],
        [5.4, 10.8],
        [6.4, 8.6],
        [5.6, 6.6],
        [0, 6.4],
      ]),
      1.0,
      0.3,
      titanium,
      deck + 0.6
    )
  );
  hull.add(box(0, 9.2, deck + 1.95, 10.2, 1.5, 0.3, MATERIALS.glass(AMBER)));
  hull.add(box(0, 9.2, deck + 2.05, 8.8, 0.7, 0.3, hot));

  // Tail: armoured engine block with four exhausts.
  hull.add(box(0, -15.2, 2.6, 15.6, 2.6, 2.2, titanium));
  for (const x of [-5.6, -1.9, 1.9, 5.6]) hull.add(engine(x, -16.6, 3.2, 1.55, glow));

  return noseDown(hull);
}
