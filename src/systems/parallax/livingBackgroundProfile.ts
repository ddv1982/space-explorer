import type { VisualQualityTier } from '../../config/visualQuality';

export const LIVING_CAMPAIGN = [
  { level: 1, world: 'aurora', name: 'Aurora Threshold' },
  { level: 2, world: 'tideglass', name: 'Tideglass Shallows' },
  { level: 3, world: 'ember', name: 'Ember Monsoon' },
  { level: 4, world: 'clockwork', name: 'Clockwork Causeway' },
  { level: 5, world: 'reef', name: 'Shatter Reef' },
  { level: 6, world: 'debris', name: 'Debris Gauntlet' },
  { level: 7, world: 'choir', name: 'Hollow Choir' },
  { level: 8, world: 'eclipse', name: 'Eclipse Narrows' },
  { level: 9, world: 'hive', name: 'Swarmfront' },
  { level: 10, world: 'eventide', name: 'Eventide Engine' },
] as const;

export type LivingWorld = (typeof LIVING_CAMPAIGN)[number]['world'];
export type LandmarkKind = 'mechanism' | 'broken-ring' | 'crystal' | 'wreckage' | 'arches' | 'hive';
export interface LandmarkPlacement {
  x: number;
  y: number;
  offset: number;
  scale: number;
  alpha: number;
  rotation: number;
  spin: number;
}
interface WorldProfile {
  starAccent: number;
  landmark: { kind: 'none' } | { kind: LandmarkKind; placements: readonly LandmarkPlacement[] };
  occluder: { x: number; y: number; radiusWidth: number; radiusHeight: number; mask: number } | null;
}
const LEFT = { x: 0, y: 0.35, offset: -0.35, scale: 1, alpha: 0.72, rotation: 0, spin: 0.000012 };
const RIGHT = { x: 1, y: 0.76, offset: 0.35, scale: 1, alpha: 0.5, rotation: 0, spin: -0.000008 };

export const LIVING_WORLD_PROFILES: Record<LivingWorld, WorldProfile> = {
  aurora: { starAccent: 0x79aab9, landmark: { kind: 'none' }, occluder: null },
  tideglass: {
    starAccent: 0x6bced5,
    landmark: {
      kind: 'crystal',
      placements: [
        { ...LEFT, y: 0.74, rotation: 0.2, spin: 0.000004, alpha: 0.5 },
        { ...RIGHT, y: 0.22, rotation: 2.8, spin: -0.000003, alpha: 0.42 },
      ],
    },
    occluder: null,
  },
  ember: { starAccent: 0xda9064, landmark: { kind: 'none' }, occluder: null },
  clockwork: { starAccent: 0x79aab9, landmark: { kind: 'mechanism', placements: [LEFT, RIGHT] }, occluder: null },
  reef: {
    starAccent: 0xc5a3d1,
    landmark: {
      kind: 'crystal',
      placements: [
        { ...LEFT, y: 0.4, rotation: -0.25, spin: 0.000006 },
        { ...RIGHT, y: 0.83, rotation: 2.7, spin: -0.000004 },
      ],
    },
    occluder: null,
  },
  debris: {
    starAccent: 0x93b2bc,
    landmark: {
      kind: 'wreckage',
      placements: [
        { ...LEFT, y: 0.28, rotation: -0.2, spin: 0.000009 },
        { ...RIGHT, y: 0.7, rotation: 2.9, spin: -0.000006 },
      ],
    },
    occluder: null,
  },
  choir: {
    starAccent: 0xb8c8de,
    landmark: {
      kind: 'arches',
      placements: [
        { ...LEFT, y: 0.42, rotation: 0, spin: 0.000002, alpha: 0.6 },
        { ...RIGHT, y: 0.69, rotation: Math.PI, spin: -0.000002 },
      ],
    },
    occluder: null,
  },
  eclipse: {
    starAccent: 0xbb9ecd,
    landmark: { kind: 'none' },
    occluder: { x: 0.94, y: 0.48, radiusWidth: 0.4, radiusHeight: 0.48, mask: 0.83 },
  },
  hive: {
    starAccent: 0xcac486,
    landmark: {
      kind: 'hive',
      placements: [
        { ...LEFT, y: 0.32, rotation: 0.1, spin: 0.000003, alpha: 0.65 },
        { ...RIGHT, y: 0.78, rotation: 2.9, spin: -0.000004, alpha: 0.55 },
      ],
    },
    occluder: null,
  },
  eventide: {
    starAccent: 0x79aab9,
    landmark: { kind: 'broken-ring', placements: [{ ...LEFT, y: 0.82 }] },
    occluder: { x: 0.87, y: 0.3, radiusWidth: 0.29, radiusHeight: 0.38, mask: 0.53 },
  },
};

export function selectLivingWorld(levelName?: string): LivingWorld | null {
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    if (params.get('background') === 'legacy' || params.get('art') === 'neon') return null;
  }
  return LIVING_CAMPAIGN.find((entry) => entry.name === levelName)?.world ?? null;
}

export function getAtmosphereSize(width: number, height: number, tier: VisualQualityTier): [number, number] {
  const longEdge = tier === 'low' ? 320 : tier === 'standard' ? 480 : 640;
  const scale = Math.min(1, longEdge / Math.max(width, height));
  return [Math.max(2, Math.round(width * scale)), Math.max(2, Math.round(height * scale))];
}

export function visualNoise(x: number, y: number): number {
  let value = (x * 37 + y * 113 + 19) % 2003;
  value = (value * value + 71) % 2003;
  return ((value * value + value * 37) % 2003) / 2003;
}
