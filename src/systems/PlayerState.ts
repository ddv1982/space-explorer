import Phaser from 'phaser';

export interface PlayerStateData {
  level: number;
  score: number;
  currentHp: number;
  upgrades: {
    hp: number;
    damage: number;
    fireRate: number;
    shield: number;
  };
}

export interface RunSummaryData {
  finalScore: number;
  levelReached: number;
}

const PLAYER_STATE_KEY = 'playerState';
const RUN_SUMMARY_KEYS = {
  finalScore: 'finalScore',
  levelReached: 'levelReached',
} as const;
const DEFAULT_RUN_SUMMARY: RunSummaryData = {
  finalScore: 0,
  levelReached: 1,
};

export function getDefaultPlayerState(): PlayerStateData {
  return {
    level: 1,
    score: 0,
    currentHp: 5,
    upgrades: {
      hp: 0,
      damage: 0,
      fireRate: 0,
      shield: 0,
    },
  };
}

export function getPlayerState(registry: Phaser.Data.DataManager): PlayerStateData {
  const state = registry.get(PLAYER_STATE_KEY);
  if (!state) {
    const defaultState = getDefaultPlayerState();
    registry.set(PLAYER_STATE_KEY, defaultState);
    return defaultState;
  }
  return state as PlayerStateData;
}

export function setPlayerState(registry: Phaser.Data.DataManager, state: PlayerStateData): void {
  registry.set(PLAYER_STATE_KEY, state);
}

export function resetPlayerState(registry: Phaser.Data.DataManager): void {
  registry.set(PLAYER_STATE_KEY, getDefaultPlayerState());
}

export function getRunSummary(registry: Phaser.Data.DataManager): RunSummaryData {
  return {
    finalScore: registry.get(RUN_SUMMARY_KEYS.finalScore) ?? DEFAULT_RUN_SUMMARY.finalScore,
    levelReached: registry.get(RUN_SUMMARY_KEYS.levelReached) ?? DEFAULT_RUN_SUMMARY.levelReached,
  };
}

export function setRunSummary(
  registry: Phaser.Data.DataManager,
  summary: Partial<RunSummaryData>
): RunSummaryData {
  const nextSummary = {
    ...getRunSummary(registry),
    ...summary,
  };

  registry.set(RUN_SUMMARY_KEYS.finalScore, nextSummary.finalScore);
  registry.set(RUN_SUMMARY_KEYS.levelReached, nextSummary.levelReached);

  return nextSummary;
}

export function getPlayerMaxHp(state: PlayerStateData): number {
  return 5 + state.upgrades.hp * 2;
}

export function getPlayerDamage(state: PlayerStateData): number {
  return 1 + state.upgrades.damage;
}

export function getPlayerFireRate(state: PlayerStateData): number {
  return Math.max(60, 150 - state.upgrades.fireRate * 15);
}

export function getPlayerShieldCount(state: PlayerStateData): number {
  return state.upgrades.shield;
}

export function advanceToNextLevel(registry: Phaser.Data.DataManager): void {
  const state = getPlayerState(registry);
  state.level += 1;
  state.currentHp = getPlayerMaxHp(state);
  setPlayerState(registry, state);
}

export function saveScoreToState(registry: Phaser.Data.DataManager, score: number): void {
  const state = getPlayerState(registry);
  state.score = score;
  setPlayerState(registry, state);
}

export function saveCurrentHp(registry: Phaser.Data.DataManager, hp: number): void {
  const state = getPlayerState(registry);
  state.currentHp = hp;
  setPlayerState(registry, state);
}
