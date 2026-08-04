import type { LevelMusicConfig } from './music/types';

export type EnemyType =
  | 'scout'
  | 'fighter'
  | 'bomber'
  | 'swarm'
  | 'gunship'
  | 'diver'
  | 'dodger'
  | 'sower'
  | 'lancer'
  | 'splitter'
  | 'swarmling';

export interface EnemySpawnConfig {
  type: EnemyType;
  weight: number;
}

interface EncounterSizeConfig {
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
  phase2AttackStyle?: BossAttackStyle;
  phase1SpreadShotCount: number;
  phase1SpreadArcDegrees: number;
  phase1BulletSpeedScale: number;
  phase2SpiralShotCount: number;
  phase2SpiralTurnRate: number;
  phase2BulletSpeedScale: number;
  /** Main-player damage required to trigger Guard Break. Omit to disable. */
  guardCapacity?: number;
  guardDecayDelayMs?: number;
  guardDecayPerSecond?: number;
  guardBreakDurationMs?: number;
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

type LevelPacingPhase = 'intro' | 'build' | 'hazard' | 'climax' | 'boss-approach';

type HazardType =
  | 'ambient-asteroids'
  | 'debris-surge'
  | 'minefield'
  | 'nebula-ambush'
  | 'ring-crossfire'
  | 'rock-corridor'
  | 'energy-storm'
  | 'gravity-well'
  | 'solar-flare'
  | 'laser-lattice'
  | 'wormhole-spawn';

interface LevelThemeSummary {
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
  blocksEnemyProjectiles?: boolean;
  coverHp?: number;
  coverIndestructible?: boolean;
  enemyTypes?: EnemyType[];
  notes?: string;
}

export type AuthoredLaneAnchor = 'left' | 'center' | 'right';

interface SignatureWaveEnemyConfig {
  type: EnemyType;
  lane: AuthoredLaneAnchor;
  y?: number;
  /** Flags this enemy as a gilded Marked Ace (levels 5-10 only; see aceConfig). */
  ace?: boolean;
}

export interface SignatureWaveConfig {
  id: string;
  triggerProgress: number;
  enemies: SignatureWaveEnemyConfig[];
  notes?: string;
}

export type WaveFormation = 'column' | 'line' | 'vee' | 'ring' | 'pincer';

type WaveTelegraph = 'none' | 'warning' | 'wormhole';

export interface ChoreographedWaveConfig {
  id: string;
  atMs: number;
  formation: WaveFormation;
  type: EnemyType;
  count: number;
  lane?: number;
  spacing?: number;
  telegraph?: WaveTelegraph;
  /** Number of lead members spawned as Marked Aces (levels 5-10 only; see aceConfig). */
  aceCount?: number;
  bonusOnClearMs?: number;
  bonusWave?: { type: EnemyType; count: number };
  midBossBeat?: boolean;
  notes?: string;
}

export interface RecoveryDropConfig {
  id: string;
  triggerProgress: number;
  type: 'health' | 'shield';
  lane: AuthoredLaneAnchor;
  notes?: string;
}

interface LevelSectionVisualModifierConfig {
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
  signatureWaves?: SignatureWaveConfig[];
  waves?: ChoreographedWaveConfig[];
  recoveryDrops?: RecoveryDropConfig[];
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
  bossAddWaves?: boolean;
  lastLifeHelperWing?: LastLifeHelperWingConfig | null;
  bossTriggerProgress: number;
  asteroidInterval: number;
  sections: LevelSectionConfig[];
  music: LevelMusicConfig;
  passingPlanets?: PassingPlanetConfig[];
}

export interface PassingPlanetConfig {
  scrollSpeed: number;
  planetPalette: [number, number];
  size: number;
  yPosition: number;
  alpha: number;
  ringChance: number;
}
