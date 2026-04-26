import Phaser from 'phaser';
import { Scout } from '../entities/enemies/Scout';
import { Fighter } from '../entities/enemies/Fighter';
import { Bomber } from '../entities/enemies/Bomber';
import { Swarm } from '../entities/enemies/Swarm';
import { Gunship } from '../entities/enemies/Gunship';
import { Boss } from '../entities/enemies/Boss';
import { EnemyBullet } from '../entities/EnemyBullet';
import { BomberBomb } from '../entities/BomberBomb';
import type { BossConfig, EnemyType } from '../config/LevelsConfig';

type EnemyPoolGroupKey = EnemyType | 'boss';
type PoolGroupKey = EnemyPoolGroupKey | 'bomb' | 'enemyBullet';
type EnemyPlayerCollisionBehavior = 'kamikaze' | 'impact' | 'none';

type GroupClass = abstract new (...args: never[]) => unknown;

type GroupDescriptor = {
  maxSize: number;
  classType: GroupClass;
  runChildUpdate: boolean;
};
interface EnemyGroupRegistration {
  key: EnemyPoolGroupKey;
  group: Phaser.Physics.Arcade.Group;
  playerCollisionBehavior: EnemyPlayerCollisionBehavior;
}

export class EnemyPool {
  private scene!: Phaser.Scene;
  private groups: Partial<Record<PoolGroupKey, Phaser.Physics.Arcade.Group>> = {};

  private readonly groupDescriptors: Record<PoolGroupKey, GroupDescriptor> = {
    scout: {
      maxSize: 50,
      classType: Scout,
      runChildUpdate: true,
    },
    fighter: {
      maxSize: 30,
      classType: Fighter,
      runChildUpdate: true,
    },
    bomber: {
      maxSize: 20,
      classType: Bomber,
      runChildUpdate: true,
    },
    swarm: {
      maxSize: 40,
      classType: Swarm,
      runChildUpdate: true,
    },
    gunship: {
      maxSize: 15,
      classType: Gunship,
      runChildUpdate: true,
    },
    boss: {
      maxSize: 1,
      classType: Boss,
      runChildUpdate: true,
    },
    bomb: {
      maxSize: 30,
      classType: BomberBomb,
      runChildUpdate: true,
    },
    enemyBullet: {
      maxSize: 80,
      classType: EnemyBullet,
      runChildUpdate: true,
    },
  };

  private acquireFromGroup<T>(group: Phaser.Physics.Arcade.Group, x: number, y: number): T | null {
    const existing = group.getFirstDead(false) as T | null;
    if (existing) {
      return existing;
    }

    return group.get(x, y) as T | null;
  }

  create(scene: Phaser.Scene): void {
    this.scene = scene;
    this.groups = {};

    this.ensureGroup('scout');
    this.ensureGroup('fighter');
    this.ensureGroup('enemyBullet');
  }

  private ensureGroup(key: PoolGroupKey): Phaser.Physics.Arcade.Group {
    const existing = this.groups[key];
    if (existing) {
      return existing;
    }

    const descriptor = this.groupDescriptors[key];
    const group = this.scene.physics.add.group({
      maxSize: descriptor.maxSize,
      classType: descriptor.classType,
      runChildUpdate: descriptor.runChildUpdate,
    });

    this.groups[key] = group;
    return group;
  }

  private ensureBomberSupport(): void {
    this.ensureGroup('bomber');
    this.ensureGroup('bomb');
  }

  spawnScout(x: number, y: number): Scout | null {
    const scout = this.acquireFromGroup<Scout>(this.ensureGroup('scout'), x, y);
    if (scout) {
      scout.spawn(x, y);
    }
    return scout;
  }

  spawnFighter(x: number, y: number): Fighter | null {
    const fighterGroup = this.ensureGroup('fighter');
    const enemyBulletGroup = this.ensureGroup('enemyBullet');
    const fighter = this.acquireFromGroup<Fighter>(fighterGroup, x, y);
    if (fighter) {
      fighter.spawn(x, y);
      fighter.setEnemyBulletGroup(enemyBulletGroup);
    }
    return fighter;
  }

  spawnBomber(x: number, y: number): Bomber | null {
    this.ensureBomberSupport();

    const bomberGroup = this.ensureGroup('bomber');
    const bombGroup = this.ensureGroup('bomb');
    const bomber = this.acquireFromGroup<Bomber>(bomberGroup, x, y);
    if (bomber) {
      bomber.spawn(x, y);
      bomber.setBombGroup(bombGroup);
    }
    return bomber;
  }

  spawnSwarm(x: number, y: number): Swarm | null {
    const swarmGroup = this.ensureGroup('swarm');
    const swarm = this.acquireFromGroup<Swarm>(swarmGroup, x, y);
    if (swarm) {
      swarm.spawn(x, y);
    }
    return swarm;
  }

  spawnGunship(x: number, y: number): Gunship | null {
    const gunshipGroup = this.ensureGroup('gunship');
    const enemyBulletGroup = this.ensureGroup('enemyBullet');
    const gunship = this.acquireFromGroup<Gunship>(gunshipGroup, x, y);
    if (gunship) {
      gunship.spawn(x, y);
      gunship.setEnemyBulletGroup(enemyBulletGroup);
    }
    return gunship;
  }

  spawnEnemy(type: EnemyType, x: number, y: number): Phaser.Physics.Arcade.Sprite | null {
    switch (type) {
      case 'scout':
        return this.spawnScout(x, y);
      case 'fighter':
        return this.spawnFighter(x, y);
      case 'bomber':
        return this.spawnBomber(x, y);
      case 'swarm':
        return this.spawnSwarm(x, y);
      case 'gunship':
        return this.spawnGunship(x, y);
    }
  }

  spawnBoss(x: number, y: number, config?: BossConfig): Boss | null {
    const bossGroup = this.ensureGroup('boss');
    const activeBoss = bossGroup.getChildren().find(c => c.active) as Boss | undefined;
    if (activeBoss) return null;

    const boss = this.acquireFromGroup<Boss>(bossGroup, x, y);
    if (boss) {
      boss.spawn(x, y, config);
      boss.setEnemyBulletGroup(this.ensureGroup('enemyBullet'));
      boss.setSummonHandler((type, spawnX, spawnY) => {
        this.spawnEnemy(type, spawnX, spawnY);
      });
    }
    return boss;
  }

  fireEnemyBullet(x: number, y: number): EnemyBullet | null {
    const bullet = this.acquireFromGroup<EnemyBullet>(this.ensureGroup('enemyBullet'), x, y);
    if (bullet) {
      bullet.fire(x, y);
    }
    return bullet;
  }

  getScoutGroup(): Phaser.Physics.Arcade.Group {
    return this.ensureGroup('scout');
  }

  getFighterGroup(): Phaser.Physics.Arcade.Group {
    return this.ensureGroup('fighter');
  }

  getBomberGroup(): Phaser.Physics.Arcade.Group {
    this.ensureBomberSupport();
    return this.ensureGroup('bomber');
  }

  getSwarmGroup(): Phaser.Physics.Arcade.Group {
    return this.ensureGroup('swarm');
  }

  getGunshipGroup(): Phaser.Physics.Arcade.Group {
    return this.ensureGroup('gunship');
  }

  getBossGroup(): Phaser.Physics.Arcade.Group {
    return this.ensureGroup('boss');
  }

  getBombGroup(): Phaser.Physics.Arcade.Group {
    return this.ensureGroup('bomb');
  }

  getEnemyBulletGroup(): Phaser.Physics.Arcade.Group {
    return this.ensureGroup('enemyBullet');
  }

  getEnemyGroupRegistry(): EnemyGroupRegistration[] {
    return [
      {
        key: 'scout',
        group: this.getScoutGroup(),
        playerCollisionBehavior: 'kamikaze',
      },
      {
        key: 'fighter',
        group: this.getFighterGroup(),
        playerCollisionBehavior: 'impact',
      },
      {
        key: 'bomber',
        group: this.getBomberGroup(),
        playerCollisionBehavior: 'impact',
      },
      {
        key: 'swarm',
        group: this.getSwarmGroup(),
        playerCollisionBehavior: 'kamikaze',
      },
      {
        key: 'gunship',
        group: this.getGunshipGroup(),
        playerCollisionBehavior: 'impact',
      },
      {
        key: 'boss',
        group: this.getBossGroup(),
        playerCollisionBehavior: 'none',
      },
    ];
  }

  getAllEnemies(): Phaser.Physics.Arcade.Sprite[] {
    const enemies: Phaser.Physics.Arcade.Sprite[] = [];

    this.ensureGroup('scout').getChildren().forEach(c => enemies.push(c as Phaser.Physics.Arcade.Sprite));
    this.ensureGroup('fighter').getChildren().forEach(c => enemies.push(c as Phaser.Physics.Arcade.Sprite));

    const optionalGroups: PoolGroupKey[] = ['bomber', 'swarm', 'gunship'];
    optionalGroups.forEach((key) => {
      const group = this.groups[key];
      group?.getChildren().forEach(c => enemies.push(c as Phaser.Physics.Arcade.Sprite));
    });

    return enemies;
  }
}
