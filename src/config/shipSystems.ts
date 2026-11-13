/**
 * Ship systems: free picks that change how the ship plays, offered at the refit bay. Once picked, a slot
 * can be changed to another of its options: freely at any later refit bay, and mid-run the main gun on
 * the swap key or touch button (`GUN_SWAP` keeps it a decision), support and doctrine from the pause panel. Nothing else needs input,
 * so touch and keyboard stay equal. Stat upgrades are bought separately.
 */
export type MainGunId = 'lance' | 'scatter' | 'seekers';
type SupportSystemId = 'magnet' | 'surgeCore' | 'wingman';
type LateSystemId = 'overdrive' | 'bulwark' | 'salvager';
export type ShipSystemId = MainGunId | SupportSystemId | LateSystemId;
export type ShipSystemSlot = 'gun' | 'support' | 'late';

export interface ShipSystems {
  /** Null keeps the standard bolt. */
  gun: MainGunId | null;
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
    slot: 'gun',
    title: 'MAIN GUN',
    shortTitle: 'GUN',
    offeredAfterLevel: 2,
    options: [
      { id: 'lance', name: 'LANCE', description: 'Slower shots that pierce every ship in a line.' },
      { id: 'scatter', name: 'SCATTER', description: 'Three-way spread. Strong up close, thin at range.' },
      { id: 'seekers', name: 'SEEKERS', description: 'Shots curve toward targets. Slow to fire, rarely miss.' },
    ],
  },
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

export const NO_SHIP_SYSTEMS: ShipSystems = { gun: null, support: null, late: null };

/** A slot's title and options, e.g. to offer them again at the refit bay. */
export function getShipSystemSlot(slot: ShipSystemSlot): ShipSystemSlotDef {
  // Every slot is authored above, so the lookup cannot miss.
  return SHIP_SYSTEM_SLOTS.find((def) => def.slot === slot)!;
}

function optionIds(slot: ShipSystemSlot): readonly ShipSystemId[] {
  return getShipSystemSlot(slot).options.map((option) => option.id);
}

/** Clamps untrusted persisted picks to the authored options. */
export function normalizeShipSystems(value: unknown): ShipSystems {
  const record = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const pick = <T extends ShipSystemId>(slot: ShipSystemSlot): T | null =>
    optionIds(slot).includes(record[slot] as ShipSystemId) ? (record[slot] as T) : null;
  return { gun: pick('gun'), support: pick('support'), late: pick('late') };
}

/** The pick to offer after clearing `level`: the earliest unlocked slot that is still empty. */
export function getPendingShipSystemSlot(level: number, systems: ShipSystems): ShipSystemSlotDef | null {
  return SHIP_SYSTEM_SLOTS.find((def) => level >= def.offeredAfterLevel && systems[def.slot] === null) ?? null;
}

/** Puts `id` in its slot. Usable anywhere a pick changes: the refit bay, the swap key, the pause panel. */
export function setShipSystem(systems: ShipSystems, slot: ShipSystemSlot, id: ShipSystemId): ShipSystems {
  return normalizeShipSystems({ ...systems, [slot]: id });
}

/** The slot's next option, wrapping around (Lance -> Scatter -> Seekers -> Lance). An empty slot stays empty. */
export function selectNextShipSystem(systems: ShipSystems, slot: ShipSystemSlot): ShipSystems {
  const current = systems[slot];
  if (current === null) return systems;
  const ids = optionIds(slot);
  return setShipSystem(systems, slot, ids[(ids.indexOf(current) + 1) % ids.length]);
}

interface PickedShipSystem {
  slot: ShipSystemSlot;
  /** The slot's title, e.g. `MAIN GUN`. */
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

/** The display name of a system, e.g. `SCATTER`. */
export function getShipSystemName(id: ShipSystemId): string {
  return SHIP_SYSTEM_SLOTS.flatMap((def) => def.options).find((option) => option.id === id)?.name ?? '';
}

/** The picks as one line for a save slot, e.g. `SYSTEMS: LANCE · MAGNET`; empty with none. */
export function describeShipSystems(systems: ShipSystems): string {
  const names = describePickedShipSystems(systems).map((picked) => picked.option.name);
  return names.length > 0 ? `SYSTEMS: ${names.join(' · ')}` : '';
}

/** Main-gun firing patterns. Damage per shot is unchanged; the fire cooldown pays for the pattern. */
export interface MainGunProfile {
  /** Multiplies the fire cooldown. */
  cooldownScale: number;
  /** Shot directions in degrees off straight ahead. */
  spreadDegrees: readonly number[];
  pierce: boolean;
  /** Turn rate toward the nearest target, in degrees per second (0 flies straight). */
  seekDegreesPerSecond: number;
}

const STANDARD_GUN: MainGunProfile = { cooldownScale: 1, spreadDegrees: [0], pierce: false, seekDegreesPerSecond: 0 };

/**
 * Tuned by measurement, not only arithmetic: 40 s of sector 5 with autofire and a sweeping ship scored
 * 72k-132k with the standard gun over four runs, and each of these landed inside that spread.
 */
const GUN_PROFILES: Record<MainGunId, MainGunProfile> = {
  // One target: 0.77x the standard gun. Two in a line: 1.54x. Rewards lining ships up.
  lance: { cooldownScale: 1.3, spreadDegrees: [0], pierce: true, seekDegreesPerSecond: 0 },
  // All three hit up close: 1.67x. Only the centre shot at range: 0.56x. Rewards flying in.
  scatter: { cooldownScale: 1.8, spreadDegrees: [-13, 0, 13], pierce: false, seekDegreesPerSecond: 0 },
  // Half the shots of the standard gun, but almost every one connects. Rewards dodging over aiming.
  seekers: { cooldownScale: 2, spreadDegrees: [0], pierce: false, seekDegreesPerSecond: 150 },
};

export function getMainGunProfile(gun: MainGunId | null): MainGunProfile {
  return gun ? GUN_PROFILES[gun] : STANDARD_GUN;
}

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
/**
 * Changing the main gun mid-run, counted on the gameplay clock: the next change waits `cooldownMs` and
 * the new gun stays silent for `fireSilenceMs`, so swapping is a decision and never a free best-of-all.
 */
export const GUN_SWAP = { cooldownMs: 2000, fireSilenceMs: 500 } as const;
