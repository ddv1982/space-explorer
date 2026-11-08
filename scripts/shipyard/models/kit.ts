import * as THREE from 'three';

/**
 * Shared shipyard building blocks. Models are authored in logical sprite pixels, viewed from the
 * top: +X right, +Y toward the nose (screen up), +Z toward the camera.
 */

export const PALETTE = {
  titanium: '#485460',
  ceramic: '#c4ccd2',
  recess: '#101a27',
  edge: '#e0e5e8',
  glass: '#0b1a24',
  playerAccent: '#5ff2ff',
  enemyAccent: '#c8452f',
  enemyGlow: '#ff8a3a',
} as const;

export const MATERIALS = {
  titanium: () => new THREE.MeshStandardMaterial({ color: PALETTE.titanium, metalness: 0.6, roughness: 0.42 }),
  ceramic: () => new THREE.MeshStandardMaterial({ color: PALETTE.ceramic, metalness: 0.08, roughness: 0.34 }),
  recess: () => new THREE.MeshStandardMaterial({ color: PALETTE.recess, metalness: 0.3, roughness: 0.7 }),
  edge: () => new THREE.MeshStandardMaterial({ color: PALETTE.edge, metalness: 0.2, roughness: 0.25 }),
  glass: (tint: string) =>
    new THREE.MeshStandardMaterial({
      color: PALETTE.glass,
      metalness: 0.3,
      roughness: 0.08,
      emissive: tint,
      emissiveIntensity: 0.35,
    }),
  armour: (color: string) => new THREE.MeshStandardMaterial({ color, metalness: 0.15, roughness: 0.38 }),
  glow: (color: string, intensity = 2.6) =>
    new THREE.MeshStandardMaterial({ color: '#000000', emissive: color, emissiveIntensity: intensity }),
};

type Point = readonly [number, number];

/** Mirrors right-side points (x >= 0, listed nose to tail) into a closed symmetric outline. */
export function mirrored(rightSide: readonly Point[]): Point[] {
  const left = [...rightSide].reverse().map(([x, y]) => [-x, y] as const);
  return [...rightSide, ...left.filter(([x]) => x !== 0)];
}

/** Extrudes a top-view outline into a bevelled slab whose underside sits at `z`. */
export function slab(
  outline: readonly Point[],
  depth: number,
  bevel: number,
  material: THREE.Material,
  z = 0
): THREE.Mesh {
  const shape = new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, y)));
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    curveSegments: 8,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.z = z;
  return mesh;
}

/** A cylinder lying along the Y axis (nose-to-tail), centred at (x, y, z). */
export function podY(x: number, y: number, z: number, radius: number, length: number, material: THREE.Material) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 18), material);
  mesh.position.set(x, y, z);
  return mesh;
}

export function box(x: number, y: number, z: number, w: number, h: number, d: number, material: THREE.Material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  return mesh;
}

export function ellipsoid(
  x: number,
  y: number,
  z: number,
  rx: number,
  ry: number,
  rz: number,
  material: THREE.Material
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), material);
  mesh.position.set(x, y, z);
  mesh.scale.set(rx, ry, rz);
  return mesh;
}
