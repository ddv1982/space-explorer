import type {
  LevelMusicConfig,
  ProceduralMusicLayerConfig,
  ProceduralMusicTrackConfig,
  ProceduralNoiseLayerConfig,
} from './types';

type TrackVariation = Partial<Omit<ProceduralMusicTrackConfig, 'bass' | 'pulse' | 'lead' | 'noise'>> & {
  bass?: Partial<ProceduralMusicLayerConfig>;
  pulse?: Partial<ProceduralMusicLayerConfig>;
  lead?: Partial<ProceduralMusicLayerConfig>;
  noise?: Partial<ProceduralNoiseLayerConfig>;
};

function withTrackVariation(base: ProceduralMusicTrackConfig, variation: TrackVariation): ProceduralMusicTrackConfig {
  return {
    ...base,
    ...variation,
    bass: variation.bass ? { ...base.bass, ...variation.bass } : base.bass,
    pulse: base.pulse
      ? variation.pulse
        ? { ...base.pulse, ...variation.pulse }
        : base.pulse
      : undefined,
    lead: base.lead
      ? variation.lead
        ? { ...base.lead, ...variation.lead }
        : base.lead
      : undefined,
    noise: base.noise
      ? variation.noise
        ? { ...base.noise, ...variation.noise }
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
