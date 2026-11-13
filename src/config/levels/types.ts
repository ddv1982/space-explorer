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
  | 'swarmling'
  | 'rival'
  | 'courier';

export interface EnemySpawnConfig {
  type: EnemyType;
  weight: number;
}

interface EncounterSizeConfig {
  min: number;
  max: number;
}

/** Hull look: picks the boss sprite (`boss-<style>`). A phase can switch it. */
export type BossStyle = 'barrage' | 'pressure' | 'maelstrom' | 'carrier' | 'pursuit' | 'bulwark';

/**
 * One emitter in a volley. Speeds scale `ENEMY_BULLET_SPEED`; angles are degrees, 90 is straight
 * down; origins are pixel offsets from the boss centre.
 */
export type BossShotPattern =
  | {
      /** A fan of shots around a fixed heading. */
      kind: 'arc';
      shots: number;
      arcDegrees: number;
      speed: number;
      /** One fan per origin; defaults to the centre line. */
      originsX?: readonly number[];
      originY: number;
      /** Fixed turn off straight down. */
      angle?: number;
      /** Leans the fan this many degrees the way the boss is moving... */
      lean?: number;
      /** ...only on every other volley, so consecutive fans interleave. */
      leanEveryOther?: boolean;
    }
  | {
      /** A fan centred on the player. */
      kind: 'aimedArc';
      shots: number;
      arcDegrees: number;
      speed: number;
      originY: number;
    }
  | {
      /** Evenly spaced spokes all around, turning with the fight clock. */
      kind: 'spiral';
      shots: number;
      degreesPerSecond: number;
      speed: number;
      originY: number;
      /** Adds a counter-rotating set offset by half a spoke. */
      mirrored?: boolean;
    }
  | {
      /**
       * A line of shots across the whole screen with one gap to fly through. Gaps are screen
       * fractions, used in turn on each use of this attack.
       */
      kind: 'wall';
      gaps: readonly number[];
      gapWidth: number;
      spacing: number;
      speed: number;
      originY: number;
    }
  | {
      /** Single aimed shots in quick succession, re-aimed at the player for each shot. */
      kind: 'aimedBurst';
      shots: number;
      intervalMs: number;
      speed: number;
      originY: number;
    }
  | {
      /** A telegraphed hazard beam straight down from the boss (`HazardBeam`). */
      kind: 'beam';
      width: number;
      telegraphMs: number;
      activeMs: number;
      originY: number;
    }
  | {
      /** Escorts launched beside the boss; `onVolleys` limits them to even or odd volleys of the fight. */
      kind: 'summon';
      escorts: readonly EnemyType[];
      onVolleys?: 'even' | 'odd';
    };

/** A spot the boss flies to before an attack: `x` is a share of the screen width, `y` pixels from the top. */
export interface BossAnchor {
  x: number;
  y: number;
}

/** One step of a phase's rotation: everything in `volley` fires together after one wind-up. */
export interface BossAttackConfig {
  /** Time since the previous volley. */
  cooldownMs: number;
  volley: readonly BossShotPattern[];
  /** Flies here first and holds still until the volley fires. */
  anchor?: BossAnchor;
  /** The hull is shielded from the previous volley until this one fires. */
  shielded?: boolean;
}

interface BossMovementBob {
  amplitude: number;
  periodMs: number;
}

/** How the boss moves between attacks (and around its last anchor). */
export type BossMovementConfig =
  | { kind: 'patrol'; speed: number; edgePadding: number; bob?: BossMovementBob }
  /** Slides toward the player's x, capped at `speed`. */
  | { kind: 'pursuit'; speed: number; edgePadding: number; bob?: BossMovementBob };

export interface BossPhaseConfig {
  /** The phase begins once the hull falls to this share; the first phase starts at 1. */
  startsAtHull: number;
  style: BossStyle;
  movement: BossMovementConfig;
  /** Fired in order, then from the top again. */
  attacks: readonly BossAttackConfig[];
}

export interface BossConfig {
  name: string;
  maxHp: number;
  /**
   * Fight length, in seconds, for the sector's representative ship (`bun run balance:bosses`).
   * A kill under par pays a fast-kill bonus; past par, volleys come faster (see `escalatesPastPar`).
   */
  parSeconds: number;
  /** False keeps the fight's pace fixed however long it runs (the gentle first boss). */
  escalatesPastPar: boolean;
  /** Firing pause after each phase change. */
  phaseChangePauseMs: number;
  phases: readonly BossPhaseConfig[];
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

/**
 * `wall` fills every lane except the wave's `lane`, which is the gap to fly through; wide screens
 * get up to three members per lane, and `count` caps the total;
 * `echelon` is a diagonal staircase stepping away from the nearer screen edge.
 */
export type WaveFormation = 'column' | 'line' | 'vee' | 'ring' | 'pincer' | 'wall' | 'echelon';

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
    valence: number; // -1.0 to 1.0
    arousal: number; // 0.0 to 1.0
    tension: number; // 0.0 to 1.0
  };
  tensionArc?: 'constant' | 'gradualBuild' | 'buildRelease' | 'waves';
}

export * from './music/types';

export interface LevelConfig extends LevelThemeSummary {
  name: string;
  planetName: string;
  bgColor: string;
  accentColor: number;
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
}
