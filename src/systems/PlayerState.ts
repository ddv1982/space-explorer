import { getUpgradeByKey, normalizeUpgradeLevel, PlayerUpgradeLevels } from '../config/UpgradesConfig';
import { PLAYER_CONFIG } from '../config/playerConfig';

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
const DEFAULT_REMAINING_LIVES = PLAYER_CONFIG.startingLives;
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

function normalizeBoundedInteger(value: unknown, fallback: number, maximum: number): number {
  return Math.min(maximum, normalizeNonNegativeInteger(value, fallback));
}

function normalizeBoundedNumber(value: unknown, fallback: number, maximum: number): number {
  return Math.min(maximum, Math.max(0, normalizeFiniteNumber(value, fallback)));
}

export function normalizePersistedScore(value: unknown, fallback: number): number {
  return normalizeBoundedInteger(value, fallback, Number.MAX_SAFE_INTEGER);
}

function getMaxHpForHullTier(hullTier: number): number {
  return PLAYER_CONFIG.baseMaxHp + hullTier * PLAYER_CONFIG.hpPerUpgrade;
}

function getDefaultPlayerState(): PlayerStateData {
  return {
    level: 1,
    score: 0,
    currentHp: PLAYER_CONFIG.baseMaxHp,
    remainingLives: DEFAULT_REMAINING_LIVES,
    currentShields: 0,
    upgrades: {
      hp: 0,
      damage: 0,
      fireRate: 0,
      shield: 0,
      turrets: 0,
    },
    helperWing: {
      slots: [],
      grantedSlots: 0,
    },
  };
}

function normalizeHelperWingState(state: unknown, maxPlayerHp: number): PersistentHelperWingState {
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
            remainingLives: normalizeBoundedInteger(slot.remainingLives, 0, PLAYER_CONFIG.startingLives),
            hp: normalizeBoundedInteger(slot.hp, 0, maxPlayerHp),
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

export function normalizePersistedPlayerState(value: unknown): PlayerStateData {
  const defaultState = getDefaultPlayerState();
  if (!isObjectRecord(value)) {
    return defaultState;
  }

  const upgradesInput = isObjectRecord(value.upgrades) ? value.upgrades : {};
  const upgrades = {
    hp: normalizeUpgradeLevel('hp', upgradesInput.hp, defaultState.upgrades.hp),
    damage: normalizeUpgradeLevel('damage', upgradesInput.damage, defaultState.upgrades.damage),
    fireRate: normalizeUpgradeLevel('fireRate', upgradesInput.fireRate, defaultState.upgrades.fireRate),
    shield: normalizeUpgradeLevel('shield', upgradesInput.shield, defaultState.upgrades.shield),
    turrets: normalizeUpgradeLevel('turrets', upgradesInput.turrets, defaultState.upgrades.turrets),
  };
  const maxHp = getMaxHpForHullTier(upgrades.hp);
  const maxShields = upgrades.shield;
  const currentShieldsInput = normalizeFiniteNumber(value.currentShields, maxShields);

  return {
    level: normalizeFiniteNumber(value.level, defaultState.level),
    score: normalizePersistedScore(value.score, defaultState.score),
    currentHp: normalizeBoundedNumber(value.currentHp, defaultState.currentHp, maxHp),
    currentShields: Math.max(0, Math.min(Math.floor(currentShieldsInput), maxShields)),
    remainingLives: normalizeBoundedInteger(
      value.remainingLives,
      defaultState.remainingLives,
      PLAYER_CONFIG.startingLives
    ),
    upgrades,
    helperWing: normalizeHelperWingState(value.helperWing, maxHp),
  };
}

export function getPlayerState(registry: PlayerStateRegistry): PlayerStateData {
  const normalizedState = normalizePersistedPlayerState(registry.get(PLAYER_STATE_KEY) as unknown);
  registry.set(PLAYER_STATE_KEY, normalizedState);
  return normalizedState;
}

export function setPlayerState(registry: PlayerStateRegistry, state: PlayerStateData): void {
  registry.set(PLAYER_STATE_KEY, normalizePersistedPlayerState(state));
}

export function resetPlayerState(registry: PlayerStateRegistry): void {
  registry.set(PLAYER_STATE_KEY, getDefaultPlayerState());
}

export function getRunSummary(registry: PlayerStateRegistry): RunSummaryData {
  return {
    finalScore: normalizePersistedScore(
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
    finalScore: normalizePersistedScore(summary.finalScore, currentSummary.finalScore),
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
  return getMaxHpForHullTier(normalizeUpgradeLevel('hp', state.upgrades.hp));
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

export function getPlayerTurretTier(state: PlayerStateData): number {
  const maxTier = getUpgradeByKey('turrets').maxLevel;
  const rawTier = state.upgrades.turrets;
  const tier = Number.isFinite(rawTier) ? Math.floor(rawTier) : 0;
  return Math.min(maxTier, Math.max(0, tier));
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
  state.helperWing = normalizeHelperWingState(helperWing, getPlayerMaxHp(state));
  setPlayerState(registry, state);
}
