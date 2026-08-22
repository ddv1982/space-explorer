import Phaser from 'phaser';

import { getLevelConfig, getSectionProgress } from '@/config/LevelsConfig';
import { getVisualQualityProfile } from '@/config/visualQuality';
import type { ParallaxBackground } from '@/systems/ParallaxBackground';
import { ensurePlayerTexture, ensureScoutTexture } from '@/utils/SpriteFactory';

import type { BrowserHarnessRenderCost, BrowserHarnessVisualPilotMetrics } from './types';

function summarize(samples: number[]): BrowserHarnessRenderCost {
  const sorted = [...samples].sort((a, b) => a - b);
  return Object.freeze({
    averageMs: samples.reduce((total, sample) => total + sample, 0) / samples.length,
    p95Ms: sorted[Math.ceil(sorted.length * 0.95) - 1] ?? 0,
    sampleCount: samples.length,
  });
}

export class BrowserHarnessVisualPilot {
  private entityMotionPhase = 0;
  private lastEntityMotionPhase = 0;
  private stagedEntities:
    { scene: Phaser.Scene; player: Phaser.GameObjects.Image; enemy: Phaser.GameObjects.Image } | undefined;

  constructor(private readonly game: Phaser.Game) {}

  show(glowEnabled = true): {
    filterCount: number;
    sectionId: string;
    motionPhase: number;
    qualityTier: string;
    entityTextureResolution: number;
    entities: Array<{
      textureKey: string;
      active: boolean;
      x: number;
      y: number;
      logicalWidth: number;
      logicalHeight: number;
      sourceCanvasWidth: number;
      sourceCanvasHeight: number;
      sourceIsCanvas: boolean;
    }>;
  } {
    const scene = this.game.scene.getScene('Game') as Phaser.Scene & {
      parallax?: Pick<ParallaxBackground, 'setSectionAtmosphere' | 'update'>;
    };
    const section = getLevelConfig(1).sections.find((candidate) =>
      candidate.hazardEvents?.some((hazard) => hazard.type === 'ring-crossfire')
    );
    if (!scene?.parallax || !section) throw new Error('Browser harness cannot show the lane-reading visual pilot');

    scene.scene.pause();
    for (const child of scene.children.list) {
      if (child instanceof Phaser.GameObjects.Graphics && child.depth === 200) child.setVisible(false);
      if (child instanceof Phaser.GameObjects.Text && this.isInstructionText(child.text)) child.setVisible(false);
    }
    scene.parallax.setSectionAtmosphere(section, getSectionProgress(section, 0.54));
    for (let frame = 0; frame < 60; frame += 1) scene.parallax.update(1000 / 60);
    const motionPhase = glowEnabled ? this.lastEntityMotionPhase : this.entityMotionPhase;
    const entities = this.stageEntityMotionEvidence(scene, motionPhase);
    const quality = getVisualQualityProfile();
    if (!glowEnabled) {
      this.lastEntityMotionPhase = motionPhase;
      this.entityMotionPhase = (this.entityMotionPhase + 1) % 2;
    }
    return {
      filterCount: this.setGlow(glowEnabled),
      sectionId: section.id,
      motionPhase,
      qualityTier: quality.tier,
      entityTextureResolution: quality.entityTextureResolution,
      entities: [this.describeEntity(entities.player), this.describeEntity(entities.enemy)],
    };
  }

  private stageEntityMotionEvidence(
    scene: Phaser.Scene,
    motionPhase: number
  ): { player: Phaser.GameObjects.Image; enemy: Phaser.GameObjects.Image } {
    if (!this.stagedEntities || this.stagedEntities.scene !== scene) {
      ensurePlayerTexture(scene);
      ensureScoutTexture(scene);
      this.stagedEntities = {
        scene,
        player: scene.add.image(0, 0, 'player-ship').setScale(3).setDepth(190),
        enemy: scene.add.image(0, 0, 'scout-texture').setScale(3).setDepth(190),
      };
    }

    const offset = motionPhase === 0 ? 0.125 : 0.625;
    const centerX = Number(this.game.scale.width) / 2;
    const centerY = Number(this.game.scale.height) / 2;
    const separation = Math.min(120, Number(this.game.scale.width) * 0.2);
    this.stagedEntities.player.setPosition(Math.round(centerX - separation) + offset, Math.round(centerY) + offset);
    this.stagedEntities.enemy.setPosition(Math.round(centerX + separation) + offset, Math.round(centerY) + offset);
    return this.stagedEntities;
  }

  private describeEntity(image: Phaser.GameObjects.Image): {
    textureKey: string;
    active: boolean;
    x: number;
    y: number;
    logicalWidth: number;
    logicalHeight: number;
    sourceCanvasWidth: number;
    sourceCanvasHeight: number;
    sourceIsCanvas: boolean;
  } {
    const frame = image.texture.get();
    const source = image.texture.getSourceImage() as CanvasImageSource & { width?: number; height?: number };
    return {
      textureKey: image.texture.key,
      active: image.active,
      x: image.x,
      y: image.y,
      logicalWidth: frame.width,
      logicalHeight: frame.height,
      sourceCanvasWidth: source.width ?? 0,
      sourceCanvasHeight: source.height ?? 0,
      sourceIsCanvas: source instanceof HTMLCanvasElement,
    };
  }

  async measureRenderCost(): Promise<BrowserHarnessVisualPilotMetrics> {
    const baselineSamples = await this.collectRenderCost(false, 45);
    const glowSamples = await this.collectRenderCost(true, 45);
    glowSamples.push(...(await this.collectRenderCost(true, 45)));
    baselineSamples.push(...(await this.collectRenderCost(false, 45)));
    this.setGlow(true);
    const baseline = summarize(baselineSamples);
    const glow = summarize(glowSamples);
    return Object.freeze({
      baseline,
      glow,
      averageRegressionMs: glow.averageMs - baseline.averageMs,
      p95RegressionMs: glow.p95Ms - baseline.p95Ms,
    });
  }

  private isInstructionText(text: string): boolean {
    return text === 'SECTOR 1' || ['Move', 'move', 'Fire', 'fire', 'shoot'].some((fragment) => text.includes(fragment));
  }

  private getOverlay(): Phaser.GameObjects.Graphics {
    const overlay = this.game.scene
      .getScene('Game')
      ?.children.list.find((child) => child instanceof Phaser.GameObjects.Graphics && child.depth === -5);
    if (!(overlay instanceof Phaser.GameObjects.Graphics)) {
      throw new Error('Browser harness cannot find the lane-reading visual pilot overlay');
    }
    return overlay;
  }

  private setGlow(enabled: boolean): number {
    const filters = this.getOverlay().filters?.internal.list ?? [];
    for (const filter of filters) filter.setActive(enabled);
    return filters.length;
  }

  private async collectRenderCost(enabled: boolean, sampleCount: number): Promise<number[]> {
    this.setGlow(enabled);
    const renderer = this.game.renderer;
    if (!(renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer)) {
      throw new Error('Browser harness render-cost measurement requires WebGL');
    }
    const gl = renderer.gl;
    const samples: number[] = [];
    let renderStartedAt = 0;
    let warmupFrames = 15;
    return new Promise((resolve) => {
      const onPreRender = (): void => {
        gl.finish();
        renderStartedAt = performance.now();
      };
      const onPostRender = (): void => {
        gl.finish();
        if (warmupFrames > 0) {
          warmupFrames -= 1;
        } else {
          samples.push(performance.now() - renderStartedAt);
        }
        if (samples.length === sampleCount) {
          this.game.events.off(Phaser.Core.Events.PRE_RENDER, onPreRender);
          this.game.events.off(Phaser.Core.Events.POST_RENDER, onPostRender);
          resolve(samples);
        }
      };
      this.game.events.on(Phaser.Core.Events.PRE_RENDER, onPreRender);
      this.game.events.on(Phaser.Core.Events.POST_RENDER, onPostRender);
    });
  }
}
