/// <reference types="bun" />

/**
 * Deterministic offline authoring pipeline for the ten campaign planet
 * portraits. Renders painterly 512x512 RGBA rasters (value-noise surfaces,
 * spherical lighting, soft terminators, limb shading, world-specific
 * features), writes PNG intermediates, then encodes committed WebP assets via
 * the locally installed `cwebp` binary.
 *
 * Usage: bun scripts/generatePlanetPortraits.ts
 *
 * The script is fully deterministic: every feature derives from a per-planet
 * seed, never from Math.random or wall-clock time.
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { deflateSync } from 'node:zlib';

const SIZE = 512;
const CENTER = SIZE / 2;
const PLANET_RADIUS = 180;
const WEBP_QUALITY = 80;
const OUTPUT_DIR = path.resolve(process.cwd(), 'public/assets/planets');
const PNG_DIR = path.resolve(process.cwd(), 'test-results/planet-portraits-src');

// ---------------------------------------------------------------------------
// Seeded hashing / value noise
// ---------------------------------------------------------------------------

function hash3(ix: number, iy: number, iz: number, seed: number): number {
  let h = Math.imul(ix, 0x8da6b343) ^ Math.imul(iy, 0xd8163841) ^ Math.imul(iz, 0xcb1ab31f) ^ Math.imul(seed, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function smooth(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function valueNoise3(x: number, y: number, z: number, seed: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const z0 = Math.floor(z);
  const sx = smooth(x - x0);
  const sy = smooth(y - y0);
  const sz = smooth(z - z0);

  const c000 = hash3(x0, y0, z0, seed);
  const c100 = hash3(x0 + 1, y0, z0, seed);
  const c010 = hash3(x0, y0 + 1, z0, seed);
  const c110 = hash3(x0 + 1, y0 + 1, z0, seed);
  const c001 = hash3(x0, y0, z0 + 1, seed);
  const c101 = hash3(x0 + 1, y0, z0 + 1, seed);
  const c011 = hash3(x0, y0 + 1, z0 + 1, seed);
  const c111 = hash3(x0 + 1, y0 + 1, z0 + 1, seed);

  const x00 = c000 + (c100 - c000) * sx;
  const x10 = c010 + (c110 - c010) * sx;
  const x01 = c001 + (c101 - c001) * sx;
  const x11 = c011 + (c111 - c011) * sx;
  const y0v = x00 + (x10 - x00) * sy;
  const y1v = x01 + (x11 - x01) * sy;
  return y0v + (y1v - y0v) * sz;
}

function fbm3(x: number, y: number, z: number, octaves: number, seed: number): number {
  let amplitude = 0.5;
  let frequency = 1;
  let total = 0;
  let normalizer = 0;

  for (let octave = 0; octave < octaves; octave += 1) {
    total += valueNoise3(x * frequency, y * frequency, z * frequency, seed + octave * 101) * amplitude;
    normalizer += amplitude;
    amplitude *= 0.5;
    frequency *= 2.03;
  }

  return total / normalizer;
}

/** Ridged variant: sharp crease lines for fractures and lava cracks. */
function ridged3(x: number, y: number, z: number, octaves: number, seed: number): number {
  let amplitude = 0.5;
  let frequency = 1;
  let total = 0;
  let normalizer = 0;

  for (let octave = 0; octave < octaves; octave += 1) {
    const n = valueNoise3(x * frequency, y * frequency, z * frequency, seed + octave * 733);
    total += (1 - Math.abs(n * 2 - 1)) * amplitude;
    normalizer += amplitude;
    amplitude *= 0.5;
    frequency *= 2.11;
  }

  return total / normalizer;
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Color + pixel buffer helpers
// ---------------------------------------------------------------------------

type Rgb = [number, number, number];

function hex(color: number): Rgb {
  return [((color >> 16) & 0xff) / 255, ((color >> 8) & 0xff) / 255, (color & 0xff) / 255];
}

function mixRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = clamp01((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

class PixelBuffer {
  readonly data = new Float32Array(SIZE * SIZE * 4);

  /** Alpha-over blend of a source color in 0..1 float space. */
  blend(x: number, y: number, color: Rgb, alpha: number): void {
    if (x < 0 || y < 0 || x >= SIZE || y >= SIZE || alpha <= 0) {
      return;
    }

    const index = (y * SIZE + x) * 4;
    const clamped = Math.min(1, alpha);
    const inv = 1 - clamped;
    this.data[index] = color[0] * clamped + this.data[index] * inv;
    this.data[index + 1] = color[1] * clamped + this.data[index + 1] * inv;
    this.data[index + 2] = color[2] * clamped + this.data[index + 2] * inv;
    this.data[index + 3] = clamped + this.data[index + 3] * inv;
  }

  /** Additive blend for emissive features (glows, lights, lava). */
  add(x: number, y: number, color: Rgb, amount: number): void {
    if (x < 0 || y < 0 || x >= SIZE || y >= SIZE || amount <= 0) {
      return;
    }

    const index = (y * SIZE + x) * 4;
    const coverage = Math.min(1, amount);
    this.data[index] = Math.min(1, this.data[index] + color[0] * coverage);
    this.data[index + 1] = Math.min(1, this.data[index + 1] + color[1] * coverage);
    this.data[index + 2] = Math.min(1, this.data[index + 2] + color[2] * coverage);
    this.data[index + 3] = Math.min(1, this.data[index + 3] + coverage * 0.85);
  }
}

// ---------------------------------------------------------------------------
// Sphere lighting model
// ---------------------------------------------------------------------------

interface SphereSample {
  /** Surface point on the unit sphere (nz toward viewer). */
  px: number;
  py: number;
  pz: number;
  /** Screen-space radial coordinate in planet radii. */
  r: number;
  /** Soft-terminated daylight factor in [0, 1]. */
  light: number;
  /** Limb-darkening factor in [0, 1]. */
  limb: number;
}

const LIGHT_DIR: Rgb = (() => {
  const x = -0.62;
  const y = -0.58;
  const z = 0.53;
  const length = Math.hypot(x, y, z);
  return [x / length, y / length, z / length];
})();

function sampleSphere(x: number, y: number): SphereSample | null {
  const dx = (x + 0.5 - CENTER) / PLANET_RADIUS;
  const dy = (y + 0.5 - CENTER) / PLANET_RADIUS;
  const r2 = dx * dx + dy * dy;
  if (r2 > 1) {
    return null;
  }

  const pz = Math.sqrt(1 - r2);
  const diffuse = dx * LIGHT_DIR[0] + dy * LIGHT_DIR[1] + pz * LIGHT_DIR[2];
  const light = smoothstep(-0.28, 0.62, diffuse);
  const limb = 0.42 + 0.58 * Math.pow(pz, 0.55);

  return { px: dx, py: dy, pz, r: Math.sqrt(r2), light, limb };
}

// ---------------------------------------------------------------------------
// Surface painters: albedo + emissive per surface point
// ---------------------------------------------------------------------------

interface SurfaceResult {
  albedo: Rgb;
  emissive: Rgb;
  emissiveStrength: number;
}

type SurfacePainter = (sample: SphereSample) => SurfaceResult;

function noEmissive(albedo: Rgb): SurfaceResult {
  return { albedo, emissive: [0, 0, 0], emissiveStrength: 0 };
}

function makeAuroraGasGiant(seed: number): SurfacePainter {
  const deep = hex(0x07333e);
  const mid = hex(0x14707a);
  const bright = hex(0x5fd8c4);
  const pale = hex(0xb8f4e4);
  const aurora = hex(0x7affd9);
  return ({ px, py, pz }) => {
    const warp = fbm3(px * 2.4, py * 2.4, pz * 2.4, 4, seed) - 0.5;
    const band = Math.sin((py + warp * 0.55) * 9.5 + seed);
    const bandT = band * 0.5 + 0.5;
    let albedo = mixRgb(deep, mid, smoothstep(0.15, 0.85, bandT));
    albedo = mixRgb(albedo, bright, smoothstep(0.62, 0.95, bandT) * 0.7);
    albedo = mixRgb(albedo, pale, smoothstep(0.86, 1, bandT) * 0.5);

    const storm = fbm3(px * 3.1 + 9, py * 3.4, pz * 3.1, 4, seed + 41);
    const stormMask = smoothstep(0.58, 0.72, storm) * smoothstep(0.35, 0.1, Math.abs(py - 0.18));
    albedo = mixRgb(albedo, mixRgb(deep, pale, 0.35), stormMask * 0.55);

    // Aurora ribbons hugging the upper pole, emissive and streaky.
    const polar = smoothstep(0.35, 0.85, -py);
    const streak = fbm3(px * 6.2, py * 1.6, pz * 6.2, 3, seed + 77);
    const auroraMask = polar * smoothstep(0.52, 0.75, streak);
    return { albedo, emissive: aurora, emissiveStrength: auroraMask * 0.85 };
  };
}

function makeOceanWorld(seed: number): SurfacePainter {
  const deep = hex(0x0a2a56);
  const shallow = hex(0x1f7fa8);
  const glowCyan = hex(0x54d8e8);
  const cloud = hex(0xf2f8ff);
  const ice = hex(0xe8f4fa);
  return ({ px, py, pz }) => {
    const currents = fbm3(px * 2.1, py * 3.3, pz * 2.1, 4, seed);
    let albedo = mixRgb(deep, shallow, smoothstep(0.32, 0.72, currents));
    albedo = mixRgb(albedo, glowCyan, smoothstep(0.66, 0.86, currents) * 0.55);

    // Wind-stretched cloud swirls.
    const cloudNoise = fbm3(px * 2.6, py * 6.4, pz * 2.6, 4, seed + 13);
    const cloudMask = smoothstep(0.55, 0.78, cloudNoise);
    albedo = mixRgb(albedo, cloud, cloudMask * 0.82);

    // Soft-edged polar ice.
    const capNoise = (fbm3(px * 4.4, py * 4.4, pz * 4.4, 3, seed + 29) - 0.5) * 0.16;
    const capMask = smoothstep(0.66, 0.78, Math.abs(py) + capNoise);
    albedo = mixRgb(albedo, ice, capMask * 0.92);
    return noEmissive(albedo);
  };
}

function makeVolcanicWorld(seed: number): SurfacePainter {
  const basalt = hex(0x161016);
  const basaltLight = hex(0x3c2620);
  const ash = hex(0x4a3c38);
  const lavaDeep = hex(0xff4a1c);
  const lavaCore = hex(0xffc36e);
  return ({ px, py, pz }) => {
    const plates = fbm3(px * 3.2, py * 3.2, pz * 3.2, 4, seed);
    let albedo = mixRgb(basalt, basaltLight, smoothstep(0.3, 0.75, plates));
    albedo = mixRgb(albedo, ash, smoothstep(0.68, 0.9, fbm3(px * 1.7, py * 1.7, pz * 1.7, 3, seed + 5)) * 0.5);

    // Incandescent fracture network with a hot core and dimmer bleed.
    const ridge = ridged3(px * 4.6, py * 4.6, pz * 4.6, 4, seed + 17);
    const crackCore = smoothstep(0.86, 0.95, ridge);
    const crackBleed = smoothstep(0.72, 0.9, ridge) * 0.5;
    const pools = smoothstep(0.7, 0.86, fbm3(px * 2.2 + 31, py * 2.2, pz * 2.2, 3, seed + 23));
    const emissiveStrength = Math.min(1, crackCore + crackBleed + pools * 0.8);
    const emissive = mixRgb(lavaDeep, lavaCore, crackCore);
    return { albedo, emissive, emissiveStrength };
  };
}

function makeMachineWorld(seed: number): SurfacePainter {
  const hull = hex(0x161c26);
  const hullLight = hex(0x36434f);
  const trench = hex(0x090d14);
  const cityWarm = hex(0xffd9a0);
  return ({ px, py, pz, light }) => {
    const panels = fbm3(px * 4.1, py * 4.1, pz * 4.1, 4, seed);
    let albedo = mixRgb(hull, hullLight, smoothstep(0.28, 0.74, panels));

    // Faint manufactured panel grid.
    const gridX = Math.abs(((px * 3.1 + pz * 1.3) % 0.5 + 0.5) % 0.5 - 0.25);
    const gridY = Math.abs(((py * 3.4) % 0.5 + 0.5) % 0.5 - 0.25);
    const gridMask = smoothstep(0.032, 0.012, Math.min(gridX, gridY)) * 0.35;
    albedo = mixRgb(albedo, trench, gridMask);

    // Equatorial trench.
    const trenchMask = smoothstep(0.09, 0.03, Math.abs(py + 0.04));
    albedo = mixRgb(albedo, trench, trenchMask * 0.8);

    // Night-side city clusters; a sparse few glint through on the day side.
    const clusters = fbm3(px * 5.4, py * 5.4, pz * 5.4, 3, seed + 53);
    const streets = fbm3(px * 9.5, py * 2.4, pz * 9.5, 2, seed + 59);
    const night = 1 - light;
    const cityMask = smoothstep(0.62, 0.78, clusters * 0.72 + streets * 0.28);
    const emissiveStrength = cityMask * Math.min(1, night * 1.25 + 0.08);
    return { albedo, emissive: cityWarm, emissiveStrength };
  };
}

function makeReefOceanWorld(seed: number): SurfacePainter {
  const abyss = hex(0x1d0e33);
  const violet = hex(0x4c2478);
  const reef = hex(0x2fbfae);
  const biolum = hex(0x64ffe0);
  const cloud = hex(0xcbb8f4);
  return ({ px, py, pz, light }) => {
    const currents = fbm3(px * 2.3, py * 2.9, pz * 2.3, 4, seed);
    let albedo = mixRgb(abyss, violet, smoothstep(0.3, 0.74, currents));

    const reefNoise = fbm3(px * 3.8 + 17, py * 3.8, pz * 3.8, 4, seed + 7);
    const reefMask = smoothstep(0.58, 0.74, reefNoise);
    albedo = mixRgb(albedo, reef, reefMask * 0.6);

    const wisps = fbm3(px * 2.2, py * 5.6, pz * 2.2, 3, seed + 19);
    albedo = mixRgb(albedo, cloud, smoothstep(0.62, 0.82, wisps) * 0.35);

    // Bioluminescent speckle inside reef shelves, brighter on the night side.
    const speckle = valueNoise3(px * 26, py * 26, pz * 26, seed + 91);
    const night = 0.45 + 0.55 * (1 - light);
    const emissiveStrength = reefMask * smoothstep(0.78, 0.92, speckle) * night;
    return { albedo, emissive: biolum, emissiveStrength };
  };
}

function makeShatteredFortress(seed: number): SurfacePainter {
  const rock = hex(0x2b2521);
  const rockLight = hex(0x5d5348);
  const plateDark = hex(0x17130f);
  const scarGlow = hex(0xff8a4a);
  return ({ px, py, pz }) => {
    const strata = fbm3(px * 3.6, py * 3.6, pz * 3.6, 4, seed);
    let albedo = mixRgb(rock, rockLight, smoothstep(0.26, 0.76, strata));

    // Angular fortress plates with hard-ish noisy boundaries.
    const plates = fbm3(px * 5.2 + 43, py * 5.2, pz * 5.2, 3, seed + 3);
    albedo = mixRgb(albedo, plateDark, smoothstep(0.55, 0.62, plates) * 0.55);

    // Deep fracture scars, dark with a faint hot trace at the deepest lines.
    const ridge = ridged3(px * 3.9, py * 3.9, pz * 3.9, 4, seed + 31);
    const scar = smoothstep(0.8, 0.92, ridge);
    albedo = mixRgb(albedo, plateDark, scar * 0.85);
    const emissiveStrength = smoothstep(0.93, 0.99, ridge) * 0.5;
    return { albedo, emissive: scarGlow, emissiveStrength };
  };
}

interface Crater {
  x: number;
  y: number;
  z: number;
  radius: number;
  depth: number;
}

function makeCathedralMoon(seed: number): SurfacePainter {
  const regolith = hex(0xb9bec9);
  const regolithLight = hex(0xdde2ec);
  const craterFloor = hex(0x767c8c);
  const ghost = hex(0xa8d8ff);

  const random = mulberry32(seed * 7919 + 17);
  const craters: Crater[] = [];
  for (let index = 0; index < 30; index += 1) {
    // Rejection-sample crater centers onto the visible hemisphere.
    const dx = random() * 1.7 - 0.85;
    const dy = random() * 1.7 - 0.85;
    const r2 = dx * dx + dy * dy;
    if (r2 > 0.92) {
      continue;
    }
    craters.push({
      x: dx,
      y: dy,
      z: Math.sqrt(1 - r2),
      radius: 0.05 + random() * 0.13,
      depth: 0.35 + random() * 0.4,
    });
  }

  return ({ px, py, pz }) => {
    const maria = fbm3(px * 2.6, py * 2.6, pz * 2.6, 4, seed);
    let albedo = mixRgb(regolith, regolithLight, smoothstep(0.3, 0.72, maria));

    for (const crater of craters) {
      const dx = px - crater.x;
      const dy = py - crater.y;
      const dz = pz - crater.z;
      const distance = Math.hypot(dx, dy, dz);
      if (distance >= crater.radius) {
        continue;
      }
      const t = distance / crater.radius;
      const floorMask = 1 - t * t;
      albedo = mixRgb(albedo, craterFloor, floorMask * crater.depth * 0.7);
      // Sunlit inner rim on the light-facing wall.
      const rimMask = smoothstep(0.55, 0.95, t) * floorMask;
      const facing = clamp01((dx * LIGHT_DIR[0] + dy * LIGHT_DIR[1]) / (crater.radius + 1e-5) * -1.4 + 0.5);
      albedo = mixRgb(albedo, regolithLight, rimMask * facing * 0.5);
    }

    // Ghost lights: sparse cold votive glints.
    const glint = valueNoise3(px * 21, py * 21, pz * 21, seed + 67);
    const emissiveStrength = smoothstep(0.9, 0.98, glint) * 0.5;
    return { albedo, emissive: ghost, emissiveStrength };
  };
}

function makeEclipsedPlanet(seed: number): SurfacePainter {
  const rock = hex(0x05060c);
  const rockSheen = hex(0x12142a);
  const ember = hex(0xff3a2a);
  return ({ px, py, pz }) => {
    const mottling = fbm3(px * 3.4, py * 3.4, pz * 3.4, 4, seed);
    const albedo = mixRgb(rock, rockSheen, smoothstep(0.3, 0.8, mottling) * 0.6);
    const ridge = ridged3(px * 4.9, py * 4.9, pz * 4.9, 3, seed + 11);
    const emissiveStrength = smoothstep(0.94, 0.995, ridge) * 0.16;
    return { albedo, emissive: ember, emissiveStrength };
  };
}

function makeHiveWorld(seed: number): SurfacePainter {
  const ochre = hex(0x5f421a);
  const ochreLight = hex(0xa87c2e);
  const sand = hex(0xd8ac54);
  const mound = hex(0x3c2a10);
  const lights = hex(0xffca6a);
  return ({ px, py, pz, light }) => {
    const dunes = fbm3(px * 2.8, py * 3.6, pz * 2.8, 4, seed);
    let albedo = mixRgb(ochre, ochreLight, smoothstep(0.28, 0.74, dunes));
    albedo = mixRgb(albedo, sand, smoothstep(0.68, 0.88, dunes) * 0.5);

    // Hive mound cells.
    const cells = fbm3(px * 7.4 + 7, py * 7.4, pz * 7.4, 3, seed + 37);
    albedo = mixRgb(albedo, mound, smoothstep(0.56, 0.66, cells) * 0.45);

    // Dense artificial lighting: clustered speckle with street-like filaments,
    // present everywhere but dominant on the night side.
    const cluster = fbm3(px * 6.1, py * 6.1, pz * 6.1, 3, seed + 43);
    const speckle = valueNoise3(px * 30, py * 30, pz * 30, seed + 47);
    const streets = fbm3(px * 11, py * 3.1, pz * 11, 2, seed + 51);
    const night = 0.4 + 0.6 * (1 - light);
    const mask = smoothstep(0.6, 0.74, cluster * 0.55 + streets * 0.25 + speckle * 0.2);
    const emissiveStrength = mask * smoothstep(0.55, 0.8, speckle) * night;
    return { albedo, emissive: lights, emissiveStrength };
  };
}

function makeSingularityEngine(seed: number): SurfacePainter {
  const horizon = hex(0x020208);
  const sheen = hex(0x1a1430);
  return ({ px, py, pz }) => {
    const swirl = fbm3(px * 4.4, py * 4.4, pz * 4.4, 3, seed);
    const albedo = mixRgb(horizon, sheen, smoothstep(0.35, 0.85, swirl) * 0.5);
    return noEmissive(albedo);
  };
}

// ---------------------------------------------------------------------------
// Composition passes
// ---------------------------------------------------------------------------

interface PlanetArt {
  fileName: string;
  seed: number;
  atmosphere: Rgb;
  /** Outer glow reach in planet radii and strength. */
  glowReach: number;
  glowStrength: number;
  /** Ambient floor so the night side never clips to pure black. */
  ambient: number;
  surface: SurfacePainter;
  ring?: {
    tiltDegrees: number;
    innerRadius: number;
    outerRadius: number;
    color: Rgb;
    hotColor: Rgb;
    alpha: number;
    thicknessSoftness: number;
  };
  debris?: { count: number; seed: number };
  mist?: { count: number; seed: number; alpha: number };
  /** Razor-thin eclipse crescent on the light-facing limb. */
  eclipseCrescent?: boolean;
  /** Lensed accretion arc above the sphere (singularity engine). */
  lensedArc?: boolean;
  /** Photon-bright ring hugging the limb (singularity engine). */
  photonRing?: boolean;
}

function renderSphere(buffer: PixelBuffer, art: PlanetArt): void {
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const sample = sampleSphere(x, y);
      if (!sample) {
        continue;
      }

      const { albedo, emissive, emissiveStrength } = art.surface(sample);
      const shading = (art.ambient + (1 - art.ambient) * sample.light) * sample.limb;
      const color: Rgb = [
        clamp01(albedo[0] * shading),
        clamp01(albedo[1] * shading),
        clamp01(albedo[2] * shading),
      ];

      // 1px anti-aliased limb.
      const edgeAlpha = clamp01((1 - sample.r) * PLANET_RADIUS);
      buffer.blend(x, y, color, edgeAlpha);

      if (emissiveStrength > 0) {
        const glow = emissiveStrength * (0.35 + 0.65 * sample.limb) * edgeAlpha;
        buffer.add(x, y, emissive, glow * 0.9);
      }

      // Atmospheric rim hugging the limb, stronger on the day side.
      const rim = smoothstep(0.78, 1.0, sample.r) * (0.22 + 0.78 * sample.light);
      if (rim > 0) {
        buffer.add(x, y, art.atmosphere, rim * 0.34 * edgeAlpha);
      }

      if (art.eclipseCrescent) {
        // Razor crescent: light arrives from behind, so only a thin limb arc
        // facing the light direction ignites.
        const facing = sample.px * -LIGHT_DIR[0] + sample.py * -LIGHT_DIR[1];
        const crescent = smoothstep(0.955, 0.995, sample.r) * smoothstep(0.25, 0.85, facing);
        if (crescent > 0) {
          buffer.add(x, y, [0.92, 0.97, 1], crescent * 1.1 * edgeAlpha);
        }
        const scatter = smoothstep(0.86, 0.98, sample.r) * smoothstep(0.05, 0.6, facing);
        if (scatter > 0) {
          buffer.add(x, y, art.atmosphere, scatter * 0.16 * edgeAlpha);
        }
      }

      if (art.photonRing) {
        const ring = smoothstep(0.965, 0.995, sample.r);
        if (ring > 0) {
          buffer.add(x, y, [0.88, 0.84, 1], ring * 0.85 * edgeAlpha);
        }
      }
    }
  }
}

function renderOuterGlow(buffer: PixelBuffer, art: PlanetArt): void {
  const maxRadius = PLANET_RADIUS * art.glowReach;
  const minX = Math.max(0, Math.floor(CENTER - maxRadius));
  const maxX = Math.min(SIZE - 1, Math.ceil(CENTER + maxRadius));
  const minY = Math.max(0, Math.floor(CENTER - maxRadius));
  const maxY = Math.min(SIZE - 1, Math.ceil(CENTER + maxRadius));

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const dx = (x + 0.5 - CENTER) / PLANET_RADIUS;
      const dy = (y + 0.5 - CENTER) / PLANET_RADIUS;
      const r = Math.hypot(dx, dy);
      if (r <= 1 || r > art.glowReach) {
        continue;
      }

      const falloff = Math.pow(1 - (r - 1) / (art.glowReach - 1), 2.1);
      buffer.add(x, y, art.atmosphere, falloff * art.glowStrength);
    }
  }
}

function renderRing(buffer: PixelBuffer, art: PlanetArt, front: boolean): void {
  const ring = art.ring;
  if (!ring) {
    return;
  }

  const tilt = (ring.tiltDegrees * Math.PI) / 180;
  const cosT = Math.cos(-tilt);
  const sinT = Math.sin(-tilt);
  const semiMajor = PLANET_RADIUS * ring.outerRadius;
  const semiMinor = semiMajor * 0.3;
  const extent = semiMajor * 1.08;
  const minX = Math.max(0, Math.floor(CENTER - extent));
  const maxX = Math.min(SIZE - 1, Math.ceil(CENTER + extent));
  const minY = Math.max(0, Math.floor(CENTER - extent * 0.6));
  const maxY = Math.min(SIZE - 1, Math.ceil(CENTER + extent * 0.6));

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const dx = x + 0.5 - CENTER;
      const dy = y + 0.5 - CENTER;
      const qx = dx * cosT - dy * sinT;
      const qy = dx * sinT + dy * cosT;
      const ellipseDistance = Math.hypot(qx / semiMajor, qy / semiMinor);
      const radial = 1 - ellipseDistance; // >0 inside the ring band ellipse
      const bandCenter = 1 - (ring.outerRadius - ring.innerRadius) / 2 / ring.outerRadius;
      const halfWidth = (ring.outerRadius - ring.innerRadius) / 2 / ring.outerRadius;
      const bandOffset = Math.abs(ellipseDistance - bandCenter) / halfWidth;
      if (bandOffset >= 1) {
        continue;
      }

      const theta = Math.atan2(qy / semiMinor, qx / semiMajor);
      const isFront = Math.sin(theta) > 0;
      if (isFront !== front) {
        continue;
      }

      // The back half hides behind the body; the front half sweeps over it.
      const r2 = (dx / PLANET_RADIUS) ** 2 + (dy / PLANET_RADIUS) ** 2;
      if (!front && r2 < 1) {
        continue;
      }

      const bandProfile = smoothstep(1, 0.15, bandOffset);
      const grain = 0.75 + 0.25 * valueNoise3(qx * 0.05, qy * 0.05, 0, 501);
      const innerHeat = smoothstep(1, 0, bandOffset);
      const color = mixRgb(ring.color, ring.hotColor, innerHeat * innerHeat);
      const alpha = bandProfile * ring.alpha * grain * ring.thicknessSoftness;
      buffer.blend(x, y, color, alpha);
      if (innerHeat > 0.55) {
        buffer.add(x, y, ring.hotColor, (innerHeat - 0.55) * ring.alpha * 0.6);
      }
      void radial;
    }
  }
}

function renderLensedArc(buffer: PixelBuffer, art: PlanetArt): void {
  // Gravitational-lensing stand-in: a fine bright arc bent over the pole.
  const ring = art.ring;
  if (!ring) {
    return;
  }

  const semiMajor = PLANET_RADIUS * 1.04;
  const semiMinor = semiMajor * 0.34;
  const tilt = (ring.tiltDegrees * Math.PI) / 180;
  const cosT = Math.cos(-tilt);
  const sinT = Math.sin(-tilt);

  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const dx = x + 0.5 - CENTER;
      const dy = y + 0.5 - CENTER;
      if (dy > -PLANET_RADIUS * 0.28) {
        continue;
      }
      const qx = dx * cosT - dy * sinT;
      const qy = dx * sinT + dy * cosT;
      const ellipseDistance = Math.hypot(qx / semiMajor, qy / semiMinor);
      const bandOffset = Math.abs(ellipseDistance - 1) / 0.045;
      if (bandOffset >= 1) {
        continue;
      }
      const arc = smoothstep(1, 0.1, bandOffset);
      buffer.add(x, y, ring.hotColor, arc * 0.5);
    }
  }
}

function renderDebris(buffer: PixelBuffer, art: PlanetArt): void {
  const debris = art.debris;
  if (!debris) {
    return;
  }

  const random = mulberry32(debris.seed);
  const rockA = hex(0x4c443c);
  const rockB = hex(0x8a7d6c);

  for (let index = 0; index < debris.count; index += 1) {
    const angle = random() * Math.PI * 2;
    const orbit = PLANET_RADIUS * (1.08 + random() * 0.5);
    const cx = CENTER + Math.cos(angle) * orbit;
    const cy = CENTER + Math.sin(angle) * orbit * 0.42 + PLANET_RADIUS * 0.05;
    const size = 1.2 + random() * 3.8;
    const stretch = random() > 0.72 ? 1.9 : 1;
    const spin = random() * Math.PI;
    const shade = random();
    const cosS = Math.cos(spin);
    const sinS = Math.sin(spin);

    const bound = Math.ceil(size * stretch + 2);
    for (let py = Math.floor(cy - bound); py <= Math.ceil(cy + bound); py += 1) {
      for (let px = Math.floor(cx - bound); px <= Math.ceil(cx + bound); px += 1) {
        const dx = px + 0.5 - cx;
        const dy = py + 0.5 - cy;
        const rx = (dx * cosS - dy * sinS) / (size * stretch);
        const ry = (dx * sinS + dy * cosS) / size;
        const d = rx * rx + ry * ry;
        if (d > 1) {
          continue;
        }
        // Cheap directional shading so shards read as lit rubble, not confetti.
        const lit = clamp01(0.5 - (rx * LIGHT_DIR[0] + ry * LIGHT_DIR[1]) * 0.9);
        const color = mixRgb(rockA, rockB, clamp01(shade * 0.5 + lit * 0.6));
        buffer.blend(px, py, color, (1 - d) * 0.92);
      }
    }
  }
}

function renderMist(buffer: PixelBuffer, art: PlanetArt): void {
  const mist = art.mist;
  if (!mist) {
    return;
  }

  const random = mulberry32(mist.seed);
  const mistColor: Rgb = [0.92, 0.96, 1];

  for (let index = 0; index < mist.count; index += 1) {
    const angle = random() * Math.PI * 2;
    const radius = PLANET_RADIUS * (0.55 + random() * 0.62);
    const cx = CENTER + Math.cos(angle) * radius;
    const cy = CENTER + Math.sin(angle) * radius;
    const blobRadius = 22 + random() * 58;
    const alpha = mist.alpha * (0.6 + random() * 0.7);
    const stretch = 1.4 + random() * 1.6;

    const bound = Math.ceil(blobRadius * stretch);
    for (let py = Math.floor(cy - bound); py <= Math.ceil(cy + bound); py += 1) {
      for (let px = Math.floor(cx - bound); px <= Math.ceil(cx + bound); px += 1) {
        const dx = (px + 0.5 - cx) / (blobRadius * stretch);
        const dy = (py + 0.5 - cy) / blobRadius;
        const d2 = dx * dx + dy * dy;
        if (d2 > 1) {
          continue;
        }
        const falloff = Math.exp(-d2 * 3.4) * alpha;
        buffer.blend(px, py, mistColor, falloff);
      }
    }
  }
}

function renderGrain(buffer: PixelBuffer, seed: number): void {
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const index = (y * SIZE + x) * 4;
      if (buffer.data[index + 3] <= 0) {
        continue;
      }
      const grain = (hash3(x, y, 0, seed) - 0.5) * 0.045;
      buffer.data[index] = clamp01(buffer.data[index] * (1 + grain));
      buffer.data[index + 1] = clamp01(buffer.data[index + 1] * (1 + grain));
      buffer.data[index + 2] = clamp01(buffer.data[index + 2] * (1 + grain));
    }
  }
}

function renderPlanet(art: PlanetArt): PixelBuffer {
  const buffer = new PixelBuffer();
  renderOuterGlow(buffer, art);
  renderRing(buffer, art, false);
  renderSphere(buffer, art);
  renderLensedArc(buffer, art);
  renderDebris(buffer, art);
  renderMist(buffer, art);
  renderRing(buffer, art, true);
  renderGrain(buffer, art.seed);
  return buffer;
}

// ---------------------------------------------------------------------------
// Planet art direction table
// ---------------------------------------------------------------------------

const PLANETS: PlanetArt[] = [
  {
    fileName: 'planet-01',
    seed: 101,
    atmosphere: hex(0x7af5d8),
    glowReach: 1.34,
    glowStrength: 0.16,
    ambient: 0.3,
    surface: makeAuroraGasGiant(101),
    ring: {
      tiltDegrees: -12,
      innerRadius: 1.3,
      outerRadius: 1.37,
      color: hex(0x9fe8dc),
      hotColor: hex(0xe8fffa),
      alpha: 0.5,
      thicknessSoftness: 1,
    },
  },
  {
    fileName: 'planet-02',
    seed: 202,
    atmosphere: hex(0x9fd8ff),
    glowReach: 1.36,
    glowStrength: 0.2,
    ambient: 0.34,
    surface: makeOceanWorld(202),
  },
  {
    fileName: 'planet-03',
    seed: 303,
    atmosphere: hex(0xff8a5c),
    glowReach: 1.3,
    glowStrength: 0.13,
    ambient: 0.26,
    surface: makeVolcanicWorld(303),
  },
  {
    fileName: 'planet-04',
    seed: 404,
    atmosphere: hex(0x7fb0d8),
    glowReach: 1.26,
    glowStrength: 0.1,
    ambient: 0.24,
    surface: makeMachineWorld(404),
  },
  {
    fileName: 'planet-05',
    seed: 505,
    atmosphere: hex(0xb48aff),
    glowReach: 1.34,
    glowStrength: 0.18,
    ambient: 0.32,
    surface: makeReefOceanWorld(505),
  },
  {
    fileName: 'planet-06',
    seed: 606,
    atmosphere: hex(0xa89080),
    glowReach: 1.24,
    glowStrength: 0.09,
    ambient: 0.28,
    surface: makeShatteredFortress(606),
    debris: { count: 52, seed: 6061 },
  },
  {
    fileName: 'planet-07',
    seed: 707,
    atmosphere: hex(0xcfe4ff),
    glowReach: 1.36,
    glowStrength: 0.18,
    ambient: 0.4,
    surface: makeCathedralMoon(707),
    mist: { count: 16, seed: 7071, alpha: 0.075 },
  },
  {
    fileName: 'planet-08',
    seed: 808,
    atmosphere: hex(0xdfeaff),
    glowReach: 1.42,
    glowStrength: 0.24,
    ambient: 0.05,
    surface: makeEclipsedPlanet(808),
    eclipseCrescent: true,
  },
  {
    fileName: 'planet-09',
    seed: 909,
    atmosphere: hex(0xffb86a),
    glowReach: 1.3,
    glowStrength: 0.15,
    ambient: 0.3,
    surface: makeHiveWorld(909),
  },
  {
    fileName: 'planet-10',
    seed: 1010,
    atmosphere: hex(0xc8b8ff),
    glowReach: 1.44,
    glowStrength: 0.26,
    ambient: 0.1,
    surface: makeSingularityEngine(1010),
    ring: {
      tiltDegrees: -9,
      innerRadius: 1.26,
      outerRadius: 1.52,
      color: hex(0x8a76e8),
      hotColor: hex(0xf4eeff),
      alpha: 0.72,
      thicknessSoftness: 1,
    },
    lensedArc: true,
    photonRing: true,
  },
];

// ---------------------------------------------------------------------------
// PNG encoding (8-bit RGBA, filter type 0 scanlines)
// ---------------------------------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let index = 0; index < bytes.length; index += 1) {
    crc = CRC_TABLE[(crc ^ bytes[index]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, payload: Uint8Array): Uint8Array {
  const typeBytes = new TextEncoder().encode(type);
  const chunk = new Uint8Array(8 + payload.length + 4);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, payload.length);
  chunk.set(typeBytes, 4);
  chunk.set(payload, 8);
  view.setUint32(8 + payload.length, crc32(chunk.subarray(4, 8 + payload.length)));
  return chunk;
}

function encodePng(buffer: PixelBuffer): Uint8Array {
  const scanlines = new Uint8Array(SIZE * (1 + SIZE * 4));
  for (let y = 0; y < SIZE; y += 1) {
    const rowStart = y * (1 + SIZE * 4);
    scanlines[rowStart] = 0;
    for (let x = 0; x < SIZE; x += 1) {
      const source = (y * SIZE + x) * 4;
      const target = rowStart + 1 + x * 4;
      scanlines[target] = Math.round(clamp01(buffer.data[source]) * 255);
      scanlines[target + 1] = Math.round(clamp01(buffer.data[source + 1]) * 255);
      scanlines[target + 2] = Math.round(clamp01(buffer.data[source + 2]) * 255);
      scanlines[target + 3] = Math.round(clamp01(buffer.data[source + 3]) * 255);
    }
  }

  const ihdr = new Uint8Array(13);
  const ihdrView = new DataView(ihdr.buffer);
  ihdrView.setUint32(0, SIZE);
  ihdrView.setUint32(4, SIZE);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const signature = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const idat = deflateSync(scanlines, { level: 9 });
  const png = new Uint8Array(
    signature.length + (12 + 13) + (12 + idat.length) + 12
  );
  let offset = 0;
  png.set(signature, offset);
  offset += signature.length;
  const ihdrChunk = pngChunk('IHDR', ihdr);
  png.set(ihdrChunk, offset);
  offset += ihdrChunk.length;
  const idatChunk = pngChunk('IDAT', idat);
  png.set(idatChunk, offset);
  offset += idatChunk.length;
  png.set(pngChunk('IEND', new Uint8Array(0)), offset);
  return png;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  mkdirSync(PNG_DIR, { recursive: true });

  let totalBytes = 0;
  for (const art of PLANETS) {
    const startedAt = performance.now();
    const buffer = renderPlanet(art);
    const png = encodePng(buffer);
    const pngPath = path.join(PNG_DIR, `${art.fileName}.png`);
    const webpPath = path.join(OUTPUT_DIR, `${art.fileName}.webp`);
    writeFileSync(pngPath, png);

    execFileSync('cwebp', [
      '-q', String(WEBP_QUALITY),
      '-alpha_q', '90',
      '-m', '6',
      '-mt',
      pngPath,
      '-o', webpPath,
    ], { stdio: 'pipe' });

    const stats = Bun.file(webpPath);
    totalBytes += stats.size;
    const elapsed = (performance.now() - startedAt).toFixed(0);
    console.log(`${art.fileName}.webp: ${(stats.size / 1024).toFixed(1)} kB (${elapsed} ms)`);
  }

  console.log(`Total: ${(totalBytes / 1024).toFixed(1)} kB across ${PLANETS.length} portraits -> ${OUTPUT_DIR}`);
}

main();
