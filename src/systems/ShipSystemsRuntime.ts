import type Phaser from 'phaser';
import { MAGNET, WINGMAN, type ShipSystems } from '../config/shipSystems';

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

/**
 * The always-on parts of the picked support system: Magnet pulls pickups in and Wingman shows its
 * drone. (The drone's shots come from `fireMainGunVolley`; Surge Core is tuning on the surge itself.)
 */
export class ShipSystemsRuntime {
  private drone: Phaser.GameObjects.Image | null = null;

  constructor(
    scene: Phaser.Scene,
    private readonly ship: Ship,
    private readonly pickups: Phaser.Physics.Arcade.Group,
    private readonly systems: ShipSystems
  ) {
    if (systems.support === 'wingman') {
      this.drone = scene.add
        .image(ship.x + WINGMAN.offsetX, ship.y + WINGMAN.offsetY, 'helper-ship')
        .setScale(0.7)
        .setDepth(WINGMAN_DEPTH);
    }
  }

  update(): void {
    if (this.drone) {
      this.drone.setVisible(this.ship.isAlive);
      this.drone.x += (this.ship.x + WINGMAN.offsetX - this.drone.x) * WINGMAN_FOLLOW;
      this.drone.y += (this.ship.y + WINGMAN.offsetY - this.drone.y) * WINGMAN_FOLLOW;
    }
    if (this.systems.support === 'magnet') this.pullPickups();
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
}
