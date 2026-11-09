import * as THREE from 'three';
import {
  bossMaterials,
  bothSides,
  box,
  cellGrid,
  ellipsoid,
  engine,
  greebles,
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

/** Barrage: broad gun-line battleship, a swept delta bristling with twin batteries. Pink-red. */
export function buildBossBarrage(): THREE.Group {
  const m = bossMaterials({ armour: '#8a2238', armourDark: '#4c1220', glow: '#ff6688', hot: '#ffd7e0' });
  const hull = new THREE.Group();

  // Main delta hull with stepped trailing edge.
  hull.add(
    slab(
      mirrored([
        [0, 25.5],
        [4.5, 21],
        [7.5, 13],
        [16, 6.5],
        [38.5, -4.5],
        [41, -9.5],
        [38, -12.5],
        [27, -12],
        [24, -16],
        [14, -16.5],
        [11.5, -22],
        [6, -24.5],
        [0, -24.5],
      ]),
      2.4,
      0.5,
      m.hull
    )
  );

  bothSides(hull, (side) => [
    // Leading-edge armour band.
    slab(
      sided(side, [
        [8.5, 12],
        [16.5, 6.2],
        [38, -4.4],
        [37, -6.6],
        [16, 3.4],
        [9, 8],
      ]),
      0.6,
      0.18,
      m.armour,
      2.7
    ),
    // Inner wing plate and outer wing plate split by a seam.
    slab(
      sided(side, [
        [9, 6.4],
        [17, 2.6],
        [24, -0.8],
        [24, -11],
        [14.6, -15],
        [9, -15],
      ]),
      0.6,
      0.18,
      m.armourDark,
      2.7
    ),
    slab(
      sided(side, [
        [25.2, -1.4],
        [36.6, -7],
        [37.6, -10.2],
        [27.4, -10.8],
        [25.2, -8.6],
      ]),
      0.6,
      0.18,
      m.armour,
      2.7
    ),
    // Glowing leading-edge light line.
    strand(side * 9.4, 10.4, side * 37.2, -4.6, 3.55, 0.45, m.glow),
    // Wing-tip running light and trailing sponson.
    ellipsoid(side * 39.4, -9, 2.6, 1.1, 1.6, 0.8, m.glow),
    podY(side * 33, -11.5, 2.6, 1.3, 4, m.titanium),
    // Broadside battery: three twin turrets per wing, outermost angled outward.
    turret(m, side * 14.5, -2.5, 3.3, 2.5, { barrels: 2, length: 4.6, angle: side * -0.08 }),
    turret(m, side * 21, -6, 3.3, 2.4, { barrels: 2, length: 4.4, angle: side * -0.18 }),
    turret(m, side * 29.5, -6.6, 3.3, 2.2, { barrels: 2, length: 4, angle: side * -0.32 }),
    // Missile cells behind the batteries.
    cellGrid(m, side * 17.5, -12, 3.35, 4, 2, 1.6, (c, r) => (c + r) % 2 === 0),
    // Vent strip and wing engines.
    vent(m, side * 31, -9.3, 3.35, 4.2, 1.6, 3, false, side * 0.08),
    engine(m, side * 19, -16.5, 1.4, 1.5, 2.4),
    engine(m, side * 9, -22.5, 1.4, 1.7, 2.6),
    // Spinal hull sidings.
    strip(side * 4.6, -4, 5.05, 0.45, 26, m.glowSoft),
  ]);

  // Raised ceramic spine with layered armour and a seam.
  hull.add(
    slab(
      mirrored([
        [0, 23],
        [3.6, 18],
        [5.6, 10],
        [5.6, -19],
        [3.4, -22],
      ]),
      1.8,
      0.4,
      m.titanium,
      2.6
    )
  );
  hull.add(
    slab(
      mirrored([
        [0, 15],
        [2.6, 12],
        [2.6, -18],
        [0, -19],
      ]),
      0.4,
      0.12,
      m.ceramic,
      4.75
    )
  );
  hull.add(
    slab(
      mirrored([
        [0, 20.5],
        [2.4, 17],
        [3.6, 12],
        [0, 13],
      ]),
      0.6,
      0.15,
      m.armour,
      4.6
    )
  );
  hull.add(box(0, -3, 5.3, 0.45, 30, 0.3, m.recess));

  // Spinal main battery: two heavy triple turrets and a twin bow cannon.
  hull.add(turret(m, 0, 7.5, 4.8, 3.3, { barrels: 3, length: 5.6, spacing: 1.2 }));
  hull.add(turret(m, 0, -1.5, 4.8, 3.1, { barrels: 3, length: 5.2, spacing: 1.15 }));
  for (const x of [-1.1, 1.1]) hull.add(podY(x, 21, 4.8, 0.45, 7, m.ceramic));
  hull.add(box(0, 18.2, 5.2, 3.2, 2.2, 1.2, m.titanium));

  // Command tower with lit bridge slit.
  hull.add(box(0, -11, 5.6, 6, 5, 2, m.titanium));
  hull.add(box(0, -10.4, 7, 4.2, 3, 1.4, m.armourDark));
  hull.add(strip(0, -9.1, 7.8, 3.4, 0.5, m.glow));
  hull.add(box(0, -12.6, 8.2, 0.6, 2, 1.4, m.ceramic));

  // Reactor glow behind the tower and the spine's tail engines.
  hull.add(ellipsoid(0, -16.8, 4.6, 2.4, 1.6, 0.8, m.glow));
  hull.add(ellipsoid(0, -16.8, 5, 1.1, 0.7, 0.6, m.hot));
  hull.add(engine(m, 0, -24, 2.2, 2.2, 3));
  hull.add(engine(m, 3.4, -23.2, 2, 1.4, 2.4));
  hull.add(engine(m, -3.4, -23.2, 2, 1.4, 2.4));

  hull.add(greebles(m, 11, { x: 8, y: 5, w: 6, h: 3 }, 2.9, 4));
  hull.add(greebles(m, 23, { x: 27, y: -12, w: 9, h: 1.5 }, 2.9, 3));

  return noseDown(hull);
}
