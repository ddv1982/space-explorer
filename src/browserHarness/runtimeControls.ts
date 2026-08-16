import Phaser from 'phaser';

type GameplayScene = Phaser.Scene & {
  bulletPool?: { getGroup(): Phaser.Physics.Arcade.Group };
  enemyPool?: { getEnemyBulletGroup(): Phaser.Physics.Arcade.Group };
};

export class BrowserHarnessRuntimeControls {
  private trailEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private originalTrailExplode: Phaser.GameObjects.Particles.ParticleEmitter['explode'] | null = null;

  constructor(private readonly game: Phaser.Game) {}

  setPlayerBulletTrailEmissionEnabled(enabled: boolean): number {
    const scene = this.requireGameplayScene();
    const emitter = scene.children.list.find(
      (child): child is Phaser.GameObjects.Particles.ParticleEmitter =>
        child instanceof Phaser.GameObjects.Particles.ParticleEmitter && child.texture.key === 'particle-trail'
    );
    if (!emitter) return 0;

    if (!enabled && !this.originalTrailExplode) {
      this.trailEmitter = emitter;
      this.originalTrailExplode = emitter.explode;
      emitter.explode = () => undefined;
    } else if (enabled && this.originalTrailExplode && this.trailEmitter) {
      this.trailEmitter.explode = this.originalTrailExplode;
      this.trailEmitter = null;
      this.originalTrailExplode = null;
    }
    return 1;
  }

  setProjectileTrailIntervals(playerMs: number, enemyMs: number): void {
    const scene = this.requireGameplaySceneWithPools();
    this.setGroupTrailInterval(scene.bulletPool.getGroup(), playerMs);
    this.setGroupTrailInterval(scene.enemyPool.getEnemyBulletGroup(), enemyMs);
  }

  stageProjectileTrailEvidence(): { playerCount: number; enemyCount: number } {
    const scene = this.requireGameplaySceneWithPools();
    const { width, height } = scene.cameras.main;
    const playerCount = this.stageGroup(
      scene.bulletPool.getGroup(),
      [0.82, 0.68, 0.54, 0.4].map((y) => [width * 0.38, height * y] as const),
      (projectile, x, y) => {
        (
          projectile as Phaser.Physics.Arcade.Sprite & {
            fire(x: number, y: number, velocityX?: number, velocityY?: number): void;
          }
        ).fire(x, y, 0, -180);
      }
    );
    const enemyCount = this.stageGroup(
      scene.enemyPool.getEnemyBulletGroup(),
      [0.18, 0.32, 0.46, 0.6].map((y) => [width * 0.62, height * y] as const),
      (projectile, x, y) => {
        (projectile as Phaser.Physics.Arcade.Sprite & { fire(x: number, y: number): void }).fire(x, y);
      }
    );
    return { playerCount, enemyCount };
  }

  private requireGameplayScene(): GameplayScene {
    const scene = this.game.scene.getScenes(true).find((candidate) => candidate.scene.key === 'Game');
    if (!scene) throw new Error('Browser harness requires active gameplay');
    return scene;
  }

  private requireGameplaySceneWithPools(): Required<Pick<GameplayScene, 'bulletPool' | 'enemyPool'>> & GameplayScene {
    const scene = this.requireGameplayScene();
    if (!scene.bulletPool || !scene.enemyPool) {
      throw new Error('Browser harness cannot configure projectile trails without active gameplay');
    }
    return scene as Required<Pick<GameplayScene, 'bulletPool' | 'enemyPool'>> & GameplayScene;
  }

  private setGroupTrailInterval(group: Phaser.Physics.Arcade.Group, intervalMs: number): void {
    const projectile = group.getChildren()[0];
    const projectileClass = (projectile?.constructor ?? (group as unknown as { classType?: unknown }).classType) as
      { setTrailIntervalMs?: (nextIntervalMs: number) => void } | undefined;
    if (!projectileClass?.setTrailIntervalMs) {
      throw new Error('Browser harness cannot find a configurable projectile type');
    }
    projectileClass.setTrailIntervalMs(intervalMs);
  }

  private stageGroup(
    group: Phaser.Physics.Arcade.Group,
    positions: ReadonlyArray<readonly [number, number]>,
    fire: (projectile: Phaser.Physics.Arcade.Sprite, x: number, y: number) => void
  ): number {
    const existing = group.getChildren() as Phaser.Physics.Arcade.Sprite[];
    let count = 0;
    for (const [index, [x, y]] of positions.entries()) {
      const projectile = existing[index] ?? (group.get(x, y) as Phaser.Physics.Arcade.Sprite | null);
      if (!projectile) break;
      fire(projectile, x, y);
      count += 1;
    }
    return count;
  }
}
