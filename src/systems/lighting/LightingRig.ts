import Phaser from 'phaser';
import type { LightingBudget } from './lightingBudget';

/** Slightly under full white so dynamic light has headroom to visibly brighten baked albedo. */
const LIT_AMBIENT = 0xd2d8e0;
/** Thresholds sit above the pale ceramic armour so only emissives, fire and pulses bloom. */
const BLOOM_CONFIG = {
  soft: { threshold: 0.92, blurRadius: 2, blurSteps: 3, blendAmount: 0.5 },
  full: { threshold: 0.88, blurRadius: 3, blurSteps: 4, blendAmount: 0.75 },
} as const;
/** Light height as a fraction of radius: high enough to light upward-facing hull plates. */
const LIGHT_HEIGHT = 0.35;

interface PooledLight {
  light: Phaser.GameObjects.Light;
  /** Remaining life in ms for pulses; Infinity for followers. */
  remainingMs: number;
  durationMs: number;
  peakIntensity: number;
  follow: { target: { x: number; y: number; visible?: boolean }; intensity: number; offsetY: number } | null;
  startedAt: number;
}

type Lightable = Phaser.GameObjects.GameObject & {
  texture?: Phaser.Textures.Texture;
  setLighting?: (enable: boolean) => unknown;
  setSelfShadow?: (enabled?: boolean, penumbra?: number, diffuseFlatThreshold?: number) => unknown;
};

/**
 * Scene-owned dynamic lighting for v2 sprites. Any game object whose texture carries a normal map is
 * lit automatically; explosions pulse pooled lights and the player's engines carry a follow light.
 * Pulses fade on gameplay delta, so a paused game freezes them mid-fade.
 */
export class LightingRig {
  private readonly pool: PooledLight[] = [];
  private bloom: { parallelFilters: { destroy(): void } } | null = null;
  private budget: LightingBudget;
  private sequence = 0;
  private destroyed = false;

  private readonly handleAddedToScene = (object: Phaser.GameObjects.GameObject): void => {
    this.applyLighting(object as Lightable);
  };

  constructor(
    private readonly scene: Phaser.Scene,
    budget: LightingBudget
  ) {
    this.budget = budget;
    scene.lights.enable();
    scene.lights.setAmbientColor(budget.normalMapLighting ? LIT_AMBIENT : 0xffffff);
    scene.events.on(Phaser.Scenes.Events.ADDED_TO_SCENE, this.handleAddedToScene);
    for (const child of scene.children.list) this.applyLighting(child as Lightable);
    this.applyBloom();
  }

  /** Short-lived light; reuses the oldest pulse when the pool is full. No-op with a zero budget. */
  pulse(x: number, y: number, color: number, radius: number, intensity: number, durationMs: number): void {
    const slot = this.acquire(false);
    if (!slot) return;
    slot.follow = null;
    slot.remainingMs = durationMs;
    slot.durationMs = durationMs;
    slot.peakIntensity = intensity;
    slot.light.setPosition(x, y);
    slot.light.setRadius(radius);
    slot.light.z = radius * LIGHT_HEIGHT;
    slot.light.setColor(color);
    slot.light.setIntensity(intensity);
  }

  /**
   * Persistent light that tracks a target, `offsetY` px below it (hidden while the target is invisible).
   * Returns a release function.
   */
  follow(
    target: { x: number; y: number; visible?: boolean },
    color: number,
    radius: number,
    intensity: number,
    offsetY = 0
  ) {
    const slot = this.acquire(true);
    if (!slot) return () => {};
    slot.follow = { target, intensity, offsetY };
    slot.remainingMs = Number.POSITIVE_INFINITY;
    slot.light.setRadius(radius);
    slot.light.z = radius * LIGHT_HEIGHT;
    slot.light.setColor(color);
    slot.light.setPosition(target.x, target.y + offsetY);
    slot.light.setIntensity(target.visible === false ? 0 : intensity);
    return () => {
      if (slot.follow?.target === target) this.release(slot);
    };
  }

  update(delta: number): void {
    if (!Number.isFinite(delta) || delta <= 0) return;
    for (const slot of this.pool) {
      if (slot.follow) {
        const { target, intensity, offsetY } = slot.follow;
        slot.light.setPosition(target.x, target.y + offsetY);
        slot.light.setIntensity(target.visible === false ? 0 : intensity);
        continue;
      }
      if (slot.remainingMs <= 0) continue;
      slot.remainingMs = Math.max(0, slot.remainingMs - delta);
      const life = slot.remainingMs / slot.durationMs;
      slot.light.setIntensity(slot.peakIntensity * life * life);
    }
  }

  setBudget(budget: LightingBudget): void {
    if (this.destroyed) return;
    this.budget = budget;
    while (this.pool.length > budget.lights) {
      const slot = this.pool.pop()!;
      this.scene.lights.removeLight(slot.light);
    }
    this.scene.lights.setAmbientColor(budget.normalMapLighting ? LIT_AMBIENT : 0xffffff);
    this.applyBloom();
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.scene.events.off(Phaser.Scenes.Events.ADDED_TO_SCENE, this.handleAddedToScene);
    for (const slot of this.pool) this.scene.lights.removeLight(slot.light);
    this.pool.length = 0;
    this.bloom?.parallelFilters.destroy();
    this.bloom = null;
  }

  private applyLighting(object: Lightable): void {
    if (!this.budget.normalMapLighting || !object.setLighting) return;
    if ((object.texture?.dataSource.length ?? 0) === 0) return;
    object.setLighting(true);
  }

  private applyBloom(): void {
    this.bloom?.parallelFilters.destroy();
    this.bloom = null;
    if (this.budget.bloom === 'off') return;
    const [effect] = Phaser.Actions.AddEffectBloom(this.scene.cameras.main, BLOOM_CONFIG[this.budget.bloom]);
    this.bloom = effect ?? null;
  }

  private acquire(persistent: boolean): PooledLight | null {
    if (this.destroyed || this.budget.lights <= 0) return null;
    const free = this.pool.find((slot) => !slot.follow && slot.remainingMs <= 0);
    if (free) return this.stamp(free);
    if (this.pool.length < this.budget.lights) {
      const light = this.scene.lights.addLight(0, 0, 100, 0xffffff, 0);
      const slot: PooledLight = {
        light,
        remainingMs: 0,
        durationMs: 1,
        peakIntensity: 0,
        follow: null,
        startedAt: 0,
      };
      this.pool.push(slot);
      return this.stamp(slot);
    }
    // Full: a pulse steals the oldest pulse; followers never steal and never get stolen.
    if (persistent) return null;
    const pulses = this.pool.filter((slot) => !slot.follow);
    if (pulses.length === 0) return null;
    return this.stamp(pulses.reduce((oldest, slot) => (slot.startedAt < oldest.startedAt ? slot : oldest)));
  }

  private stamp(slot: PooledLight): PooledLight {
    slot.startedAt = ++this.sequence;
    return slot;
  }

  private release(slot: PooledLight): void {
    slot.follow = null;
    slot.remainingMs = 0;
    slot.light.setIntensity(0);
  }
}
