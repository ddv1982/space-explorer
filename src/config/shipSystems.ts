/**
 * Ship systems: free picks that change how the ship plays, offered at the refit bay. Once picked, a slot
 * can be changed to another of its options: freely at any later refit bay, and mid-run from the pause
 * panel. Nothing needs input, so touch and keyboard stay equal. Stat upgrades are bought separately.
 *
 * The main gun is not a pick: from sector 3 on the ship flies Lance, and the swap key borrows one of the
 * two special guns for as long as `SPECIAL_GUN_CHARGE` lasts (see below).
 */
export type MainGunId = 'lance' | 'scatter' | 'seekers';
type SupportSystemId = 'magnet' | 'surgeCore' | 'wingman';
type LateSystemId = 'overdrive' | 'bulwark' | 'salvager';
export type ShipSystemId = SupportSystemId | LateSystemId;
export type ShipSystemSlot = 'support' | 'late';

export interface ShipSystems {
  support: SupportSystemId | null;
  late: LateSystemId | null;
}

interface ShipSystemOption {
  id: ShipSystemId;
  name: string;
  description: string;
}

export interface ShipSystemSlotDef {
  slot: ShipSystemSlot;
  title: string;
  /** For narrow spaces, e.g. three systems side by side at the refit bay. */
  shortTitle: string;
  /** Offered at the refit bay after clearing this sector (and later, until a pick is made). */
  offeredAfterLevel: number;
  options: readonly [ShipSystemOption, ShipSystemOption, ShipSystemOption];
}

const SHIP_SYSTEM_SLOTS: readonly ShipSystemSlotDef[] = [
  {
    slot: 'support',
    title: 'SUPPORT SYSTEM',
    shortTitle: 'SUPPORT',
    offeredAfterLevel: 5,
    options: [
      { id: 'magnet', name: 'MAGNET', description: 'Pickups drift toward your ship.' },
      {
        id: 'surgeCore',
        name: 'SURGE CORE',
        description: 'Close calls charge the surge faster and it reaches further.',
      },
      { id: 'wingman', name: 'WINGMAN', description: 'A drone at your side adds a shot to every other volley.' },
    ],
  },
  {
    slot: 'late',
    title: 'COMBAT DOCTRINE',
    shortTitle: 'DOCTRINE',
    offeredAfterLevel: 8,
    options: [
      { id: 'overdrive', name: 'OVERDRIVE', description: 'Every step of your score chain speeds up the gun.' },
      { id: 'bulwark', name: 'BULWARK', description: 'When a shield absorbs a hit, nearby enemy shots are cleared.' },
      { id: 'salvager', name: 'SALVAGER', description: 'Aces drop two pickups instead of one.' },
    ],
  },
];

export const NO_SHIP_SYSTEMS: ShipSystems = { support: null, late: null };

/** A slot's title and options, e.g. to offer them again at the refit bay. */
export function getShipSystemSlot(slot: ShipSystemSlot): ShipSystemSlotDef {
  // Every slot is authored above, so the lookup cannot miss.
  return SHIP_SYSTEM_SLOTS.find((def) => def.slot === slot)!;
}

function optionIds(slot: ShipSystemSlot): readonly ShipSystemId[] {
  return getShipSystemSlot(slot).options.map((option) => option.id);
}

/** Clamps untrusted persisted picks to the authored options; anything else stored with them is dropped. */
export function normalizeShipSystems(value: unknown): ShipSystems {
  const record = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const pick = <T extends ShipSystemId>(slot: ShipSystemSlot): T | null =>
    optionIds(slot).includes(record[slot] as ShipSystemId) ? (record[slot] as T) : null;
  return { support: pick('support'), late: pick('late') };
}

/** The pick to offer after clearing `level`: the earliest unlocked slot that is still empty. */
export function getPendingShipSystemSlot(level: number, systems: ShipSystems): ShipSystemSlotDef | null {
  return SHIP_SYSTEM_SLOTS.find((def) => level >= def.offeredAfterLevel && systems[def.slot] === null) ?? null;
}

/** Puts `id` in its slot. Usable anywhere a pick changes: the refit bay and the pause panel. */
export function setShipSystem(systems: ShipSystems, slot: ShipSystemSlot, id: ShipSystemId): ShipSystems {
  return normalizeShipSystems({ ...systems, [slot]: id });
}

/** The slot's next option, wrapping around (Magnet -> Surge Core -> Wingman -> Magnet). An empty slot stays empty. */
export function selectNextShipSystem(systems: ShipSystems, slot: ShipSystemSlot): ShipSystems {
  const current = systems[slot];
  if (current === null) return systems;
  const ids = optionIds(slot);
  return setShipSystem(systems, slot, ids[(ids.indexOf(current) + 1) % ids.length]);
}

interface PickedShipSystem {
  slot: ShipSystemSlot;
  /** The slot's title, e.g. `SUPPORT SYSTEM`. */
  title: string;
  shortTitle: string;
  option: ShipSystemOption;
}

/** The run's picks in slot order, for the pause panel and the refit bay; empty slots are left out. */
export function describePickedShipSystems(systems: ShipSystems): PickedShipSystem[] {
  return SHIP_SYSTEM_SLOTS.flatMap((def) => {
    const option = def.options.find((candidate) => candidate.id === systems[def.slot]);
    return option ? [{ slot: def.slot, title: def.title, shortTitle: def.shortTitle, option }] : [];
  });
}

/** The picks as one line for a save slot, e.g. `SYSTEMS: MAGNET · BULWARK`; empty with none. */
export function describeShipSystems(systems: ShipSystems): string {
  const names = describePickedShipSystems(systems).map((picked) => picked.option.name);
  return names.length > 0 ? `SYSTEMS: ${names.join(' · ')}` : '';
}

/**
 * How a gun's shots look: a frame of the shared `player-bullet` texture, so every gun's fire batches
 * together. Each look says what the gun does (a long piercing lance, short pellets, homing darts) while
 * staying in the friendly cyan-white family; the hitbox is the same for all of them.
 */
export type PlayerShotLook = 'bolt' | 'lance' | 'pellet' | 'dart';

/** Main-gun firing patterns. Damage per shot is unchanged; the fire cooldown pays for the pattern. */
export interface MainGunProfile {
  /** Shown in the HUD and flashed over the ship on a change, e.g. `SCATTER`. */
  name: string;
  look: PlayerShotLook;
  /** Multiplies the fire cooldown. */
  cooldownScale: number;
  /** Shot directions in degrees off straight ahead. */
  spreadDegrees: readonly number[];
  pierce: boolean;
  /** Turn rate toward the nearest target, in degrees per second (0 flies straight). */
  seekDegreesPerSecond: number;
}

const STANDARD_GUN: MainGunProfile = {
  name: 'STANDARD',
  look: 'bolt',
  cooldownScale: 1,
  spreadDegrees: [0],
  pierce: false,
  seekDegreesPerSecond: 0,
};

/**
 * Lance is the home gun from sector 3 on; Scatter and Seekers are the special guns, used on the charge.
 * Tuned by measurement, not only arithmetic: 40 s of sector 5 with autofire and a sweeping ship scored
 * 72k-132k with the standard gun over four runs, and each of these landed inside that spread.
 */
const GUN_PROFILES: Record<MainGunId, MainGunProfile> = {
  // One target: 0.77x the standard gun. Two in a line: 1.54x. Rewards lining ships up.
  lance: {
    name: 'LANCE',
    look: 'lance',
    cooldownScale: 1.3,
    spreadDegrees: [0],
    pierce: true,
    seekDegreesPerSecond: 0,
  },
  // All three hit up close: 1.67x. Only the centre shot at range: 0.56x. Rewards flying in.
  scatter: {
    name: 'SCATTER',
    look: 'pellet',
    cooldownScale: 1.8,
    spreadDegrees: [-13, 0, 13],
    pierce: false,
    seekDegreesPerSecond: 0,
  },
  // Half the shots of the standard gun, but almost every one connects. Rewards dodging over aiming.
  seekers: {
    name: 'SEEKERS',
    look: 'dart',
    cooldownScale: 2,
    spreadDegrees: [0],
    pierce: false,
    seekDegreesPerSecond: 150,
  },
};

/** The order the swap key steps through: Lance -> Scatter -> Seekers -> Lance. */
const MAIN_GUN_CYCLE: readonly MainGunId[] = ['lance', 'scatter', 'seekers'];

export function getMainGunProfile(gun: MainGunId | null): MainGunProfile {
  return gun ? GUN_PROFILES[gun] : STANDARD_GUN;
}

export function getNextMainGun(gun: MainGunId): MainGunId {
  return MAIN_GUN_CYCLE[(MAIN_GUN_CYCLE.indexOf(gun) + 1) % MAIN_GUN_CYCLE.length];
}

/**
 * The special-gun charge: one meter (0 empty, 1 full) on the gameplay clock, so pause and hit-stop never
 * run it. Sectors before `fromLevel` fly the standard gun and have no meter; from there the ship flies
 * Lance and the swap key steps to Scatter, Seekers and back.
 * - `drainMs`: a full meter lasts this long while a special gun is selected; at empty the gun returns
 *   to Lance by itself.
 * - `refillMs`: on Lance an empty meter refills in this long, plus `perKill` for every enemy destroyed.
 *   It never refills while a special gun is selected.
 * - `minToLeaveLance`: leaving Lance needs at least this much; below it the swap is refused. Moving
 *   between the special guns, or back to Lance, is always allowed.
 * The meter starts full every sector and after every respawn or checkpoint load, and is never saved.
 */
export const SPECIAL_GUN_CHARGE = {
  fromLevel: 3,
  drainMs: 10_000,
  refillMs: 30_000,
  perKill: 0.02,
  minToLeaveLance: 0.2,
} as const;

/** Surge Core: grazes count for more and the pulse clears a wider circle. */
export const SURGE_CORE = { grazeValueScale: 1.6, clearRadiusScale: 1.35 } as const;
/** Magnet: pickups within this distance drift toward the ship at this speed. */
export const MAGNET = { radius: 260, pullSpeed: 220 } as const;
/** Wingman: the drone sits at this offset and fires on every Nth volley. */
export const WINGMAN = { offsetX: 34, offsetY: 10, everyNthVolley: 2 } as const;
/** Overdrive: fire cooldown falls by this share per chain step above x1 (x5 gives 24% faster). */
export const OVERDRIVE_COOLDOWN_STEP = 0.06;
/** Bulwark: a shield hit clears enemy shots inside this radius. */
export const BULWARK_CLEAR_RADIUS = 160;
