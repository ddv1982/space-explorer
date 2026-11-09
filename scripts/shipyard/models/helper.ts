import * as THREE from 'three';
import { MATERIALS, mirrored, slab } from './kit';
import { SIDES, canopy, engine, onSide, plate, strip, vents } from './lightCraftParts';

const GLOW = '#1fc8b0';
const HOT = '#dcfff6';

/** Helper drone: compact escort in the player's ceramic-over-titanium livery with teal glows. 24×30, nose up. */
export function buildHelper(): THREE.Group {
  const ship = new THREE.Group();
  const titanium = MATERIALS.titanium();
  const ceramic = MATERIALS.ceramic();
  const recess = MATERIALS.recess();
  const glow = MATERIALS.glow(GLOW, 2.8);

  // Delta wing.
  ship.add(
    slab(
      mirrored([
        [2, 7.4],
        [8.6, -4.2],
        [8.4, -6.6],
        [4, -8.8],
        [2, -6.4],
      ]).map(([x, y]) => [x, y] as const),
      1,
      0.3,
      titanium
    )
  );

  for (const side of SIDES) {
    hull(side);
  }

  function hull(side: 1 | -1) {
    ship.add(
      plate(
        onSide(
          [
            [3.4, 1.6],
            [7.3, -4.9],
            [6.7, -6.4],
            [3.4, -5],
          ],
          side
        ),
        1.3,
        ceramic
      )
    );
    ship.add(strip(side * 3, 4.1, side * 7.9, -4.2, 0.65, 1.4, glow));
    ship.add(strip(side * 4.2, -1.4, side * 5.6, -2.2, 0.5, 1.85, recess));
  }

  // Fuselage with ceramic dorsal armour.
  ship.add(
    slab(
      mirrored([
        [0, 12.6],
        [2.3, 8.6],
        [3, -6],
        [2.4, -9],
        [0, -9.4],
      ]),
      2,
      0.5,
      titanium
    )
  );
  ship.add(
    plate(
      mirrored([
        [0, 11.2],
        [1.8, 8.2],
        [2.1, -4.6],
        [1.2, -7.6],
        [0, -8],
      ]),
      2.5,
      ceramic,
      0.6
    )
  );
  ship.add(strip(0, 2.6, 0, -1.2, 0.6, 3.25, recess));
  for (const side of SIDES) ship.add(vents(side * 0.95, -4.4, 3.3, 1, 2.4, 3, recess));

  ship.add(canopy(0, 6, 3.3, 1.2, 2.2, 0.8, GLOW));
  for (const side of SIDES) ship.add(engine(side * 2.3, -9.2, 1.4, 1.05, titanium, GLOW, HOT));

  return ship;
}
