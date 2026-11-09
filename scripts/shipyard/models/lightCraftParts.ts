import * as THREE from 'three';
import { MATERIALS, ellipsoid, podY, slab } from './kit';

/**
 * Shared parts for the light craft (player, helper and the small hostiles). Same conventions as
 * kit.ts: logical sprite pixels, +X right, +Y nose, +Z toward the camera.
 */

export type Pt = readonly [number, number];
export type Side = 1 | -1;
export const SIDES: readonly Side[] = [1, -1];

/** Darker hostile hull metal so accent armour and glows carry the identity. */
export const gunmetal = () => new THREE.MeshStandardMaterial({ color: '#333b45', metalness: 0.7, roughness: 0.36 });

/** Mirrors a right-side point list onto `side`. */
export function onSide(points: readonly Pt[], side: Side): Pt[] {
  return points.map(([x, y]) => [side * x, y] as const);
}

/** A thin armour plate laid on a surface whose top is at `z`. */
export function plate(outline: readonly Pt[], z: number, material: THREE.Material, depth = 0.4, bevel = 0.12) {
  return slab(outline, depth, bevel, material, z);
}

/** A flat bar from (x1, y1) to (x2, y2): light strips, seams and edge trims. */
export function strip(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  width: number,
  z: number,
  material: THREE.Material,
  depth = 0.25
): THREE.Mesh {
  const length = Math.hypot(x2 - x1, y2 - y1);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, length, depth), material);
  mesh.position.set((x1 + x2) / 2, (y1 + y2) / 2, z);
  mesh.rotation.z = Math.atan2(x1 - x2, y2 - y1);
  return mesh;
}

/** A disc lying flat (axis toward the camera) with a slightly smaller top for a chamfered rim. */
export function disc(x: number, y: number, z: number, radius: number, height: number, material: THREE.Material) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.9, radius, height, 32), material);
  mesh.rotation.x = Math.PI / 2;
  mesh.position.set(x, y, z);
  return mesh;
}

/** Regular polygon outline, first vertex at `rotation` radians from +X. */
export function polygon(cx: number, cy: number, radius: number, sides: number, rotation = 0): Pt[] {
  return Array.from({ length: sides }, (_, i) => {
    const angle = rotation + (i / sides) * Math.PI * 2;
    return [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius] as const;
  });
}

/**
 * Engine pointing down -Y: housing, dark nozzle ring, a coloured plume that pokes past the tail so
 * it reads from above, and a white-hot core on top of the plume.
 */
export function engine(
  x: number,
  y: number,
  z: number,
  radius: number,
  housing: THREE.Material,
  glow: string,
  hot: string,
  length = radius * 2.6
): THREE.Group {
  const group = new THREE.Group();
  group.add(podY(x, y + length / 2, z, radius, length, housing));
  group.add(podY(x, y - 0.15, z, radius * 1.08, 0.6, MATERIALS.recess()));
  group.add(ellipsoid(x, y - radius * 0.55, z, radius * 0.92, radius * 1.15, radius * 0.9, MATERIALS.glow(glow, 3)));
  group.add(
    ellipsoid(
      x,
      y - radius * 0.4,
      z + radius * 0.35,
      radius * 0.5,
      radius * 0.6,
      radius * 0.6,
      MATERIALS.glow(hot, 3.2)
    )
  );
  return group;
}

/** Glass canopy seated in a dark frame, with a small specular glint toward the key light. */
export function canopy(
  x: number,
  y: number,
  z: number,
  rx: number,
  ry: number,
  rz: number,
  tint: string,
  glint = true
): THREE.Group {
  const group = new THREE.Group();
  group.add(ellipsoid(x, y, z - rz * 0.25, rx + 0.45, ry + 0.5, rz * 0.9, MATERIALS.recess()));
  group.add(ellipsoid(x, y, z, rx, ry, rz, MATERIALS.glass(tint)));
  if (glint)
    group.add(ellipsoid(x - rx * 0.35, y + ry * 0.35, z + rz * 0.75, rx * 0.28, ry * 0.3, 0.2, MATERIALS.edge()));
  return group;
}

/** A row of `count` vent slats across a w×h patch centred at (x, y). */
export function vents(x: number, y: number, z: number, w: number, h: number, count: number, material: THREE.Material) {
  const group = new THREE.Group();
  const pitch = h / count;
  for (let i = 0; i < count; i++) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, pitch * 0.5, 0.25), material);
    mesh.position.set(x, y + h / 2 - pitch * (i + 0.5), z);
    group.add(mesh);
  }
  return group;
}

/** Enemies fly toward the player: build nose-up, then turn the hull to point down the screen. */
export function noseDown(hull: THREE.Object3D): THREE.Group {
  const ship = new THREE.Group();
  hull.rotation.z = Math.PI;
  ship.add(hull);
  return ship;
}
