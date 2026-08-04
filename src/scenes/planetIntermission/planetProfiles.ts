export interface PlanetIntermissionProfile {
  level: number;
  levelName: string;
  approachCode: string;
  classification: string;
  signalLabel: string;
  orbitTilt: number;
  satelliteCount: number;
}

export const PLANET_INTERMISSION_PROFILES: readonly PlanetIntermissionProfile[] = Object.freeze([
  {
    level: 1,
    levelName: 'Aurora Threshold',
    approachCode: 'AURORA RELAY',
    classification: 'LUMINOUS GATEWORLD',
    signalLabel: 'CURRENT STABLE',
    orbitTilt: -12,
    satelliteCount: 1,
  },
  {
    level: 2,
    levelName: 'Tideglass Shallows',
    approachCode: 'PRISM SHOAL',
    classification: 'GLASS-TIDE OCEAN',
    signalLabel: 'PORTALS ECHOING',
    orbitTilt: 8,
    satelliteCount: 2,
  },
  {
    level: 3,
    levelName: 'Ember Monsoon',
    approachCode: 'EMBER FRONT',
    classification: 'VOLCANIC STORMWORLD',
    signalLabel: 'PYRE SIGNATURE',
    orbitTilt: -18,
    satelliteCount: 1,
  },
  {
    level: 4,
    levelName: 'Clockwork Causeway',
    approachCode: 'CHRONO HUB',
    classification: 'MECHANIZED ORBIT',
    signalLabel: 'GEARS SYNCHRONIZED',
    orbitTilt: 4,
    satelliteCount: 3,
  },
  {
    level: 5,
    levelName: 'Shatter Reef',
    approachCode: 'CORAL BREACH',
    classification: 'SHATTERED REEF WORLD',
    signalLabel: 'BROOD MULTIPLYING',
    orbitTilt: 15,
    satelliteCount: 2,
  },
  {
    level: 6,
    levelName: 'Debris Gauntlet',
    approachCode: 'FALLEN BASTION',
    classification: 'WRECK-FORTRESS',
    signalLabel: 'GAUNTLET CLEARED',
    orbitTilt: -7,
    satelliteCount: 3,
  },
  {
    level: 7,
    levelName: 'Hollow Choir',
    approachCode: 'GHOSTLIGHT VAULT',
    classification: 'CATHEDRAL MOON',
    signalLabel: 'CHOIR RESONANT',
    orbitTilt: 11,
    satelliteCount: 1,
  },
  {
    level: 8,
    levelName: 'Eclipse Narrows',
    approachCode: 'ECLIPSE KEEP',
    classification: 'UMBRAL CITADEL',
    signalLabel: 'CONVOY IN SHADOW',
    orbitTilt: -3,
    satelliteCount: 2,
  },
  {
    level: 9,
    levelName: 'Swarmfront',
    approachCode: 'HIVE FOUNDRY',
    classification: 'INDUSTRIAL BROODWORLD',
    signalLabel: 'HIVE STILL ACTIVE',
    orbitTilt: 17,
    satelliteCount: 3,
  },
  {
    level: 10,
    levelName: 'Eventide Engine',
    approachCode: 'EVENTIDE CORE',
    classification: 'SINGULARITY ENGINE',
    signalLabel: 'CORE POWERING DOWN',
    orbitTilt: -9,
    satelliteCount: 0,
  },
]);

export function getPlanetIntermissionProfile(level: number): PlanetIntermissionProfile {
  const normalizedLevel = Math.floor(level);
  const profile = PLANET_INTERMISSION_PROFILES.find((entry) => entry.level === normalizedLevel);

  if (!profile) {
    throw new Error(`Missing planet intermission profile for level ${level}`);
  }

  return profile;
}
