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
  // VAT emotion targets for this section
  vatTarget?: {
    valence: number;   // -1.0 to 1.0
    arousal: number;   // 0.0 to 1.0
    tension: number;   // 0.0 to 1.0
  };
  tensionArc?: 'constant' | 'gradualBuild' | 'buildRelease' | 'waves';
}

export type MusicWaveform = OscillatorType;
export type MusicStep = number | null;

export type MusicEnvelopeCurve = 'linear' | 'soft' | 'hard';

export interface MusicEnvelopeShapeConfig {
  attack?: number;
  decay?: number;
  sustain?: number;
  release?: number;
  curve?: MusicEnvelopeCurve;
}

export interface MusicStereoMotionConfig {
  pan?: number;
  width?: number;
  rateHz?: number;
  phaseOffset?: number;
}

export type MusicModulationTarget = 'gain' | 'filter' | 'pitch' | 'pan';

export interface MusicModulationConfig {
  target?: MusicModulationTarget;
  depth?: number;
  rateHz?: number;
  waveform?: MusicWaveform | 'random';
}

export interface MusicAccentConfig {
  amount?: number;
  patternBias?: number;
  emphasisSteps?: number[];
}

export type MusicNoiseColor = 'white' | 'pink' | 'brown';
export type MusicNoiseTexture = 'smooth' | 'grainy' | 'shimmer';

export interface MusicNoiseCharacterConfig {
  color?: MusicNoiseColor;
  texture?: MusicNoiseTexture;
  drift?: number;
  burst?: number;
}

export interface ProceduralMusicLayerExpressionConfig {
  envelope?: MusicEnvelopeShapeConfig;
  stereo?: MusicStereoMotionConfig;
  modulation?: MusicModulationConfig;
  accent?: MusicAccentConfig;
}

export interface ProceduralNoiseLayerExpressionConfig extends ProceduralMusicLayerExpressionConfig {
  noiseCharacter?: MusicNoiseCharacterConfig;
}

export interface ProceduralMusicTrackExpressionConfig {
  stereo?: MusicStereoMotionConfig;
  modulation?: MusicModulationConfig;
  accent?: MusicAccentConfig;
}

export interface ProceduralMusicLayerConfig {
  waveform: MusicWaveform;
  pattern: MusicStep[];
  gain: number;
  durationSteps: number;
  octaveShift?: number;
  detune?: number;
  filterHz?: number;
  expression?: ProceduralMusicLayerExpressionConfig;
}

export interface ProceduralNoiseLayerConfig {
  pattern: Array<0 | 1>;
  gain: number;
  filterHz: number;
  durationSteps: number;
  expression?: ProceduralNoiseLayerExpressionConfig;
}

export interface ProceduralMusicTrackConfig {
  tempo: number;
  rootHz: number;
  stepsPerBeat: number;
  masterGain: number;
  expression?: ProceduralMusicTrackExpressionConfig;
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
  moonSurface?: MoonSurfaceConfig;
  passingPlanets?: PassingPlanetConfig[];
}

export interface MoonSurfaceConfig {
  scrollSpeed: number;
  surfaceColor: number;
  accentColor: number;
  buildingCount: number;
  craterCount: number;
  horizonGlow: number;
}

export interface PassingPlanetConfig {
  scrollSpeed: number;
  planetPalette: [number, number];
  size: number;
  yPosition: number;
  alpha: number;
  ringChance: number;
}
