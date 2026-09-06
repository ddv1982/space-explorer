import type { DamageSource } from '@/systems/PlayerDamage';
import { getPlayerState } from '@/systems/PlayerState';
import type { VisualQualityTier } from '@/config/visualQuality';
import type { GameplayDifficultyTier } from '@/config/gameplayDifficulty';

export interface GameFeelEnvironment {
  userAgent: string;
  renderer: string | null;
  hardwareConcurrency: number;
  viewport: { width: number; height: number; devicePixelRatio: number };
  gameSize: { width: number; height: number };
  quality: VisualQualityTier;
  difficulty: GameplayDifficultyTier;
  startingPersistedPlayerState: ReturnType<typeof getPlayerState>;
}

export interface GameFeelOptions {
  scenario: string;
  buildSha: string;
  source: 'automation' | 'human';
  deviceLabel: string;
  maxFrames?: number;
  maxEvents?: number;
  maxDurationMs?: number;
}

export type GameFeelStopReason =
  'requested' | 'frame-cap' | 'event-cap' | 'duration-cap' | 'adapter-unavailable' | 'game-destroyed';

export interface GameFeelFrame {
  wallMs: number;
  segmentId: number;
  deltaMs: number;
  gameplayMs: number;
  level: number;
  section: string | null;
  progress: number;
  x: number;
  y: number;
  accelerationX: number;
  accelerationY: number;
  velocityX: number;
  velocityY: number;
  firingIntent: boolean;
  lastFireGameplayMs: number;
  hp: number;
  shields: number;
  alive: boolean;
  manualPause: boolean;
  physicsPause: boolean;
  flowLock: boolean;
  captureCostMs: number;
}

export type GameFeelEventDetail =
  | { kind: 'key'; action: 'down' | 'up'; code: string; repeat: boolean }
  | {
      kind: 'pointer';
      action: 'down' | 'move' | 'up' | 'cancel';
      pointerId: number;
      pointerType: 'mouse' | 'touch' | 'pen' | 'unknown';
      x: number;
      y: number;
      buttons: number;
    }
  | {
      kind: 'focus';
      delivered: 'initial' | 'focus' | 'blur' | 'visibilitychange';
      trusted: boolean;
      focused: boolean;
      visible: boolean;
    }
  | { kind: 'scene'; action: 'entered' | 'shutdown' | 'destroy'; scene: string }
  | { kind: 'player-hit'; cause: DamageSource; outcome: 'absorbed' | 'damaged'; hullDamage: number }
  | { kind: 'player-death'; cause: DamageSource; outcome: 'fatal'; hullDamage: number }
  | { kind: 'level-complete' | 'enemy-spawn-warning' | 'wormhole-telegraph' }
  | {
      kind: 'occupancy';
      totalEnabledBodies: number;
      truncated: boolean;
      bodies: { texture: string | null; x: number; y: number; width: number; height: number }[];
    };

export type GameFeelEvent = GameFeelEventDetail & { wallMs: number; segmentId: number | null };

export interface GameFeelExport {
  schemaVersion: 1;
  metadata: {
    scenario: string;
    buildSha: string;
    source: 'automation' | 'human';
    deviceLabel: string;
    attribution: 'caller-supplied';
  };
  limits: {
    maxFrames: number;
    maxEvents: number;
    maxDurationMs: number;
    occupancyIntervalMs: 250;
    maxOccupancyBodies: 64;
  };
  startedAt: string;
  environment: GameFeelEnvironment | null;
  status: { kind: 'recording' } | { kind: 'stopped'; reason: GameFeelStopReason; wallMs: number };
  frames: GameFeelFrame[];
  events: GameFeelEvent[];
}

function boundedText(value: unknown, field: string, max: number): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) {
    throw new Error(`${field} must be a nonempty string of at most ${max} characters`);
  }
  return value;
}

function boundedLimit(value: unknown, fallback: number, max: number, field: string): number {
  if (value === undefined) return fallback;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > max) {
    throw new Error(`${field} must be an integer between 1 and ${max}`);
  }
  return value;
}

function createExport(options: GameFeelOptions, startedAt: string): GameFeelExport {
  if (!options || typeof options !== 'object') throw new Error('Recording options are required');
  if (options.source !== 'automation' && options.source !== 'human')
    throw new Error('source must be automation or human');
  return {
    schemaVersion: 1,
    metadata: {
      scenario: boundedText(options.scenario, 'scenario', 160),
      buildSha: boundedText(options.buildSha, 'buildSha', 64),
      source: options.source,
      deviceLabel: boundedText(options.deviceLabel, 'deviceLabel', 160),
      attribution: 'caller-supplied',
    },
    limits: {
      occupancyIntervalMs: 250,
      maxOccupancyBodies: 64,
      maxFrames: boundedLimit(options.maxFrames, 36_000, 120_000, 'maxFrames'),
      maxEvents: boundedLimit(options.maxEvents, 8_000, 20_000, 'maxEvents'),
      maxDurationMs: boundedLimit(options.maxDurationMs, 600_000, 1_800_000, 'maxDurationMs'),
    },
    startedAt,
    environment: null,
    status: { kind: 'recording' },
    frames: [],
    events: [],
  };
}

export class GameFeelRecording {
  private data: GameFeelExport | null = null;

  constructor(private readonly onStop: () => void) {}

  get active(): boolean {
    return this.data?.status.kind === 'recording';
  }
  get durationLimit(): number {
    return this.data?.limits.maxDurationMs ?? 0;
  }

  start(options: GameFeelOptions, startedAt: string): boolean {
    if (this.active) return false;
    this.data = createExport(options, startedAt);
    return true;
  }

  environment(value: GameFeelEnvironment): void {
    if (this.active && this.data) this.data.environment = value;
  }

  frame(frame: GameFeelFrame): void {
    if (!this.active || !this.data || !this.checkDuration(frame.wallMs)) return;
    this.data.frames.push(frame);
    if (this.data.frames.length === this.data.limits.maxFrames) this.stop('frame-cap', frame.wallMs);
  }

  event(event: GameFeelEvent): void {
    if (!this.active || !this.data || !this.checkDuration(event.wallMs)) return;
    this.data.events.push(event);
    if (this.data.events.length === this.data.limits.maxEvents) this.stop('event-cap', event.wallMs);
  }

  checkDuration(wallMs: number): boolean {
    if (!this.active) return false;
    if (wallMs >= this.durationLimit) {
      this.stop('duration-cap', wallMs);
      return false;
    }
    return true;
  }

  stop(reason: GameFeelStopReason, wallMs: number): void {
    if (!this.active || !this.data) return;
    this.data.status = { kind: 'stopped', reason, wallMs };
    this.onStop();
  }

  clear(): void {
    this.stop('requested', 0);
    this.data = null;
  }

  read(): GameFeelExport | null {
    return this.data ? structuredClone(this.data) : null;
  }
}

export function readGameFeelLoadout(registry: Pick<Parameters<typeof getPlayerState>[0], 'get'>) {
  return getPlayerState({ get: (key) => registry.get(key), set: () => undefined });
}
