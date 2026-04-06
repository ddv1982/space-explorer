export type EnemyType = 'scout' | 'fighter' | 'bomber' | 'swarm' | 'gunship';

export interface EnemySpawnConfig {
  type: EnemyType;
  weight: number;
}

export interface EncounterSizeConfig {
  min: number;
  max: number;
}

export type BossAttackStyle =
  | 'barrage'
  | 'pressure'
  | 'maelstrom'
  | 'carrier'
  | 'pursuit'
  | 'bulwark';

export interface BossConfig {
  name: string;
  maxHp: number;
  phase1Cooldown: number;
  phase2Cooldown: number;
  phase2MoveSpeed: number;
  attackStyle: BossAttackStyle;
  phase1SpreadShotCount: number;
  phase1SpreadArcDegrees: number;
  phase1BulletSpeedScale: number;
  phase2SpiralShotCount: number;
  phase2SpiralTurnRate: number;
  phase2BulletSpeedScale: number;
}

export type LevelPacingPhase = 'intro' | 'build' | 'hazard' | 'climax' | 'boss-approach';

export type HazardType =
  | 'ambient-asteroids'
  | 'debris-surge'
  | 'minefield'
  | 'nebula-ambush'
  | 'ring-crossfire'
  | 'rock-corridor'
  | 'energy-storm'
  | 'gravity-well';

export interface LevelThemeSummary {
  destination: string;
  visualTheme: string;
  coreGameplayIdea: string;
  pacingSummary: string;
  enemyCompositionSummary: string;
  hazardSummary: string;
  bossConcept: string;
  difficultyRole: string;
  journeyNote: string;
}

export interface ScriptedHazardConfig {
  type: HazardType;
  cadenceMs?: number;
  durationMs?: number;
  laneCount?: number;
  corridorWidth?: number;
  damage?: number;
  intensity?: number;
  notes?: string;
}

export interface LevelSectionConfig {
  id: string;
  label: string;
  startProgress: number;
  endProgress: number;
  phase: LevelPacingPhase;
  summary: string;
  enemyFocus?: EnemySpawnConfig[];
  encounterSizeOverride?: EncounterSizeConfig;
  spawnRateMultiplier?: number;
  asteroidInterval?: number;
  hazardEvents?: ScriptedHazardConfig[];
  musicIntensity?: number;
}

export type MusicWaveform = OscillatorType;
export type MusicStep = number | null;

export interface ProceduralMusicLayerConfig {
  waveform: MusicWaveform;
  pattern: MusicStep[];
  gain: number;
  durationSteps: number;
  octaveShift?: number;
  detune?: number;
  filterHz?: number;
}

export interface ProceduralNoiseLayerConfig {
  pattern: Array<0 | 1>;
  gain: number;
  filterHz: number;
  durationSteps: number;
}

export interface ProceduralMusicTrackConfig {
  tempo: number;
  rootHz: number;
  stepsPerBeat: number;
  masterGain: number;
  bass: ProceduralMusicLayerConfig;
  pulse?: ProceduralMusicLayerConfig;
  lead?: ProceduralMusicLayerConfig;
  noise?: ProceduralNoiseLayerConfig;
}

export interface LevelMusicConfig {
  cueName: string;
  mood: string;
  tempoFeel: string;
  musicalStyle: string;
  intensity: string;
  shiftMoments: string[];
  bossCueName: string;
  stage: ProceduralMusicTrackConfig;
  boss: ProceduralMusicTrackConfig;
}

export interface LevelConfig extends LevelThemeSummary {
  name: string;
  planetName: string;
  bgColor: string;
  accentColor: number;
  nebulaColor: number;
  nebulaAlpha: number;
  colorGrade: { brightness: number; contrast: number; saturation: number } | null;
  planetPalette: [number, number];
  enemies: EnemySpawnConfig[];
  encounterSize: EncounterSizeConfig;
  spawnRateMultiplier: number;
  levelDistance: number;
  hasBoss: boolean;
  boss: BossConfig | null;
  bossTriggerProgress: number;
  asteroidInterval: number;
  sections: LevelSectionConfig[];
  music: LevelMusicConfig;
}
