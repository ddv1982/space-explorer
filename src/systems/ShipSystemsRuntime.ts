import type Phaser from 'phaser';
import {
  getNextMainGun,
  MAGNET,
  selectNextShipSystem,
  SPECIAL_GUN_CHARGE,
  WINGMAN,
  type MainGunId,
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

export type GunSwapOutcome = 'swapped' | 'low-charge' | 'unavailable';

/**
 * The one owner of the run's current ship systems and main gun during a sector. Everything that depends
 * on them (the gun, the surge, doctrine effects, the HUD) reads them from here, so a change applies at
 * once: Magnet pulls pickups in, Wingman shows its drone, and a special gun runs the
 * `SPECIAL_GUN_CHARGE` meter down. The meter counts gameplay time only, so pause and hit-stop never run it.
 */
export class ShipSystemsRuntime {
  private systems: ShipSystems;
  private drone: Phaser.GameObjects.Image | null = null;
  /** Null flies the standard gun: sectors before `SPECIAL_GUN_CHARGE.fromLevel`. */
  private gun: MainGunId | null;
  private gunCharge = 1;

  constructor(
    private readonly scene: Pick<Phaser.Scene, 'add'> & { registry: PlayerStateRegistry },
    private readonly ship: Ship,
    private readonly pickups: Phaser.Physics.Arcade.Group,
    systems: ShipSystems,
    level: number
  ) {
    this.systems = systems;
    this.gun = level >= SPECIAL_GUN_CHARGE.fromLevel ? 'lance' : null;
    this.syncDrone();
  }

  getSystems(): ShipSystems {
    return this.systems;
  }

  getGun(): MainGunId | null {
    return this.gun;
  }

  /** The special-gun meter, 0 empty to 1 full. */
  getGunCharge(): number {
    return this.gunCharge;
  }

  /** Steps Lance -> Scatter -> Seekers -> Lance. Leaving Lance needs `minToLeaveLance` charge. */
  trySwapGun(): GunSwapOutcome {
    if (this.gun === null) return 'unavailable';
    if (this.gun === 'lance' && this.gunCharge < SPECIAL_GUN_CHARGE.minToLeaveLance) return 'low-charge';
    this.gun = getNextMainGun(this.gun);
    return 'swapped';
  }

  /**
   * Runs the meter for one gameplay frame: a special gun drains it, Lance refills it. Returns true on the
   * frame an empty meter hands the gun back to Lance.
   */
  updateGunCharge(deltaMs: number): boolean {
    if (this.gun === null) return false;
    if (this.gun === 'lance') {
      this.gunCharge = Math.min(1, this.gunCharge + deltaMs / SPECIAL_GUN_CHARGE.refillMs);
      return false;
    }
    this.gunCharge = Math.max(0, this.gunCharge - deltaMs / SPECIAL_GUN_CHARGE.drainMs);
    if (this.gunCharge > 0) return false;
    this.gun = 'lance';
    return true;
  }

  /** An enemy destroyed tops the meter up, but only while on Lance. */
  recordKill(): void {
    if (this.gun === 'lance') this.gunCharge = Math.min(1, this.gunCharge + SPECIAL_GUN_CHARGE.perKill);
  }

  /** A respawn starts over on Lance with a full meter. */
  resetGunCharge(): void {
    if (this.gun !== null) this.gun = 'lance';
    this.gunCharge = 1;
  }

  /**
   * Moves a picked slot to its next option and keeps the change for the next sector and for saves. The
   * pause panel calls this for support and doctrine.
   */
  cycleSystem(slot: ShipSystemSlot): void {
    const previous = this.systems;
    const next = selectNextShipSystem(previous, slot);
    this.systems = next;
    saveShipSystems(this.scene.registry, next);
    // Pickups the magnet was pulling go back to falling instead of drifting on forever.
    if (previous.support === 'magnet' && next.support !== 'magnet') this.releasePickups();
    this.syncDrone();
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
