import type Phaser from 'phaser';
import {
  GUN_SWAP,
  MAGNET,
  selectNextShipSystem,
  WINGMAN,
  type ShipSystems,
  type ShipSystemSlot,
} from '../config/shipSystems';
import { saveShipSystems, type PlayerStateRegistry } from './PlayerState';

/** Speed a pickup falls at when nothing pulls it (matches `PowerUp.spawn`). */
const PICKUP_FALL_SPEED = 60;
/** The drone trails the ship a little, so it reads as a companion and not part of the hull. */
const WINGMAN_FOLLOW = 0.2;
const WINGMAN_DEPTH = 5;

interface Ship {
  x: number;
  y: number;
  isAlive: boolean;
}

type Pickup = Phaser.Physics.Arcade.Sprite;

export type GunSwapOutcome = 'swapped' | 'cooling' | 'unavailable';

/**
 * The one owner of the run's current ship systems during a sector. Everything that depends on them
 * (the gun, the surge, doctrine effects) reads them from here, so a change applies at once: Magnet
 * pulls pickups in, Wingman shows its drone, and a changed main gun pays the `GUN_SWAP` cost. Times
 * are on the gameplay clock, so pause and hit-stop never run the swap cost down.
 */
export class ShipSystemsRuntime {
  private systems: ShipSystems;
  private drone: Phaser.GameObjects.Image | null = null;
  private lastGunSwapAt = Number.NEGATIVE_INFINITY;

  constructor(
    private readonly scene: Pick<Phaser.Scene, 'add'> & { registry: PlayerStateRegistry },
    private readonly ship: Ship,
    private readonly pickups: Phaser.Physics.Arcade.Group,
    systems: ShipSystems
  ) {
    this.systems = systems;
    this.syncDrone();
  }

  getSystems(): ShipSystems {
    return this.systems;
  }

  /**
   * Moves a picked slot to its next option and keeps the change for the next sector and for saves. The
   * pause panel calls this for support and doctrine; the main gun goes through `trySwapGun`.
   */
  cycleSystem(slot: ShipSystemSlot, now: number): void {
    const previous = this.systems;
    const next = selectNextShipSystem(previous, slot);
    if (next.gun !== previous.gun) this.lastGunSwapAt = now;
    this.systems = next;
    saveShipSystems(this.scene.registry, next);
    // Pickups the magnet was pulling go back to falling instead of drifting on forever.
    if (previous.support === 'magnet' && next.support !== 'magnet') this.releasePickups();
    this.syncDrone();
  }

  /** Cycles the main gun when the run has one and the last swap has cooled down. */
  trySwapGun(now: number): GunSwapOutcome {
    if (this.systems.gun === null) return 'unavailable';
    if (this.getGunSwapCooldownRatio(now) > 0) return 'cooling';
    this.cycleSystem('gun', now);
    return 'swapped';
  }

  /** True while a freshly swapped gun is still coming online. */
  isGunSilenced(now: number): boolean {
    return now - this.lastGunSwapAt < GUN_SWAP.fireSilenceMs;
  }

  /** Share of the swap cooldown still to run: 1 right after a swap, 0 when the next swap is ready. */
  getGunSwapCooldownRatio(now: number): number {
    return Math.min(1, Math.max(0, 1 - (now - this.lastGunSwapAt) / GUN_SWAP.cooldownMs));
  }

  update(): void {
    if (this.drone) {
      this.drone.setVisible(this.ship.isAlive);
      this.drone.x += (this.ship.x + WINGMAN.offsetX - this.drone.x) * WINGMAN_FOLLOW;
      this.drone.y += (this.ship.y + WINGMAN.offsetY - this.drone.y) * WINGMAN_FOLLOW;
    }
    if (this.systems.support === 'magnet') this.pullPickups();
  }

  private syncDrone(): void {
    if (this.systems.support !== 'wingman') {
      this.drone?.destroy();
      this.drone = null;
    } else if (!this.drone) {
      this.drone = this.scene.add
        .image(this.ship.x + WINGMAN.offsetX, this.ship.y + WINGMAN.offsetY, 'helper-ship')
        .setScale(0.7)
        .setDepth(WINGMAN_DEPTH);
    }
  }

  private pullPickups(): void {
    for (const child of this.pickups.getChildren()) {
      const pickup = child as Pickup;
      if (!pickup.active) continue;
      const dx = this.ship.x - pickup.x;
      const dy = this.ship.y - pickup.y;
      const distance = Math.hypot(dx, dy);
      if (!this.ship.isAlive || distance > MAGNET.radius || distance < 1) {
        pickup.setVelocity(0, PICKUP_FALL_SPEED);
      } else {
        pickup.setVelocity((dx / distance) * MAGNET.pullSpeed, (dy / distance) * MAGNET.pullSpeed);
      }
    }
  }

  private releasePickups(): void {
    for (const child of this.pickups.getChildren()) {
      const pickup = child as Pickup;
      if (pickup.active) pickup.setVelocity(0, PICKUP_FALL_SPEED);
    }
  }
}
