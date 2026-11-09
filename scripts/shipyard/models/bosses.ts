import type * as THREE from 'three';
import { buildBossBarrage } from './bossBarrage';
import { buildBossBulwark } from './bossBulwark';
import { buildBossCarrier } from './bossCarrier';
import { buildBossMaelstrom } from './bossMaelstrom';
import { buildBossPressure } from './bossPressure';
import { buildBossPursuit } from './bossPursuit';

/** Boss hulls keyed by sheet file (`boss-<attackStyle>`), each 88×56 logical, nose down. */
export const BOSS_BUILDERS: Record<string, () => THREE.Object3D> = {
  'boss-barrage': buildBossBarrage,
  'boss-bulwark': buildBossBulwark,
  'boss-carrier': buildBossCarrier,
  'boss-pursuit': buildBossPursuit,
  'boss-maelstrom': buildBossMaelstrom,
  'boss-pressure': buildBossPressure,
};
