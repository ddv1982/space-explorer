import * as THREE from 'three';
import { MATERIALS, box, ellipsoid, slab } from './kit';
import { SIDES, type Pt, disc, engine, gunmetal, noseDown, plate, polygon, strip } from './lightCraftParts';

/** Teardrop pod outline: round body drawn out into a blunt prow toward +Y. */
function podOutline(cx: number, radius: number, prow: number): Pt[] {
  return Array.from({ length: 40 }, (_, i) => {
    const angle = (i / 40) * Math.PI * 2;
    const r = radius + prow * Math.max(0, Math.sin(angle)) ** 3;
    return [cx + Math.cos(angle) * r, Math.sin(angle) * r] as const;
  });
}

const ACCENT = '#b8461f';
const GLOW = '#e2541c';
const HOT = '#ffe0d0';

/** Splitter: twin armoured pods clamped to a glowing bridge, ready to break apart. 30×26, nose down. */
export function buildSplitter(): THREE.Group {
  const hull = new THREE.Group();
  const metal = gunmetal();
  const titanium = MATERIALS.titanium();
  const recess = MATERIALS.recess();
  const armour = MATERIALS.armour(ACCENT);
  const glow = MATERIALS.glow(GLOW, 2.8);

  // Bridge between the pods, with a seam where they separate and a charged coupling node.
  hull.add(box(0, 0.4, 1.1, 7.4, 5.2, 1.8, titanium));
  hull.add(box(0, 0.4, 2.05, 0.6, 5.4, 0.3, recess));
  for (const y of [2.1, -1.3]) hull.add(strip(-3.4, y, 3.4, y, 0.7, 2.1, glow));
  hull.add(ellipsoid(0, 0, 2.3, 1.1, 1.1, 0.8, MATERIALS.glow(GLOW, 3)));
  hull.add(ellipsoid(0, 0, 2.8, 0.55, 0.55, 0.45, MATERIALS.glow(HOT, 3.2)));

  for (const side of SIDES) {
    const cx = side * 7;
    // Pod body: gunmetal drum, octagonal armour collar split into four plates, and a reactor eye.
    hull.add(slab(podOutline(cx, 5, 2.8), 1.6, 0.45, metal, 0.2));
    hull.add(
      plate(
        podOutline(cx, 2.6, 4.6).filter(([, y]) => y > 3.2),
        2.1,
        titanium,
        0.35
      )
    );
    const collar = polygon(cx, 0, 4.3, 8, Math.PI / 8);
    for (let quarter = 0; quarter < 4; quarter++) {
      const a = collar[quarter * 2]!;
      const b = collar[(quarter * 2 + 1) % 8]!;
      const c = collar[(quarter * 2 + 2) % 8]!;
      // Each plate is a wedge from the collar edge toward the eye, trimmed for a seam gap.
      const inset = (p: readonly [number, number], k: number) => [cx + (p[0] - cx) * k, p[1] * k] as const;
      hull.add(
        plate([inset(a, 0.96), inset(b, 0.98), inset(c, 0.96), inset(c, 0.6), inset(b, 0.62), inset(a, 0.6)], 2, armour)
      );
    }
    hull.add(disc(cx, 0, 2.35, 2.3, 0.5, recess));
    hull.add(ellipsoid(cx, 0, 2.5, 1.5, 1.5, 0.9, MATERIALS.glow(GLOW, 2.8)));
    hull.add(ellipsoid(cx, 0, 3, 0.8, 0.8, 0.55, MATERIALS.glow(HOT, 3.2)));
    // Sensor prow on the leading edge and a thruster at the tail.
    hull.add(strip(cx, 5.6, cx, 7, 0.8, 2.55, glow));
    hull.add(engine(cx, -4.9, 1, 1, titanium, GLOW, HOT, 2));
  }

  return noseDown(hull);
}
