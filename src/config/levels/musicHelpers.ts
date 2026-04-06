import type {
  LevelMusicConfig,
  ProceduralMusicLayerConfig,
  ProceduralMusicLayerExpressionConfig,
  ProceduralMusicTrackConfig,
  ProceduralMusicTrackExpressionConfig,
  ProceduralNoiseLayerConfig,
  ProceduralNoiseLayerExpressionConfig,
} from './types';

export type LayerVariation = Partial<Omit<ProceduralMusicLayerConfig, 'expression'>> & {
  expression?: Partial<ProceduralMusicLayerExpressionConfig>;
};

export type NoiseVariation = Partial<Omit<ProceduralNoiseLayerConfig, 'expression'>> & {
  expression?: Partial<ProceduralNoiseLayerExpressionConfig>;
};

export type TrackVariation = Partial<Omit<ProceduralMusicTrackConfig, 'bass' | 'pulse' | 'lead' | 'noise' | 'expression'>> & {
  expression?: Partial<ProceduralMusicTrackExpressionConfig>;
  bass?: LayerVariation;
  pulse?: LayerVariation;
  lead?: LayerVariation;
  noise?: NoiseVariation;
};

export const layerExpressionPresets = {
  pad: {
    envelope: { attack: 0.16, release: 0.24, curve: 'soft' },
  },
  pluck: {
    envelope: { attack: 0.01, decay: 0.12, sustain: 0.55, release: 0.08, curve: 'hard' },
  },
  swell: {
    envelope: { attack: 0.28, decay: 0.18, sustain: 0.82, release: 0.3, curve: 'soft' },
  },
  drift: {
    stereo: { width: 0.35, rateHz: 0.08, phaseOffset: 0.25 },
  },
  orbit: {
    stereo: { width: 0.75, rateHz: 0.18, phaseOffset: 0.5 },
  },
  vibrato: {
    modulation: { target: 'pitch', depth: 10, rateHz: 5, waveform: 'sine' },
  },
  tremolo: {
    modulation: { target: 'gain', depth: 0.18, rateHz: 4, waveform: 'triangle' },
  },
  gentleAccent: {
    accent: { amount: 0.12, patternBias: 0.2 },
  },
  drivingAccent: {
    accent: { amount: 0.24, patternBias: 0.55 },
  },
} as const satisfies Record<string, ProceduralMusicLayerExpressionConfig>;

export const trackExpressionPresets = {
  subtleWidth: {
    stereo: { width: 0.25, rateHz: 0.04 },
  },
  orbit: {
    stereo: { width: 0.6, rateHz: 0.12, phaseOffset: 0.5 },
  },
  chase: {
    modulation: { target: 'filter', depth: 380, rateHz: 1.5, waveform: 'triangle' },
    accent: { amount: 0.2, patternBias: 0.4 },
  },
} as const satisfies Record<string, ProceduralMusicTrackExpressionConfig>;

export const noiseExpressionPresets = {
  air: {
    noiseCharacter: { color: 'pink', texture: 'smooth', drift: 0.1 },
  },
  grit: {
    noiseCharacter: { color: 'white', texture: 'grainy', drift: 0.18, burst: 0.12 },
    accent: { amount: 0.16, patternBias: 0.3 },
  },
  rumble: {
    noiseCharacter: { color: 'brown', texture: 'smooth', drift: 0.08, burst: 0.2 },
  },
  shimmer: {
    noiseCharacter: { color: 'pink', texture: 'shimmer', drift: 0.14 },
    stereo: { width: 0.4, rateHz: 0.1 },
  },
} as const satisfies Record<string, ProceduralNoiseLayerExpressionConfig>;

function mergeLayerExpression(
  base?: ProceduralMusicLayerExpressionConfig,
  variation?: Partial<ProceduralMusicLayerExpressionConfig>
): ProceduralMusicLayerExpressionConfig | undefined {
  const envelope = base?.envelope || variation?.envelope ? { ...base?.envelope, ...variation?.envelope } : undefined;
  const stereo = base?.stereo || variation?.stereo ? { ...base?.stereo, ...variation?.stereo } : undefined;
  const modulation = base?.modulation || variation?.modulation ? { ...base?.modulation, ...variation?.modulation } : undefined;
  const accent = base?.accent || variation?.accent ? { ...base?.accent, ...variation?.accent } : undefined;

  if (!envelope && !stereo && !modulation && !accent) {
    return undefined;
  }

  return { envelope, stereo, modulation, accent };
}

function mergeNoiseExpression(
  base?: ProceduralNoiseLayerExpressionConfig,
  variation?: Partial<ProceduralNoiseLayerExpressionConfig>
): ProceduralNoiseLayerExpressionConfig | undefined {
  const expression = mergeLayerExpression(base, variation);
  const noiseCharacter =
    base?.noiseCharacter || variation?.noiseCharacter
      ? { ...base?.noiseCharacter, ...variation?.noiseCharacter }
      : undefined;

  if (!expression && !noiseCharacter) {
    return undefined;
  }

  return { ...expression, noiseCharacter };
}

function mergeTrackExpression(
  base?: ProceduralMusicTrackExpressionConfig,
  variation?: Partial<ProceduralMusicTrackExpressionConfig>
): ProceduralMusicTrackExpressionConfig | undefined {
  const stereo = base?.stereo || variation?.stereo ? { ...base?.stereo, ...variation?.stereo } : undefined;
  const modulation = base?.modulation || variation?.modulation ? { ...base?.modulation, ...variation?.modulation } : undefined;
  const accent = base?.accent || variation?.accent ? { ...base?.accent, ...variation?.accent } : undefined;

  if (!stereo && !modulation && !accent) {
    return undefined;
  }

  return { stereo, modulation, accent };
}

export function withLayerVariation(base: ProceduralMusicLayerConfig, variation: LayerVariation): ProceduralMusicLayerConfig {
  return {
    ...base,
    ...variation,
    expression: mergeLayerExpression(base.expression, variation.expression),
  };
}

export function withNoiseVariation(base: ProceduralNoiseLayerConfig, variation: NoiseVariation): ProceduralNoiseLayerConfig {
  return {
    ...base,
    ...variation,
    expression: mergeNoiseExpression(base.expression, variation.expression),
  };
}

export function withTrackVariation(base: ProceduralMusicTrackConfig, variation: TrackVariation): ProceduralMusicTrackConfig {
  return {
    ...base,
    ...variation,
    expression: mergeTrackExpression(base.expression, variation.expression),
    bass: variation.bass ? withLayerVariation(base.bass, variation.bass) : base.bass,
    pulse: base.pulse
      ? variation.pulse
        ? withLayerVariation(base.pulse, variation.pulse)
        : base.pulse
      : undefined,
    lead: base.lead
      ? variation.lead
        ? withLayerVariation(base.lead, variation.lead)
        : base.lead
      : undefined,
    noise: base.noise
      ? variation.noise
        ? withNoiseVariation(base.noise, variation.noise)
        : base.noise
      : undefined,
  };
}

export function createMusicProfile(
  meta: Omit<LevelMusicConfig, 'stage' | 'boss'>,
  stage: ProceduralMusicTrackConfig,
  bossVariation: TrackVariation
): LevelMusicConfig {
  return {
    ...meta,
    stage,
    boss: withTrackVariation(stage, bossVariation),
  };
}
