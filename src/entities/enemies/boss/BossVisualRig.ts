import Phaser from 'phaser';

interface OptionalShapeFactory {
  circle?: (
    x: number,
    y: number,
    radius: number,
    fillColor?: number,
    fillAlpha?: number
  ) => Phaser.GameObjects.Arc;
  ellipse?: (
    x: number,
    y: number,
    width: number,
    height: number,
    fillColor?: number,
    fillAlpha?: number
  ) => Phaser.GameObjects.Ellipse;
}

/**
 * Render-only hardpoints, command core, aura, and shield for a pooled boss.
 * These shapes are deliberately not physics objects and never receive input.
 */
export class BossVisualRig {
  private readonly aura: Phaser.GameObjects.Ellipse | null;
  private readonly shield: Phaser.GameObjects.Ellipse | null;
  private readonly core: Phaser.GameObjects.Arc | null;
  private readonly hardpoints: Phaser.GameObjects.Arc[];

  constructor(scene: Phaser.Scene) {
    const factory = scene.add as unknown as OptionalShapeFactory;
    if (!factory.circle || !factory.ellipse) {
      this.aura = null;
      this.shield = null;
      this.core = null;
      this.hardpoints = [];
      return;
    }

    this.aura = factory.ellipse(0, 0, 108, 72, 0xff5577, 0.045)
      .setStrokeStyle(2, 0xff6688, 0.12)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(2)
      .setVisible(false);
    this.shield = factory.ellipse(0, 0, 104, 70, 0x77ccff, 0.035)
      .setStrokeStyle(2, 0xa8e7ff, 0.72)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(4)
      .setVisible(false);
    this.core = factory.circle(0, 0, 5, 0xffd7e0, 0.9)
      .setStrokeStyle(2, 0xff6688, 0.72)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(4)
      .setVisible(false);
    this.hardpoints = [-31, 31].map((offset) => factory.circle!(offset, 0, 3.2, 0xff6688, 0.72)
      .setStrokeStyle(1, 0xffffff, 0.5)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(4)
      .setVisible(false));
  }

  update(params: {
    active: boolean;
    x: number;
    y: number;
    time: number;
    phase: number;
    shieldActive: boolean;
    guardBroken: boolean;
  }): void {
    const objects = [this.aura, this.shield, this.core, ...this.hardpoints].filter(
      (object): object is Phaser.GameObjects.Arc | Phaser.GameObjects.Ellipse => object !== null
    );
    for (const object of objects) {
      object.setVisible(params.active);
    }
    if (!params.active || !this.aura || !this.shield || !this.core) {
      return;
    }

    const pulse = (Math.sin(params.time * (params.phase === 2 ? 0.008 : 0.0045)) + 1) * 0.5;
    this.aura.setPosition(params.x, params.y + 2).setScale(0.98 + pulse * 0.08);
    this.aura.setAlpha(0.42 + pulse * 0.3);
    this.shield.setPosition(params.x, params.y).setVisible(params.shieldActive);
    this.shield.setScale(0.98 + pulse * 0.045).setAlpha(0.62 + pulse * 0.28);
    this.core.setPosition(params.x, params.y - 1).setScale(0.82 + pulse * 0.44);
    this.core.setFillStyle(params.guardBroken ? 0xffd76a : params.phase === 2 ? 0xffffff : 0xffd7e0, 0.92);
    this.hardpoints.forEach((hardpoint, index) => {
      hardpoint.setPosition(params.x + (index === 0 ? -31 : 31), params.y + 5);
      hardpoint.setScale(0.82 + (1 - pulse) * 0.32);
      hardpoint.setFillStyle(params.phase === 2 ? 0xff335f : 0xff6688, 0.78);
    });
  }

  hide(): void {
    this.update({
      active: false,
      x: 0,
      y: 0,
      time: 0,
      phase: 1,
      shieldActive: false,
      guardBroken: false,
    });
  }
}
