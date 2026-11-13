import Phaser from 'phaser';
import { HazardBeam } from '../entities/HazardBeam';
import { BEAM_HIT_FRACTION } from '../entities/hazardBeamGeometry';
import { getViewportBounds } from '../utils/layout';
import type { BossBeamShot } from '../entities/enemies/boss/volleys';

const SOLAR_FLARE_TINT = 0xffb066;
const LASER_LATTICE_TINT = 0xff6a8d;
const BOSS_BEAM_TINT = 0xff4f7a;
const SOLAR_FLARE_TELEGRAPH_MS = 1300;
const SOLAR_FLARE_MIN_GAP = 120;
const SOLAR_FLARE_MAX_GAP = 170;
/**
 * Lattice telegraph = reaction + reach × √(farthest distance to the gap in px). An inertial ship
 * (1600 px/s² thrust, braking at 600) covers d px in about 68 × √d ms, so this leaves a margin.
 */
const LATTICE_TELEGRAPH_BASE_MS = 450;
const LATTICE_TELEGRAPH_REACH_MS = 80;
/** How far a follow-up lattice's gap may move: an inertial ship covers 200 px in about 1 s. */
const LATTICE_FOLLOW_UP_REACH = 200;
/** Dark space between neighbouring curtain beams' hit cores; below the ship's 24 px width. */
const LATTICE_CORE_SPACING = 16;
const LASER_LATTICE_ACTIVE_MS = 2200;

export class HazardBeamSystem {
  private scene!: Phaser.Scene;
  private group!: Phaser.Physics.Arcade.Group;
  /** Gap centre of the last lattice, so a quick follow-up curtain keeps its gap within reach. */
  private lastLatticeGapCenter: number | null = null;

  create(scene: Phaser.Scene): void {
    this.lastLatticeGapCenter = null;
    this.scene = scene;
    this.group = scene.physics.add.group({
      // Uncapped: a wide-screen lattice curtain alone can need 60+ beams, and two can overlap.
      // Every beam despawns when its active window ends, so the pool stays bounded by the schedule.
      maxSize: -1,
      classType: HazardBeam,
      runChildUpdate: true,
    });
  }

  getGroup(): Phaser.Physics.Arcade.Group {
    return this.group;
  }

  /**
   * Telegraphed wall of fire that sweeps across the screen from a random edge, clearing enemy
   * bullets. It spans the full height (no flying under it) with one telegraphed gap to thread.
   */
  spawnSolarFlare(intensity: number): void {
    const viewport = getViewportBounds(this.scene);
    const fromLeft = Phaser.Math.Between(0, 1) === 0;
    const thickness = 26 + intensity * 14;
    const speed = 150 + intensity * 110;
    // Starts just inside the edge so the telegraphed wall and its gap are on screen before it fires.
    const startX = fromLeft ? viewport.left + thickness / 2 : viewport.right - thickness / 2;
    const travel = viewport.width + 60;
    const activeMs = (travel / speed) * 1000 + 200;
    const gapHeight = Phaser.Math.Clamp(viewport.height * 0.2, SOLAR_FLARE_MIN_GAP, SOLAR_FLARE_MAX_GAP);
    // The gap sits below the lattice crossbeam band, where the ship flies, never at the bottom edge.
    const lowestCenter = viewport.top + viewport.height * 0.55;
    const highestCenter = Math.max(
      lowestCenter,
      viewport.bottom - Math.max(viewport.height * 0.18, gapHeight / 2 + 48)
    );
    const gapCenter = Phaser.Math.Between(Math.round(lowestCenter), Math.round(highestCenter));
    const gapTop = gapCenter - gapHeight / 2;
    const gapBottom = gapCenter + gapHeight / 2;
    const beamTop = viewport.top - 30;
    const beamBottom = viewport.bottom + 30;
    const segment = { width: thickness, tint: SOLAR_FLARE_TINT, telegraphMs: SOLAR_FLARE_TELEGRAPH_MS };

    for (const [top, bottom] of [
      [beamTop, gapTop],
      [gapBottom, beamBottom],
    ] as const) {
      this.launchBeam({
        ...segment,
        x: startX,
        y: (top + bottom) / 2,
        height: bottom - top,
        activeMs,
        velocityX: fromLeft ? speed : -speed,
        clearsBullets: true,
      });
    }
  }

  /**
   * Laser curtain: vertical beams packed from both screen edges up to one safe gap (too close
   * together for the ship to slip between), plus a horizontal crossbeam. The telegraph is long
   * enough for an inertial ship to reach the gap from the far edge.
   */
  spawnLaserLattice(intensity: number): void {
    const viewport = getViewportBounds(this.scene);
    const thickness = 22 + intensity * 10;
    const gapWidth = Phaser.Math.Clamp(130 - intensity * 40, 80, 130);
    // Back-to-back lattices (Terminus fires one every 3.4 s) leave ~1.2 s between the previous
    // curtain expiring and the next one firing, while the ship is still held in the previous gap.
    // Keeping the new gap within LATTICE_FOLLOW_UP_REACH of the last one keeps that reachable.
    const fullMin = viewport.left + viewport.width * 0.25;
    const fullMax = viewport.right - viewport.width * 0.25;
    // After a resize the last gap can sit outside the new range; anchor on its nearest valid point.
    const anchor =
      this.lastLatticeGapCenter === null ? null : Phaser.Math.Clamp(this.lastLatticeGapCenter, fullMin, fullMax);
    const minCenter = anchor === null ? fullMin : Math.max(fullMin, anchor - LATTICE_FOLLOW_UP_REACH);
    const maxCenter = anchor === null ? fullMax : Math.min(fullMax, anchor + LATTICE_FOLLOW_UP_REACH);
    const gapCenter = Phaser.Math.Between(Math.round(minCenter), Math.round(maxCenter));
    this.lastLatticeGapCenter = gapCenter;
    const farthest = Math.max(gapCenter - viewport.left, viewport.right - gapCenter);
    const telegraphMs = Math.round(LATTICE_TELEGRAPH_BASE_MS + LATTICE_TELEGRAPH_REACH_MS * Math.sqrt(farthest));
    const beam = {
      width: thickness,
      height: viewport.height + 40,
      y: viewport.centerY,
      tint: LASER_LATTICE_TINT,
      telegraphMs,
      activeMs: LASER_LATTICE_ACTIVE_MS,
    };
    // Gaps between hit cores stay narrower than the ship, so the curtain is solid to fly into.
    const step = thickness * BEAM_HIT_FRACTION + LATTICE_CORE_SPACING;
    for (let x = gapCenter - gapWidth / 2 - thickness / 2; x > viewport.left - thickness; x -= step) {
      this.launchBeam({ ...beam, x });
    }
    for (let x = gapCenter + gapWidth / 2 + thickness / 2; x < viewport.right + thickness; x += step) {
      this.launchBeam({ ...beam, x });
    }

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
      telegraphMs,
      activeMs: LASER_LATTICE_ACTIVE_MS,
    });
  }

  /** A boss's beam: straight down from under its hull to below the screen, after its own telegraph. */
  launchBossBeam(shot: BossBeamShot): void {
    const bottom = getViewportBounds(this.scene).bottom + 30;
    this.launchBeam({
      x: shot.x,
      y: (shot.top + bottom) / 2,
      width: shot.width,
      height: bottom - shot.top,
      tint: BOSS_BEAM_TINT,
      telegraphMs: shot.telegraphMs,
      activeMs: shot.activeMs,
    });
  }

  private launchBeam(config: Parameters<HazardBeam['launch']>[0]): void {
    const beam =
      (this.group.getFirstDead(false) as HazardBeam | null) ??
      (this.group.get(config.x, config.y) as HazardBeam | null);
    beam?.launch(config);
  }
}
