import type { LevelMusicConfig } from './music/types';

export type EnemyType = 'scout' | 'fighter' | 'bomber' | 'swarm' | 'gunship';

export interface EnemySpawnConfig {
  type: EnemyType;
  weight: number;
}

export interface EncounterSizeConfig {
  min: number;
  max: number;
}

export type BossAttackStyle =
  | 'barrage'
  | 'pressure'
  | 'maelstrom'
  | 'carrier'
  | 'pursuit'
  | 'bulwark';

export interface BossConfig {
  name: string;
  maxHp: number;
  phase1Cooldown: number;
  phase2Cooldown: number;
  phase2MoveSpeed: number;
  phaseTransitionPauseMs?: number;
  attackStyle: BossAttackStyle;
  phase1SpreadShotCount: number;
  phase1SpreadArcDegrees: number;
  phase1BulletSpeedScale: number;
  phase2SpiralShotCount: number;
  phase2SpiralTurnRate: number;
  phase2BulletSpeedScale: number;
}

export interface LastLifeHelperWingConfig {
  shipCount: number;
  helperLives: number;
  hpScaleFromPlayer: number;
  fireRateMs: number;
  respawnDelayMs: number;
  spacing?: number;
  followOffsetY?: number;
}

export type LevelPacingPhase = 'intro' | 'build' | 'hazard' | 'climax' | 'boss-approach';

export type HazardType =
  | 'ambient-asteroids'
  | 'debris-surge'
  | 'minefield'
  | 'nebula-ambush'
  | 'ring-crossfire'
  | 'rock-corridor'
  | 'energy-storm'
  | 'gravity-well';

export interface LevelThemeSummary {
  destination: string;
  visualTheme: string;
  coreGameplayIdea: string;
  pacingSummary: string;
  enemyCompositionSummary: string;
  hazardSummary: string;
  bossConcept: string;
  difficultyRole: string;
  journeyNote: string;
}

export interface ScriptedHazardConfig {
  type: HazardType;
  cadenceMs?: number;
  durationMs?: number;
  laneCount?: number;
  corridorWidth?: number;
  damage?: number;
  intensity?: number;
  notes?: string;
}

export interface LevelSectionVisualModifierConfig {
  atmosphereAlpha?: number;
  driftScale?: number;
  twinkleScale?: number;
  landmarkAlpha?: number;
  hazardResponseScale?: number;
}

export interface LevelSectionConfig {
  id: string;
  label: string;
  startProgress: number;
  endProgress: number;
  phase: LevelPacingPhase;
  summary: string;
  enemyFocus?: EnemySpawnConfig[];
  encounterSizeOverride?: EncounterSizeConfig;
  spawnRateMultiplier?: number;
  asteroidInterval?: number;
  hazardEvents?: ScriptedHazardConfig[];
  musicIntensity?: number;
  visualModifiers?: LevelSectionVisualModifierConfig;
  // VAT emotion targets for this section
  vatTarget?: {
    valence: number;   // -1.0 to 1.0
    arousal: number;   // 0.0 to 1.0
    tension: number;   // 0.0 to 1.0
  };
  tensionArc?: 'constant' | 'gradualBuild' | 'buildRelease' | 'waves';
}

export * from './music/types';

export interface LevelConfig extends LevelThemeSummary {
  name: string;
  planetName: string;
  bgColor: string;
  accentColor: number;
  nebulaColor: number;
  nebulaAlpha: number;
  colorGrade: { brightness: number; contrast: number; saturation: number } | null;
  planetPalette: [number, number];
  enemies: EnemySpawnConfig[];
  encounterSize: EncounterSizeConfig;
  spawnRateMultiplier: number;
  levelDistance: number;
  hasBoss: boolean;
  boss: BossConfig | null;
  lastLifeHelperWing?: LastLifeHelperWingConfig | null;
  bossTriggerProgress: number;
  asteroidInterval: number;
  sections: LevelSectionConfig[];
  music: LevelMusicConfig;
  moonSurface?: MoonSurfaceConfig;
  passingPlanets?: PassingPlanetConfig[];
}

export interface MoonSurfaceConfig {
  scrollSpeed: number;
  surfaceColor: number;
  accentColor: number;
  buildingCount: number;
  craterCount: number;
  horizonGlow: number;
}

export interface PassingPlanetConfig {
  scrollSpeed: number;
  planetPalette: [number, number];
  size: number;
  yPosition: number;
  alpha: number;
  ringChance: number;
}
