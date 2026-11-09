import Phaser from 'phaser';
import { PLAYER_CONFIG } from '../config/playerConfig';
import { MAX_CURRENT_SHIELDS } from './PlayerState';
import { colorToHexString } from '../utils/colorUtils';
import { Player } from '../entities/Player';
import { PowerUp, PowerUpType } from '../entities/PowerUp';
import { EffectsManager } from './EffectsManager';
import { audioManager } from './AudioManager';
import { createPickupLabel } from './effects/ephemeralOverlayTweens';
export { GAME_SCENE_EVENTS } from './GameSceneEvents';
export type { GameSceneEventHandler, GameSceneEventName } from './GameSceneEvents';

export const TERMINAL_TRANSITIONS = {
  none: 'none',
  playerDeath: 'player-death',
  levelComplete: 'level-complete',
} as const;

export type TerminalTransitionState = (typeof TERMINAL_TRANSITIONS)[keyof typeof TERMINAL_TRANSITIONS];

const POWER_UP_DROP_CHANCE = 0.12;
const POWER_UP_TYPES: PowerUpType[] = ['health', 'shield', 'rapidfire'];

const POWER_UP_LABELS: Record<PowerUpType, string> = {
  health: '+HP',
  shield: '+SHIELD',
  rapidfire: 'FIRE RATE UP',
};

/** Matches the pickup orbs painted in `powerUpTextures.ts`. */
const POWER_UP_TINTS: Record<PowerUpType, number> = {
  health: 0x5dffa0,
  shield: 0x9cd6ff,
  rapidfire: 0xffe066,
};

export function trySpawnRandomPowerUp(group: Phaser.Physics.Arcade.Group, x: number, y: number): void {
  if (Math.random() > POWER_UP_DROP_CHANCE) {
    return;
  }

  const type = Phaser.Utils.Array.GetRandom(POWER_UP_TYPES);
  spawnPowerUp(group, x, y, type);
}

/**
 * Marked Ace reward: always spawns a power-up. Callers must branch on the ace
 * flag instead of also rolling trySpawnRandomPowerUp, so the guaranteed drop
 * is never duplicated by the normal drop roll.
 */
export function spawnGuaranteedPowerUp(group: Phaser.Physics.Arcade.Group, x: number, y: number): void {
  const type = Phaser.Utils.Array.GetRandom(POWER_UP_TYPES);
  spawnPowerUp(group, x, y, type);
}

export function spawnPowerUp(group: Phaser.Physics.Arcade.Group, x: number, y: number, type: PowerUpType): void {
  const powerUp = (group.getFirstDead(false) as PowerUp | null) ?? (group.get(x, y) as PowerUp | null);

  powerUp?.spawn(x, y, type);
}

export function applyPowerUpPickup(
  scene: Phaser.Scene,
  player: Player,
  effectsManager: EffectsManager,
  type: PowerUpType
): void {
  audioManager.playPowerUpPickup();

  switch (type) {
    case 'health':
      player.hp = Math.min(player.hp + 2, player.maxHp);
      break;
    case 'shield':
      player.shields = Math.min(player.shields + 1, MAX_CURRENT_SHIELDS);
      break;
    case 'rapidfire':
      player.fireRate = Math.max(PLAYER_CONFIG.absoluteMinFireRate, player.fireRate - 20);
      break;
  }

  effectsManager.createSparkBurst(player.x, player.y);
  effectsManager.createPowerUpBurst(player.x, player.y, POWER_UP_TINTS[type]);

  createPickupLabel(scene, player.x, player.y, POWER_UP_LABELS[type], colorToHexString(POWER_UP_TINTS[type]));
}
