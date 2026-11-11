import Phaser from 'phaser';
import { prefersReducedMotion } from '../scenes/shared/neonUiTheme';
import { getViewportBounds } from '../utils/layout';
import { mixColor } from '../utils/colorUtils';
import { rebindSceneLifecycleHandlers, unbindSceneLifecycleHandlers } from '../utils/sceneLifecycle';
import { audioManager } from './AudioManager';
import { PARTICLE, generateEffectsParticleTextures } from './effects/particleTextureFactory';

const DURATION_MS = 2100;
const REDUCED_MOTION_DURATION_MS = 700;
/** The jump gate closes onto the vanishing point while the stars start to drag. */
const CHARGE_END = 0.38;
/** The tunnel runs at full speed until here; the rest is the arrival flash. */
const JUMP_END = 0.8;
/** Share of the timeline the ship takes to stretch away into the gate. */
const SHIP_LAUNCH_SPAN = 0.14;
const STREAK_COUNT = 110;
const RING_COUNT = 6;
/** Streaks and rings bunch up near the vanishing point and race at the screen edge. */
const DEPTH_CURVE = 2.2;

interface WarpStreak {
  angle: number;
  /** Position along the tunnel, 0 at the vanishing point to 1 past the screen edge. */
  phase: number;
  pace: number;
  width: number;
  color: number;
}

type WarpShip = Phaser.GameObjects.Image;

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));
/** 0 before `from`, 1 after `to`, linear between. */
const span = (value: number, from: number, to: number): number => clamp01((value - from) / (to - from));

/**
 * The jump to the next sector: a gate ring closes onto a vanishing point ahead of the ship while the
 * stars begin to drag, the ship stretches away into it, a tunnel of light races past, and the arrival
 * blooms to white. Under reduced motion it is a plain fade.
 */
export class WarpTransition {
  private scene: Phaser.Scene | null = null;
  private dim: Phaser.GameObjects.Graphics | null = null;
  private tunnel: Phaser.GameObjects.Graphics | null = null;
  private flash: Phaser.GameObjects.Graphics | null = null;
  /** Soft light at the vanishing point: a round glow and a spiked flare. */
  private core: Phaser.GameObjects.Image[] = [];
  private streaks: WarpStreak[] = [];
  private ship: { sprite: WarpShip; x: number; y: number; scaleX: number; scaleY: number } | null = null;
  private elapsed = 0;
  private duration = DURATION_MS;
  private travel = 0;
  private running = false;
  private reducedMotion = false;
  private shaken = false;
  private onCompleteCallback: (() => void) | null = null;
  private viewport = { left: 0, top: 0, width: 0, height: 0 };
  private originX = 0;
  private originY = 0;
  private maxDistance = 0;
  private accentColor = 0x00ccff;

  private readonly handleScaleResize = (): void => {
    this.resize();
  };

  private readonly handleSceneShutdown = (): void => {
    this.destroy();
  };

  create(scene: Phaser.Scene): void {
    if (this.scene) {
      this.destroy();
    }

    this.scene = scene;
    this.accentColor = 0x00ccff;
    this.syncLayout();

    scene.scale.off(Phaser.Scale.Events.RESIZE, this.handleScaleResize, this);
    scene.scale.on(Phaser.Scale.Events.RESIZE, this.handleScaleResize, this);
    rebindSceneLifecycleHandlers(scene, {
      onShutdown: this.handleSceneShutdown,
      context: this,
    });
  }

  setAccentColor(color: number): void {
    this.accentColor = color;
  }

  /** `ship`, when given, is flown into the gate and left there; the caller changes scene afterwards. */
  play(onComplete: () => void, ship?: WarpShip): void {
    if (!this.scene || this.running) return;

    this.syncLayout();
    this.running = true;
    this.elapsed = 0;
    this.travel = 0;
    this.shaken = false;
    this.onCompleteCallback = onComplete;
    this.reducedMotion = prefersReducedMotion();
    this.duration = this.reducedMotion ? REDUCED_MOTION_DURATION_MS : DURATION_MS;

    const layer = (depth: number, blendMode = Phaser.BlendModes.NORMAL): Phaser.GameObjects.Graphics =>
      this.scene!.add.graphics().setDepth(depth).setScrollFactor(0).setBlendMode(blendMode);
    this.dim = layer(1000);
    this.tunnel = layer(1001, Phaser.BlendModes.ADD);
    this.flash = layer(1002);

    if (!this.reducedMotion) {
      const colors = [this.accentColor, 0xffffff, mixColor(this.accentColor, 0x6f8cff, 0.6)];
      this.streaks = Array.from({ length: STREAK_COUNT }, (_, index) => ({
        angle: ((Math.PI * 2) / STREAK_COUNT) * (index + Math.random()),
        phase: Math.random(),
        pace: 0.6 + Math.random() * 0.8,
        width: 0.6 + Math.random() * 1.1,
        color: colors[index % colors.length]!,
      }));
      this.ship = ship ? { sprite: ship, x: ship.x, y: ship.y, scaleX: ship.scaleX, scaleY: ship.scaleY } : null;
      generateEffectsParticleTextures(this.scene);
      const coreTint = mixColor(this.accentColor, 0xffffff, 0.5);
      this.core = [PARTICLE.glow, PARTICLE.flare].map((texture) =>
        this.scene!.add.image(this.originX, this.originY, texture)
          .setDepth(1001)
          .setScrollFactor(0)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setTint(coreTint)
          .setAlpha(0)
      );
      audioManager.playSfx('warpJump');
    }

    this.scene.events.on('update', this.update, this);
  }

  resize(): void {
    if (this.scene) this.syncLayout();
  }

  private syncLayout(): void {
    if (!this.scene) {
      return;
    }

    const viewport = getViewportBounds(this.scene);
    this.viewport = viewport;
    // The vanishing point sits ahead of the ship, in the upper part of the screen.
    this.originX = viewport.centerX;
    this.originY = viewport.top + viewport.height * 0.38;
    this.maxDistance = Math.hypot(viewport.width / 2, viewport.height * 0.62) + 80;
  }

  private fillScreen(graphics: Phaser.GameObjects.Graphics, color: number, alpha: number): void {
    graphics.fillStyle(color, alpha);
    graphics.fillRect(this.viewport.left, this.viewport.top, this.viewport.width, this.viewport.height);
  }

  private update(_time: number, delta: number): void {
    if (!this.running || !this.scene || !this.dim || !this.tunnel || !this.flash) return;

    this.elapsed += delta;
    const progress = clamp01(this.elapsed / this.duration);

    if (this.reducedMotion) {
      this.flash.clear();
      this.fillScreen(this.flash, 0xffffff, progress);
    } else {
      this.drawJump(progress, delta, this.dim, this.tunnel, this.flash);
    }

    if (progress >= 1) {
      // The white-out stays up until the scene shuts down, so the old scene never shows through
      // while the next one loads.
      const onComplete = this.onCompleteCallback;
      this.onCompleteCallback = null;
      this.scene.events.off('update', this.update, this);
      onComplete?.();
    }
  }

  private drawJump(
    progress: number,
    delta: number,
    dim: Phaser.GameObjects.Graphics,
    tunnel: Phaser.GameObjects.Graphics,
    flash: Phaser.GameObjects.Graphics
  ): void {
    const charge = span(progress, 0, CHARGE_END);
    const jump = span(progress, CHARGE_END, JUMP_END);
    const arrival = span(progress, JUMP_END, 1);
    // Tunnel passes per second: a slow drag while charging, then a hard kick at the jump.
    const speed = 0.12 + charge * charge * 0.5 + Phaser.Math.Easing.Cubic.Out(jump) * 2.6;
    this.travel += (speed * delta) / 1000;

    dim.clear();
    this.fillScreen(dim, 0x02040c, 0.55 * span(progress, 0, CHARGE_END * 0.8));

    tunnel.clear();
    this.drawStreaks(tunnel, speed, clamp01(charge * 1.5));
    if (jump > 0) this.drawRings(tunnel, 1 - arrival);
    this.drawGate(tunnel, charge, jump);
    this.poseCore(charge, jump, arrival);
    this.poseShip(progress, charge);

    if (jump > 0 && !this.shaken) {
      this.shaken = true;
      this.scene?.cameras.main.shake(this.duration * (1 - CHARGE_END), 0.004);
    }

    flash.clear();
    if (arrival > 0) {
      // The arrival blooms out of the vanishing point before it takes the whole screen.
      const bloom = Phaser.Math.Easing.Cubic.In(arrival);
      flash.fillStyle(0xffffff, 0.35 + 0.65 * arrival);
      flash.fillCircle(this.originX, this.originY, bloom * this.maxDistance * 1.1);
      this.fillScreen(flash, 0xffffff, span(arrival, 0.45, 1));
    }
  }

  private drawStreaks(tunnel: Phaser.GameObjects.Graphics, speed: number, visibility: number): void {
    const trail = Math.min(0.6, 0.05 + speed * 0.11);
    for (const streak of this.streaks) {
      const head = (streak.phase + this.travel * streak.pace) % 1;
      const headRadius = Math.pow(head, DEPTH_CURVE) * this.maxDistance;
      const tailRadius = Math.pow(Math.max(0, head - trail * streak.pace), DEPTH_CURVE) * this.maxDistance;
      const cos = Math.cos(streak.angle);
      const sin = Math.sin(streak.angle);
      // Streaks are born dim at the vanishing point and brighten as they rush outward.
      const alpha = visibility * clamp01(head * 3);
      const width = streak.width * (0.6 + head * 1.6);

      tunnel.lineStyle(width * 1.8, streak.color, alpha * 0.4);
      tunnel.lineBetween(
        this.originX + cos * tailRadius,
        this.originY + sin * tailRadius,
        this.originX + cos * headRadius,
        this.originY + sin * headRadius
      );
      // A white-hot core on the leading half.
      const coreRadius = (headRadius + tailRadius) / 2;
      tunnel.lineStyle(width * 0.6, 0xffffff, alpha * 0.9);
      tunnel.lineBetween(
        this.originX + cos * coreRadius,
        this.originY + sin * coreRadius,
        this.originX + cos * headRadius,
        this.originY + sin * headRadius
      );
    }
  }

  /** Tunnel ribs: rings born at the vanishing point that race out past the screen edge. */
  private drawRings(tunnel: Phaser.GameObjects.Graphics, visibility: number): void {
    for (let index = 0; index < RING_COUNT; index++) {
      const phase = (index / RING_COUNT + this.travel * 0.7) % 1;
      const radius = Math.pow(phase, DEPTH_CURVE) * this.maxDistance;
      tunnel.lineStyle(1.5 + phase * 5, this.accentColor, visibility * 0.42 * (1 - phase));
      tunnel.strokeCircle(this.originX, this.originY, radius);
    }
  }

  /** The gate: counter-rotating arcs that close onto the vanishing point, then a shockwave at the jump. */
  private drawGate(tunnel: Phaser.GameObjects.Graphics, charge: number, jump: number): void {
    if (jump === 0) {
      const closing = Phaser.Math.Easing.Cubic.InOut(charge);
      const radius = Phaser.Math.Linear(this.maxDistance * 0.5, 30, closing);
      const spin = this.elapsed / 260;
      tunnel.lineStyle(1, this.accentColor, 0.1 + closing * 0.35);
      tunnel.strokeCircle(this.originX, this.originY, radius);
      for (const [scale, turn, width] of [
        [1, spin, 2 + closing * 3],
        [0.84, -spin * 1.4, 1.5],
      ] as const) {
        tunnel.lineStyle(width, scale === 1 ? this.accentColor : 0xffffff, 0.2 + closing * 0.7);
        for (let arc = 0; arc < 3; arc++) {
          const start = turn + (arc * Math.PI * 2) / 3;
          tunnel.beginPath();
          tunnel.arc(this.originX, this.originY, radius * scale, start, start + 1.3);
          tunnel.strokePath();
        }
      }
    } else if (jump < 0.5) {
      const burst = jump / 0.5;
      tunnel.lineStyle(8 * (1 - burst) + 1.5, 0xffffff, 0.9 * (1 - burst));
      tunnel.strokeCircle(this.originX, this.originY, 30 + burst * this.maxDistance * 0.9);
    }
  }

  private poseCore(charge: number, jump: number, arrival: number): void {
    const [glow, flare] = this.core;
    if (!glow || !flare) return;
    const size = 60 + charge * 150 + jump * 260 + arrival * this.maxDistance;
    const flicker = 0.92 + Math.random() * 0.08;
    glow.setDisplaySize(size, size).setAlpha(clamp01(charge * 1.6) * flicker);
    flare.setDisplaySize(size * 2.4, size * 2.4).setAlpha(clamp01(charge * 1.2 - 0.2) * 0.85 * flicker);
  }

  /** The ship settles back while the gate charges, then stretches into a streak of light and is gone. */
  private poseShip(progress: number, charge: number): void {
    const ship = this.ship;
    if (!ship?.sprite.active) return;

    const launch = Phaser.Math.Easing.Cubic.In(span(progress, CHARGE_END, CHARGE_END + SHIP_LAUNCH_SPAN));
    const recoil = Phaser.Math.Easing.Sine.Out(charge) * 22 * (1 - launch);
    const tremble = launch === 0 ? (Math.random() - 0.5) * charge * 3 : 0;
    ship.sprite
      .setPosition(
        Phaser.Math.Linear(ship.x, this.originX, launch) + tremble,
        Phaser.Math.Linear(ship.y, this.originY, launch) + recoil
      )
      .setScale(ship.scaleX * (1 - launch * 0.8), ship.scaleY * (1 + launch * 2.4))
      .setAlpha(1 - launch * launch);
  }

  private cleanup(): void {
    if (this.scene) {
      this.scene.events.off('update', this.update, this);
    }

    for (const image of this.core) image.destroy();
    this.core = [];
    this.dim?.destroy();
    this.tunnel?.destroy();
    this.flash?.destroy();
    this.dim = null;
    this.tunnel = null;
    this.flash = null;
    this.streaks = [];
    this.ship = null;
    this.running = false;
    this.onCompleteCallback = null;
  }

  destroy(): void {
    this.cleanup();

    if (!this.scene) {
      return;
    }

    this.scene.scale.off(Phaser.Scale.Events.RESIZE, this.handleScaleResize, this);
    unbindSceneLifecycleHandlers(this.scene, {
      onShutdown: this.handleSceneShutdown,
      context: this,
    });
    this.scene = null;
  }
}
