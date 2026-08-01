import Phaser from 'phaser';
import { HazardBeam } from '../entities/HazardBeam';
import { getViewportBounds } from '../utils/layout';

const SOLAR_FLARE_TINT = 0xffb066;
const LASER_LATTICE_TINT = 0xff6a8d;
const SOLAR_FLARE_TELEGRAPH_MS = 700;
const LASER_LATTICE_TELEGRAPH_MS = 800;
const LASER_LATTICE_ACTIVE_MS = 2200;

export class HazardBeamSystem {
  private scene!: Phaser.Scene;
  private group!: Phaser.Physics.Arcade.Group;

  create(scene: Phaser.Scene): void {
    this.scene = scene;
    this.group = scene.physics.add.group({
      maxSize: 8,
      classType: HazardBeam,
      runChildUpdate: true,
    });
  }

  getGroup(): Phaser.Physics.Arcade.Group {
    return this.group;
  }

  /** Telegraphed beam that sweeps across the screen from a random edge, clearing enemy bullets. */
  spawnSolarFlare(intensity: number): void {
    const viewport = getViewportBounds(this.scene);
    const fromLeft = Phaser.Math.Between(0, 1) === 0;
    const thickness = 26 + intensity * 14;
    const speed = 150 + intensity * 110;
    const startX = fromLeft ? viewport.left - 30 : viewport.right + 30;
    const travel = viewport.width + 60;
    const activeMs = (travel / speed) * 1000 + 200;

    this.launchBeam({
      x: startX,
      y: viewport.centerY,
      width: thickness,
      height: viewport.height + 60,
      tint: SOLAR_FLARE_TINT,
      telegraphMs: SOLAR_FLARE_TELEGRAPH_MS,
      activeMs,
      velocityX: fromLeft ? speed : -speed,
      clearsBullets: true,
    });
  }

  /** Timed vertical beam pair with a safe gap, plus a horizontal crossbeam. */
  spawnLaserLattice(intensity: number): void {
    const viewport = getViewportBounds(this.scene);
    const thickness = 22 + intensity * 10;
    const gapWidth = Phaser.Math.Clamp(130 - intensity * 40, 80, 130);
    const gapCenter = Phaser.Math.Between(
      Math.round(viewport.left + viewport.width * 0.25),
      Math.round(viewport.right - viewport.width * 0.25)
    );

    const beamHeight = viewport.height + 40;
    const leftBeamX = gapCenter - gapWidth / 2 - thickness / 2;
    const rightBeamX = gapCenter + gapWidth / 2 + thickness / 2;

    this.launchBeam({
      x: leftBeamX,
      y: viewport.centerY,
      width: thickness,
      height: beamHeight,
      tint: LASER_LATTICE_TINT,
      telegraphMs: LASER_LATTICE_TELEGRAPH_MS,
      activeMs: LASER_LATTICE_ACTIVE_MS,
    });
    this.launchBeam({
      x: rightBeamX,
      y: viewport.centerY,
      width: thickness,
      height: beamHeight,
      tint: LASER_LATTICE_TINT,
      telegraphMs: LASER_LATTICE_TELEGRAPH_MS,
      activeMs: LASER_LATTICE_ACTIVE_MS,
    });

    const crossY = Phaser.Math.Between(
      Math.round(viewport.top + viewport.height * 0.2),
      Math.round(viewport.top + viewport.height * 0.45)
    );
    this.launchBeam({
      x: viewport.centerX,
      y: crossY,
      width: viewport.width + 40,
      height: thickness,
      tint: LASER_LATTICE_TINT,
      telegraphMs: LASER_LATTICE_TELEGRAPH_MS,
      activeMs: LASER_LATTICE_ACTIVE_MS,
    });
  }

  private launchBeam(config: Parameters<HazardBeam['launch']>[0]): void {
    const beam =
      (this.group.getFirstDead(false) as HazardBeam | null) ??
      (this.group.get(config.x, config.y) as HazardBeam | null);
    beam?.launch(config);
  }
}
