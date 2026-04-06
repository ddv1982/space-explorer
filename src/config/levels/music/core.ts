import type {
  LevelMusicConfig,
  ProceduralMusicLayerConfig,
  ProceduralMusicLayerExpressionConfig,
  ProceduralMusicTrackConfig,
  ProceduralMusicTrackExpressionConfig,
  ProceduralNoiseLayerConfig,
  ProceduralNoiseLayerExpressionConfig,
} from '../types';

type LayerVariation = Partial<Omit<ProceduralMusicLayerConfig, 'expression'>> & {
  expression?: Partial<ProceduralMusicLayerExpressionConfig>;
};

type NoiseVariation = Partial<Omit<ProceduralNoiseLayerConfig, 'expression'>> & {
  expression?: Partial<ProceduralNoiseLayerExpressionConfig>;
};

type TrackVariation = Partial<Omit<ProceduralMusicTrackConfig, 'bass' | 'pulse' | 'lead' | 'noise' | 'expression'>> & {
  expression?: Partial<ProceduralMusicTrackExpressionConfig>;
  bass?: LayerVariation;
  pulse?: LayerVariation;
  lead?: LayerVariation;
  noise?: NoiseVariation;
};

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

function withLayerVariation(base: ProceduralMusicLayerConfig, variation: LayerVariation): ProceduralMusicLayerConfig {
  return {
    ...base,
    ...variation,
    expression: mergeLayerExpression(base.expression, variation.expression),
  };
}

function withNoiseVariation(base: ProceduralNoiseLayerConfig, variation: NoiseVariation): ProceduralNoiseLayerConfig {
  return {
    ...base,
    ...variation,
    expression: mergeNoiseExpression(base.expression, variation.expression),
  };
}

function withTrackVariation(base: ProceduralMusicTrackConfig, variation: TrackVariation): ProceduralMusicTrackConfig {
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
