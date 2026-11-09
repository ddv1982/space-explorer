import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { prng } from './heavyParts';

/**
 * Asteroids: neutral grey stone (levels multiply-tint them), lumpy seeded-noise rocks with crater
 * dents and flat-ish facets. 44×44 logical, four distinct variants, each roughly filling the
 * radius-20 hitbox circle.
 */

interface Crater {
  centre: THREE.Vector3;
  /** Angular radius (radians). */
  size: number;
  depth: number;
}

interface RockRecipe {
  seed: number;
  /** Per-axis stretch applied after displacement. */
  stretch: readonly [number, number, number];
  /** Number and strength of broad lumps. */
  lumps: number;
  lumpAmp: number;
  /** Fine surface roughness. */
  grit: number;
  craters: number;
  craterSize: readonly [number, number];
  craterDepth: number;
  /** Fracture planes that shear flat faces off the rock, and how deep they cut (plane offset range). */
  cuts: number;
  cutDepth: readonly [number, number];
  /** Two-lobed pinch strength along X (0 = off). */
  pinch: number;
  tilt: readonly [number, number, number];
}

const RECIPES: readonly RockRecipe[] = [
  // 0: elongated potato, few small craters.
  {
    seed: 11,
    stretch: [1.2, 0.74, 0.8],
    lumps: 9,
    lumpAmp: 0.24,
    grit: 0.04,
    craters: 4,
    craterSize: [0.2, 0.34],
    craterDepth: 0.16,
    cuts: 5,
    cutDepth: [0.78, 0.92],
    pinch: 0,
    tilt: [0.3, -0.2, 0.5],
  },
  // 1: chunky fractured boulder with hard planar facets.
  {
    seed: 47,
    stretch: [1, 0.94, 0.86],
    lumps: 7,
    lumpAmp: 0.18,
    grit: 0.025,
    craters: 2,
    craterSize: [0.28, 0.4],
    craterDepth: 0.12,
    cuts: 16,
    cutDepth: [0.6, 0.8],
    pinch: 0,
    tilt: [-0.4, 0.3, -0.3],
  },
  // 2: round, heavily cratered.
  {
    seed: 93,
    stretch: [1, 0.98, 0.9],
    lumps: 7,
    lumpAmp: 0.14,
    grit: 0.035,
    craters: 12,
    craterSize: [0.16, 0.48],
    craterDepth: 0.22,
    cuts: 3,
    cutDepth: [0.82, 0.92],
    pinch: 0,
    tilt: [0.2, 0.4, 1.1],
  },
  // 3: split two-lobed contact binary.
  {
    seed: 158,
    stretch: [1.22, 0.86, 0.8],
    lumps: 8,
    lumpAmp: 0.2,
    grit: 0.04,
    craters: 4,
    craterSize: [0.16, 0.28],
    craterDepth: 0.16,
    cuts: 5,
    cutDepth: [0.76, 0.9],
    pinch: 0.3,
    tilt: [0.25, -0.35, -0.6],
  },
];

function randomDirection(random: () => number): THREE.Vector3 {
  const z = random() * 2 - 1;
  const a = random() * Math.PI * 2;
  const r = Math.sqrt(1 - z * z);
  return new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, z);
}

function craterProfile(angle: number, crater: Crater): number {
  const t = angle / crater.size;
  if (t >= 1.45) return 0;
  // Bowl below the surface with a raised rim just outside it.
  if (t < 1) return -crater.depth * (1 - t * t);
  const rim = (t - 1) / 0.45;
  return crater.depth * 0.35 * Math.sin(rim * Math.PI);
}

export function buildAsteroid(frame = 0): THREE.Group {
  const recipe = RECIPES[frame % RECIPES.length]!;
  const random = prng(recipe.seed);

  const lumps = Array.from({ length: recipe.lumps }, () => ({
    dir: randomDirection(random),
    amp: (random() * 2 - 1) * recipe.lumpAmp,
    width: 0.6 + random() * 0.9,
  }));
  const gritDirs = Array.from({ length: 90 }, () => ({
    dir: randomDirection(random),
    amp: (random() * 2 - 1) * recipe.grit * 1.6,
    width: 0.05 + random() * 0.12,
  }));
  const craters: Crater[] = Array.from({ length: recipe.craters }, () => ({
    centre: randomDirection(random),
    size: recipe.craterSize[0] + random() * (recipe.craterSize[1] - recipe.craterSize[0]),
    depth: recipe.craterDepth * (0.6 + random() * 0.6),
  }));
  const cuts = Array.from({ length: recipe.cuts }, () => ({
    normal: randomDirection(random),
    offset: recipe.cutDepth[0] + random() * (recipe.cutDepth[1] - recipe.cutDepth[0]),
  }));
  // Face the deepest craters toward the camera so they read from above.
  for (const crater of craters) if (crater.centre.z < -0.2) crater.centre.z *= -1;

  const geometry = mergeVertices(new THREE.IcosahedronGeometry(1, 5));
  const position = geometry.getAttribute('position') as THREE.BufferAttribute;
  const colors = new Float32Array(position.count * 3);
  const v = new THREE.Vector3();

  for (let i = 0; i < position.count; i++) {
    v.fromBufferAttribute(position, i).normalize();
    let radius = 1;
    for (const lump of lumps) {
      const d = v.dot(lump.dir);
      radius += lump.amp * Math.exp(-((1 - d) / lump.width) * 2.2);
    }
    for (const g of gritDirs) {
      const d = v.dot(g.dir);
      radius += g.amp * Math.exp(-((1 - d) / g.width) * 3);
    }
    for (const cut of cuts) {
      const d = v.dot(cut.normal);
      if (d > 0.05) radius = Math.min(radius, cut.offset / d);
    }
    let craterShade = 0;
    for (const crater of craters) {
      const angle = Math.acos(THREE.MathUtils.clamp(v.dot(crater.centre), -1, 1));
      const dent = craterProfile(angle, crater);
      radius += dent;
      craterShade = Math.min(craterShade, dent / crater.depth);
    }
    if (recipe.pinch > 0) {
      // Waist around x = 0 to read as two fused lobes.
      const waist = Math.exp(-(v.x * v.x) / 0.05);
      radius *= 1 - recipe.pinch * waist * (1 - Math.abs(v.x));
    }

    position.setXYZ(
      i,
      v.x * radius * recipe.stretch[0],
      v.y * radius * recipe.stretch[1],
      v.z * radius * recipe.stretch[2]
    );

    // Neutral mid-grey stone; crater floors and low ground darker, high ridges lighter.
    const height = THREE.MathUtils.clamp((radius - 1) * 2.2, -0.5, 0.5);
    const speckle = (Math.sin(i * 12.9898) * 43758.5453) % 1;
    const shade = 0.085 + height * 0.05 + craterShade * 0.03 + speckle * 0.012;
    colors[i * 3] = shade * 1.01;
    colors[i * 3 + 1] = shade;
    colors[i * 3 + 2] = shade * 0.97;
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  // Non-indexed with recomputed normals gives the faceted, chipped look.
  const faceted = geometry.toNonIndexed();
  faceted.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    vertexColors: true,
    metalness: 0,
    roughness: 0.92,
    flatShading: true,
  });
  const rock = new THREE.Mesh(faceted, material);
  rock.scale.setScalar(19.5);
  rock.rotation.set(recipe.tilt[0], recipe.tilt[1], recipe.tilt[2]);

  const root = new THREE.Group();
  root.add(rock);
  return root;
}
