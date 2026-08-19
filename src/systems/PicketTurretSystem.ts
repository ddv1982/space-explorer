import Phaser from 'phaser';
import { PicketBolt } from '../entities/PicketBolt';
import { EnemyBase } from '../entities/enemies/EnemyBase';
import { audioManager } from './AudioManager';
import type { EffectsManager } from './EffectsManager';
import type { EnemyPool } from './EnemyPool';
import { GAME_SCENE_EVENTS } from './GameplayFlow';
import { getViewportBounds } from '../utils/layout';
import { resolveCollisionTarget } from '../utils/resolveCollisionTarget';
import { ensurePicketTurretTexture } from '../utils/SpriteFactory';
import {
  getPicketTierConfig,
  normalizePicketTier,
  PICKET_BOLT_DAMAGE,
  PICKET_BOLT_POOL_SIZE,
  PICKET_BOLT_SPEED,
  PICKET_HARDPOINT_EDGE_INSET_X,
  PICKET_HARDPOINT_Y_RATIO,
  PICKET_ONLINE_ANNOUNCE_DELAY_MS,
  PICKET_PREFERRED_TARGET_TYPES,
  PICKET_TARGET_RETRY_MS,
} from './picketTurretConfig';

interface PicketTurretSystemContext {
  scene: Phaser.Scene;
  enemyPool: EnemyPool;
  effectsManager: EffectsManager;
  tier: number;
}

interface PicketMount {
  sprite: Phaser.GameObjects.Sprite;
  side: -1 | 1;
  nextFireTime: number;
}

const TARGET_OFFSCREEN_PADDING = 30;

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}

/**
 * AEGIS Picket: two fixed automatic screen-edge hardpoints with target-gated
 * fire. No placement UI, no aiming input, no persistent HUD. Mounts prefer
 * eligible non-boss targets in their own half of the screen, favoring
 * scouts/swarms/adds, and never inherit player damage.
 */
export class PicketTurretSystem {
  private scene!: Phaser.Scene;
  private enemyPool!: EnemyPool;
  private effectsManager!: EffectsManager;

  private tier = 0;
  private fireIntervalMs = 0;
  private onlineAnnouncementPending = false;
  private onlineAnnounceAtTime = 0;
  private mounts: PicketMount[] = [];
  private boltGroup: Phaser.Physics.Arcade.Group | null = null;
  private targetGroups: Phaser.Physics.Arcade.Group[] = [];
  private overlapColliders: Phaser.Physics.Arcade.Collider[] = [];

  create(context: PicketTurretSystemContext): void {
    this.scene = context.scene;
    this.enemyPool = context.enemyPool;
    this.effectsManager = context.effectsManager;
    this.tier = normalizePicketTier(context.tier);
    this.mounts = [];
    this.targetGroups = [];
    this.boltGroup = null;
    this.onlineAnnouncementPending = false;
    this.onlineAnnounceAtTime = 0;

    const tierConfig = getPicketTierConfig(this.tier);
    if (!tierConfig) {
      return;
    }

    this.fireIntervalMs = tierConfig.fireIntervalMs;

    const groupRegistry = this.enemyPool.getEnemyGroupRegistry();
    this.targetGroups = groupRegistry
      .filter((registration) => registration.key !== 'boss')
      .map((registration) => registration.group);

    this.boltGroup = this.scene.physics.add.group({
      maxSize: PICKET_BOLT_POOL_SIZE,
      classType: PicketBolt,
      runChildUpdate: true,
    });

    // Bosses are never target candidates; the boss group is registered only so
    // an already-in-flight bolt can connect incidentally for flat damage.
    for (const { group } of groupRegistry) {
      this.registerOverlap(group);
    }

    this.createMounts();
    this.anchorMounts();
    this.playDeployment();
    this.onlineAnnouncementPending = true;
  }

  update(time: number): void {
    // The one-time announcement counts down on the gameplay clock passed to
    // update rather than scene.time.delayedCall: the scene clock's TimerEvent
    // elapsed accumulates clamped per-frame delta, which drifts far behind
    // real time on slow renderers, and keeps running while the game is
    // paused. Gating on the update timestamp keeps the announcement roughly
    // three seconds after deployment regardless of frame rate.
    if (this.onlineAnnouncementPending) {
      if (this.onlineAnnounceAtTime === 0) {
        this.onlineAnnounceAtTime = time + PICKET_ONLINE_ANNOUNCE_DELAY_MS;
      }
      if (time >= this.onlineAnnounceAtTime) {
        this.onlineAnnouncementPending = false;
        this.scene.events.emit(GAME_SCENE_EVENTS.picketOnline);
      }
    }

    if (this.mounts.length === 0) {
      return;
    }

    for (const mount of this.mounts) {
      if (time < mount.nextFireTime) {
        continue;
      }

      // Rescan every volley so target preferences apply to each shot.
      const target = this.scanForTarget(mount);
      if (!target) {
        // Target-gated: hold fire and retry on a bounded cadence.
        mount.nextFireTime = time + PICKET_TARGET_RETRY_MS;
        continue;
      }

      this.fireAt(mount, target);
      mount.nextFireTime = time + this.fireIntervalMs;
    }
  }

  relayout(): void {
    if (this.mounts.length === 0) {
      return;
    }

    this.anchorMounts();
  }

  suspendForTransition(): void {
    this.killActiveBolts();
  }

  destroy(): void {
    this.destroyOverlaps();
    this.destroyMounts();
    this.destroyBoltGroupSafely();
    this.mounts = [];
    this.targetGroups = [];
    this.boltGroup = null;
    this.tier = 0;
    this.fireIntervalMs = 0;
    this.onlineAnnouncementPending = false;
    this.onlineAnnounceAtTime = 0;
  }

  private createMounts(): void {
    ensurePicketTurretTexture(this.scene);

    const now = 0;
    const sides: (-1 | 1)[] = [-1, 1];
    for (const [index, side] of sides.entries()) {
      const sprite = this.scene.add.sprite(0, 0, 'picket-turret');
      sprite.setDepth(4);
      this.mounts.push({
        sprite,
        side,
        // Stagger the mounts so the pair never volleys on the same frame.
        nextFireTime: now + Math.floor(this.fireIntervalMs * (0.5 + index * 0.5)),
      });
    }
  }

  private anchorMounts(): void {
    const viewport = getViewportBounds(this.scene);
    const anchorY = viewport.top + viewport.height * PICKET_HARDPOINT_Y_RATIO;

    for (const mount of this.mounts) {
      const anchorX =
        mount.side < 0 ? viewport.left + PICKET_HARDPOINT_EDGE_INSET_X : viewport.right - PICKET_HARDPOINT_EDGE_INSET_X;
      mount.sprite.setPosition(anchorX, anchorY);
    }
  }

  private playDeployment(): void {
    if (prefersReducedMotion()) {
      return;
    }

    for (const [index, mount] of this.mounts.entries()) {
      mount.sprite.setAlpha(0);
      mount.sprite.setScale(0.6);
      this.scene.tweens.add({
        targets: mount.sprite,
        alpha: 1,
        scaleX: 1,
        scaleY: 1,
        duration: 260,
        delay: index * 110,
        ease: 'Quad.easeOut',
      });
    }
  }

  private isTargetValid(target: EnemyBase): boolean {
    if (!target.active) {
      return false;
    }

    const viewport = getViewportBounds(this.scene);
    return (
      target.x > viewport.left - TARGET_OFFSCREEN_PADDING &&
      target.x < viewport.right + TARGET_OFFSCREEN_PADDING &&
      target.y > viewport.top - TARGET_OFFSCREEN_PADDING &&
      target.y < viewport.bottom + TARGET_OFFSCREEN_PADDING
    );
  }

  private scanForTarget(mount: PicketMount): EnemyBase | null {
    const centerX = getViewportBounds(this.scene).centerX;
    let best: EnemyBase | null = null;
    let bestInHalf = false;
    let bestPreferred = false;
    let bestDistanceSq = Number.POSITIVE_INFINITY;

    for (const group of this.targetGroups) {
      for (const child of group.getChildren()) {
        const enemy = child as EnemyBase;
        if (!this.isTargetValid(enemy)) {
          continue;
        }

        const inHalf = mount.side < 0 ? enemy.x <= centerX : enemy.x >= centerX;
        const preferred = PICKET_PREFERRED_TARGET_TYPES.has(enemy.enemyType);
        const dx = enemy.x - mount.sprite.x;
        const dy = enemy.y - mount.sprite.y;
        const distanceSq = dx * dx + dy * dy;

        const isBetter =
          best === null ||
          (inHalf && !bestInHalf) ||
          (inHalf === bestInHalf && preferred && !bestPreferred) ||
          (inHalf === bestInHalf && preferred === bestPreferred && distanceSq < bestDistanceSq);

        if (isBetter) {
          best = enemy;
          bestInHalf = inHalf;
          bestPreferred = preferred;
          bestDistanceSq = distanceSq;
        }
      }
    }

    return best;
  }

  private fireAt(mount: PicketMount, target: EnemyBase): void {
    if (!this.boltGroup) {
      return;
    }

    const bolt = (this.boltGroup.getFirstDead(false) ??
      this.boltGroup.get(mount.sprite.x, mount.sprite.y)) as PicketBolt | null;
    if (!bolt) {
      return;
    }

    const angle = Math.atan2(target.y - mount.sprite.y, target.x - mount.sprite.x);
    const muzzleX = mount.sprite.x + Math.cos(angle) * 10;
    const muzzleY = mount.sprite.y + Math.sin(angle) * 10;

    bolt.fire(muzzleX, muzzleY, Math.cos(angle) * PICKET_BOLT_SPEED, Math.sin(angle) * PICKET_BOLT_SPEED);
    this.effectsManager.createMuzzleFlash(muzzleX, muzzleY);
    audioManager.playPicketShot();
  }

  private registerOverlap(group: Phaser.Physics.Arcade.Group): void {
    if (!this.boltGroup) {
      return;
    }

    const collider = this.scene.physics.add.overlap(this.boltGroup, group, (a, b) => this.handleBoltEnemyOverlap(a, b));
    this.overlapColliders.push(collider);
  }

  private handleBoltEnemyOverlap(a: unknown, b: unknown): void {
    const bolt = resolveCollisionTarget(PicketBolt, a, b);
    const enemy = resolveCollisionTarget(EnemyBase, a, b);

    if (!bolt?.active || !enemy?.active) {
      return;
    }

    bolt.kill();
    enemy.takeDamage(PICKET_BOLT_DAMAGE);

    if (!enemy.active) {
      this.effectsManager.createExplosion(enemy.x, enemy.y, 0.9);
    } else {
      this.effectsManager.createSparkBurst(enemy.x, enemy.y);
    }
  }

  private killActiveBolts(): void {
    if (!this.boltGroup) {
      return;
    }

    for (const child of this.getBoltChildrenSafely()) {
      const bolt = child as PicketBolt;
      if (bolt.active) {
        bolt.kill();
      }
    }
  }

  private getBoltChildrenSafely(): Phaser.GameObjects.GameObject[] {
    if (!this.boltGroup) {
      return [];
    }

    try {
      return this.boltGroup.getChildren();
    } catch (_error) {
      // Phaser group internals can already be disposed during scene transitions.
      return [];
    }
  }

  private destroyOverlaps(): void {
    for (const collider of this.overlapColliders) {
      try {
        collider.destroy();
      } catch (_error) {
        // Collider internals can already be disposed during Phaser scene shutdown.
      }
    }

    this.overlapColliders = [];
  }

  private destroyMounts(): void {
    for (const mount of this.mounts) {
      try {
        mount.sprite.destroy();
      } catch (_error) {
        // Mount sprites may already be destroyed by a scene transition.
      }
    }
  }

  private destroyBoltGroupSafely(): void {
    if (!this.boltGroup) {
      return;
    }

    for (const child of this.getBoltChildrenSafely()) {
      try {
        child.destroy();
      } catch (_error) {
        // Bolt game objects may already be destroyed by a scene transition.
      }
    }

    try {
      this.boltGroup.clear(false, false);
    } catch (_error) {
      // Some Phaser group internals can be undefined while a scene is ending.
    }
  }
}
