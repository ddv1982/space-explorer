export type EnemyType = 'scout' | 'fighter' | 'bomber' | 'swarm' | 'gunship';

export interface EnemySpawnConfig {
  type: EnemyType;
  weight: number;
}

export interface EncounterSizeConfig {
  min: number;
  max: number;
}

export interface BossConfig {
  maxHp: number;
  phase1Cooldown: number;
  phase2Cooldown: number;
  phase2MoveSpeed: number;
  phase1SpreadShotCount: number;
  phase1SpreadArcDegrees: number;
  phase1BulletSpeedScale: number;
  phase2SpiralShotCount: number;
  phase2SpiralTurnRate: number;
  phase2BulletSpeedScale: number;
}

export interface LevelConfig {
  name: string;
  planetName: string;
  bgColor: string;
  accentColor: number;
  nebulaColor: number;
  nebulaAlpha: number;
  colorGrade: { brightness: number; contrast: number; saturation: number } | null;
  enemies: EnemySpawnConfig[];
  encounterSize: EncounterSizeConfig;
  spawnRateMultiplier: number;
  levelDistance: number;
  hasBoss: boolean;
  boss: BossConfig | null;
  bossTriggerProgress: number;
  asteroidInterval: number;
}

const LEVELS: LevelConfig[] = [
  {
    name: 'Asteroid Belt Alpha',
    planetName: 'Kepler-7b',
    bgColor: '#000011',
    accentColor: 0x00ccff,
    nebulaColor: 0x1133aa,
    nebulaAlpha: 0.08,
    colorGrade: { brightness: 0.02, contrast: 1.03, saturation: 1.05 },
    enemies: [
      { type: 'scout', weight: 80 },
      { type: 'fighter', weight: 20 },
    ],
    encounterSize: { min: 1, max: 2 },
    spawnRateMultiplier: 1.0,
    levelDistance: 7200,
    hasBoss: false,
    boss: null,
    bossTriggerProgress: 0.8,
    asteroidInterval: 5000,
  },
  {
    name: 'Nebula Pass',
    planetName: 'Vega Prime',
    bgColor: '#100022',
    accentColor: 0x8844ff,
    nebulaColor: 0x4422aa,
    nebulaAlpha: 0.12,
    colorGrade: { brightness: 0.06, contrast: 1.08, saturation: 1.18 },
    enemies: [
      { type: 'scout', weight: 50 },
      { type: 'fighter', weight: 30 },
      { type: 'bomber', weight: 20 },
    ],
    encounterSize: { min: 1, max: 2 },
    spawnRateMultiplier: 1.2,
    levelDistance: 8400,
    hasBoss: false,
    boss: null,
    bossTriggerProgress: 0.8,
    asteroidInterval: 4500,
  },
  {
    name: 'Ion Storm Sector',
    planetName: 'Rigel Station',
    bgColor: '#001108',
    accentColor: 0x44ff88,
    nebulaColor: 0x116633,
    nebulaAlpha: 0.10,
    colorGrade: { brightness: 0.08, contrast: 1.12, saturation: 0.92 },
    enemies: [
      { type: 'scout', weight: 35 },
      { type: 'fighter', weight: 30 },
      { type: 'bomber', weight: 15 },
      { type: 'swarm', weight: 20 },
    ],
    encounterSize: { min: 1, max: 2 },
    spawnRateMultiplier: 1.4,
    levelDistance: 9600,
    hasBoss: true,
    boss: {
      maxHp: 48,
      phase1Cooldown: 1200,
      phase2Cooldown: 650,
      phase2MoveSpeed: 150,
      phase1SpreadShotCount: 5,
      phase1SpreadArcDegrees: 60,
      phase1BulletSpeedScale: 0.8,
      phase2SpiralShotCount: 3,
      phase2SpiralTurnRate: 60,
      phase2BulletSpeedScale: 0.9,
    },
    bossTriggerProgress: 0.72,
    asteroidInterval: 4000,
  },
  {
    name: 'Warzone Corridor',
    planetName: 'Antares Fortress',
    bgColor: '#180900',
    accentColor: 0xff4444,
    nebulaColor: 0x662211,
    nebulaAlpha: 0.10,
    colorGrade: { brightness: 0.03, contrast: 1.14, saturation: 1.24 },
    enemies: [
      { type: 'scout', weight: 20 },
      { type: 'fighter', weight: 25 },
      { type: 'bomber', weight: 20 },
      { type: 'swarm', weight: 15 },
      { type: 'gunship', weight: 20 },
    ],
    encounterSize: { min: 2, max: 2 },
    spawnRateMultiplier: 1.7,
    levelDistance: 10800,
    hasBoss: true,
    boss: {
      maxHp: 62,
      phase1Cooldown: 1000,
      phase2Cooldown: 525,
      phase2MoveSpeed: 175,
      phase1SpreadShotCount: 7,
      phase1SpreadArcDegrees: 72,
      phase1BulletSpeedScale: 0.9,
      phase2SpiralShotCount: 4,
      phase2SpiralTurnRate: 78,
      phase2BulletSpeedScale: 0.98,
    },
    bossTriggerProgress: 0.68,
    asteroidInterval: 3500,
  },
  {
    name: 'Deep Space Inferno',
    planetName: 'Betelgeuse Gate',
    bgColor: '#18010c',
    accentColor: 0xff4488,
    nebulaColor: 0x661133,
    nebulaAlpha: 0.12,
    colorGrade: { brightness: 0.02, contrast: 1.18, saturation: 1.32 },
    enemies: [
      { type: 'scout', weight: 15 },
      { type: 'fighter', weight: 25 },
      { type: 'bomber', weight: 20 },
      { type: 'swarm', weight: 20 },
      { type: 'gunship', weight: 20 },
    ],
    encounterSize: { min: 2, max: 3 },
    spawnRateMultiplier: 2.0,
    levelDistance: 12000,
    hasBoss: true,
    boss: {
      maxHp: 80,
      phase1Cooldown: 850,
      phase2Cooldown: 425,
      phase2MoveSpeed: 205,
      phase1SpreadShotCount: 9,
      phase1SpreadArcDegrees: 84,
      phase1BulletSpeedScale: 1,
      phase2SpiralShotCount: 5,
      phase2SpiralTurnRate: 96,
      phase2BulletSpeedScale: 1.05,
    },
    bossTriggerProgress: 0.64,
    asteroidInterval: 3000,
  },
];

export function getLevelConfig(levelNumber: number): LevelConfig {
  const index = Math.min(levelNumber - 1, LEVELS.length - 1);
  return LEVELS[Math.max(0, index)];
}

export function getTotalLevels(): number {
  return LEVELS.length;
}

export function isLastLevel(levelNumber: number): boolean {
  return levelNumber >= LEVELS.length;
}
