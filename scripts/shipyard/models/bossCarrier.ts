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
  strip,
  turret,
  vent,
  type BossMaterials,
} from './bossKit';
import { mirrored } from './kit';

/** Small docked strike drone sitting on a deck, nose-up. */
function drone(m: BossMaterials, x: number, y: number, z: number): THREE.Group {
  const group = new THREE.Group();
  group.add(box(0, 0, 0, 4.2, 4.6, 0.2, m.recess));
  group.add(
    slab(
      mirrored([
        [0, 2.2],
        [2.2, -1.2],
        [1.6, -1.8],
        [0, -1.2],
      ]),
      0.4,
      0.12,
      m.titanium,
      0.1
    )
  );
  group.add(
    slab(
      mirrored([
        [0.6, 0.6],
        [1.9, -1.1],
        [1.5, -1.5],
        [0.6, -0.6],
      ]),
      0.15,
      0.05,
      m.armour,
      0.6
    )
  );
  group.add(ellipsoid(0, 0.2, 0.55, 0.45, 0.9, 0.3, m.glass));
  group.add(ellipsoid(0, -1.4, 0.3, 0.5, 0.3, 0.3, m.glow));
  group.position.set(x, y, z);
  return group;
}

/** Hangar mouth: deep dark bay framed in titanium, lit along its floor, with a deck-light row. */
function hangar(m: BossMaterials, x: number, y: number, z: number, w: number, h: number): THREE.Group {
  const group = new THREE.Group();
  group.add(box(0, 0, 0, w + 1.4, h + 1.2, 0.6, m.titanium));
  group.add(box(0, 0, 0.25, w, h, 0.4, m.recess));
  group.add(box(0, -h / 2 + 0.5, 0.45, w - 0.6, 0.5, 0.2, m.glowSoft));
  const lights = Math.max(2, Math.round(w / 2));
  for (let i = 0; i < lights; i++) {
    group.add(box(-w / 2 + (w * (i + 0.5)) / lights, h / 2 - 0.4, 0.45, 0.35, 0.35, 0.2, m.glow));
  }
  // Blast-door rails on the bay sides.
  group.add(box(-w / 2 - 0.3, 0, 0.5, 0.35, h + 0.6, 0.4, m.ceramic));
  group.add(box(w / 2 + 0.3, 0, 0.5, 0.35, h + 0.6, 0.4, m.ceramic));
  group.position.set(x, y, z);
  return group;
}

/** Carrier: twin-hulled flight-deck mothership, hangar bays agape at the bow. Amber. */
export function buildBossCarrier(): THREE.Group {
  const m = bossMaterials({ armour: '#a3581c', armourDark: '#5a2e10', glow: '#ffb066', hot: '#ffe8cc' });
  const hull = new THREE.Group();

  // Central connecting body.
  hull.add(
    slab(
      mirrored([
        [0, 13],
        [12, 13],
        [20, 9],
        [20, -15],
        [13, -19],
        [0, -19],
      ]),
      2.4,
      0.5,
      m.hull
    )
  );

  // The two flight-deck hulls.
  bothSides(hull, (side) => [
    slab(
      sided(side, [
        [20, 19],
        [23.5, 25],
        [34, 25],
        [37.5, 19],
        [37.5, -20],
        [34.5, -25],
        [23, -25],
        [20, -21],
      ]),
      3,
      0.5,
      m.hull
    ),
    // Flight deck plating, split into bow and stern panels.
    slab(
      sided(side, [
        [22, 15.6],
        [35.6, 15.6],
        [35.6, -3.8],
        [22, -3.8],
      ]),
      0.5,
      0.15,
      m.armourDark,
      3.5
    ),
    slab(
      sided(side, [
        [22, -5],
        [35.6, -5],
        [35.6, -19.4],
        [33.6, -22],
        [24, -22],
        [22, -19.4],
      ]),
      0.5,
      0.15,
      m.armour,
      3.5
    ),
    strip(side * 28.8, -12, 4.3, 13.2, 0.4, m.recess),
    strip(side * 28.8, 4, 4.3, 13.2, 0.4, m.recess),
    // Launch lane: centre line of amber lights and edge markers.
    ...Array.from({ length: 9 }, (_, i) =>
      strip(side * 28.8, 13.6 - i * 3.6, 4.3, 0.55, 1.4, i < 5 ? m.glow : m.glowSoft)
    ),
    strip(side * 22.6, -3, 4.3, 0.35, 34, m.titanium),
    strip(side * 35, -3, 4.3, 0.35, 34, m.titanium),
    // Bow hangar mouth.
    hangar(m, side * 28.8, 20.4, 3.4, 10, 4.2),
    // Docked drones queued on the deck.
    drone(m, side * 25.4, 6.5, 4.2),
    drone(m, side * 32.2, 6.5, 4.2),
    drone(m, side * 25.4, 0.5, 4.2),
    drone(m, side * 32.2, 0.5, 4.2),
    // Outboard gun sponsons and point-defence.
    podY(side * 39.2, -2, 1.6, 1.9, 22, m.titanium),
    box(side * 39.4, -2, 2.6, 2.2, 16, 1.2, m.armourDark),
    turret(m, side * 39.6, 6, 3.6, 1.8, { barrels: 2, length: 3, angle: side * -0.2 }),
    turret(m, side * 39.6, -9, 3.6, 1.8, { barrels: 2, length: 3, angle: side * -0.35 }),
    // Stern elevator and vents.
    vent(m, side * 28.8, -15, 4.3, 7, 4, 5),
    cellGrid(m, side * 28.8, -9.6, 4.3, 5, 2, 1.5, (c) => c % 2 === 1),
    // Twin stern engines per hull.
    engine(m, side * 25.4, -25, 1.4, 2, 2.6),
    engine(m, side * 32.2, -25, 1.4, 2, 2.6),
    // Inner hull edge running light.
    strip(side * 20.4, -2, 3.6, 0.45, 30, m.glowSoft),
  ]);

  // Central command island and broad centre hangar.
  hull.add(hangar(m, 0, 9.4, 2.9, 22, 4));
  hull.add(
    slab(
      mirrored([
        [0, 6],
        [15, 6],
        [18, 3],
        [18, -13],
        [12, -17],
        [0, -17],
      ]),
      0.6,
      0.18,
      m.armour,
      2.9
    )
  );
  hull.add(box(0, -12, 3.6, 36, 0.4, 0.3, m.recess));
  for (const x of [-10.5, 10.5]) hull.add(box(x, -5.5, 3.6, 0.4, 22, 0.3, m.recess));
  hull.add(box(0, 4.6, 3.6, 36, 0.4, 0.3, m.recess));
  // Comms mast and sensor dish atop the island.
  hull.add(ellipsoid(4, -9.6, 7.6, 1.8, 1.8, 0.5, m.ceramic));
  hull.add(ellipsoid(4, -9.6, 8, 0.5, 0.5, 0.4, m.glow));
  hull.add(
    slab(
      mirrored([
        [0, 3.4],
        [7, 3.4],
        [9, 1],
        [9, -10],
        [6.6, -13],
        [0, -13],
      ]),
      1.6,
      0.4,
      m.titanium,
      3.4
    )
  );
  hull.add(box(0, -4, 6.1, 10, 7, 1.6, m.hull));
  hull.add(box(0, -3, 7.4, 7, 3.4, 1.2, m.armourDark));
  hull.add(strip(0, -1.4, 8.1, 6, 0.6, m.glow));
  hull.add(box(-2.4, -6.4, 8.2, 0.6, 3, 2, m.ceramic));
  hull.add(box(2.4, -6.4, 7.8, 1.6, 1.6, 1.2, m.ceramic));
  // Reactor ring feeding the launch catapults.
  hull.add(ellipsoid(0, -14.6, 5.2, 3, 1.6, 0.8, m.glow));
  hull.add(ellipsoid(0, -14.6, 5.6, 1.4, 0.8, 0.6, m.hot));
  bothSides(hull, (side) => [
    vent(m, side * 13.4, -6, 3.4, 4, 8, 6),
    turret(m, side * 13.8, 1.6, 3.6, 2, { barrels: 2, length: 3.2 }),
  ]);
  for (const x of [-8, 0, 8]) hull.add(engine(m, x, -19.4, 1.4, x === 0 ? 2.6 : 2, 2.4));

  hull.add(greebles(m, 41, { x: 9.5, y: -16, w: 7, h: 3 }, 3.5, 4));

  return noseDown(hull);
}
