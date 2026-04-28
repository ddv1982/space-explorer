// Private gameplay-systems phase contract for GameScene create-time orchestration only.
import type Phaser from 'phaser';

import type { PowerUpType } from '@/entities/PowerUp';
import type { BulletPool } from '@/systems/BulletPool';
import type { CollisionManager } from '@/systems/CollisionManager';
import type { EnemyPool } from '@/systems/EnemyPool';
import type { LastLifeHelperWing } from '@/systems/LastLifeHelperWing';
import type { ScoreManager } from '@/systems/ScoreManager';
import type { WaveManager } from '@/systems/WaveManager';

export type GameSceneCreateGameplayBridge = {
  applyPowerUp: (type: PowerUpType) => void;
  flow: {
    isTerminalTransitionActive: () => boolean;
    isGameplayLocked: () => boolean;
  };
  bulletPool: BulletPool;
  enemyPool: EnemyPool;
  lastLifeHelperWing: LastLifeHelperWing | null;
  waveManager: WaveManager;
  collisionManager: CollisionManager;
  scoreManager: ScoreManager;
  powerUpGroup: Phaser.Physics.Arcade.Group;
};
