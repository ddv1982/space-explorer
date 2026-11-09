import * as THREE from 'three';
import {
  arcOutline,
  bossMaterials,
  bothSides,
  box,
  cylZ,
  ellipsoid,
  engine,
  frustumZ,
  greebles,
  noseDown,
  ringZ,
  sided,
  slab,
  strip,
  turret,
  vent,
} from './bossKit';
import { mirrored } from './kit';

/** Bulwark: armoured fortress behind a segmented crescent shield wall, flanked by generator bastions. Violet. */
export function buildBossBulwark(): THREE.Group {
  const m = bossMaterials({ armour: '#5440a0', armourDark: '#2e2160', glow: '#b49cff', hot: '#ecdfff' });
  const hull = new THREE.Group();

  // Octagonal fortress core.
  hull.add(
    slab(
      mirrored([
        [0, 15],
        [17, 15],
        [23, 9],
        [23, -15],
        [17, -21],
        [0, -21],
      ]),
      3,
      0.6,
      m.hull
    )
  );

  // Crescent shield wall: a glowing emitter arc under five thick armour segments.
  const cx = 0;
  const cy = -9;
  hull.add(slab(arcOutline(cx, cy, 26.4, 30.6, 0.5, Math.PI - 0.5, 30), 2.2, 0.3, m.glowSoft, 1.6));
  const segments = 5;
  const start = 0.42;
  const end = Math.PI - 0.42;
  const gap = 0.035;
  for (let i = 0; i < segments; i++) {
    const a0 = start + ((end - start) * i) / segments + gap;
    const a1 = start + ((end - start) * (i + 1)) / segments - gap;
    hull.add(slab(arcOutline(cx, cy, 25.2, 34.4, a0, a1, 8), 2.4, 0.5, i % 2 === 0 ? m.armour : m.armourDark, 2.2));
    // Inner ceramic facing and stud.
    hull.add(slab(arcOutline(cx, cy, 30.6, 33.2, a0 + 0.04, a1 - 0.04, 8), 0.5, 0.15, m.ceramic, 5));
    const mid = (a0 + a1) / 2;
    hull.add(cylZ(cx + Math.cos(mid) * 28, cy + Math.sin(mid) * 28, 5.1, 0.9, 0.6, m.titanium, 6));
  }
  // Shield wall support struts back to the core.
  bothSides(hull, (side) => [
    box(side * 11, 12.6, 3.6, 2, 6, 1.2, m.titanium),
    box(side * 20, 9.4, 3.6, 2, 6, 1.2, m.titanium),
  ]);

  // Generator bastions: heavy side towers with glowing shield projector domes.
  bothSides(hull, (side) => [
    slab(
      sided(side, [
        [22, 4],
        [31, 4],
        [41, -4],
        [41, -16],
        [36, -21],
        [22, -21],
      ]),
      3.2,
      0.6,
      m.hull
    ),
    slab(
      sided(side, [
        [24, 2.4],
        [30.4, 2.4],
        [39.2, -4.6],
        [39.2, -10],
        [24, -10],
      ]),
      0.8,
      0.2,
      m.armour,
      3.6
    ),
    slab(
      sided(side, [
        [24, -11.4],
        [39.2, -11.4],
        [39.2, -15.4],
        [35.4, -19.2],
        [24, -19.2],
      ]),
      0.8,
      0.2,
      m.armourDark,
      3.6
    ),
    ringZ(side * 32.5, -9.5, 5, 4.4, 0.6, m.titanium),
    ringZ(side * 32.5, -9.5, 5.3, 3.4, 0.35, m.glow),
    frustumZ(side * 32.5, -9.5, 5.2, 2.4, 3.4, 1.6, m.armourDark),
    ellipsoid(side * 32.5, -9.5, 6, 1.8, 1.8, 1.2, m.hot),
    vent(m, side * 31, -17, 4.5, 8, 2, 4),
    turret(m, side * 27.5, -1.5, 4.5, 2.2, { barrels: 2, length: 3.6, angle: side * -0.25, cap: m.armourDark }),
    strip(side * 40.4, -10, 3.6, 0.5, 9, m.glow),
  ]);

  // Layered core armour: three stacked plates with seams.
  hull.add(
    slab(
      mirrored([
        [0, 13],
        [15.5, 13],
        [20.5, 8],
        [20.5, -3],
        [0, -3],
      ]),
      0.9,
      0.25,
      m.armour,
      3.6
    )
  );
  hull.add(
    slab(
      mirrored([
        [0, -4.4],
        [20.5, -4.4],
        [20.5, -14.2],
        [15.4, -19.2],
        [0, -19.2],
      ]),
      0.9,
      0.25,
      m.armourDark,
      3.6
    )
  );
  hull.add(
    slab(
      mirrored([
        [0, 10],
        [9, 10],
        [12, 6],
        [12, -13],
        [8, -16],
        [0, -16],
      ]),
      1.4,
      0.35,
      m.titanium,
      4.6
    )
  );
  hull.add(box(0, -3.7, 4.3, 41, 0.5, 0.4, m.recess));

  // Central keep: reactor dome under a cage ring, flanked by a lit gate slit.
  hull.add(cylZ(0, -3, 6.6, 7.2, 1.2, m.hull, 8));
  hull.add(ringZ(0, -3, 7.3, 6, 0.5, m.ceramic));
  hull.add(ringZ(0, -3, 7.5, 4.6, 0.45, m.glow));
  hull.add(ellipsoid(0, -3, 7.5, 3.6, 3.6, 2.2, m.armour));
  hull.add(ellipsoid(0, -3, 8.6, 1.9, 1.9, 1.4, m.hot));
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    hull.add(box(Math.cos(a) * 5.3, -3 + Math.sin(a) * 5.3, 8, 1.4, 1.4, 1.2, m.titanium));
  }
  hull.add(strip(0, 7.6, 6.2, 9, 0.6, m.glow));
  bothSides(hull, (side) => [
    turret(m, side * 7.6, 8.2, 6, 2.2, { barrels: 1, length: 4, cap: m.armour }),
    vent(m, side * 9, -12.5, 6.1, 4.5, 3.4, 4),
  ]);

  // Rear engine block: four square-shrouded engines.
  hull.add(box(0, -20.6, 2.2, 30, 3.4, 3.6, m.titanium));
  for (const x of [-11, -4, 4, 11]) {
    hull.add(box(x, -21.7, 2.4, 5.6, 2.6, 4.2, m.hull));
    hull.add(engine(m, x, -23.6, 2.6, 2, 1.4));
  }

  hull.add(greebles(m, 5, { x: 13, y: -2, w: 7, h: 4 }, 4.5, 5));

  return noseDown(hull);
}
