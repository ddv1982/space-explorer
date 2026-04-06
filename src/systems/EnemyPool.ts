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
type EnemyPlayerCollisionBehavior = 'kamikaze' | 'impact' | 'none';

interface EnemyGroupRegistration {
  key: EnemyPoolGroupKey;
  group: Phaser.Physics.Arcade.Group;
  playerCollisionBehavior: EnemyPlayerCollisionBehavior;
}

export class EnemyPool {
  private scene!: Phaser.Scene;
  private scoutGroup!: Phaser.Physics.Arcade.Group;
  private fighterGroup!: Phaser.Physics.Arcade.Group;
  private bomberGroup: Phaser.Physics.Arcade.Group | null = null;
  private swarmGroup: Phaser.Physics.Arcade.Group | null = null;
  private gunshipGroup: Phaser.Physics.Arcade.Group | null = null;
  private bossGroup: Phaser.Physics.Arcade.Group | null = null;
  private bombGroup: Phaser.Physics.Arcade.Group | null = null;
  private enemyBulletGroup!: Phaser.Physics.Arcade.Group;

  private acquireFromGroup<T>(group: Phaser.Physics.Arcade.Group, x: number, y: number): T | null {
    const existing = group.getFirstDead(false) as T | null;
    if (existing) {
      return existing;
    }

    return group.get(x, y) as T | null;
  }

  create(scene: Phaser.Scene): void {
    this.scene = scene;

    this.scoutGroup = scene.physics.add.group({
      maxSize: 50,
      classType: Scout,
      runChildUpdate: true,
    });

    this.fighterGroup = scene.physics.add.group({
      maxSize: 30,
      classType: Fighter,
      runChildUpdate: true,
    });

    this.enemyBulletGroup = scene.physics.add.group({
      maxSize: 80,
      classType: EnemyBullet,
      runChildUpdate: true,
    });
  }

  private ensureBomberGroup(): void {
    if (!this.bomberGroup) {
      this.bomberGroup = this.scene.physics.add.group({
        maxSize: 20,
        classType: Bomber,
        runChildUpdate: true,
      });
      this.ensureBombGroup();
    }
  }

  private ensureSwarmGroup(): void {
    if (!this.swarmGroup) {
      this.swarmGroup = this.scene.physics.add.group({
        maxSize: 40,
        classType: Swarm,
        runChildUpdate: true,
      });
    }
  }

  private ensureGunshipGroup(): void {
    if (!this.gunshipGroup) {
      this.gunshipGroup = this.scene.physics.add.group({
        maxSize: 15,
        classType: Gunship,
        runChildUpdate: true,
      });
    }
  }

  private ensureBombGroup(): void {
    if (!this.bombGroup) {
      this.bombGroup = this.scene.physics.add.group({
        maxSize: 30,
        classType: BomberBomb,
        runChildUpdate: true,
      });
    }
  }

  spawnScout(x: number, y: number): Scout | null {
    const scout = this.acquireFromGroup<Scout>(this.scoutGroup, x, y);
    if (scout) {
      scout.spawn(x, y);
    }
    return scout;
  }

  spawnFighter(x: number, y: number): Fighter | null {
    const fighter = this.acquireFromGroup<Fighter>(this.fighterGroup, x, y);
    if (fighter) {
      fighter.spawn(x, y);
      fighter.setEnemyBulletGroup(this.enemyBulletGroup);
    }
    return fighter;
  }

  spawnBomber(x: number, y: number): Bomber | null {
    this.ensureBomberGroup();
    const bomber = this.acquireFromGroup<Bomber>(this.bomberGroup!, x, y);
    if (bomber) {
      bomber.spawn(x, y);
      if (this.bombGroup) bomber.setBombGroup(this.bombGroup);
    }
    return bomber;
  }

  spawnSwarm(x: number, y: number): Swarm | null {
    this.ensureSwarmGroup();
    const swarm = this.acquireFromGroup<Swarm>(this.swarmGroup!, x, y);
    if (swarm) {
      swarm.spawn(x, y);
    }
    return swarm;
  }

  spawnGunship(x: number, y: number): Gunship | null {
    this.ensureGunshipGroup();
    const gunship = this.acquireFromGroup<Gunship>(this.gunshipGroup!, x, y);
    if (gunship) {
      gunship.spawn(x, y);
      gunship.setEnemyBulletGroup(this.enemyBulletGroup);
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
    if (!this.bossGroup) {
      this.bossGroup = this.scene.physics.add.group({
        maxSize: 1,
        classType: Boss,
        runChildUpdate: true,
      });
    }
    const activeBoss = this.bossGroup.getChildren().find(c => c.active) as Boss | undefined;
    if (activeBoss) return null;

    const boss = this.acquireFromGroup<Boss>(this.bossGroup, x, y);
    if (boss) {
      boss.spawn(x, y, config);
      boss.setEnemyBulletGroup(this.enemyBulletGroup);
    }
    return boss;
  }

  fireEnemyBullet(x: number, y: number): EnemyBullet | null {
    const bullet = this.acquireFromGroup<EnemyBullet>(this.enemyBulletGroup, x, y);
    if (bullet) {
      bullet.fire(x, y);
    }
    return bullet;
  }

  getScoutGroup(): Phaser.Physics.Arcade.Group {
    return this.scoutGroup;
  }

  getFighterGroup(): Phaser.Physics.Arcade.Group {
    return this.fighterGroup;
  }

  getBomberGroup(): Phaser.Physics.Arcade.Group {
    this.ensureBomberGroup();
    return this.bomberGroup!;
  }

  getSwarmGroup(): Phaser.Physics.Arcade.Group {
    this.ensureSwarmGroup();
    return this.swarmGroup!;
  }

  getGunshipGroup(): Phaser.Physics.Arcade.Group {
    this.ensureGunshipGroup();
    return this.gunshipGroup!;
  }

  getBossGroup(): Phaser.Physics.Arcade.Group {
    if (!this.bossGroup) {
      this.bossGroup = this.scene.physics.add.group({
        maxSize: 1,
        classType: Boss,
        runChildUpdate: true,
      });
    }
    return this.bossGroup;
  }

  getBombGroup(): Phaser.Physics.Arcade.Group {
    this.ensureBombGroup();
    return this.bombGroup!;
  }

  getEnemyBulletGroup(): Phaser.Physics.Arcade.Group {
    return this.enemyBulletGroup;
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
    this.scoutGroup.getChildren().forEach(c => enemies.push(c as Phaser.Physics.Arcade.Sprite));
    this.fighterGroup.getChildren().forEach(c => enemies.push(c as Phaser.Physics.Arcade.Sprite));
    if (this.bomberGroup) this.bomberGroup.getChildren().forEach(c => enemies.push(c as Phaser.Physics.Arcade.Sprite));
    if (this.swarmGroup) this.swarmGroup.getChildren().forEach(c => enemies.push(c as Phaser.Physics.Arcade.Sprite));
    if (this.gunshipGroup) this.gunshipGroup.getChildren().forEach(c => enemies.push(c as Phaser.Physics.Arcade.Sprite));
    return enemies;
  }
}
