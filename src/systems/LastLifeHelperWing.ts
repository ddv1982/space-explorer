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

const DEFAULT_HELPER_CONFIG: Required<LastLifeHelperWingConfig> = {
  shipCount: 2,
  helperLives: 2,
  hpScaleFromPlayer: 0.5,
  fireRateMs: 280,
  respawnDelayMs: 800,
  spacing: 38,
  followOffsetY: 18,
};

const HARD_MAX_HELPER_SLOTS = 4;

interface LastLifeHelperWingContext {
  scene: Phaser.Scene;
  player: Player;
  bulletPool: BulletPool;
  enemyPool: EnemyPool;
  effectsManager: EffectsManager;
  config: LastLifeHelperWingConfig | null | undefined;
  persistentState: PersistentHelperWingState | null | undefined;
}

interface NormalizedPersistedWingState {
  grantedSlots: number;
  slots: PersistentHelperWingSlotState[];
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
    this.scene = context.scene;
    this.player = context.player;
    this.bulletPool = context.bulletPool;
    this.enemyPool = context.enemyPool;
    this.effectsManager = context.effectsManager;
    this.runtimeConfig = this.resolveRuntimeConfig(context.config);

    this.activated = false;
    this.depletedAnnounced = false;
    this.destroyOverlaps();
    this.helpers = [];

    const persistedState = this.normalizePersistedState(context.persistentState);
    const persistedSlots = persistedState.slots;
    this.grantedSlots = persistedState.grantedSlots;

    this.canAcquireInLevel = Boolean(
      (context.config && context.config.shipCount > 0) || this.grantedSlots > 0
    );
    this.maxSlots = Math.max(this.canAcquireInLevel ? this.runtimeConfig.shipCount : 0, this.grantedSlots);

    if (this.maxSlots <= 0) {
      this.helperGroup = null;
      return;
    }

    this.helperGroup = this.scene.physics.add.group({
      maxSize: this.maxSlots,
      classType: HelperShip,
      runChildUpdate: false,
    });

    this.prewarmHelpers(this.maxSlots);
    this.registerOverlaps();

    if (persistedSlots.length > 0) {
      this.restorePersistedWing(persistedSlots);
    }
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
      this.activated = false;
      if (!this.depletedAnnounced) {
        this.depletedAnnounced = true;
        this.scene.events.emit(GAME_SCENE_EVENTS.helperWingDepleted);
      }
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
    this.helpers = [];
    this.helperGroup?.clear(true, true);
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

      helper.disableBody(true, true);
      helper.clearTint();
    }
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

  private resolveRuntimeConfig(config: LastLifeHelperWingConfig | null | undefined): Required<LastLifeHelperWingConfig> {
    const normalizedShipCount =
      typeof config?.shipCount === 'number' ? Math.max(1, Math.floor(config.shipCount)) : DEFAULT_HELPER_CONFIG.shipCount;

    return {
      shipCount: normalizedShipCount,
      helperLives:
        typeof config?.helperLives === 'number'
          ? Math.max(1, Math.floor(config.helperLives))
          : DEFAULT_HELPER_CONFIG.helperLives,
      hpScaleFromPlayer:
        typeof config?.hpScaleFromPlayer === 'number'
          ? Phaser.Math.Clamp(config.hpScaleFromPlayer, 0.1, 1)
          : DEFAULT_HELPER_CONFIG.hpScaleFromPlayer,
      fireRateMs:
        typeof config?.fireRateMs === 'number'
          ? Math.max(80, Math.floor(config.fireRateMs))
          : DEFAULT_HELPER_CONFIG.fireRateMs,
      respawnDelayMs:
        typeof config?.respawnDelayMs === 'number'
          ? Math.max(120, Math.floor(config.respawnDelayMs))
          : DEFAULT_HELPER_CONFIG.respawnDelayMs,
      spacing:
        typeof config?.spacing === 'number'
          ? Math.max(18, Math.round(config.spacing))
          : DEFAULT_HELPER_CONFIG.spacing,
      followOffsetY:
        typeof config?.followOffsetY === 'number'
          ? Math.round(config.followOffsetY)
          : DEFAULT_HELPER_CONFIG.followOffsetY,
    };
  }

  private normalizePersistedState(
    persistentState: PersistentHelperWingState | null | undefined
  ): NormalizedPersistedWingState {
    if (!persistentState || !Array.isArray(persistentState.slots)) {
      return {
        grantedSlots: 0,
        slots: [],
      };
    }

    const slots = persistentState.slots.map((slot) => ({
        remainingLives:
          typeof slot?.remainingLives === 'number'
            ? Math.max(0, Math.floor(slot.remainingLives))
            : 0,
        hp:
          typeof slot?.hp === 'number'
            ? Math.max(0, Math.round(slot.hp))
            : 0,
      }));

    const sourceGrantedSlots =
      typeof persistentState.grantedSlots === 'number'
        ? Math.max(0, Math.floor(persistentState.grantedSlots))
        : slots.length;

    const grantedSlots = Math.min(Math.max(sourceGrantedSlots, slots.length), HARD_MAX_HELPER_SLOTS);
    const normalizedSlots = slots.slice(0, grantedSlots);

    while (normalizedSlots.length < grantedSlots) {
      normalizedSlots.push({ remainingLives: 0, hp: 0 });
    }

    return {
      grantedSlots,
      slots: normalizedSlots,
    };
  }

  private registerOverlaps(): void {
    if (!this.helperGroup) {
      return;
    }

    const enemyBulletCollider = this.scene.physics.add.overlap(
      this.enemyPool.getEnemyBulletGroup(),
      this.helperGroup,
      (a, b) => this.handleEnemyBulletOverlap(a, b)
    );
    this.overlapColliders.push(enemyBulletCollider);

    const bombCollider = this.scene.physics.add.overlap(
      this.enemyPool.getBombGroup(),
      this.helperGroup,
      (a, b) => this.handleBombOverlap(a, b)
    );
    this.overlapColliders.push(bombCollider);

    for (const { key, group } of this.enemyPool.getEnemyGroupRegistry()) {
      if (key === 'boss') {
        continue;
      }

      const enemyContactCollider = this.scene.physics.add.overlap(
        group,
        this.helperGroup,
        (a, b) => this.handleEnemyContactOverlap(a, b)
      );
      this.overlapColliders.push(enemyContactCollider);
    }
  }

  private destroyOverlaps(): void {
    if (this.overlapColliders.length === 0) {
      return;
    }

    for (const collider of this.overlapColliders) {
      collider.destroy();
    }

    this.overlapColliders = [];
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
