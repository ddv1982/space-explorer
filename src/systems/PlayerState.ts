import Phaser from 'phaser';
import { PlayerUpgradeLevels } from '../config/UpgradesConfig';

export interface PlayerStateData {
  level: number;
  score: number;
  currentHp: number;
  remainingLives: number;
  upgrades: PlayerUpgradeLevels;
  helperWing: PersistentHelperWingState;
}

export interface PersistentHelperWingSlotState {
  remainingLives: number;
  hp: number;
}

export interface PersistentHelperWingState {
  slots: PersistentHelperWingSlotState[];
  grantedSlots: number;
}

interface RunSummaryData {
  finalScore: number;
  levelReached: number;
}

const PLAYER_STATE_KEY = 'playerState';
const DEFAULT_REMAINING_LIVES = 3;
const RUN_SUMMARY_KEYS = {
  finalScore: 'finalScore',
  levelReached: 'levelReached',
} as const;
const DEFAULT_RUN_SUMMARY: RunSummaryData = {
  finalScore: 0,
  levelReached: 1,
};

function getDefaultPlayerState(): PlayerStateData {
  return {
    level: 1,
    score: 0,
    currentHp: 5,
    remainingLives: DEFAULT_REMAINING_LIVES,
    upgrades: {
      hp: 0,
      damage: 0,
      fireRate: 0,
      shield: 0,
    },
    helperWing: {
      slots: [],
      grantedSlots: 0,
    },
  };
}

function normalizeHelperWingState(state: PersistentHelperWingState | null | undefined): PersistentHelperWingState {
  const normalizedSlots = Array.isArray(state?.slots)
    ? state.slots
        .map((slot) => ({
          remainingLives:
            typeof slot?.remainingLives === 'number'
              ? Math.max(0, Math.floor(slot.remainingLives))
              : 0,
          hp:
            typeof slot?.hp === 'number'
              ? Math.max(0, Math.round(slot.hp))
              : 0,
        }))
    : [];

  const backwardCompatibleGrantedSlots =
    typeof state?.grantedSlots === 'number'
      ? Math.max(0, Math.floor(state.grantedSlots))
      : normalizedSlots.length;

  const grantedSlots = Math.max(backwardCompatibleGrantedSlots, normalizedSlots.length);
  const slots = normalizedSlots.slice(0, grantedSlots);

  while (slots.length < grantedSlots) {
    slots.push({ remainingLives: 0, hp: 0 });
  }

  return {
    slots,
    grantedSlots,
  };
}

function normalizePlayerState(state: Partial<PlayerStateData> | null | undefined): PlayerStateData {
  const defaultState = getDefaultPlayerState();

  return {
    level: typeof state?.level === 'number' ? state.level : defaultState.level,
    score: typeof state?.score === 'number' ? state.score : defaultState.score,
    currentHp: typeof state?.currentHp === 'number' ? state.currentHp : defaultState.currentHp,
    remainingLives:
      typeof state?.remainingLives === 'number'
        ? Math.max(0, state.remainingLives)
        : defaultState.remainingLives,
    upgrades: {
      hp: state?.upgrades?.hp ?? defaultState.upgrades.hp,
      damage: state?.upgrades?.damage ?? defaultState.upgrades.damage,
      fireRate: state?.upgrades?.fireRate ?? defaultState.upgrades.fireRate,
      shield: state?.upgrades?.shield ?? defaultState.upgrades.shield,
    },
    helperWing: normalizeHelperWingState(state?.helperWing),
  };
}

export function getPlayerState(registry: Phaser.Data.DataManager): PlayerStateData {
  const state = registry.get(PLAYER_STATE_KEY) as Partial<PlayerStateData> | undefined;
  if (!state) {
    const defaultState = getDefaultPlayerState();
    registry.set(PLAYER_STATE_KEY, defaultState);
    return defaultState;
  }

  const normalizedState = normalizePlayerState(state);
  registry.set(PLAYER_STATE_KEY, normalizedState);
  return normalizedState;
}

export function setPlayerState(registry: Phaser.Data.DataManager, state: PlayerStateData): void {
  registry.set(PLAYER_STATE_KEY, normalizePlayerState(state));
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

export function saveRemainingLives(registry: Phaser.Data.DataManager, remainingLives: number): void {
  const state = getPlayerState(registry);
  state.remainingLives = Math.max(0, remainingLives);
  setPlayerState(registry, state);
}

export function getHelperWingState(registry: Phaser.Data.DataManager): PersistentHelperWingState {
  return getPlayerState(registry).helperWing;
}

export function saveHelperWingState(
  registry: Phaser.Data.DataManager,
  helperWing: PersistentHelperWingState | null | undefined
): void {
  const state = getPlayerState(registry);
  state.helperWing = normalizeHelperWingState(helperWing);
  setPlayerState(registry, state);
}
