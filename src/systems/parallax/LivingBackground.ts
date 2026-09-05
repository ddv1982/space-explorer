import Phaser from 'phaser';
import { getVisualQualityTier } from '../../config/visualQuality';
import {
  getAtmosphereSize,
  selectLivingWorld,
  LIVING_WORLD_PROFILES,
  type LandmarkPlacement,
  type LivingWorld,
} from './livingBackgroundProfile';
import { createLivingBackgroundFragment } from './livingBackgroundShader';
import { bindOwnedShaderCleanup, hasOwnedShaderProgram } from './livingBackgroundShaderOwner';
import { createLivingNoise, createLivingStars } from './livingBackgroundTextures';

import { createLivingLandmark } from './livingCampaignLandmarks';

let nextOwner = 0;

export function createLivingBackground(scene: Phaser.Scene, levelName: string | undefined): LivingBackground | null {
  const world = selectLivingWorld(levelName);
  return world ? new LivingBackground(scene, world) : null;
}

export class LivingBackground {
  private readonly tier = getVisualQualityTier();
  private readonly prefix: string;
  private readonly shader: Phaser.GameObjects.Shader;
  private readonly image: Phaser.GameObjects.Image;
  private readonly stars: Phaser.GameObjects.TileSprite;
  private readonly landmarks: Phaser.GameObjects.Image[] = [];
  private readonly occluder: Phaser.GameObjects.Arc | null;
  private readonly textureKeys: string[];
  private readonly profile: (typeof LIVING_WORLD_PROFILES)[LivingWorld];
  private readonly placements: readonly LandmarkPlacement[];
  private readonly viewport: [number, number];
  private readonly motionQuery =
    typeof window !== 'undefined' ? window.matchMedia?.('(prefers-reduced-motion: reduce)') : undefined;
  private readonly liveNoise =
    import.meta.env.DEV &&
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('atmosphere') === 'live';
  private elapsed = 0;
  private lastRenderTime = 0;
  private activity = 1;
  private landmarkStrength = 1;
  private pressure = 0;
  private renderCount = 0;
  private destroyed = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly world: LivingWorld
  ) {
    this.profile = LIVING_WORLD_PROFILES[world];
    this.placements = this.profile.landmark.kind === 'none' ? [] : this.profile.landmark.placements;
    this.prefix = `living-${scene.sys.settings.key}-${nextOwner++}`;
    this.viewport = [Number(scene.scale.width), Number(scene.scale.height)];
    const noiseKey = `${this.prefix}-noise`;
    const starsKey = `${this.prefix}-stars`;
    const outputKey = `${this.prefix}-atmosphere`;
    this.textureKeys = [noiseKey, starsKey, outputKey];
    createLivingNoise(scene, noiseKey);
    createLivingStars(scene, starsKey, world);
    const [width, height] = getAtmosphereSize(...this.viewport, this.tier);
    this.shader = scene.add
      .shader(
        {
          name: `SpaceExplorerLiving-${world}`,
          fragmentSource: createLivingBackgroundFragment(world),
          setupUniforms: (set: (name: string, value: number | number[]) => void) => {
            set('uNoise', 0);
            set('uViewport', this.viewport);
            set('uTime', this.elapsed / 1000);
            set('uActivity', this.activity);
            set('uLandmark', this.landmarkStrength);
            set('uLive', this.liveNoise ? 1 : 0);
          },
        },
        width / 2,
        height / 2,
        width,
        height,
        [noiseKey]
      )
      .setDepth(-22);
    bindOwnedShaderCleanup(this.shader);
    this.shader.setRenderToTexture(outputKey).setVisible(false);
    if (hasOwnedShaderProgram(this.shader)) this.renderCount += 1;
    this.image = scene.add.image(0, 0, outputKey).setDepth(-20);
    this.stars = scene.add
      .tileSprite(0, 0, ...this.viewport, starsKey)
      .setDepth(-19)
      .setAlpha(0.7);
    this.occluder = this.profile.occluder ? scene.add.circle(0, 0, 1, 0x020309).setDepth(-18) : null;
    if (this.profile.landmark.kind !== 'none') {
      const landmarkKey = `${this.prefix}-landmark`;
      this.textureKeys.push(landmarkKey);
      createLivingLandmark(scene, landmarkKey, world, this.profile.landmark.kind);
      for (const placement of this.placements) {
        this.landmarks.push(scene.add.image(0, 0, landmarkKey).setDepth(-17).setRotation(placement.rotation));
      }
    }
    this.resize(...this.viewport);
    scene.game.events.on(Phaser.Core.Events.POST_RENDER, this.afterRender);
    scene.renderer.on(Phaser.Renderer.Events.RESTORE_WEBGL, this.invalidate);
    this.motionQuery?.addEventListener('change', this.invalidate);
  }

  private readonly afterRender = (): void => {
    if (!this.shader.visible || !hasOwnedShaderProgram(this.shader)) return;
    this.renderCount += 1;
    this.shader.setVisible(false);
  };

  private readonly invalidate = (): void => {
    if (!this.destroyed) this.shader.setVisible(true);
  };

  resize(width: number, height: number): void {
    this.viewport[0] = width;
    this.viewport[1] = height;
    const [targetWidth, targetHeight] = getAtmosphereSize(width, height, this.tier);
    this.shader.setSize(targetWidth, targetHeight).setPosition(targetWidth / 2, targetHeight / 2);
    this.shader.renderImmediate();
    if (hasOwnedShaderProgram(this.shader)) this.renderCount += 1;
    const frame = this.image.frame;
    frame.source.width = targetWidth;
    frame.source.height = targetHeight;
    frame.setSize(targetWidth, targetHeight);
    this.image
      .setSizeToFrame()
      .setDisplaySize(width, height)
      .setPosition(width / 2, height / 2);
    this.stars.setSize(width, height).setPosition(width / 2, height / 2);
    const body = this.profile.occluder;
    if (body)
      this.occluder
        ?.setPosition(width * body.x, height * body.y)
        .setRadius(Math.min(width * body.radiusWidth, height * body.radiusHeight) * body.mask);
    const radius = Math.min(width * 0.43, height * 0.55);
    this.landmarks.forEach((landmark, index) => {
      const placement = this.placements[index];
      landmark.setDisplaySize(radius * 2 * placement.scale, radius * 2 * placement.scale);
      landmark.setPosition(width * placement.x + radius * placement.offset, height * placement.y);
      landmark.setAlpha(placement.alpha * this.landmarkStrength);
    });
    this.invalidate();
  }

  setPressure(pressure: number): void {
    this.pressure = pressure;
  }

  update(delta: number, drift: number, alpha: number, landmarkAlpha: number): void {
    const motionDelta = delta > 250 ? 0 : delta;
    const frozen = this.motionQuery?.matches || this.tier === 'low';
    if (!frozen) this.elapsed += motionDelta * drift;
    const nextActivity = Math.min(1.18, Math.max(0.8, alpha));
    const nextLandmark = Math.min(1.22, Math.max(0.78, landmarkAlpha));
    if (Math.abs(nextLandmark - this.landmarkStrength) > 0.015) {
      this.landmarkStrength = nextLandmark;
      this.landmarks.forEach((landmark, index) => landmark.setAlpha(this.placements[index].alpha * nextLandmark));
      this.invalidate();
    }
    if (Math.abs(nextActivity - this.activity) > 0.015) {
      this.activity = nextActivity;
      this.invalidate();
    }
    const cadence = this.pressure >= 2 ? 125 : this.tier === 'high' || this.tier === 'auto' ? 16 : 32;
    if (!frozen && this.elapsed - this.lastRenderTime >= cadence) {
      this.lastRenderTime = this.elapsed;
      this.invalidate();
    }
    if (!this.motionQuery?.matches) {
      this.stars.tilePositionY -= motionDelta * 0.008 * drift;
      if (this.tier !== 'low' && this.pressure < 3) {
        this.landmarks.forEach((landmark, index) => {
          landmark.rotation += motionDelta * this.placements[index].spin;
        });
      }
    }
  }

  snapshot() {
    return {
      world: this.world,
      landmarkKind: this.profile.landmark.kind,
      targetWidth: this.shader.width,
      targetHeight: this.shader.height,
      elapsed: this.elapsed,
      renderCount: this.renderCount,
      ready: hasOwnedShaderProgram(this.shader),
      atmosphereAlpha: this.activity,
      landmarkAlpha: this.landmarkStrength,
      landmarkAlphas: this.landmarks.map((landmark) => landmark.alpha),
      pressure: this.pressure,
      reducedMotion: this.motionQuery?.matches ?? false,
      tier: this.tier,
      liveNoise: this.liveNoise,
      textureKeys: [...this.textureKeys],
    };
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.scene.game.events.off(Phaser.Core.Events.POST_RENDER, this.afterRender);
    this.scene.renderer.off(Phaser.Renderer.Events.RESTORE_WEBGL, this.invalidate);
    this.motionQuery?.removeEventListener('change', this.invalidate);
    this.image.destroy();
    this.stars.destroy();
    this.occluder?.destroy();
    this.landmarks.forEach((landmark) => landmark.destroy());
    this.shader.destroy();
    this.textureKeys.forEach((key) => {
      if (this.scene.textures.exists(key)) this.scene.textures.remove(key);
    });
  }
}
