import { PlayerUpgradeLevels } from '../config/UpgradesConfig';

export interface PlayerStateData {
  level: number;
  score: number;
  currentHp: number;
  currentShields: number;
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

export interface RunSummaryData {
  finalScore: number;
  levelReached: number;
}

interface PlayerStateRegistry {
  get(key: string): unknown;
  set(key: string, value: unknown): unknown;
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
const MAX_HELPER_WING_SLOTS = 4;

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeFiniteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalizeNonNegativeInteger(value: unknown, fallback: number): number {
  return Math.max(0, Math.floor(normalizeFiniteNumber(value, fallback)));
}

function getDefaultPlayerState(): PlayerStateData {
  return {
    level: 1,
    score: 0,
    currentHp: 5,
    remainingLives: DEFAULT_REMAINING_LIVES,
    currentShields: 0,
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

function normalizeHelperWingState(state: unknown): PersistentHelperWingState {
  if (!isObjectRecord(state)) {
    return { slots: [], grantedSlots: 0 };
  }

  const normalizedSlots = Array.isArray(state.slots)
    ? state.slots
        .slice(0, MAX_HELPER_WING_SLOTS)
        .map((slot) => {
          if (!isObjectRecord(slot)) {
            return { remainingLives: 0, hp: 0 };
          }

          return {
            remainingLives: normalizeNonNegativeInteger(slot.remainingLives, 0),
            hp: Math.max(0, Math.round(normalizeFiniteNumber(slot.hp, 0))),
          };
        })
    : [];

  const backwardCompatibleGrantedSlots =
    typeof state.grantedSlots === 'number' && Number.isFinite(state.grantedSlots)
      ? Math.min(MAX_HELPER_WING_SLOTS, Math.max(0, Math.floor(state.grantedSlots)))
      : normalizedSlots.length;

  const grantedSlots = Math.min(
    MAX_HELPER_WING_SLOTS,
    Math.max(backwardCompatibleGrantedSlots, normalizedSlots.length)
  );
  const slots = normalizedSlots.slice(0, grantedSlots);

  while (slots.length < grantedSlots) {
    slots.push({ remainingLives: 0, hp: 0 });
  }

  return {
    slots,
    grantedSlots,
  };
}

function normalizePlayerState(value: unknown): PlayerStateData {
  const defaultState = getDefaultPlayerState();
  if (!isObjectRecord(value)) {
    return defaultState;
  }

  const upgradesInput = isObjectRecord(value.upgrades) ? value.upgrades : {};
  const upgrades = {
    hp: normalizeNonNegativeInteger(upgradesInput.hp, defaultState.upgrades.hp),
    damage: normalizeNonNegativeInteger(upgradesInput.damage, defaultState.upgrades.damage),
    fireRate: normalizeNonNegativeInteger(upgradesInput.fireRate, defaultState.upgrades.fireRate),
    shield: normalizeNonNegativeInteger(upgradesInput.shield, defaultState.upgrades.shield),
  };
  const maxShields = upgrades.shield;
  const currentShieldsInput = normalizeFiniteNumber(value.currentShields, maxShields);

  return {
    level: normalizeFiniteNumber(value.level, defaultState.level),
    score: normalizeFiniteNumber(value.score, defaultState.score),
    currentHp: normalizeFiniteNumber(value.currentHp, defaultState.currentHp),
    currentShields: Math.max(0, Math.min(Math.floor(currentShieldsInput), maxShields)),
    remainingLives: normalizeNonNegativeInteger(value.remainingLives, defaultState.remainingLives),
    upgrades,
    helperWing: normalizeHelperWingState(value.helperWing),
  };
}

export function getPlayerState(registry: PlayerStateRegistry): PlayerStateData {
  const normalizedState = normalizePlayerState(registry.get(PLAYER_STATE_KEY) as unknown);
  registry.set(PLAYER_STATE_KEY, normalizedState);
  return normalizedState;
}

export function setPlayerState(registry: PlayerStateRegistry, state: PlayerStateData): void {
  registry.set(PLAYER_STATE_KEY, normalizePlayerState(state));
}

export function resetPlayerState(registry: PlayerStateRegistry): void {
  registry.set(PLAYER_STATE_KEY, getDefaultPlayerState());
}

export function getRunSummary(registry: PlayerStateRegistry): RunSummaryData {
  return {
    finalScore: normalizeFiniteNumber(
      registry.get(RUN_SUMMARY_KEYS.finalScore) as unknown,
      DEFAULT_RUN_SUMMARY.finalScore
    ),
    levelReached: normalizeFiniteNumber(
      registry.get(RUN_SUMMARY_KEYS.levelReached) as unknown,
      DEFAULT_RUN_SUMMARY.levelReached
    ),
  };
}

export function setRunSummary(
  registry: PlayerStateRegistry,
  summary: Partial<RunSummaryData>
): RunSummaryData {
  const currentSummary = getRunSummary(registry);
  const nextSummary: RunSummaryData = {
    finalScore: normalizeFiniteNumber(summary.finalScore, currentSummary.finalScore),
    levelReached: normalizeFiniteNumber(summary.levelReached, currentSummary.levelReached),
  };

  registry.set(RUN_SUMMARY_KEYS.finalScore, nextSummary.finalScore);
  registry.set(RUN_SUMMARY_KEYS.levelReached, nextSummary.levelReached);

  return nextSummary;
}

export function resetRunSummary(registry: PlayerStateRegistry): void {
  registry.set(RUN_SUMMARY_KEYS.finalScore, DEFAULT_RUN_SUMMARY.finalScore);
  registry.set(RUN_SUMMARY_KEYS.levelReached, DEFAULT_RUN_SUMMARY.levelReached);
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

function getPlayerShieldCount(state: PlayerStateData): number {
  return state.upgrades.shield;
}

export function advanceToNextLevel(registry: PlayerStateRegistry): void {
  const state = getPlayerState(registry);
  state.level += 1;
  state.currentHp = getPlayerMaxHp(state);
  state.currentShields = getPlayerShieldCount(state);
  setPlayerState(registry, state);
}

export function saveScoreToState(registry: PlayerStateRegistry, score: number): void {
  const state = getPlayerState(registry);
  state.score = score;
  setPlayerState(registry, state);
}

export function saveCurrentHp(registry: PlayerStateRegistry, hp: number): void {
  const state = getPlayerState(registry);
  state.currentHp = hp;
  setPlayerState(registry, state);
}

export function saveCurrentShields(registry: PlayerStateRegistry, shields: number): void {
  const state = getPlayerState(registry);
  const maxShields = getPlayerShieldCount(state);
  state.currentShields = Math.max(0, Math.min(Math.floor(shields), maxShields));
  setPlayerState(registry, state);
}

export function saveRemainingLives(registry: PlayerStateRegistry, remainingLives: number): void {
  const state = getPlayerState(registry);
  state.remainingLives = Math.max(0, remainingLives);
  setPlayerState(registry, state);
}

export function getHelperWingState(registry: PlayerStateRegistry): PersistentHelperWingState {
  return getPlayerState(registry).helperWing;
}

export function saveHelperWingState(
  registry: PlayerStateRegistry,
  helperWing: PersistentHelperWingState | null | undefined
): void {
  const state = getPlayerState(registry);
  state.helperWing = normalizeHelperWingState(helperWing);
  setPlayerState(registry, state);
}
