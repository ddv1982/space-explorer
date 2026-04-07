export interface MusicFXChain {
  widener: StereoPannerNode | null;
  reverbDelay: DelayNode | null;
  reverbGain: GainNode | null;
}

export function setMusicBusReverbGain(
  ctx: AudioContext,
  musicFX: MusicFXChain | null,
  value: number,
  rampSeconds = 0.12
): void {
  const reverbGain = musicFX?.reverbGain;
  if (!reverbGain) {
    return;
  }

  const clampedValue = Math.max(0, Math.min(0.45, value));
  reverbGain.gain.cancelScheduledValues(ctx.currentTime);
  reverbGain.gain.setValueAtTime(reverbGain.gain.value, ctx.currentTime);
  reverbGain.gain.linearRampToValueAtTime(clampedValue, ctx.currentTime + Math.max(0.01, rampSeconds));
}

function disconnectNode(node: AudioNode | null): void {
  if (!node) {
    return;
  }

  try {
    node.disconnect();
  } catch {
    // Best effort cleanup
  }
}

function createAmbientReverb(ctx: AudioContext): { delay: DelayNode; gain: GainNode } {
  const delay = ctx.createDelay();
  delay.delayTime.value = 0.25;

  const gain = ctx.createGain();
  gain.gain.value = 0.12;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 2800;
  filter.Q.value = 0.5;

  delay.connect(filter);
  filter.connect(gain);

  return { delay, gain };
}

export function disconnectMusicBus(musicGain: GainNode | null, musicFX: MusicFXChain | null): void {
  disconnectNode(musicGain);
  disconnectNode(musicFX?.widener ?? null);
  disconnectNode(musicFX?.reverbDelay ?? null);
  disconnectNode(musicFX?.reverbGain ?? null);
}

export function recreateMusicBus(
  ctx: AudioContext,
  masterGain: GainNode,
  currentGain: GainNode | null,
  currentFX: MusicFXChain | null
): { musicGain: GainNode; musicFX: MusicFXChain } {
  disconnectMusicBus(currentGain, currentFX);

  const musicGain = ctx.createGain();
  musicGain.gain.value = 0.001;

  const widener = ctx.createStereoPanner();
  widener.pan.value = 0;

  const reverb = createAmbientReverb(ctx);
  const musicFX: MusicFXChain = {
    widener,
    reverbDelay: reverb.delay,
    reverbGain: reverb.gain,
  };

  musicGain.connect(widener);
  widener.connect(masterGain);

  musicGain.connect(reverb.delay);
  reverb.gain.connect(masterGain);

  return { musicGain, musicFX };
}
