import * as THREE from 'three';
import { MATERIALS } from './kit';

/** Shared parts for the heavy hostile hulls (bomber, gunship, sower), turret, mine and asteroids. */

export type Pt = readonly [number, number];

/** Mirrors a list of points to the given side (1 = right as authored, -1 = left). */
export function side(points: readonly Pt[], s: number): Pt[] {
  const mapped = points.map(([x, y]) => [s * x, y] as const);
  // Keep the winding consistent so extruded faces point outward on both sides.
  return s < 0 ? mapped.reverse() : mapped;
}

/** A flat bar from (x1, y1) to (x2, y2): seams, light strips, struts. */
export function bar(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  width: number,
  z: number,
  depth: number,
  material: THREE.Material
): THREE.Mesh {
  const length = Math.hypot(x2 - x1, y2 - y1);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, length, depth), material);
  mesh.position.set((x1 + x2) / 2, (y1 + y2) / 2, z);
  mesh.rotation.z = Math.atan2(x1 - x2, y2 - y1);
  return mesh;
}

/** A disc lying flat (axis toward the camera), e.g. hatches, bay doors, turret rings. */
export function disc(
  x: number,
  y: number,
  z: number,
  radius: number,
  depth: number,
  material: THREE.Material,
  segments = 28
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, depth, segments), material);
  mesh.rotation.x = Math.PI / 2;
  mesh.position.set(x, y, z);
  return mesh;
}

/** A tapered cylinder along the Y axis: radius `r1` at +Y end, `r2` at -Y end. */
export function taperY(
  x: number,
  y: number,
  z: number,
  r1: number,
  r2: number,
  length: number,
  material: THREE.Material,
  segments = 20
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, length, segments), material);
  mesh.position.set(x, y, z);
  return mesh;
}

/**
 * Tail engine: dark housing bell with a glowing exhaust core poking out behind it (toward -Y in
 * nose-up authoring space).
 */
export function engine(x: number, y: number, z: number, radius: number, glow: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  group.add(taperY(x, y + radius * 0.9, z, radius * 0.85, radius, radius * 1.8, MATERIALS.titanium()));
  group.add(taperY(x, y - 0.1, z, radius * 1.02, radius * 1.08, 0.7, MATERIALS.recess()));
  const core = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 12), glow);
  core.position.set(x, y - 0.45, z);
  core.scale.set(radius * 0.86, radius * 0.85, radius * 0.86);
  group.add(core);
  return group;
}

/** A row of small dark vent slots between two points, perpendicular to the row. */
export function vents(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  count: number,
  slotLength: number,
  z: number,
  material: THREE.Material = MATERIALS.recess()
): THREE.Group {
  const group = new THREE.Group();
  const angle = Math.atan2(y2 - y1, x2 - x1);
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.62, slotLength, 0.3), material);
    mesh.position.set(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, z);
    mesh.rotation.z = angle;
    group.add(mesh);
  }
  return group;
}

/** Darker, more metallic accent armour so the type's hue reads as painted plate, not a light. */
export function paint(color: string, darken = 0.62): THREE.MeshStandardMaterial {
  const c = new THREE.Color(color).multiplyScalar(darken);
  return new THREE.MeshStandardMaterial({ color: c, metalness: 0.35, roughness: 0.4 });
}

/** Dark gunmetal hull, a touch darker and bluer than the kit titanium for hostile ships. */
export function gunmetal(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: '#3a434e', metalness: 0.65, roughness: 0.4 });
}

/** Satin hull for curved shells: high metalness turns domes into black mirrors of the dark sky. */
export function shell(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: '#56616d', metalness: 0.3, roughness: 0.45 });
}

/** Mid-grey brushed plating for spines and bridges: lighter than gunmetal, darker than ceramic. */
export function plating(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: '#7c8792', metalness: 0.45, roughness: 0.36 });
}

/** Tiny deterministic PRNG (mulberry32). */
export function prng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Wraps a nose-up hull so the nose points down the screen (enemies fly toward the player). */
export function noseDown(hull: THREE.Object3D): THREE.Group {
  const ship = new THREE.Group();
  hull.rotation.z = Math.PI;
  ship.add(hull);
  return ship;
}

/**
 * Tilts an object about a nose-to-tail hinge line at x = `pivotX` so flank plates slope away from
 * the spine and catch the key light differently on each side (positive angle drops the +X edge).
 */
export function hinge(object: THREE.Object3D, pivotX: number, pivotZ: number, angle: number): THREE.Group {
  const pivot = new THREE.Group();
  pivot.position.set(pivotX, 0, pivotZ);
  pivot.rotation.y = angle;
  object.position.x -= pivotX;
  object.position.z -= pivotZ;
  pivot.add(object);
  return pivot;
}
