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
    this.initializeCoreGroups();
  }

  private initializeCoreGroups(): void {
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

  private spawnFromGroup<T extends { spawn(x: number, y: number): void }>(
    key: PoolGroupKey,
    x: number,
    y: number
  ): T | null {
    const entity = this.acquireFromGroup<T>(this.ensureGroup(key), x, y);
    if (entity) {
      entity.spawn(x, y);
    }
    return entity;
  }

  private spawnArmedEnemy<T extends { spawn(x: number, y: number): void; setEnemyBulletGroup(group: Phaser.Physics.Arcade.Group): void }>(
    key: PoolGroupKey,
    x: number,
    y: number
  ): T | null {
    const enemy = this.spawnFromGroup<T>(key, x, y);
    if (enemy) {
      enemy.setEnemyBulletGroup(this.ensureGroup('enemyBullet'));
    }
    return enemy;
  }

  spawnScout(x: number, y: number): Scout | null {
    return this.spawnFromGroup<Scout>('scout', x, y);
  }

  spawnFighter(x: number, y: number): Fighter | null {
    return this.spawnArmedEnemy<Fighter>('fighter', x, y);
  }

  spawnBomber(x: number, y: number): Bomber | null {
    this.ensureBomberSupport();

    const bomber = this.spawnFromGroup<Bomber>('bomber', x, y);
    if (bomber) {
      bomber.setBombGroup(this.ensureGroup('bomb'));
    }
    return bomber;
  }

  spawnSwarm(x: number, y: number): Swarm | null {
    return this.spawnFromGroup<Swarm>('swarm', x, y);
  }

  spawnGunship(x: number, y: number): Gunship | null {
    return this.spawnArmedEnemy<Gunship>('gunship', x, y);
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
      this.configureBoss(boss);
    }
    return boss;
  }

  private configureBoss(boss: Boss): void {
    boss.setEnemyBulletGroup(this.ensureGroup('enemyBullet'));
    boss.setSummonHandler((type, spawnX, spawnY) => {
      this.spawnEnemy(type, spawnX, spawnY);
    });
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

  private createEnemyGroupRegistration(
    key: EnemyPoolGroupKey,
    group: Phaser.Physics.Arcade.Group,
    playerCollisionBehavior: EnemyPlayerCollisionBehavior
  ): EnemyGroupRegistration {
    return { key, group, playerCollisionBehavior };
  }

  getEnemyGroupRegistry(): EnemyGroupRegistration[] {
    return [
      this.createEnemyGroupRegistration('scout', this.getScoutGroup(), 'kamikaze'),
      this.createEnemyGroupRegistration('fighter', this.getFighterGroup(), 'impact'),
      this.createEnemyGroupRegistration('bomber', this.getBomberGroup(), 'impact'),
      this.createEnemyGroupRegistration('swarm', this.getSwarmGroup(), 'kamikaze'),
      this.createEnemyGroupRegistration('gunship', this.getGunshipGroup(), 'impact'),
      this.createEnemyGroupRegistration('boss', this.getBossGroup(), 'none'),
    ];
  }

  private appendGroupChildren(
    enemies: Phaser.Physics.Arcade.Sprite[],
    key: PoolGroupKey,
    ensure = false
  ): void {
    const group = ensure ? this.ensureGroup(key) : this.groups[key];
    group?.getChildren().forEach(c => enemies.push(c as Phaser.Physics.Arcade.Sprite));
  }

  getAllEnemies(): Phaser.Physics.Arcade.Sprite[] {
    const enemies: Phaser.Physics.Arcade.Sprite[] = [];

    this.appendGroupChildren(enemies, 'scout', true);
    this.appendGroupChildren(enemies, 'fighter', true);

    const optionalGroups: PoolGroupKey[] = ['bomber', 'swarm', 'gunship'];
    optionalGroups.forEach((key) => {
      this.appendGroupChildren(enemies, key);
    });

    return enemies;
  }
}
