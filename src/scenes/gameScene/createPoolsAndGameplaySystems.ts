import Phaser from 'phaser';
import { PowerUp, PowerUpType, resolvePowerUpOverlap } from '../../entities/PowerUp';
import { Player } from '../../entities/Player';
import { BulletPool } from '../../systems/BulletPool';
import { EnemyPool } from '../../systems/EnemyPool';
import { LastLifeHelperWing } from '../../systems/LastLifeHelperWing';
import { WaveManager } from '../../systems/WaveManager';
import { CollisionManager } from '../../systems/CollisionManager';
import { ScoreManager } from '../../systems/ScoreManager';
import { type LevelManager } from '../../systems/LevelManager';
import { getHelperWingState, type getPlayerState } from '../../systems/PlayerState';
import { type EffectsManager } from '../../systems/EffectsManager';

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

export function createPoolsAndGameplaySystems(params: {
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
}): PoolsAndGameplaySystems {
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

  const waveManager = createWaveManager();
  const asteroidGroup = waveManager.create(scene, enemyPool);
  waveManager.setLevelConfig(state.level);

  const collisionManager = createCollisionManager();
  collisionManager.setup(scene, player, bulletPool, enemyPool, asteroidGroup);
  collisionManager.setEffectsManager(effectsManager);
  collisionManager.setBulletDamage(player.damage);

  const scoreManager = createScoreManager();
  scoreManager.addScore(state.score);

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
