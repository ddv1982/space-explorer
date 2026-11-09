import type * as THREE from 'three';
import { buildAsteroid } from './asteroid';
import { buildBomber } from './bomber';
import { BOSS_BUILDERS } from './bosses';
import { buildDiver } from './diver';
import { buildDodger } from './dodger';
import { buildFighter } from './fighter';
import { buildGunship } from './gunship';
import { buildHelper } from './helper';
import { buildLancer } from './lancer';
import { buildMine } from './mine';
import { buildPlayerShip } from './playerShip';
import { buildScout } from './scout';
import { buildSower } from './sower';
import { buildSplitter } from './splitter';
import { buildSwarm } from './swarm';
import { buildSwarmling } from './swarmling';
import { buildTurret } from './turret';

/**
 * Shipyard model per sheet `file` (see SHIPYARD_SPRITES). Bank sheets call the builder once with
 * frame 0; variant sheets call it once per frame so each frame can be a distinct shape.
 */
export const MODEL_BUILDERS: Record<string, (frame: number) => THREE.Object3D> = {
  player: buildPlayerShip,
  helper: buildHelper,
  scout: buildScout,
  fighter: buildFighter,
  bomber: buildBomber,
  gunship: buildGunship,
  swarm: buildSwarm,
  swarmling: buildSwarmling,
  diver: buildDiver,
  dodger: buildDodger,
  sower: buildSower,
  lancer: buildLancer,
  splitter: buildSplitter,
  turret: buildTurret,
  mine: buildMine,
  asteroid: buildAsteroid,
  ...BOSS_BUILDERS,
};
