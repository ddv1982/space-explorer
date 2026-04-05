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

const PLAYER_STATE_KEY = 'playerState';

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
