export type EnemyType = 'scout' | 'fighter' | 'bomber' | 'swarm' | 'gunship';

export interface EnemySpawnConfig {
  type: EnemyType;
  weight: number;
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
  spawnRateMultiplier: number;
  levelDistance: number;
  hasBoss: boolean;
  bossTriggerProgress: number;
  asteroidInterval: number;
}

export const LEVELS: LevelConfig[] = [
  {
    name: 'Asteroid Belt Alpha',
    planetName: 'Kepler-7b',
    bgColor: '#000011',
    accentColor: 0x00ccff,
    nebulaColor: 0x1133aa,
    nebulaAlpha: 0.08,
    colorGrade: null,
    enemies: [
      { type: 'scout', weight: 80 },
      { type: 'fighter', weight: 20 },
    ],
    spawnRateMultiplier: 1.0,
    levelDistance: 10000,
    hasBoss: false,
    bossTriggerProgress: 0.8,
    asteroidInterval: 5000,
  },
  {
    name: 'Nebula Pass',
    planetName: 'Vega Prime',
    bgColor: '#0a0018',
    accentColor: 0x8844ff,
    nebulaColor: 0x4422aa,
    nebulaAlpha: 0.12,
    colorGrade: { brightness: 0, contrast: 1.1, saturation: 1.2 },
    enemies: [
      { type: 'scout', weight: 50 },
      { type: 'fighter', weight: 30 },
      { type: 'bomber', weight: 20 },
    ],
    spawnRateMultiplier: 1.2,
    levelDistance: 12000,
    hasBoss: false,
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
    colorGrade: { brightness: 0.05, contrast: 1.15, saturation: 0.9 },
    enemies: [
      { type: 'scout', weight: 35 },
      { type: 'fighter', weight: 30 },
      { type: 'bomber', weight: 15 },
      { type: 'swarm', weight: 20 },
    ],
    spawnRateMultiplier: 1.4,
    levelDistance: 14000,
    hasBoss: true,
    bossTriggerProgress: 0.75,
    asteroidInterval: 4000,
  },
  {
    name: 'Warzone Corridor',
    planetName: 'Antares Fortress',
    bgColor: '#110500',
    accentColor: 0xff4444,
    nebulaColor: 0x662211,
    nebulaAlpha: 0.10,
    colorGrade: { brightness: -0.05, contrast: 1.2, saturation: 1.3 },
    enemies: [
      { type: 'scout', weight: 20 },
      { type: 'fighter', weight: 25 },
      { type: 'bomber', weight: 20 },
      { type: 'swarm', weight: 15 },
      { type: 'gunship', weight: 20 },
    ],
    spawnRateMultiplier: 1.7,
    levelDistance: 16000,
    hasBoss: true,
    bossTriggerProgress: 0.7,
    asteroidInterval: 3500,
  },
  {
    name: 'Deep Space Inferno',
    planetName: 'Betelgeuse Gate',
    bgColor: '#110008',
    accentColor: 0xff4488,
    nebulaColor: 0x661133,
    nebulaAlpha: 0.12,
    colorGrade: { brightness: -0.08, contrast: 1.25, saturation: 1.4 },
    enemies: [
      { type: 'scout', weight: 15 },
      { type: 'fighter', weight: 25 },
      { type: 'bomber', weight: 20 },
      { type: 'swarm', weight: 20 },
      { type: 'gunship', weight: 20 },
    ],
    spawnRateMultiplier: 2.0,
    levelDistance: 18000,
    hasBoss: true,
    bossTriggerProgress: 0.65,
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
