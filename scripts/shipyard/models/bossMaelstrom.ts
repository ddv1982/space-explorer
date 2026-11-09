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
  noseDown,
  ringZ,
  sided,
  slab,
  spiralOutline,
  strip,
  turret,
} from './bossKit';

/** Maelstrom: a spinning vortex disc of swept vanes around a blazing eye, held by twin storm emitters. Ice blue. */
export function buildBossMaelstrom(): THREE.Group {
  const m = bossMaterials({ armour: '#2f6f9e', armourDark: '#173a5c', glow: '#8fd3ff', hot: '#e0f3ff' });
  const hull = new THREE.Group();

  // Outrigger pylons to the storm emitters (beneath the disc).
  bothSides(hull, (side) => [
    slab(
      sided(side, [
        [14, 7],
        [31, 5.4],
        [36, 2.4],
        [36, -5.4],
        [31, -8],
        [14, -10],
      ]),
      1.8,
      0.4,
      m.hull
    ),
    slab(
      sided(side, [
        [20, 4.2],
        [30.4, 3],
        [33, 0.6],
        [33, -3.6],
        [30.4, -5.8],
        [20, -7],
      ]),
      0.5,
      0.15,
      m.armourDark,
      2.2
    ),
    strip(side * 27, -1.4, 2.8, 12, 0.5, m.glowSoft),
    // Storm emitter: ringed coil with a crackling core and a prong pair pointed forward.
    cylZ(side * 36.5, -1.4, 1.6, 5, 3.2, m.hull, 32),
    ringZ(side * 36.5, -1.4, 3.4, 4.3, 0.5, m.titanium),
    ringZ(side * 36.5, -1.4, 3.7, 3.2, 0.45, m.glow),
    frustumZ(side * 36.5, -1.4, 4, 1.6, 2.6, 1.6, m.armour),
    ellipsoid(side * 36.5, -1.4, 4.8, 1.3, 1.3, 1, m.hot),
    ...[0, 1, 2, 3, 4, 5].map((i) => {
      const a = (i * Math.PI) / 3 + Math.PI / 6;
      return box(side * 36.5 + Math.cos(a) * 4.6, -1.4 + Math.sin(a) * 4.6, 3.4, 1.1, 1.1, 0.8, m.ceramic);
    }),
    box(side * 39.4, 5, 2, 1, 4.4, 1, m.titanium),
    box(side * 33.6, 5, 2, 1, 4.4, 1, m.titanium),
  ]);

  // Main disc: hull plate, armoured rim, and a dark vortex well.
  hull.add(cylZ(0, 0, 1.4, 24.6, 2.8, m.hull, 64));
  hull.add(ringZ(0, 0, 3, 23.6, 1.1, m.titanium));
  for (let i = 0; i < 12; i++) {
    const a0 = (i * Math.PI) / 6 + 0.04;
    hull.add(
      slab(
        arcOutline(0, 0, 19.6, 22.4, a0, a0 + Math.PI / 6 - 0.08, 6),
        0.6,
        0.12,
        i % 2 === 0 ? m.armour : m.armourDark,
        2.9
      )
    );
    const mid = a0 + Math.PI / 12;
    hull.add(box(Math.cos(mid) * 21, Math.sin(mid) * 21, 3.7, 0.9, 0.9, 0.5, i % 3 === 0 ? m.glow : m.titanium));
  }
  hull.add(cylZ(0, 0, 3, 19, 0.4, m.recess, 64));

  // Spiral vanes sweeping into the eye, with glowing channels between them.
  const vanes = 7;
  for (let i = 0; i < vanes; i++) {
    const start = (i * Math.PI * 2) / vanes;
    hull.add(slab(spiralOutline(6.6, 18.6, start, 1.5, 1.6, 5.2), 0.9, 0.25, i % 2 === 0 ? m.armour : m.ceramic, 3.1));
    hull.add(slab(spiralOutline(7.2, 17.8, start, 1.5, 0.6, 1.6), 0.3, 0.08, m.titanium, 4.2));
    hull.add(slab(spiralOutline(7.4, 18.4, start - 0.42, 1.5, 0.3, 0.8), 0.2, 0.05, m.glowSoft, 3.2));
  }

  // Eye of the storm: stepped collar, glowing ring and a white-hot singularity.
  hull.add(cylZ(0, 0, 4.2, 7.4, 1.6, m.hull, 48));
  hull.add(ringZ(0, 0, 5, 6.8, 0.5, m.ceramic));
  hull.add(ringZ(0, 0, 5.1, 5.2, 0.7, m.glow));
  hull.add(cylZ(0, 0, 5, 4.4, 0.4, m.recess, 48));
  hull.add(ellipsoid(0, 0, 5.2, 3.2, 3.2, 1.2, m.glow));
  hull.add(ellipsoid(0, 0, 5.8, 1.7, 1.7, 1, m.hot));
  for (let i = 0; i < 3; i++) {
    hull.add(ringZ(0, 0, 5.4, 6, 0.3, m.titanium, 0.9, (i * Math.PI * 2) / 3));
  }

  // Forward-facing bow lances and rear drive pair.
  for (const x of [-9, 9]) hull.add(turret(m, x, 15.4, 4, 2, { barrels: 1, length: 4, cap: m.armourDark }));
  hull.add(box(0, -22.4, 2.2, 14, 4, 2, m.titanium));
  for (const x of [-4.6, 0, 4.6]) hull.add(engine(m, x, -24.2, 2.4, 1.8, 2));

  return noseDown(hull);
}
