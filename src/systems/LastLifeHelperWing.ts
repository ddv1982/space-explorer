import Phaser from 'phaser';
import type { LastLifeHelperWingConfig } from '../config/LevelsConfig';
import { Player } from '../entities/Player';
import { BulletPool } from './BulletPool';
import { EnemyPool } from './EnemyPool';
import { EffectsManager } from './EffectsManager';
import { HelperShip } from '../entities/HelperShip';
import { EnemyBullet } from '../entities/EnemyBullet';
import { BomberBomb } from '../entities/BomberBomb';
import { EnemyBase } from '../entities/enemies/EnemyBase';
import { GAME_SCENE_EVENTS } from './GameplayFlow';
import type { PersistentHelperWingSlotState, PersistentHelperWingState } from './PlayerState';
import {
  DEFAULT_HELPER_CONFIG,
  normalizePersistedState,
  resolveRuntimeConfig,
} from './lastLifeHelperWingState';

interface LastLifeHelperWingContext {
  scene: Phaser.Scene;
  player: Player;
  bulletPool: BulletPool;
  enemyPool: EnemyPool;
  effectsManager: EffectsManager;
  config: LastLifeHelperWingConfig | null | undefined;
  persistentState: PersistentHelperWingState | null | undefined;
}

export class LastLifeHelperWing {
  private scene!: Phaser.Scene;
  private player!: Player;
  private bulletPool!: BulletPool;
  private enemyPool!: EnemyPool;
  private effectsManager!: EffectsManager;

  private runtimeConfig: Required<LastLifeHelperWingConfig> = DEFAULT_HELPER_CONFIG;
  private canAcquireInLevel = false;
  private maxSlots = 0;
  private grantedSlots = 0;
  private helperGroup: Phaser.Physics.Arcade.Group | null = null;
  private overlapColliders: Phaser.Physics.Arcade.Collider[] = [];
  private helpers: HelperShip[] = [];
  private activated = false;
  private depletedAnnounced = false;

  create(context: LastLifeHelperWingContext): void {
    this.assignContext(context);
    this.resetLifecycleState();
    const persistedState = this.initializeSlotState(context);

    if (!this.hasHelperSlots()) {
      this.helperGroup = null;
      return;
    }

    this.initializeHelperGroup();
    this.restorePersistedHelpers(persistedState.slots);
  }

  updateLastLifeState(remainingLives: number): void {
    if (remainingLives !== 1 || !this.canAcquireInLevel || this.helpers.length === 0) {
      return;
    }

    this.grantHelperIfPossible();
  }

  update(time: number): void {
    if (!this.activated || this.helpers.length === 0) {
      return;
    }

    const liveHelpers = this.getLiveHelperCount();
    if (liveHelpers <= 0) {
      this.handleWingDepleted();
      return;
    }

    for (const helper of this.helpers) {
      helper.updateWithPlayer(this.player, time, this.bulletPool, this.effectsManager);
    }
  }

  capturePersistentState(): PersistentHelperWingState {
    const slots: PersistentHelperWingSlotState[] = [];

    const cappedGrantedSlots = Math.min(this.grantedSlots, this.helpers.length);

    for (let slotIndex = 0; slotIndex < cappedGrantedSlots; slotIndex++) {
      const helper = this.helpers[slotIndex];
      const state = helper.getPersistentState();
      slots.push(
        state
          ? {
              remainingLives: state.remainingLives,
              hp: state.hp,
            }
          : {
              remainingLives: 0,
              hp: 0,
            }
      );
    }

    return {
      slots,
      grantedSlots: cappedGrantedSlots,
    };
  }

  destroy(): void {
    this.suspendForTransition();
    this.destroyOverlaps();
    this.destroyHelpers();
    this.clearHelperGroupSafely();
    this.helpers = [];
    this.helperGroup = null;
    this.maxSlots = 0;
    this.grantedSlots = 0;
    this.canAcquireInLevel = false;
    this.runtimeConfig = DEFAULT_HELPER_CONFIG;
    this.activated = false;
    this.depletedAnnounced = false;
  }

  suspendForTransition(): void {
    this.activated = false;
    this.depletedAnnounced = false;

    for (const helper of this.helpers) {
      if (!helper.active) {
        continue;
      }

      this.suspendHelperSafely(helper);
    }
  }

  private suspendHelperSafely(helper: HelperShip): void {
    try {
      helper.disableBody(true, true);
      helper.clearTint();
    } catch (_error) {
      // Phaser may already be tearing down bodies during scene transitions.
    }
  }

  private assignContext(context: LastLifeHelperWingContext): void {
    this.scene = context.scene;
    this.player = context.player;
    this.bulletPool = context.bulletPool;
    this.enemyPool = context.enemyPool;
    this.effectsManager = context.effectsManager;
    this.runtimeConfig = resolveRuntimeConfig(context.config);
  }

  private resetLifecycleState(): void {
    this.activated = false;
    this.depletedAnnounced = false;
    this.destroyOverlaps();
    this.helpers = [];
  }

  private initializeSlotState(
    context: LastLifeHelperWingContext
  ): PersistentHelperWingState {
    const persistedState = normalizePersistedState(context.persistentState);
    this.grantedSlots = persistedState.grantedSlots;
    this.canAcquireInLevel = Boolean(
      (context.config && context.config.shipCount > 0) || this.grantedSlots > 0
    );
    this.maxSlots = Math.max(this.canAcquireInLevel ? this.runtimeConfig.shipCount : 0, this.grantedSlots);

    return persistedState;
  }

  private hasHelperSlots(): boolean {
    return this.maxSlots > 0;
  }

  private initializeHelperGroup(): void {
    this.helperGroup = this.scene.physics.add.group({
      maxSize: this.maxSlots,
      classType: HelperShip,
      runChildUpdate: false,
    });

    this.prewarmHelpers(this.maxSlots);
    this.registerOverlaps();
  }

  private restorePersistedHelpers(slots: PersistentHelperWingSlotState[]): void {
    if (slots.length === 0) {
      return;
    }

    this.restorePersistedWing(slots);
  }

  private handleWingDepleted(): void {
    this.activated = false;
    if (this.depletedAnnounced) {
      return;
    }

    this.depletedAnnounced = true;
    this.scene.events.emit(GAME_SCENE_EVENTS.helperWingDepleted);
  }

  private prewarmHelpers(slotCount: number): void {
    if (!this.helperGroup) {
      return;
    }

    for (let i = 0; i < slotCount; i++) {
      const helper = this.helperGroup.get(-200, -200) as HelperShip | null;
      if (!helper) {
        continue;
      }

      helper.disableBody(true, true);
      this.helpers.push(helper);
    }
  }

  private grantHelperIfPossible(): void {
    if (this.grantedSlots >= this.maxSlots) {
      return;
    }

    const nextSlot = this.grantedSlots;
    const helper = this.helpers[nextSlot];
    if (!helper) {
      return;
    }

    this.configureHelperForSlot(helper, nextSlot);
    helper.deployNearPlayer(this.player, this.scene.time.now);
    this.grantedSlots += 1;
    this.activateWing();
  }

  private activateWing(): void {
    this.activated = true;
    this.depletedAnnounced = false;
    this.scene.events.emit(GAME_SCENE_EVENTS.helperWingActivated, this.getLiveHelperCount());
  }

  private restorePersistedWing(slots: PersistentHelperWingSlotState[]): void {
    const now = this.scene.time.now;
    let restoredCount = 0;

    const maxRestoredSlots = Math.min(this.grantedSlots, slots.length, this.helpers.length);

    for (let slotIndex = 0; slotIndex < maxRestoredSlots; slotIndex++) {
      const helper = this.helpers[slotIndex];
      const slotState = slots[slotIndex];
      if (!helper || !slotState) {
        continue;
      }

      this.configureHelperForSlot(helper, slotIndex);
      helper.applyPersistentState(this.player, now, {
        remainingLives: slotState.remainingLives,
        hp: slotState.hp,
      });
      if (helper.getPersistentState()) {
        restoredCount += 1;
      }
    }

    if (restoredCount > 0) {
      this.activated = true;
      this.depletedAnnounced = false;
    }
  }

  private configureHelperForSlot(helper: HelperShip, slotIndex: number): void {
    const helperHp = Math.max(1, Math.round(this.player.maxHp * this.runtimeConfig.hpScaleFromPlayer));

    helper.configure({
      maxHp: helperHp,
      lives: this.runtimeConfig.helperLives,
      fireRateMs: this.runtimeConfig.fireRateMs,
      respawnDelayMs: this.runtimeConfig.respawnDelayMs,
      followOffsetX: this.resolveFollowOffsetX(slotIndex),
      followOffsetY: this.runtimeConfig.followOffsetY,
    });
  }

  private resolveFollowOffsetX(slotIndex: number): number {
    if (this.maxSlots <= 1) {
      return 0;
    }

    const center = (this.maxSlots - 1) / 2;
    return (slotIndex - center) * this.runtimeConfig.spacing;
  }

  private getLiveHelperCount(): number {
    let count = 0;
    for (const helper of this.helpers) {
      if (helper.getPersistentState()) {
        count += 1;
      }
    }

    return count;
  }

  private registerOverlaps(): void {
    if (!this.helperGroup) {
      return;
    }

    this.registerOverlap(
      this.enemyPool.getEnemyBulletGroup(),
      (a, b) => this.handleEnemyBulletOverlap(a, b)
    );
    this.registerOverlap(
      this.enemyPool.getBombGroup(),
      (a, b) => this.handleBombOverlap(a, b)
    );

    for (const { key, group } of this.enemyPool.getEnemyGroupRegistry()) {
      if (key === 'boss') {
        continue;
      }

      this.registerOverlap(
        group,
        (a, b) => this.handleEnemyContactOverlap(a, b)
      );
    }
  }

  private registerOverlap(
    group: Phaser.Physics.Arcade.Group,
    callback: (a: unknown, b: unknown) => void
  ): void {
    if (!this.helperGroup) {
      return;
    }

    const collider = this.scene.physics.add.overlap(group, this.helperGroup, callback);
    this.overlapColliders.push(collider);
  }

  private destroyOverlaps(): void {
    if (this.overlapColliders.length === 0) {
      return;
    }

    for (const collider of this.overlapColliders) {
      this.destroyColliderSafely(collider);
    }

    this.overlapColliders = [];
  }

  private destroyColliderSafely(collider: Phaser.Physics.Arcade.Collider): void {
    try {
      collider.destroy();
    } catch (_error) {
      // Collider internals can already be disposed during Phaser scene shutdown.
    }
  }

  private destroyHelpers(): void {
    for (const helper of this.helpers) {
      try {
        helper.destroy();
      } catch (_error) {
        // Helper game objects may already be destroyed by a scene transition.
      }
    }
  }

  private clearHelperGroupSafely(): void {
    if (!this.helperGroup) {
      return;
    }

    try {
      this.helperGroup.clear(false, false);
    } catch (_error) {
      // Some Phaser group internals can be undefined while a scene is ending.
    }
  }

  private handleEnemyBulletOverlap(a: unknown, b: unknown): void {
    const bullet = this.resolveCollisionTarget(EnemyBullet, a, b);
    const helper = this.resolveCollisionTarget(HelperShip, a, b);

    if (!bullet?.active || !helper) {
      return;
    }

    bullet.kill();
    helper.takeDamage(1, this.scene.time.now, this.effectsManager);
  }

  private handleBombOverlap(a: unknown, b: unknown): void {
    const bomb = this.resolveCollisionTarget(BomberBomb, a, b);
    const helper = this.resolveCollisionTarget(HelperShip, a, b);

    if (!bomb?.active || !helper) {
      return;
    }

    const x = bomb.x;
    const y = bomb.y;
    bomb.kill();
    this.effectsManager.createExplosion(x, y, 1.1);
    helper.takeDamage(2, this.scene.time.now, this.effectsManager);
  }

  private handleEnemyContactOverlap(a: unknown, b: unknown): void {
    const enemy = this.resolveCollisionTarget(EnemyBase, a, b);
    const helper = this.resolveCollisionTarget(HelperShip, a, b);

    if (!enemy?.active || !helper) {
      return;
    }

    helper.takeDamage(1, this.scene.time.now, this.effectsManager);
  }

  private resolveCollisionTarget<T>(ctor: abstract new (...args: never[]) => T, ...values: unknown[]): T | null {
    for (const value of values) {
      if (value instanceof ctor) {
        return value;
      }

      if (!value || typeof value !== 'object' || !('gameObject' in value)) {
        continue;
      }

      const { gameObject } = value as { gameObject?: unknown };
      if (gameObject instanceof ctor) {
        return gameObject;
      }
    }

    return null;
  }
}
