import Phaser from 'phaser';

import { getLevelConfig, getSectionProgress } from '@/config/LevelsConfig';
import { getVisualQualityProfile } from '@/config/visualQuality';
import type { ParallaxBackground } from '@/systems/ParallaxBackground';
import {
  ensureAsteroidTexture,
  ensureDiverTexture,
  ensureEnemyBulletTexture,
  ensureFighterTexture,
  ensurePlayerBulletTexture,
  ensurePlayerTexture,
  ensureScoutTexture,
} from '@/utils/SpriteFactory';

import type {
  BrowserHarnessRenderCost,
  BrowserHarnessVisualPilotEntity,
  BrowserHarnessVisualPilotEvidence,
  BrowserHarnessVisualPilotMetrics,
} from './types';

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
  private stagedEntities: { scene: Phaser.Scene; images: Phaser.GameObjects.Image[] } | undefined;

  constructor(private readonly game: Phaser.Game) {}

  show(
    glowEnabled = true,
    hazardType: 'ring-crossfire' | 'debris-surge' = 'ring-crossfire'
  ): BrowserHarnessVisualPilotEvidence {
    const scene = this.game.scene.getScene('Game') as Phaser.Scene & {
      parallax?: Pick<ParallaxBackground, 'setSectionAtmosphere' | 'update'>;
    };
    const section = getLevelConfig(1).sections.find((candidate) =>
      candidate.hazardEvents?.some((hazard) => hazard.type === hazardType)
    );
    if (!scene?.parallax || !section) throw new Error('Browser harness cannot show the lane-reading visual pilot');

    scene.scene.pause();
    for (const child of scene.children.list) {
      if (child instanceof Phaser.GameObjects.Graphics && child.depth === 200) child.setVisible(false);
      if (child instanceof Phaser.GameObjects.Text && this.isInstructionText(child.text)) child.setVisible(false);
    }
    scene.parallax.setSectionAtmosphere(section, getSectionProgress(section, 0.54));
    for (let frame = 0; frame < 60; frame += 1) scene.parallax.update(1000 / 60);
    this.hideRuntimeEvidenceEntities(scene);
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
      entities: entities.map((entity) => this.describeEntity(entity)),
    };
  }

  private stageEntityMotionEvidence(scene: Phaser.Scene, motionPhase: number): Phaser.GameObjects.Image[] {
    if (!this.stagedEntities || this.stagedEntities.scene !== scene) {
      const textureKeys = [
        ensurePlayerTexture(scene),
        ensureScoutTexture(scene),
        ensureFighterTexture(scene),
        ensureDiverTexture(scene),
        ensureAsteroidTexture(scene),
        ensurePlayerBulletTexture(scene),
        ensureEnemyBulletTexture(scene),
      ];
      this.stagedEntities = {
        scene,
        images: textureKeys.map((textureKey) => scene.add.image(0, 0, textureKey).setScale(1).setDepth(190)),
      };
    }

    const offset = motionPhase === 0 ? 0.125 : 0.625;
    const width = Number(this.game.scale.width);
    const height = Number(this.game.scale.height);
    const positions = [
      [0.15, 0.62],
      [0.27, 0.4],
      [0.39, 0.3],
      [0.61, 0.3],
      [0.73, 0.4],
      [0.32, 0.58],
      [0.68, 0.58],
    ] as const;
    this.stagedEntities.images.forEach((image, index) => {
      const position = positions[index];
      if (!position) return;
      const [x, y] = position;
      image.setPosition(Math.round(width * x) + offset, Math.round(height * y) + offset);
    });
    return this.stagedEntities.images;
  }

  private hideRuntimeEvidenceEntities(scene: Phaser.Scene): void {
    const staged = new Set<Phaser.GameObjects.GameObject>(
      this.stagedEntities?.scene === scene ? this.stagedEntities.images : []
    );
    const evidenceTextureKeys = new Set([
      'player-ship',
      'scout-texture',
      'fighter-texture',
      'diver-texture',
      'asteroid-texture',
      'player-bullet',
      'enemy-bullet',
    ]);
    for (const child of scene.children.list) {
      if (
        (child instanceof Phaser.GameObjects.Image || child instanceof Phaser.GameObjects.Sprite) &&
        !staged.has(child) &&
        evidenceTextureKeys.has(child.texture.key)
      ) {
        child.setVisible(false);
      }
    }
  }

  private describeEntity(image: Phaser.GameObjects.Image): BrowserHarnessVisualPilotEntity {
    const frame = image.texture.get();
    const source = image.texture.getSourceImage() as CanvasImageSource & { width?: number; height?: number };
    return {
      textureKey: image.texture.key,
      active: image.active,
      x: image.x,
      y: image.y,
      displayScale: image.scaleX,
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
