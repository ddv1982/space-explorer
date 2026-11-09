import * as THREE from 'three';
import {
  bandY,
  bossMaterials,
  bothSides,
  box,
  ellipsoid,
  engine,
  greebles,
  noseDown,
  podY,
  ringZ,
  sided,
  slab,
  strip,
  vent,
  type BossMaterials,
} from './bossKit';
import { mirrored } from './kit';

/** Siege cannon lying nose-to-tail: breech block, banded barrel with heat coils and a muzzle brake. */
function siegeCannon(m: BossMaterials, x: number, y0: number, y1: number, z: number, r: number): THREE.Group {
  const group = new THREE.Group();
  const length = y1 - y0;
  group.add(box(0, 1.6, 0, r * 2.8, 3.2, r * 1.6, m.titanium));
  group.add(box(0, 1.6, r * 0.8, r * 2, 2.2, 0.4, m.armour));
  group.add(podY(0, length / 2, 0, r, length, m.hull));
  group.add(podY(0, length * 0.32, 0, r * 1.18, length * 0.42, m.titanium));
  for (let i = 0; i < 4; i++) group.add(bandY(0, length * (0.2 + i * 0.06), 0, r * 1.18, r * 0.16, m.glow));
  group.add(podY(0, length * 0.75, 0, r * 0.82, length * 0.5, m.ceramic));
  group.add(box(0, length - 0.9, 0, r * 2.4, 1.8, r * 1.4, m.titanium));
  group.add(box(0, length - 0.9, r * 0.72, r * 1.6, 0.5, 0.3, m.recess));
  group.add(ellipsoid(0, length + 0.1, 0, r * 0.6, 0.4, r * 0.6, m.hot));
  group.position.set(x, y0, z);
  return group;
}

/** Pressure: hammer-headed siege platform behind three massive cannons, radiator combs glowing. Orange. */
export function buildBossPressure(): THREE.Group {
  const m = bossMaterials({ armour: '#a8481e', armourDark: '#5c240e', glow: '#ff9a66', hot: '#ffe3d1' });
  const hull = new THREE.Group();

  // Radiator combs: angled heat-sink fins flaring out from the flanks, glowing between.
  bothSides(hull, (side) => {
    const parts: THREE.Object3D[] = [
      slab(
        sided(side, [
          [22, 5],
          [33, 5],
          [33, -19],
          [22, -19],
        ]),
        1,
        0.2,
        m.recess,
        0.4
      ),
    ];
    for (let i = 0; i < 7; i++) {
      const y = 4 - i * 3.5;
      const reach = 41 - Math.abs(i - 2.5) * 1.1;
      parts.push(
        slab(
          sided(side, [
            [22, y + 0.6],
            [reach, y - 1.4],
            [reach, y - 2.6],
            [22, y - 1.2],
          ]),
          1.6,
          0.25,
          m.hull,
          0.8
        )
      );
      parts.push(
        slab(
          sided(side, [
            [26, y + 0.1],
            [reach - 1, y - 1.6],
            [reach - 1, y - 2.1],
            [26, y - 0.6],
          ]),
          0.3,
          0.08,
          i % 2 === 0 ? m.armourDark : m.titanium,
          2.6
        )
      );
      // Heat bleeding out between the fins.
      if (i < 6)
        parts.push(
          slab(
            sided(side, [
              [24, y - 2],
              [reach - 2.5, y - 3.3],
              [reach - 2.5, y - 3.7],
              [24, y - 2.5],
            ]),
            0.2,
            0.05,
            m.glow,
            1.7
          )
        );
    }
    return parts;
  });

  // Hammerhead siege body.
  hull.add(
    slab(
      mirrored([
        [0, 12],
        [24, 12],
        [28, 8],
        [26, -6],
        [20, -14],
        [14, -16],
        [12, -24],
        [0, -24],
      ]),
      3.2,
      0.6,
      m.hull
    )
  );
  // Bow armour block across the hammerhead.
  hull.add(
    slab(
      mirrored([
        [0, 10.4],
        [22.6, 10.4],
        [26, 7],
        [25, 2],
        [0, 2],
      ]),
      1,
      0.3,
      m.armour,
      3.6
    )
  );
  hull.add(box(0, 1.3, 4.5, 50, 0.5, 0.3, m.recess));
  for (const x of [-19, -8.5, 8.5, 19]) hull.add(box(x, 6.2, 4.75, 0.4, 8.4, 0.3, m.recess));
  for (const x of [-23.4, -21.6, 21.6, 23.4]) hull.add(box(x, 4.2, 4.8, 0.9, 3.4, 0.3, m.glow));
  hull.add(greebles(m, 91, { x: 9.5, y: 2.6, w: 8, h: 7 }, 4.6, 6));
  bothSides(hull, (side) => [
    slab(
      sided(side, [
        [6, 0.6],
        [24.6, 0.6],
        [23.8, -6],
        [18.6, -12.6],
        [6, -12.6],
      ]),
      0.9,
      0.25,
      m.armourDark,
      3.6
    ),
    // Heat-vent grilles glowing through the deck.
    vent(m, side * 15.5, -5, 4.7, 7, 6, 6, true),
    vent(m, side * 22, -3, 4.5, 3, 5, 4, true, side * -0.15),
    // Flank ammunition hoppers.
    box(side * 9.6, -18, 4.2, 4, 6, 2, m.titanium),
    box(side * 9.6, -18, 5.4, 3, 4.8, 0.5, m.armour),
    strip(side * 26.8, 1, 4, 0.5, 12, m.glow, side * 0.1),
  ]);

  // Central reactor and heat exchanger stack.
  hull.add(
    slab(
      mirrored([
        [0, 0],
        [4.6, 0],
        [4.6, -20],
        [0, -22],
      ]),
      1.4,
      0.35,
      m.titanium,
      3.6
    )
  );
  hull.add(ringZ(0, -9, 6, 3.6, 0.7, m.titanium));
  hull.add(ringZ(0, -9, 6.3, 2.6, 0.5, m.glow));
  hull.add(ellipsoid(0, -9, 6.4, 1.8, 1.8, 1, m.hot));
  for (let i = 0; i < 4; i++) hull.add(box(0, -14.5 - i * 1.6, 5.6, 7, 0.7, 0.6, i % 2 === 0 ? m.glowSoft : m.hull));

  // Three siege cannons: a colossal centre gun and two flank guns.
  hull.add(siegeCannon(m, 0, 4, 26, 6.4, 2.8));
  hull.add(siegeCannon(m, -15, 6, 22.6, 5.4, 2));
  hull.add(siegeCannon(m, 15, 6, 22.6, 5.4, 2));

  // Rear drive cluster.
  hull.add(box(0, -23, 3, 20, 3, 3, m.titanium));
  for (const x of [-7, 0, 7]) hull.add(engine(m, x, -25, 1.8, x === 0 ? 2.3 : 1.9, 2.4));

  hull.add(greebles(m, 77, { x: 5.5, y: -12, w: 4, h: 10 }, 4.5, 4));

  return noseDown(hull);
}
