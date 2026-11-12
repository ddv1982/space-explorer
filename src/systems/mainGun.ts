import type { BulletBehaviour, BulletTargetFinder } from '../entities/Bullet';
import { PLAYER_CONFIG } from '../config/playerConfig';
import { getMainGunProfile, OVERDRIVE_COOLDOWN_STEP, WINGMAN, type ShipSystems } from '../config/shipSystems';
import { resolvePlayerFireCooldownMs } from './chainOverdrive';

interface Point {
  x: number;
  y: number;
}

export interface MainGunVolley {
  systems: ShipSystems;
  /** Counts volleys since the run began, so the Wingman fires on every Nth. */
  volleyIndex: number;
  origin: Point;
  /** Unit vector the ship fires along. */
  direction: Point;
  speed: number;
  findTarget: BulletTargetFinder;
  fire(x: number, y: number, velocityX: number, velocityY: number, behaviour?: BulletBehaviour): void;
}

function rotate(direction: Point, degrees: number): Point {
  const radians = (degrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return { x: direction.x * cos - direction.y * sin, y: direction.x * sin + direction.y * cos };
}

/** Fires one volley of the picked main gun, plus the Wingman's shot when it is due. */
export function fireMainGunVolley(volley: MainGunVolley): void {
  const profile = getMainGunProfile(volley.systems.gun);
  const behaviour: BulletBehaviour | undefined =
    profile.pierce || profile.seekDegreesPerSecond > 0
      ? {
          pierce: profile.pierce,
          seekDegreesPerSecond: profile.seekDegreesPerSecond,
          findTarget: profile.seekDegreesPerSecond > 0 ? volley.findTarget : undefined,
        }
      : undefined;

  for (const degrees of profile.spreadDegrees) {
    const heading = degrees === 0 ? volley.direction : rotate(volley.direction, degrees);
    volley.fire(volley.origin.x, volley.origin.y, heading.x * volley.speed, heading.y * volley.speed, behaviour);
  }

  if (volley.systems.support === 'wingman' && volley.volleyIndex % WINGMAN.everyNthVolley === 0) {
    // The drone fires a plain bolt straight ahead, whatever the main gun is.
    volley.fire(
      volley.origin.x + WINGMAN.offsetX,
      volley.origin.y + WINGMAN.offsetY,
      volley.direction.x * volley.speed,
      volley.direction.y * volley.speed
    );
  }
}

/**
 * The main gun's cooldown: the ship's fire rate, stretched by the gun's pattern, then shortened by the
 * score chain. Overdrive rewards every chain step; without it only the max chain speeds the gun up.
 */
export function resolveMainGunCooldownMs(fireRateMs: number, chainMultiplier: number, systems: ShipSystems): number {
  const patterned = fireRateMs * getMainGunProfile(systems.gun).cooldownScale;
  if (systems.late !== 'overdrive') return resolvePlayerFireCooldownMs(patterned, chainMultiplier);
  const steps = Math.max(0, Math.floor(chainMultiplier) - 1);
  return Math.max(PLAYER_CONFIG.absoluteMinFireRate, patterned * (1 - OVERDRIVE_COOLDOWN_STEP * steps));
}
