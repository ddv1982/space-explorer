import type { LevelConfig } from '../types';
import { ASTEROID_BELT_ALPHA_LEVEL } from './asteroidBeltAlpha';
import { NEBULA_PASS_LEVEL } from './nebulaPass';
import { ION_STORM_SECTOR_LEVEL } from './ionStormSector';
import { WARZONE_CORRIDOR_LEVEL } from './warzoneCorridor';
import { DEEP_SPACE_INFERNO_LEVEL } from './deepSpaceInferno';

export const CORE_CAMPAIGN_LEVELS: LevelConfig[] = [
  ASTEROID_BELT_ALPHA_LEVEL,
  NEBULA_PASS_LEVEL,
  ION_STORM_SECTOR_LEVEL,
  WARZONE_CORRIDOR_LEVEL,
  DEEP_SPACE_INFERNO_LEVEL,
];
