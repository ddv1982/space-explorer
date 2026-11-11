import type { AudioContextManager } from './AudioContextManager';
import { SFX, type SfxDefinition, type SfxId } from './sfx/recipes';
import { renderSfx } from './sfx/render';

interface SfxState {
  variants: AudioBuffer[];
  activeVoices: number;
  lastPlayedAt: number;
  nextVariant: number;
}

function hashId(id: string): number {
  let hash = 2166136261;
  for (let i = 0; i < id.length; i++) {
    hash = Math.imul(hash ^ id.charCodeAt(i), 16777619);
  }
  return hash >>> 0;
}

/** Renders each sound's variants once, then plays them back as cheap buffer voices. */
export class SfxPlayer {
  private readonly states = new Map<SfxId, SfxState>();
  private renderedFor: AudioContext | null = null;
  private prewarmedFor: AudioContext | null = null;

  constructor(private readonly contextManager: AudioContextManager) {}

  /**
   * Renders every sound ahead of use, one per timer tick, so the first shot or explosion never
   * pays for rendering inside a gameplay frame. Safe to call on every scene start.
   */
  prewarm(): void {
    const ctx = this.contextManager.getCtx();
    if (!ctx || this.prewarmedFor === ctx) return;
    this.prewarmedFor = ctx;

    const pending = Object.keys(SFX) as SfxId[];
    const renderNext = (): void => {
      const id = pending.shift();
      if (!id || this.contextManager.getCtx() !== ctx) return;
      this.getState(ctx, id, SFX[id]);
      setTimeout(renderNext, 0);
    };
    setTimeout(renderNext, 0);
  }

  /** `pan` runs from -1 (left edge) to 1 (right edge). */
  play(id: SfxId, pan = 0): void {
    if (!this.contextManager.ensureContext()) return;
    const ctx = this.contextManager.getCtx();
    const bus = this.contextManager.getSfxBus();
    if (!ctx || !bus) return;

    const definition: SfxDefinition = SFX[id];
    const state = this.getState(ctx, id, definition);
    const now = ctx.currentTime;
    if (state.activeVoices >= definition.maxVoices) return;
    if (definition.minIntervalMs && now - state.lastPlayedAt < definition.minIntervalMs / 1000) return;

    const source = ctx.createBufferSource();
    source.buffer = state.variants[state.nextVariant];
    state.nextVariant = (state.nextVariant + 1) % state.variants.length;

    const gain = ctx.createGain();
    gain.gain.value = definition.gain;
    source.connect(gain);

    let output: AudioNode = gain;
    if (pan !== 0 && typeof ctx.createStereoPanner === 'function') {
      const panner = ctx.createStereoPanner();
      panner.pan.value = Math.min(1, Math.max(-1, pan));
      gain.connect(panner);
      output = panner;
    }
    output.connect(bus);

    state.activeVoices += 1;
    state.lastPlayedAt = now;
    source.onended = () => {
      state.activeVoices -= 1;
      output.disconnect();
    };
    source.start(now);

    if (definition.duck) {
      this.contextManager.duckMusic(definition.duck.depth, definition.duck.seconds);
    }
  }

  private getState(ctx: AudioContext, id: SfxId, definition: SfxDefinition): SfxState {
    if (this.renderedFor !== ctx) {
      this.states.clear();
      this.renderedFor = ctx;
    }

    let state = this.states.get(id);
    if (!state) {
      const seed = hashId(id);
      const variants: AudioBuffer[] = [];
      for (let index = 0; index < definition.variants; index++) {
        // Variants spread evenly across the jitter range, so neighbours are audibly different.
        const spread = definition.variants > 1 ? (index / (definition.variants - 1)) * 2 - 1 : 0;
        const samples = renderSfx(definition.layers, {
          sampleRate: ctx.sampleRate,
          seed: seed + index * 7919,
          pitchScale: Math.pow(2, (spread * definition.jitter) / 12),
        });
        const buffer = ctx.createBuffer(1, samples.length, ctx.sampleRate);
        buffer.getChannelData(0).set(samples);
        variants.push(buffer);
      }
      state = { variants, activeVoices: 0, lastPlayedAt: -Infinity, nextVariant: 0 };
      this.states.set(id, state);
    }
    return state;
  }
}
