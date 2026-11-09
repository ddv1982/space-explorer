import * as THREE from 'three';
import { MATERIALS, PALETTE, box, ellipsoid, podY, slab } from './kit';

/**
 * Boss-only building blocks on top of kit.ts. Bosses are authored nose-up (+Y) in logical pixels
 * inside roughly ±42 × ±26 (the 88×56 frame minus its margin), then flipped by `noseDown`.
 */

export type Pt = readonly [number, number];

export interface BossPalette {
  /** Identity armour plate colour (mid value, reads against the dark hull). */
  armour: string;
  /** Darker armour for secondary plates. */
  armourDark: string;
  /** Emissive identity colour for strips, engines and cores. */
  glow: string;
  /** Near-white hot core colour. */
  hot: string;
}

export function bossMaterials(palette: BossPalette) {
  return {
    hull: new THREE.MeshStandardMaterial({ color: '#2b333d', metalness: 0.65, roughness: 0.45 }),
    titanium: MATERIALS.titanium(),
    ceramic: MATERIALS.ceramic(),
    recess: MATERIALS.recess(),
    edge: MATERIALS.edge(),
    armour: MATERIALS.armour(palette.armour),
    armourDark: MATERIALS.armour(palette.armourDark),
    glow: MATERIALS.glow(palette.glow, 3),
    glowSoft: MATERIALS.glow(palette.glow, 2.5),
    hot: MATERIALS.glow(palette.hot, 3.4),
    glass: MATERIALS.glass(palette.glow),
  };
}

export type BossMaterials = ReturnType<typeof bossMaterials>;

/** Mirrors a list of points across the Y axis (x → −x), keeping winding usable for a slab. */
export function flipX(points: readonly Pt[]): Pt[] {
  return points.map(([x, y]) => [-x, y] as const);
}

/** Adds `make(side)` for side = 1 and −1. */
export function bothSides(group: THREE.Group, make: (side: 1 | -1) => THREE.Object3D | THREE.Object3D[]): void {
  for (const side of [1, -1] as const) {
    const made = make(side);
    for (const object of Array.isArray(made) ? made : [made]) group.add(object);
  }
}

/** Scales x of an outline by `side` so one authored right-hand outline serves both sides. */
export function sided(side: number, points: readonly Pt[]): Pt[] {
  return points.map(([x, y]) => [x * side, y] as const);
}

/** A cylinder standing along Z (toward the camera), centred at (x, y, z). */
export function cylZ(
  x: number,
  y: number,
  z: number,
  radius: number,
  height: number,
  material: THREE.Material,
  segments = 28
) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, segments), material);
  mesh.rotation.x = Math.PI / 2;
  mesh.position.set(x, y, z);
  return mesh;
}

/** A cone/frustum standing along Z; `top` radius faces the camera. */
export function frustumZ(
  x: number,
  y: number,
  z: number,
  top: number,
  bottom: number,
  height: number,
  material: THREE.Material,
  segments = 28
) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(top, bottom, height, segments), material);
  mesh.rotation.x = Math.PI / 2;
  mesh.position.set(x, y, z);
  return mesh;
}

/** A torus lying flat in the XY plane. */
export function ringZ(
  x: number,
  y: number,
  z: number,
  radius: number,
  tube: number,
  material: THREE.Material,
  arc = Math.PI * 2,
  rotation = 0
) {
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 10, 48, arc), material);
  mesh.position.set(x, y, z);
  mesh.rotation.z = rotation;
  return mesh;
}

/** A torus wrapped around the Y axis (a band around a barrel lying nose-to-tail). */
export function bandY(x: number, y: number, z: number, radius: number, tube: number, material: THREE.Material) {
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 8, 24), material);
  mesh.rotation.x = Math.PI / 2;
  mesh.position.set(x, y, z);
  return mesh;
}

/** Points along an annular sector; angles in radians, 0 = +X, π/2 = nose. */
export function arcOutline(
  cx: number,
  cy: number,
  inner: number,
  outer: number,
  from: number,
  to: number,
  steps = 18
): Pt[] {
  const points: Pt[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = from + ((to - from) * i) / steps;
    points.push([cx + Math.cos(a) * outer, cy + Math.sin(a) * outer]);
  }
  for (let i = steps; i >= 0; i--) {
    const a = from + ((to - from) * i) / steps;
    points.push([cx + Math.cos(a) * inner, cy + Math.sin(a) * inner]);
  }
  return points;
}

/** A tapered spiral vane from radius r0 to r1, sweeping `twist` radians. */
export function spiralOutline(
  r0: number,
  r1: number,
  start: number,
  twist: number,
  width0: number,
  width1: number,
  steps = 16
): Pt[] {
  const lead: Pt[] = [];
  const trail: Pt[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const r = r0 + (r1 - r0) * t;
    const a = start + twist * t;
    const halfWidth = (width0 + (width1 - width0) * t) / 2 / r;
    lead.push([Math.cos(a + halfWidth) * r, Math.sin(a + halfWidth) * r]);
    trail.push([Math.cos(a - halfWidth) * r, Math.sin(a - halfWidth) * r]);
  }
  return [...lead, ...trail.reverse()];
}

/** Thin emissive strip (or any flat inset) as a box sitting on z. */
export function strip(x: number, y: number, z: number, w: number, h: number, material: THREE.Material, rotation = 0) {
  const mesh = box(x, y, z, w, h, 0.35, material);
  mesh.rotation.z = rotation;
  return mesh;
}

/** A rotated strip running from (x0,y0) to (x1,y1). */
export function strand(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  z: number,
  width: number,
  material: THREE.Material
) {
  const length = Math.hypot(x1 - x0, y1 - y0);
  return strip((x0 + x1) / 2, (y0 + y1) / 2, z, width, length, material, Math.atan2(-(x1 - x0), y1 - y0));
}

/**
 * Gun turret: armoured ring base, domed cap and `barrels` parallel guns aimed along local +Y,
 * rotated by `angle` (radians, positive = counter-clockwise from the nose).
 */
export function turret(
  m: BossMaterials,
  x: number,
  y: number,
  z: number,
  radius: number,
  options: { barrels?: number; length?: number; angle?: number; spacing?: number; cap?: THREE.Material } = {}
): THREE.Group {
  const { barrels = 2, length = radius * 2, angle = 0, spacing = radius * 0.45, cap = m.armourDark } = options;
  const group = new THREE.Group();
  group.add(cylZ(0, 0, 0.5, radius, 1, m.hull));
  group.add(ringZ(0, 0, 1, radius * 0.92, 0.22, m.titanium));
  group.add(ellipsoid(0, -radius * 0.1, 1.1, radius * 0.74, radius * 0.8, radius * 0.32, cap));
  group.add(box(0, -radius * 0.1, 1.42, radius * 0.9, 0.22, 0.12, m.recess));
  group.add(box(0, radius * 0.45, 1.5, radius * 0.9, radius * 0.5, 0.6, m.titanium));
  const barrelRadius = Math.max(0.28, radius * 0.13);
  for (let i = 0; i < barrels; i++) {
    const bx = (i - (barrels - 1) / 2) * spacing;
    group.add(podY(bx, radius * 0.5 + length / 2, 1.5, barrelRadius, length, m.ceramic));
    group.add(podY(bx, radius * 0.5 + length - 0.25, 1.5, barrelRadius * 1.35, 0.6, m.titanium));
  }
  group.add(ellipsoid(-radius * 0.3, -radius * 0.25, 1.45, radius * 0.18, radius * 0.18, 0.2, m.glowSoft));
  group.position.set(x, y, z);
  group.rotation.z = angle;
  return group;
}

/** Engine nozzle opening toward the tail (−Y): dark bell, titanium lip, glowing plume core. */
export function engine(
  m: BossMaterials,
  x: number,
  y: number,
  z: number,
  radius: number,
  length = radius * 2
): THREE.Group {
  const group = new THREE.Group();
  group.add(podY(0, length / 2, 0, radius, length, m.titanium));
  group.add(bandY(0, 0.2, 0, radius * 0.95, radius * 0.18, m.edge));
  group.add(podY(0, length * 0.15, 0.05, radius * 0.8, length * 0.3 + 0.2, m.recess));
  group.add(ellipsoid(0, -radius * 0.15, 0.1, radius * 0.74, radius * 0.75, radius * 0.7, m.glow));
  group.add(ellipsoid(0, -radius * 0.3, 0.3, radius * 0.38, radius * 0.45, radius * 0.4, m.hot));
  group.position.set(x, y, z);
  return group;
}

/** Recessed vent grille: dark well crossed by `count` slats; `glowing` lights the well. */
export function vent(
  m: BossMaterials,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  count: number,
  glowing = false,
  rotation = 0
): THREE.Group {
  const group = new THREE.Group();
  group.add(box(0, 0, 0, w, h, 0.4, glowing ? m.glowSoft : m.recess));
  const pitch = h / count;
  for (let i = 0; i < count; i++) {
    group.add(box(0, -h / 2 + pitch * (i + 0.5), 0.3, w + 0.2, pitch * 0.45, 0.4, m.titanium));
  }
  group.position.set(x, y, z);
  group.rotation.z = rotation;
  return group;
}

/** Deterministic pseudo-random sequence (mulberry32) for repeatable greebles. */
export function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Scatters small mechanical blocks inside a rectangle, mirrored across x = 0 when `mirror`. */
export function greebles(
  m: BossMaterials,
  seed: number,
  area: { x: number; y: number; w: number; h: number },
  z: number,
  count: number,
  mirror = true
): THREE.Group {
  const group = new THREE.Group();
  const rand = seeded(seed);
  const materials = [m.titanium, m.hull, m.ceramic, m.recess];
  for (let i = 0; i < count; i++) {
    const w = 0.6 + rand() * 1.6;
    const h = 0.6 + rand() * 1.6;
    const d = 0.3 + rand() * 0.7;
    const gx = area.x + w / 2 + rand() * Math.max(0, area.w - w);
    const gy = area.y + h / 2 + rand() * Math.max(0, area.h - h);
    const material = materials[Math.floor(rand() * materials.length)]!;
    group.add(box(gx, gy, z + d / 2, w, h, d, material));
    if (mirror) group.add(box(-gx, gy, z + d / 2, w, h, d, material));
  }
  return group;
}

/** Grid of small square launch cells (missile VLS / drone racks) with lit hatches. */
export function cellGrid(
  m: BossMaterials,
  x: number,
  y: number,
  z: number,
  cols: number,
  rows: number,
  pitch: number,
  lit: (c: number, r: number) => boolean
): THREE.Group {
  const group = new THREE.Group();
  group.add(box(0, 0, 0, cols * pitch + 0.4, rows * pitch + 0.4, 0.3, m.recess));
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const cx = (c - (cols - 1) / 2) * pitch;
      const cy = (r - (rows - 1) / 2) * pitch;
      group.add(box(cx, cy, 0.25, pitch * 0.72, pitch * 0.72, 0.3, lit(c, r) ? m.glowSoft : m.titanium));
    }
  }
  group.position.set(x, y, z);
  return group;
}

export { slab, box, ellipsoid, podY, PALETTE };

/** Wraps a nose-up hull so the boss faces down the screen toward the player. */
export function noseDown(hull: THREE.Object3D): THREE.Group {
  const ship = new THREE.Group();
  hull.rotation.z = Math.PI;
  ship.add(hull);
  return ship;
}
