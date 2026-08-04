import type {
  ChoreographedWaveConfig,
  EnemyType,
  WaveFormation,
} from '@/config/LevelsConfig';

export const CHOREO_LANE_COUNT = 7;

const LANE_MARGIN_RATIO = 0.08;
const DEFAULT_WAVE_SPACING = 56;
const DEFAULT_WAVE_START_Y = -60;
const BONUS_WAVE_START_Y = -40;
const BONUS_WAVE_SPACING = 48;
const WORMHOLE_LEAD_MS = 600;
const MIN_SPAWN_X = 16;
/** Formations spawn above the viewport; telegraph rings are clamped into view so players can read them. */
const MIN_WORMHOLE_TELEGRAPH_Y = 72;

export interface FormationPosition {
  x: number;
  y: number;
}

export function getLaneCenterX(
  laneIndex: number,
  viewportWidth: number,
  laneCount: number = CHOREO_LANE_COUNT
): number {
  const margin = viewportWidth * LANE_MARGIN_RATIO;
  const usableWidth = Math.max(0, viewportWidth - margin * 2);
  const clampedLane = Math.max(0, Math.min(laneCount - 1, laneIndex));

  return margin + ((clampedLane + 0.5) / laneCount) * usableWidth;
}

function clampSpawnX(x: number, viewportWidth: number): number {
  return Math.max(MIN_SPAWN_X, Math.min(viewportWidth - MIN_SPAWN_X, x));
}

export function resolveFormationPositions(
  formation: WaveFormation,
  count: number,
  anchorX: number,
  viewportWidth: number,
  startY: number = DEFAULT_WAVE_START_Y,
  spacing: number = DEFAULT_WAVE_SPACING
): FormationPosition[] {
  const positions: FormationPosition[] = [];
  const total = Math.max(0, Math.round(count));

  switch (formation) {
    case 'column': {
      for (let i = 0; i < total; i++) {
        positions.push({ x: clampSpawnX(anchorX, viewportWidth), y: startY - i * spacing });
      }
      return positions;
    }
    case 'line': {
      for (let i = 0; i < total; i++) {
        positions.push({
          x: clampSpawnX(anchorX + (i - (total - 1) / 2) * spacing, viewportWidth),
          y: startY,
        });
      }
      return positions;
    }
    case 'vee': {
      for (let i = 0; i < total; i++) {
        if (i === 0) {
          positions.push({ x: clampSpawnX(anchorX, viewportWidth), y: startY });
          continue;
        }

        const rank = Math.ceil(i / 2);
        const side = i % 2 === 1 ? -1 : 1;
        positions.push({
          x: clampSpawnX(anchorX + side * rank * spacing, viewportWidth),
          y: startY - rank * spacing * 0.8,
        });
      }
      return positions;
    }
    case 'ring': {
      const radius = Math.max(48, (spacing * total) / (Math.PI * 2));
      const centerY = startY - radius;
      for (let i = 0; i < total; i++) {
        const angle = -Math.PI / 2 + (i / total) * Math.PI * 2;
        positions.push({
          x: clampSpawnX(anchorX + Math.cos(angle) * radius, viewportWidth),
          y: centerY + Math.sin(angle) * radius,
        });
      }
      return positions;
    }
    case 'pincer': {
      const leftX = getLaneCenterX(0, viewportWidth);
      const rightX = getLaneCenterX(CHOREO_LANE_COUNT - 1, viewportWidth);
      for (let i = 0; i < total; i++) {
        const sideRank = Math.floor(i / 2);
        positions.push({ x: i % 2 === 0 ? leftX : rightX, y: startY - sideRank * spacing });
      }
      return positions;
    }
  }
}

interface ChoreographedSpawnedMember {
  active: boolean;
  getDefeatCount(): number;
}

export interface ChoreographedSpawnOptions {
  /** Spawn this member as a gilded Marked Ace (from the wave's aceCount). */
  ace?: boolean;
}

interface TrackedWaveMember {
  member: ChoreographedSpawnedMember;
  defeatCountAtSpawn: number;
}

export interface WaveChoreographerDeps {
  spawn: (
    type: EnemyType,
    x: number,
    y: number,
    options?: ChoreographedSpawnOptions
  ) => ChoreographedSpawnedMember | null;
  emitWarning: (x: number) => void;
  emitWormhole: (x: number, y: number) => void;
  emitEliteWave: () => void;
  getViewportWidth: () => number;
}

interface WaveRuntime {
  config: ChoreographedWaveConfig;
  fireAt: number;
  telegraphAt: number;
  telegraphed: boolean;
  fired: boolean;
  firedAt: number;
  members: TrackedWaveMember[];
  bonusResolved: boolean;
}

export class WaveChoreographer {
  private waves: WaveRuntime[] = [];
  private elapsedMs = 0;

  constructor(private readonly deps: WaveChoreographerDeps) {}

  setSection(waves: ChoreographedWaveConfig[] | undefined): void {
    this.elapsedMs = 0;
    this.waves = (waves ?? []).map((config): WaveRuntime => {
      const fireAt = Math.max(0, config.atMs);
      const telegraphLead = config.telegraph === 'wormhole' ? WORMHOLE_LEAD_MS : 0;

      return {
        config,
        fireAt,
        telegraphAt: fireAt - telegraphLead,
        telegraphed: false,
        fired: false,
        firedAt: 0,
        members: [],
        bonusResolved: false,
      };
    });
  }

  /**
   * Advance the section clock by a gameplay delta (ms). Call only from unpaused,
   * unlocked gameplay frames: because the clock is driven by accumulated delta
   * rather than the scene's wall-clock time, pauses and gameplay locks freeze the
   * schedule instead of compressing elapsed waves into a single burst on resume.
   */
  update(delta: number): void {
    this.elapsedMs += Math.max(0, delta);
    const time = this.elapsedMs;

    for (const wave of this.waves) {
      if (!wave.fired) {
        this.maybeTelegraph(wave, time);
        if (time >= wave.fireAt) {
          this.fire(wave, time);
        }
        continue;
      }

      this.resolveBonusIfCleared(wave, time);
    }
  }

  private maybeTelegraph(wave: WaveRuntime, time: number): void {
    if (wave.config.telegraph !== 'wormhole' || wave.telegraphed || time < wave.telegraphAt) {
      return;
    }

    wave.telegraphed = true;
    for (const position of this.getPositions(wave.config)) {
      this.deps.emitWormhole(position.x, Math.max(position.y, MIN_WORMHOLE_TELEGRAPH_Y));
    }
  }

  private fire(wave: WaveRuntime, time: number): void {
    wave.fired = true;
    wave.firedAt = time;

    const aceCount = Math.max(0, wave.config.aceCount ?? 0);
    const warned = new Set<number>();
    const positions = this.getPositions(wave.config);
    for (const [index, position] of positions.entries()) {
      // Lead members carry the authored ace marks.
      const member = this.deps.spawn(
        wave.config.type,
        position.x,
        position.y,
        index < aceCount ? { ace: true } : undefined
      );
      if (!member) {
        continue;
      }

      wave.members.push({
        member,
        defeatCountAtSpawn: member.getDefeatCount(),
      });
      if (wave.config.telegraph !== 'none' && !warned.has(position.x)) {
        warned.add(position.x);
        this.deps.emitWarning(position.x);
      }
    }

    if (wave.config.midBossBeat) {
      this.deps.emitEliteWave();
    }
  }

  private resolveBonusIfCleared(wave: WaveRuntime, time: number): void {
    const bonus = wave.config.bonusWave;
    if (wave.bonusResolved || !bonus || !wave.config.bonusOnClearMs || wave.members.length === 0) {
      return;
    }

    if (
      wave.members.some(
        ({ member, defeatCountAtSpawn }) => member.getDefeatCount() <= defeatCountAtSpawn
      )
    ) {
      return;
    }

    wave.bonusResolved = true;
    if (time - wave.firedAt > wave.config.bonusOnClearMs) {
      return;
    }

    const anchorX = this.getAnchorX(wave.config);
    const positions = resolveFormationPositions(
      'line',
      bonus.count,
      anchorX,
      this.deps.getViewportWidth(),
      BONUS_WAVE_START_Y,
      BONUS_WAVE_SPACING
    );

    let spawnedAny = false;
    for (const position of positions) {
      if (this.deps.spawn(bonus.type, position.x, position.y)) {
        spawnedAny = true;
      }
    }

    if (spawnedAny) {
      this.deps.emitWarning(anchorX);
    }
  }

  private getPositions(config: ChoreographedWaveConfig): FormationPosition[] {
    return resolveFormationPositions(
      config.formation,
      config.count,
      this.getAnchorX(config),
      this.deps.getViewportWidth(),
      DEFAULT_WAVE_START_Y,
      config.spacing ?? DEFAULT_WAVE_SPACING
    );
  }

  private getAnchorX(config: ChoreographedWaveConfig): number {
    return getLaneCenterX(config.lane ?? Math.floor(CHOREO_LANE_COUNT / 2), this.deps.getViewportWidth());
  }
}
