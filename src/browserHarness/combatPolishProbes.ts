import Phaser from 'phaser';
import { Player } from '@/entities/Player';
import { EnemyBullet } from '@/entities/EnemyBullet';
import { BomberBomb } from '@/entities/BomberBomb';
import { Mine } from '@/entities/Mine';
import { Asteroid } from '@/entities/Asteroid';
import { HazardBeam } from '@/entities/HazardBeam';
import { EnemyBase } from '@/entities/enemies/EnemyBase';
import { Boss } from '@/entities/enemies/Boss';
import { EnemyPool } from '@/systems/EnemyPool';
import { CollisionManager } from '@/systems/CollisionManager';
import { HazardBeamSystem } from '@/systems/HazardBeamSystem';
import { GameplayClock } from '@/systems/GameplayClock';
import { LevelManager } from '@/systems/LevelManager';
import { GameSceneFlowController } from '@/scenes/gameScene/GameSceneFlowController';
import { getPlayerState, getRunSummary, saveRemainingLives, setPlayerState } from '@/systems/PlayerState';
import { GAME_SCENE_EVENTS } from '@/systems/GameSceneEvents';
import type { DamageSource, PlayerFatalResult, PlayerHitResult } from '@/systems/PlayerDamage';
import { getLevelConfig } from '@/config/LevelsConfig';
import { getViewportBounds } from '@/utils/layout';
import { startPreparedRun } from '@/scenes/shared/startRun';

function requireCombat(game: Phaser.Game) {
  const scene = game.scene.getScenes(true).find((candidate) => candidate.sys.settings.key === 'Game');
  if (
    !scene ||
    !('player' in scene) ||
    !(scene.player instanceof Player) ||
    !('enemyPool' in scene) ||
    !(scene.enemyPool instanceof EnemyPool) ||
    !('collisionManager' in scene) ||
    !(scene.collisionManager instanceof CollisionManager) ||
    !('flow' in scene) ||
    !(scene.flow instanceof GameSceneFlowController) ||
    !('levelManager' in scene) ||
    !(scene.levelManager instanceof LevelManager)
  ) {
    throw new Error('Combat polish evidence requires initialized gameplay');
  }
  const owner: object = scene.collisionManager;
  if (
    !('asteroidGroup' in owner) ||
    !(owner.asteroidGroup instanceof Phaser.Physics.Arcade.Group) ||
    !('hazardBeamSystem' in owner) ||
    !(owner.hazardBeamSystem instanceof HazardBeamSystem)
  ) {
    throw new Error('Combat polish evidence requires registered hazard groups');
  }
  return {
    scene,
    player: scene.player,
    enemies: scene.enemyPool,
    collisions: scene.collisionManager,
    flow: scene.flow,
    level: scene.levelManager,
    asteroids: owner.asteroidGroup,
    beams: owner.hazardBeamSystem,
  };
}

type Combat = ReturnType<typeof requireCombat>;

function clearField(combat: Combat): void {
  combat.collisions.clearPlayerHazards();
  for (const enemy of combat.enemies.getAllEnemies()) if (enemy instanceof EnemyBase && enemy.active) enemy.despawn();
}

function spawnCollision(combat: Combat, source: Exclude<DamageSource, 'unknown'>): void {
  const { player, enemies, asteroids, beams } = combat;
  const { x, y } = player;
  switch (source) {
    case 'enemy-bullet': {
      const value: unknown = enemies.getEnemyBulletGroup().get(x, y);
      if (!(value instanceof EnemyBullet)) throw new Error('Enemy bullet pool exhausted');
      value.fire(x, y);
      break;
    }
    case 'bomb': {
      const value: unknown = enemies.getBombGroup().get(x, y);
      if (!(value instanceof BomberBomb)) throw new Error('Bomb pool exhausted');
      value.drop(x, y);
      break;
    }
    case 'mine': {
      const value: unknown = enemies.getMineGroup().get(x, y);
      if (!(value instanceof Mine)) throw new Error('Mine pool exhausted');
      value.launch(x, y);
      break;
    }
    case 'beam': {
      const value: unknown = beams.getGroup().get(x, y);
      if (!(value instanceof HazardBeam)) throw new Error('Beam pool exhausted');
      value.launch({ x, y, width: 50, height: 80, tint: 0xff6a8d, telegraphMs: 40, activeMs: 500 });
      break;
    }
    case 'enemy-contact': {
      if (!enemies.spawnScout(x, y)) throw new Error('Scout pool exhausted');
      break;
    }
    case 'asteroid': {
      const value: unknown = asteroids.get(x, y);
      if (!(value instanceof Asteroid)) throw new Error('Asteroid pool exhausted');
      value.spawn(x, y, 0, { collisionDamage: 1, scoreValue: 0, scaleRange: { min: 1, max: 1 } });
      break;
    }
  }
}

function shieldRingCount(scene: Phaser.Scene): number {
  return scene.children.list.filter(
    (child) =>
      child instanceof Phaser.GameObjects.Image &&
      child.texture.key === 'particle-ring' &&
      child.tintTopLeft === 0x44aaff
  ).length;
}

function stageCollision(
  game: Phaser.Game,
  source: Exclude<DamageSource, 'unknown'>,
  mode: 'shield' | 'hull' | 'fatal'
) {
  const combat = requireCombat(game);
  if (combat.scene.physics.world.isPaused) throw new Error('Resume gameplay before staging a collision');
  clearField(combat);
  combat.flow.reset(1);
  combat.collisions.setRespawnInProgress(false);
  combat.collisions.setTerminalTransitionActive(false);
  saveRemainingLives(combat.scene.registry, 1);
  const viewport = getViewportBounds(combat.scene);
  combat.player.spawn(viewport.centerX, viewport.top + viewport.height * 0.7, {
    hp: mode === 'fatal' ? 0.25 : combat.player.maxHp,
  });
  combat.player.shields = mode === 'shield' ? 1 : 0;
  const beforeHp = combat.player.hp;
  return new Promise<{
    result: PlayerHitResult | PlayerFatalResult;
    beforeHp: number;
    afterHp: number;
    shields: number;
    playerTint: number;
    blueShieldRings: number;
  }>((resolve, reject) => {
    const finish = (result: PlayerHitResult | PlayerFatalResult): void => {
      cleanup();
      resolve({
        result,
        beforeHp,
        afterHp: combat.player.hp,
        shields: combat.player.shields,
        playerTint: combat.player.tintTopLeft,
        blueShieldRings: shieldRingCount(combat.scene),
      });
    };
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error(`No registered collision resolved for ${source}`));
    }, 5000);
    const cleanup = (): void => {
      clearTimeout(timeout);
      combat.scene.events.off(GAME_SCENE_EVENTS.playerHit, finish);
      combat.scene.events.off(GAME_SCENE_EVENTS.playerDeath, finish);
    };
    combat.scene.events.on(GAME_SCENE_EVENTS.playerHit, finish);
    combat.scene.events.on(GAME_SCENE_EVENTS.playerDeath, finish);
    try {
      spawnCollision(combat, source);
    } catch (error) {
      cleanup();
      reject(error);
    }
  });
}

function combatPolishState(game: Phaser.Game) {
  const scene = game.scene.getScenes(true).find((candidate) => candidate.sys.settings.key === 'Game');
  const player = scene?.children.list.find((child): child is Player => child instanceof Player);
  const beams =
    scene?.children.list.filter((child): child is HazardBeam => child instanceof HazardBeam && child.active) ?? [];
  const bosses = scene?.children.list.filter((child): child is Boss => child instanceof Boss && child.active) ?? [];
  return {
    summary: getRunSummary(game.registry),
    level:
      scene && 'levelManager' in scene && scene.levelManager instanceof LevelManager
        ? scene.levelManager.currentLevel
        : null,
    player: player ? { hp: player.hp, shields: player.shields, alive: player.isAlive, x: player.x, y: player.y } : null,
    paused: scene?.physics.world.isPaused ?? false,
    gameplayMs:
      scene && 'gameplayClock' in scene && scene.gameplayClock instanceof GameplayClock
        ? scene.gameplayClock.now
        : null,
    beams: beams.map((beam) => ({
      x: beam.x,
      y: beam.y,
      width: beam.displayWidth,
      height: beam.displayHeight,
      damaging: beam.isDamageActive(),
    })),
    bosses: bosses.map((boss) => ({ hp: boss.hp, maxHp: boss.maxHp, x: boss.x, y: boss.y })),
  };
}

export function createCombatPolishProbes(game: Phaser.Game) {
  return {
    stageCollision: (source: Exclude<DamageSource, 'unknown'>, mode: 'shield' | 'hull' | 'fatal') =>
      stageCollision(game, source, mode),
    combatPolishState: () => combatPolishState(game),
    stageBeamPattern: (pattern: 'flare' | 'lattice') => {
      const combat = requireCombat(game);
      clearField(combat);
      const viewport = getViewportBounds(combat.scene);
      if (pattern === 'flare') combat.beams.spawnSolarFlare(0.8);
      else combat.beams.spawnLaserLattice(0.8);
      const vertical = combat.beams
        .getGroup()
        .getChildren()
        .filter(
          (child): child is HazardBeam =>
            child instanceof HazardBeam && child.active && child.displayHeight > child.displayWidth
        );
      const [left, right] = vertical;
      const gapX = pattern === 'lattice' && left && right ? (left.x + right.x) / 2 : viewport.centerX;
      combat.player.spawn(gapX, viewport.bottom - 40, { hp: combat.player.maxHp });
      combat.player.shields = 0;
      return { pattern, route: 'staged in authored escape region', hp: combat.player.hp };
    },
    stageLevel: (level: number) => {
      const config = getLevelConfig(level);
      const scene = game.scene.getScenes(true)[0];
      if (!scene) throw new Error('No scene available for direct level staging');
      setPlayerState(scene.registry, { ...getPlayerState(scene.registry), level, currentHp: 5, remainingLives: 3 });
      startPreparedRun(scene);
      return { level, name: config.name, hasBoss: config.hasBoss, mode: 'direct level staging' };
    },
    stageBossThreshold: () => {
      const combat = requireCombat(game);
      const config = combat.level.getLevelConfig();
      if (!config.hasBoss) return { hasBoss: false };
      clearField(combat);
      combat.level.distance = config.levelDistance * config.bossTriggerProgress;
      combat.level.progress = config.bossTriggerProgress;
      return { hasBoss: true };
    },
  };
}
