import Phaser from 'phaser';
import { PARTICLE } from './particleTextureFactory';

export interface EngineFlameTarget {
  x: number;
  y: number;
  rotation: number;
  visible: boolean;
  alpha: number;
  depth: number;
  body?: { velocity: { y: number } } | null;
}

/** Nozzle layout of the player hull, in logical px from its centre. */
const NOZZLE = { offsetX: 4, offsetY: 20 } as const;

/**
 * A steady twin-engine flame for a ship: white-hot cores in a blue plume that flicker, and stretch when
 * the ship thrusts forward. It follows its target after every update (also while paused, so a frozen
 * ship keeps burning) and is purely visual.
 */
export class EngineFlame {
  private readonly cores: Phaser.GameObjects.Image[];
  private readonly plume: Phaser.GameObjects.Image;
  private readonly reducedMotion: boolean;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly target: EngineFlameTarget
  ) {
    const flame = (tint: number, originY: number) =>
      scene.add.image(0, 0, PARTICLE.glow).setBlendMode(Phaser.BlendModes.ADD).setTint(tint).setOrigin(0.5, originY);
    this.plume = flame(0x2f94ff, 0.2);
    this.cores = [flame(0xdffbff, 0.25), flame(0xdffbff, 0.25)];
    this.reducedMotion =
      typeof window !== 'undefined' && (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
    scene.events.on(Phaser.Scenes.Events.POST_UPDATE, this.sync, this);
    this.sync();
  }

  private sync(): void {
    const { target } = this;
    const time = this.scene.time.now;
    const flicker = this.reducedMotion ? 1 : 0.85 + 0.15 * Math.sin(time / 31) * Math.sin(time / 19);
    const forward = Phaser.Math.Clamp(-(target.body?.velocity.y ?? 0) / 800, 0, 1);
    const length = (1 + forward * 0.7) * flicker;
    const cos = Math.cos(target.rotation);
    const sin = Math.sin(target.rotation);
    const tailX = target.x - sin * NOZZLE.offsetY;
    const tailY = target.y + cos * NOZZLE.offsetY;
    const visible = target.visible && target.alpha > 0.05;
    const depth = target.depth - 0.01;

    this.plume
      .setPosition(tailX, tailY)
      .setDisplaySize(13, 26 * length)
      .setRotation(target.rotation)
      .setAlpha(0.5 * target.alpha)
      .setVisible(visible)
      .setDepth(depth);
    this.cores.forEach((core, index) => {
      const side = index === 0 ? -1 : 1;
      core
        .setPosition(tailX + side * NOZZLE.offsetX * cos, tailY + side * NOZZLE.offsetX * sin)
        .setDisplaySize(5, 13 * length)
        .setRotation(target.rotation)
        .setAlpha(target.alpha)
        .setVisible(visible)
        .setDepth(depth);
    });
  }

  destroy(): void {
    this.scene.events.off(Phaser.Scenes.Events.POST_UPDATE, this.sync, this);
    this.plume.destroy();
    for (const core of this.cores) core.destroy();
  }
}
