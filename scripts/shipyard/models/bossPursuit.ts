import * as THREE from 'three';
import {
  bossMaterials,
  bothSides,
  box,
  ellipsoid,
  engine,
  noseDown,
  podY,
  sided,
  slab,
  strand,
  strip,
  turret,
  vent,
} from './bossKit';
import { mirrored } from './kit';

/** Pursuit: knife-nosed predator with forward-swept scythe wings and an oversized engine bank. Rose. */
export function buildBossPursuit(): THREE.Group {
  const m = bossMaterials({ armour: '#a32a46', armourDark: '#561424', glow: '#ff7892', hot: '#ffdee6' });
  const hull = new THREE.Group();

  // Forward-swept scythe wings: long blades whose tips claw ahead of their roots.
  bothSides(hull, (side) => [
    slab(
      sided(side, [
        [6, 2],
        [14, 4],
        [33, 16],
        [41, 25],
        [39, 18.5],
        [29, 2],
        [20, -12],
        [8, -15],
      ]),
      1.6,
      0.35,
      m.hull
    ),
    // Blade armour with a lit leading edge.
    slab(
      sided(side, [
        [9, 1.4],
        [15, 2.8],
        [31, 13.6],
        [36.4, 19],
        [27.6, 4.6],
        [19, -7.8],
        [9, -10.6],
      ]),
      0.5,
      0.15,
      m.armour,
      2
    ),
    slab(
      sided(side, [
        [13, -2],
        [19.6, -1.2],
        [25, 3.2],
        [20.4, -6],
        [13, -8],
      ]),
      0.4,
      0.12,
      m.armourDark,
      2.55
    ),
    strand(side * 14.4, 4.2, side * 39.6, 23, 2.3, 0.55, m.glow),
    strand(side * 21.4, -10.4, side * 38.4, 17.5, 1.8, 0.35, m.glowSoft),
    // Claw-tip emitters.
    ellipsoid(side * 39.4, 22.4, 2.2, 0.9, 1.6, 0.8, m.hot),
    // Rear stabiliser blades trailing back.
    slab(
      sided(side, [
        [7, -12],
        [16, -16],
        [27, -25],
        [22, -25.5],
        [8, -21],
      ]),
      1.2,
      0.3,
      m.hull,
      0.2
    ),
    slab(
      sided(side, [
        [9, -14],
        [15.4, -17],
        [23.4, -24],
        [9.4, -19.6],
      ]),
      0.4,
      0.12,
      m.armourDark,
      1.6
    ),
    strand(side * 16, -16.4, side * 26, -24.8, 1.8, 0.35, m.glowSoft),
    // Wing-root gun and intake.
    turret(m, side * 16.5, -4, 2.6, 1.8, { barrels: 2, length: 4.4, angle: side * 0.12 }),
    vent(m, side * 9.6, 4.5, 3, 2.4, 4, 4, true),
    podY(side * 24.5, 6.4, 2.4, 0.8, 9, m.titanium),
    podY(side * 24.5, 11.4, 2.4, 0.45, 2, m.ceramic),
  ]);

  // Knife fuselage.
  hull.add(
    slab(
      mirrored([
        [0, 26],
        [2.6, 20],
        [5.4, 9],
        [8.6, -4],
        [9.4, -17],
        [7.4, -23],
        [0, -23],
      ]),
      2.6,
      0.5,
      m.hull
    )
  );
  hull.add(
    slab(
      mirrored([
        [0, 23.4],
        [2.4, 17],
        [4.4, 8],
        [4.4, -2],
        [0, -2],
      ]),
      0.6,
      0.15,
      m.armour,
      3
    )
  );
  hull.add(
    slab(
      mirrored([
        [0, -3.4],
        [6.8, -3.4],
        [7.6, -16],
        [5.8, -20.4],
        [0, -20.4],
      ]),
      0.6,
      0.15,
      m.armourDark,
      3
    )
  );
  hull.add(box(0, -2.7, 3.7, 14, 0.45, 0.3, m.recess));
  // Spine ridge and canopy.
  hull.add(
    slab(
      mirrored([
        [0, 15],
        [1.6, 10],
        [1.8, -18],
        [0, -19],
      ]),
      1,
      0.3,
      m.titanium,
      3.4
    )
  );
  hull.add(ellipsoid(0, 6, 4.4, 1.6, 5, 1.1, m.glass));
  hull.add(strip(0, 6, 5.5, 0.4, 6, m.glowSoft));
  bothSides(hull, (side) => [
    strand(side * 1.5, 22, side * 4.6, 8.6, 3.75, 0.35, m.glow),
    strip(side * 6.4, -11, 3.8, 0.45, 12, m.glowSoft),
  ]);
  // Chin rail-gun prongs.
  for (const x of [-1.6, 1.6]) hull.add(podY(x, 22.4, 2.6, 0.4, 6, m.ceramic));

  // Oversized engine bank: two huge drives and two boosters.
  hull.add(box(0, -19.6, 4, 16, 5, 2.2, m.titanium));
  hull.add(box(0, -19.6, 5.2, 12, 2.6, 0.6, m.armour));
  hull.add(strip(0, -19.6, 5.6, 9, 0.5, m.glow));
  for (const [x, r] of [
    [-4.6, 3.2],
    [4.6, 3.2],
    [-10.2, 2],
    [10.2, 2],
  ] as const) {
    hull.add(engine(m, x, -24.4 + r * 0.4, 2.2, r, 4));
  }

  return noseDown(hull);
}
