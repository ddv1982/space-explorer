import Phaser from 'phaser';
import { Scout } from '../entities/enemies/Scout';
import { Fighter } from '../entities/enemies/Fighter';
import { Bomber } from '../entities/enemies/Bomber';
import { Swarm } from '../entities/enemies/Swarm';
import { Gunship } from '../entities/enemies/Gunship';
import { Diver } from '../entities/enemies/Diver';
import { Dodger } from '../entities/enemies/Dodger';
import { Sower } from '../entities/enemies/Sower';
import { Lancer } from '../entities/enemies/Lancer';
import { Splitter } from '../entities/enemies/Splitter';
import { Swarmling } from '../entities/enemies/Swarmling';
import { EnemyBase } from '../entities/enemies/EnemyBase';
import { Boss } from '../entities/enemies/Boss';
import { EnemyBullet } from '../entities/EnemyBullet';
import { BomberBomb } from '../entities/BomberBomb';
import { Mine } from '../entities/Mine';
import type { BossConfig, EnemyType } from '../config/LevelsConfig';

type EnemyPoolGroupKey = EnemyType | 'boss';
type PoolGroupKey = EnemyPoolGroupKey | 'bomb' | 'mine' | 'enemyBullet';
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
  private targetProvider: (() => { x: number; y: number } | null) | null = null;

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
    diver: {
      maxSize: 24,
      classType: Diver,
      runChildUpdate: true,
    },
    dodger: {
      maxSize: 16,
      classType: Dodger,
      runChildUpdate: true,
    },
    sower: {
      maxSize: 10,
      classType: Sower,
      runChildUpdate: true,
    },
    lancer: {
      maxSize: 8,
      classType: Lancer,
      runChildUpdate: true,
    },
    splitter: {
      maxSize: 16,
      classType: Splitter,
      runChildUpdate: true,
    },
    swarmling: {
      maxSize: 32,
      classType: Swarmling,
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
    mine: {
      maxSize: 24,
      classType: Mine,
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

  private spawnArmedEnemy<
    T extends { spawn(x: number, y: number): void; setEnemyBulletGroup(group: Phaser.Physics.Arcade.Group): void },
  >(key: PoolGroupKey, x: number, y: number): T | null {
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

  spawnDiver(x: number, y: number): Diver | null {
    return this.spawnFromGroup<Diver>('diver', x, y);
  }

  spawnDodger(x: number, y: number): Dodger | null {
    return this.spawnArmedEnemy<Dodger>('dodger', x, y);
  }

  spawnSower(x: number, y: number): Sower | null {
    const sower = this.spawnFromGroup<Sower>('sower', x, y);
    if (sower) {
      sower.setMineGroup(this.ensureGroup('mine'));
    }
    return sower;
  }

  spawnLancer(x: number, y: number): Lancer | null {
    const lancer = this.spawnArmedEnemy<Lancer>('lancer', x, y);
    if (lancer && this.targetProvider) {
      lancer.setTargetProvider(this.targetProvider);
    }
    return lancer;
  }

  spawnSplitter(x: number, y: number): Splitter | null {
    const splitter = this.spawnFromGroup<Splitter>('splitter', x, y);
    if (splitter) {
      splitter.setSplitHandler((splitX, splitY) => {
        this.spawnSwarmling(splitX - 14, splitY);
        this.spawnSwarmling(splitX + 14, splitY);
      });
    }
    return splitter;
  }

  spawnSwarmling(x: number, y: number): Swarmling | null {
    return this.spawnFromGroup<Swarmling>('swarmling', x, y);
  }

  setTargetProvider(provider: () => { x: number; y: number } | null): void {
    this.targetProvider = provider;
  }

  spawnEnemy(type: EnemyType, x: number, y: number): EnemyBase | null {
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
      case 'diver':
        return this.spawnDiver(x, y);
      case 'dodger':
        return this.spawnDodger(x, y);
      case 'sower':
        return this.spawnSower(x, y);
      case 'lancer':
        return this.spawnLancer(x, y);
      case 'splitter':
        return this.spawnSplitter(x, y);
      case 'swarmling':
        return this.spawnSwarmling(x, y);
    }
  }

  spawnBoss(x: number, y: number, config?: BossConfig): Boss | null {
    const bossGroup = this.ensureGroup('boss');
    const activeBoss = this.getGroupChildrenSafely(bossGroup).find((c) => c.active) as Boss | undefined;
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

  getMineGroup(): Phaser.Physics.Arcade.Group {
    return this.ensureGroup('mine');
  }

  getDiverGroup(): Phaser.Physics.Arcade.Group {
    return this.ensureGroup('diver');
  }

  getDodgerGroup(): Phaser.Physics.Arcade.Group {
    return this.ensureGroup('dodger');
  }

  getSowerGroup(): Phaser.Physics.Arcade.Group {
    return this.ensureGroup('sower');
  }

  getLancerGroup(): Phaser.Physics.Arcade.Group {
    return this.ensureGroup('lancer');
  }

  getSplitterGroup(): Phaser.Physics.Arcade.Group {
    return this.ensureGroup('splitter');
  }

  getSwarmlingGroup(): Phaser.Physics.Arcade.Group {
    return this.ensureGroup('swarmling');
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
      this.createEnemyGroupRegistration('diver', this.getDiverGroup(), 'kamikaze'),
      this.createEnemyGroupRegistration('dodger', this.getDodgerGroup(), 'impact'),
      this.createEnemyGroupRegistration('sower', this.getSowerGroup(), 'impact'),
      this.createEnemyGroupRegistration('lancer', this.getLancerGroup(), 'impact'),
      this.createEnemyGroupRegistration('splitter', this.getSplitterGroup(), 'impact'),
      this.createEnemyGroupRegistration('swarmling', this.getSwarmlingGroup(), 'kamikaze'),
      this.createEnemyGroupRegistration('boss', this.getBossGroup(), 'none'),
    ];
  }

  private appendGroupChildren(enemies: Phaser.Physics.Arcade.Sprite[], key: PoolGroupKey, ensure = false): void {
    const group = ensure ? this.ensureGroup(key) : this.groups[key];
    this.getGroupChildrenSafely(group).forEach((c) => enemies.push(c as Phaser.Physics.Arcade.Sprite));
  }

  private getGroupChildrenSafely(group: Phaser.Physics.Arcade.Group | undefined): Phaser.GameObjects.GameObject[] {
    if (!group) {
      return [];
    }

    try {
      return group.getChildren();
    } catch (_error) {
      // Phaser group internals can already be disposed during scene transitions.
      return [];
    }
  }

  getAllEnemies(): Phaser.Physics.Arcade.Sprite[] {
    const enemies: Phaser.Physics.Arcade.Sprite[] = [];

    this.appendGroupChildren(enemies, 'scout', true);
    this.appendGroupChildren(enemies, 'fighter', true);

    const optionalGroups: PoolGroupKey[] = [
      'bomber',
      'swarm',
      'gunship',
      'diver',
      'dodger',
      'sower',
      'lancer',
      'splitter',
      'swarmling',
    ];
    optionalGroups.forEach((key) => {
      this.appendGroupChildren(enemies, key);
    });

    return enemies;
  }
}
