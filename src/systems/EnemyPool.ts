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
import { Rival } from '../entities/enemies/Rival';
import { Courier } from '../entities/enemies/Courier';
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
};
interface EnemyDescriptor extends GroupDescriptor {
  playerCollisionBehavior: EnemyPlayerCollisionBehavior;
  armed?: true;
}

const ENEMY_DESCRIPTORS = {
  scout: { maxSize: 50, classType: Scout, playerCollisionBehavior: 'kamikaze' },
  fighter: { maxSize: 30, classType: Fighter, playerCollisionBehavior: 'impact', armed: true },
  bomber: { maxSize: 20, classType: Bomber, playerCollisionBehavior: 'impact' },
  swarm: { maxSize: 40, classType: Swarm, playerCollisionBehavior: 'kamikaze' },
  gunship: { maxSize: 15, classType: Gunship, playerCollisionBehavior: 'impact', armed: true },
  diver: { maxSize: 24, classType: Diver, playerCollisionBehavior: 'kamikaze' },
  dodger: { maxSize: 16, classType: Dodger, playerCollisionBehavior: 'impact', armed: true },
  sower: { maxSize: 10, classType: Sower, playerCollisionBehavior: 'impact' },
  lancer: { maxSize: 8, classType: Lancer, playerCollisionBehavior: 'impact' },
  splitter: { maxSize: 16, classType: Splitter, playerCollisionBehavior: 'impact' },
  swarmling: { maxSize: 32, classType: Swarmling, playerCollisionBehavior: 'kamikaze' },
  rival: { maxSize: 3, classType: Rival, playerCollisionBehavior: 'impact' },
  courier: { maxSize: 6, classType: Courier, playerCollisionBehavior: 'impact' },
} satisfies Record<EnemyType, EnemyDescriptor>;
const ENEMY_TYPES = Object.keys(ENEMY_DESCRIPTORS) as EnemyType[];
const GROUP_DESCRIPTORS: Record<PoolGroupKey, GroupDescriptor> = {
  ...ENEMY_DESCRIPTORS,
  boss: { maxSize: 1, classType: Boss },
  bomb: { maxSize: 30, classType: BomberBomb },
  mine: { maxSize: 24, classType: Mine },
  enemyBullet: { maxSize: 80, classType: EnemyBullet },
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
  private playerDamage = 1;
  private seekGroups: Phaser.Physics.Arcade.Group[] | null = null;

  private acquireFromGroup<T>(group: Phaser.Physics.Arcade.Group, x: number, y: number): T | null {
    const existing = group.getFirstDead(false) as T | null;
    if (existing) {
      return existing;
    }

    return group.get(x, y) as T | null;
  }

  create(scene: Phaser.Scene): void {
    this.seekGroups = null;
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

    const descriptor = GROUP_DESCRIPTORS[key];
    const group = this.scene.physics.add.group({
      maxSize: descriptor.maxSize,
      classType: descriptor.classType,
      runChildUpdate: true,
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

  spawnRival(x: number, y: number): Rival | null {
    const rivals = this.ensureGroup('rival');
    const rival = this.acquireFromGroup<Rival>(rivals, x, y);
    if (rival) {
      rival.setEnemyBulletGroup(this.ensureGroup('enemyBullet'));
      if (this.targetProvider) rival.setTargetProvider(this.targetProvider);
      rival.setPlayerDamage(this.playerDamage);
      rival.spawn(x, y);
    }
    return rival;
  }

  /** Rivals still in the fight; a duel holds the sector while any remain. */
  getActiveRivals(): Rival[] {
    return this.getGroupChildrenSafely(this.groups.rival).filter((rival) => rival.active) as Rival[];
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

  setPlayerDamage(damage: number): void {
    this.playerDamage = damage;
  }

  spawnEnemy(type: EnemyType, x: number, y: number): EnemyBase | null {
    switch (type) {
      case 'bomber':
        return this.spawnBomber(x, y);
      case 'sower':
        return this.spawnSower(x, y);
      case 'lancer':
        return this.spawnLancer(x, y);
      case 'splitter':
        return this.spawnSplitter(x, y);
      case 'rival':
        return this.spawnRival(x, y);
      default: {
        const descriptor = ENEMY_DESCRIPTORS[type];
        return 'armed' in descriptor
          ? this.spawnArmedEnemy<Fighter | Gunship | Dodger>(type, x, y)
          : this.spawnFromGroup<EnemyBase>(type, x, y);
      }
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

  /**
   * The nearest live enemy ahead of (above) a point, for seeking shots. Shots do not turn back for
   * ships they have already passed.
   */
  findNearestEnemyAhead(x: number, y: number): { x: number; y: number } | null {
    this.seekGroups ??= this.getEnemyGroupRegistry().map((registration) => registration.group);
    let nearest: { x: number; y: number } | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const group of this.seekGroups) {
      for (const child of group.getChildren()) {
        const enemy = child as Phaser.GameObjects.GameObject & { x: number; y: number };
        if (!enemy.active || enemy.y > y || enemy.y < 0) continue;
        const distance = (enemy.x - x) ** 2 + (enemy.y - y) ** 2;
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearest = enemy;
        }
      }
    }
    return nearest;
  }

  getEnemyGroupRegistry(): EnemyGroupRegistration[] {
    const enemies: EnemyGroupRegistration[] = ENEMY_TYPES.map((key) => ({
      key,
      group: key === 'bomber' ? this.getBomberGroup() : this.ensureGroup(key),
      playerCollisionBehavior: ENEMY_DESCRIPTORS[key].playerCollisionBehavior,
    }));
    enemies.push({ key: 'boss', group: this.getBossGroup(), playerCollisionBehavior: 'none' });
    return enemies;
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

    for (const key of ENEMY_TYPES) {
      this.appendGroupChildren(enemies, key, key === 'scout' || key === 'fighter');
    }

    return enemies;
  }
}
