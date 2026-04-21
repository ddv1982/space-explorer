import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { PowerUp, PowerUpType } from '../entities/PowerUp';
import { EffectsManager } from './EffectsManager';
import { audioManager } from './AudioManager';

export const GAME_SCENE_EVENTS = {
  enemyDeath: 'enemy-death',
  playerDeath: 'player-death',
  playerFatalHit: 'player-fatal-hit',
  levelComplete: 'level-complete',
  bossSpawn: 'boss-spawn',
  playerHit: 'player-hit',
  playerExhaust: 'player-exhaust',
  enemySpawnWarning: 'enemy-spawn-warning',
  bossDeath: 'boss-death',
  bossPhaseChange: 'boss-phase-change',
  helperWingActivated: 'helper-wing-activated',
  helperWingDepleted: 'helper-wing-depleted',
  playerBulletTrail: 'player-bullet-trail',
  enemyBulletTrail: 'enemy-bullet-trail',
} as const;

export const TERMINAL_TRANSITIONS = {
  none: 'none',
  playerDeath: 'player-death',
  levelComplete: 'level-complete',
} as const;

export type TerminalTransitionState =
  typeof TERMINAL_TRANSITIONS[keyof typeof TERMINAL_TRANSITIONS];

const POWER_UP_DROP_CHANCE = 0.12;
const POWER_UP_TYPES: PowerUpType[] = ['health', 'shield', 'rapidfire'];

const POWER_UP_LABELS: Record<PowerUpType, string> = {
  health: '+HP',
  shield: '+SHIELD',
  rapidfire: 'FIRE RATE UP',
};

const POWER_UP_COLORS: Record<PowerUpType, string> = {
  health: '#00ff44',
  shield: '#4488ff',
  rapidfire: '#ffcc00',
};

const POWER_UP_TINTS: Record<PowerUpType, number> = {
  health: 0x00ff44,
  shield: 0x4488ff,
  rapidfire: 0xffcc00,
};

export function trySpawnRandomPowerUp(
  group: Phaser.Physics.Arcade.Group,
  x: number,
  y: number
): void {
  if (Math.random() > POWER_UP_DROP_CHANCE) {
    return;
  }

  const type = Phaser.Utils.Array.GetRandom(POWER_UP_TYPES);
  const powerUp =
    (group.getFirstDead(false) as PowerUp | null) ??
    (group.get(x, y) as PowerUp | null);

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
      player.shields += 1;
      break;
    case 'rapidfire':
      player.fireRate = Math.max(40, player.fireRate - 20);
      break;
  }

  effectsManager.createSparkBurst(player.x, player.y);
  effectsManager.createPowerUpBurst(player.x, player.y, POWER_UP_TINTS[type]);

  const text = scene.add.text(player.x, player.y - 40, POWER_UP_LABELS[type], {
    fontSize: '14px',
    color: POWER_UP_COLORS[type],
    fontFamily: 'monospace',
    fontStyle: 'bold',
  }).setOrigin(0.5).setDepth(50);

  scene.tweens.add({
    targets: text,
    y: player.y - 70,
    alpha: { from: 1, to: 0 },
    duration: 600,
    ease: 'Power2',
    onComplete: () => text.destroy(),
  });
}
