import Phaser from 'phaser';

import type { Player } from '@/entities/Player';
import { PowerUp, resolvePowerUpOverlap } from '@/entities/PowerUp';
import type { PowerUpType } from '@/entities/PowerUp';
import { BulletPool } from '@/systems/BulletPool';
import { CollisionManager } from '@/systems/CollisionManager';
import type { EffectsManager } from '@/systems/EffectsManager';
import { EnemyPool } from '@/systems/EnemyPool';
import { LastLifeHelperWing } from '@/systems/LastLifeHelperWing';
import type { LevelManager } from '@/systems/LevelManager';
import { getHelperWingState } from '@/systems/PlayerState';
import type { getPlayerState } from '@/systems/PlayerState';
import { ScoreManager } from '@/systems/ScoreManager';
import { WaveManager } from '@/systems/WaveManager';

type GameSceneLevelConfig = ReturnType<LevelManager['getLevelConfig']>;
type GameScenePlayerState = ReturnType<typeof getPlayerState>;

type PoolsAndGameplaySystems = {
  bulletPool: BulletPool;
  enemyPool: EnemyPool;
  lastLifeHelperWing: LastLifeHelperWing;
  waveManager: WaveManager;
  collisionManager: CollisionManager;
  scoreManager: ScoreManager;
  powerUpGroup: Phaser.Physics.Arcade.Group;
};

type CreatePoolsAndGameplaySystemsParams = {
  scene: Phaser.Scene;
  player: Player;
  effectsManager: EffectsManager;
  levelConfig: GameSceneLevelConfig;
  state: GameScenePlayerState;
  isTerminalTransitionActive: () => boolean;
  applyPowerUp: (type: PowerUpType) => void;
  createBulletPool?: () => BulletPool;
  createEnemyPool?: () => EnemyPool;
  createLastLifeHelperWing?: () => LastLifeHelperWing;
  createWaveManager?: () => WaveManager;
  createCollisionManager?: () => CollisionManager;
  createScoreManager?: () => ScoreManager;
};

type CollisionSetupParams = {
  scene: Phaser.Scene;
  player: Player;
  effectsManager: EffectsManager;
  bulletPool: BulletPool;
  enemyPool: EnemyPool;
  asteroidGroup: Phaser.Physics.Arcade.Group;
  createCollisionManager: () => CollisionManager;
};

type PowerUpGroupParams = Pick<CreatePoolsAndGameplaySystemsParams, 'scene' | 'player' | 'applyPowerUp' | 'isTerminalTransitionActive'>;

type HelperWingSetupParams = Pick<
  CreatePoolsAndGameplaySystemsParams,
  'scene' | 'player' | 'effectsManager' | 'levelConfig'
> & {
  bulletPool: BulletPool;
  enemyPool: EnemyPool;
  createLastLifeHelperWing: () => LastLifeHelperWing;
};

function createHelperWing({
  scene,
  player,
  effectsManager,
  levelConfig,
  bulletPool,
  enemyPool,
  createLastLifeHelperWing,
}: HelperWingSetupParams): LastLifeHelperWing {
  const lastLifeHelperWing = createLastLifeHelperWing();
  lastLifeHelperWing.create({
    scene,
    player,
    bulletPool,
    enemyPool,
    effectsManager,
    config: levelConfig.lastLifeHelperWing,
    persistentState: getHelperWingState(scene.registry),
  });

  return lastLifeHelperWing;
}

function createCollisionSystem({
  scene,
  player,
  effectsManager,
  bulletPool,
  enemyPool,
  asteroidGroup,
  createCollisionManager,
}: CollisionSetupParams): CollisionManager {
  const collisionManager = createCollisionManager();
  collisionManager.setup(scene, player, bulletPool, enemyPool, asteroidGroup);
  collisionManager.setEffectsManager(effectsManager);
  collisionManager.setBulletDamage(player.damage);

  return collisionManager;
}

function createPowerUpGroup({
  scene,
  player,
  applyPowerUp,
  isTerminalTransitionActive,
}: PowerUpGroupParams): Phaser.Physics.Arcade.Group {
  const powerUpGroup = scene.physics.add.group({
    maxSize: 20,
    classType: PowerUp,
    runChildUpdate: true,
  });

  scene.physics.add.overlap(
    powerUpGroup,
    player,
    (_obj1, _obj2) => {
      const powerUp = resolvePowerUpOverlap(_obj1, _obj2);
      if (!powerUp || !powerUp.active || !player.isAlive || isTerminalTransitionActive()) {
        return;
      }

      applyPowerUp(powerUp.powerUpType);
      powerUp.kill();
    }
  );

  return powerUpGroup;
}

export function createPoolsAndGameplaySystems(
  params: CreatePoolsAndGameplaySystemsParams
): PoolsAndGameplaySystems {
  const {
    scene,
    player,
    effectsManager,
    levelConfig,
    state,
    isTerminalTransitionActive,
    applyPowerUp,
    createBulletPool = () => new BulletPool(),
    createEnemyPool = () => new EnemyPool(),
    createLastLifeHelperWing = () => new LastLifeHelperWing(),
    createWaveManager = () => new WaveManager(),
    createCollisionManager = () => new CollisionManager(),
    createScoreManager = () => new ScoreManager(),
  } = params;

  const bulletPool = createBulletPool();
  bulletPool.create(scene);

  const enemyPool = createEnemyPool();
  enemyPool.create(scene);

  const lastLifeHelperWing = createHelperWing({
    scene,
    player,
    effectsManager,
    levelConfig,
    bulletPool,
    enemyPool,
    createLastLifeHelperWing,
  });

  const waveManager = createWaveManager();
  const asteroidGroup = waveManager.create(scene, enemyPool);
  waveManager.setLevelConfig(state.level);

  const collisionManager = createCollisionSystem({
    scene,
    player,
    effectsManager,
    bulletPool,
    enemyPool,
    asteroidGroup,
    createCollisionManager,
  });

  const scoreManager = createScoreManager();
  scoreManager.addScore(state.score);

  const powerUpGroup = createPowerUpGroup({
    scene,
    player,
    applyPowerUp,
    isTerminalTransitionActive,
  });

  return {
    bulletPool,
    enemyPool,
    lastLifeHelperWing,
    waveManager,
    collisionManager,
    scoreManager,
    powerUpGroup,
  };
}
