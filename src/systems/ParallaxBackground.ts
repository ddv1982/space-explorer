import Phaser from 'phaser';
import { SCROLL_SPEED } from '../utils/constants';
import type { LevelConfig, LevelSectionConfig, ScriptedHazardConfig } from '../config/LevelsConfig';
import { mixColor } from '../utils/colorUtils';
import { generateScenicTexture } from './parallax/scenicTextureGenerator';
import { generatePlanetTexture } from './parallax/planetTextureGenerator';
import { generateMoonSurfaceTexture } from './parallax/moonSurfaceGenerator';
import { generatePassingPlanetTextures } from './parallax/passingPlanetGenerator';

interface StarLayerConfig {
  name: string;
  scrollSpeed: number;
  starCount: number;
  starSize: { min: number; max: number };
  starAlpha: { min: number; max: number };
  baseColor: number;
  accentMix: number;
  /** Fraction of stars that get a bright cross-sparkle treatment */
  sparkleFraction: number;
  /** Number of colored accent stars to sprinkle in */
  colorStarCount: number;
}

interface ScenicLayerConfig {
  name: string;
  depth: number;
  alpha: number;
  hazeCount: number;
  cloudCount: number;
  shadowCount: number;
  sparkleCount: number;
  /** Number of elongated filament shapes to draw */
  filamentCount: number;
  radius: { min: number; max: number };
  drift: { x: number; y: number };
  speed: number;
  accentMix: number;
}

interface TwinkleState {
  sprite: Phaser.GameObjects.Image;
  phase: number;
  speed: number;
  minAlpha: number;
  maxAlpha: number;
  baseMinAlpha: number;
  baseMaxAlpha: number;
}

interface ScenicLayerState {
  sprite: Phaser.GameObjects.Image;
  textureKey: string;
  baseX: number;
  baseY: number;
  baseAlpha: number;
  driftX: number;
  driftY: number;
  speed: number;
  phase: number;
}

interface PlanetLayerState {
  sprite: Phaser.GameObjects.Image;
  textureKey: string;
  baseX: number;
  baseY: number;
  baseAlpha: number;
}

interface DebrisMote {
  sprite: Phaser.GameObjects.Image;
  baseX: number;
  baseY: number;
  baseAlpha: number;
  speed: number;
  driftX: number;
  driftY: number;
  phase: number;
  rotSpeed: number;
}

interface PassingPlanetState {
  sprite: Phaser.GameObjects.Image;
  scrollSpeed: number;
  baseY: number;
  baseAlpha: number;
}

interface MoonSurfaceState {
  sprite: Phaser.GameObjects.Image;
  textureKey: string;
  baseX: number;
  baseY: number;
  baseAlpha: number;
  motionSpeed: number;
  motionAmplitude: number;
}

interface ForegroundSilhouetteState {
  sprite: Phaser.GameObjects.Image;
  baseX: number;
  baseY: number;
  driftX: number;
  driftY: number;
  phase: number;
  alpha: number;
}

const LAYER_CONFIGS: StarLayerConfig[] = [
  { name: 'far-stars', scrollSpeed: 0.15, starCount: 100, starSize: { min: 0.4, max: 1.2 }, starAlpha: { min: 0.15, max: 0.5 }, baseColor: 0x8888aa, accentMix: 0.08, sparkleFraction: 0.03, colorStarCount: 3 },
  { name: 'mid-stars', scrollSpeed: 0.35, starCount: 65, starSize: { min: 0.8, max: 1.8 }, starAlpha: { min: 0.3, max: 0.75 }, baseColor: 0xaaaacc, accentMix: 0.14, sparkleFraction: 0.06, colorStarCount: 5 },
  { name: 'near-stars', scrollSpeed: 0.6, starCount: 35, starSize: { min: 1.2, max: 2.8 }, starAlpha: { min: 0.5, max: 1.0 }, baseColor: 0xccccee, accentMix: 0.22, sparkleFraction: 0.1, colorStarCount: 4 },
  { name: 'dust', scrollSpeed: 0.85, starCount: 20, starSize: { min: 0.4, max: 1.2 }, starAlpha: { min: 0.08, max: 0.22 }, baseColor: 0x6666aa, accentMix: 0.32, sparkleFraction: 0, colorStarCount: 2 },
];

const SCENIC_LAYER_CONFIGS: ScenicLayerConfig[] = [
  {
    name: 'nebula-far',
    depth: -9,
    alpha: 0.82,
    hazeCount: 4,
    cloudCount: 8,
    shadowCount: 4,
    sparkleCount: 14,
    filamentCount: 3,
    radius: { min: 140, max: 280 },
    drift: { x: 18, y: 12 },
    speed: 0.00012,
    accentMix: 0.24,
  },
  {
    name: 'nebula-near',
    depth: -7,
    alpha: 0.52,
    hazeCount: 3,
    cloudCount: 7,
    shadowCount: 5,
    sparkleCount: 20,
    filamentCount: 4,
    radius: { min: 90, max: 200 },
    drift: { x: 32, y: 18 },
    speed: 0.00018,
    accentMix: 0.48,
  },
];

const TILE_WIDTH = 512;
const TILE_HEIGHT = 2048;
const DEPTHS = [-10, -8, -6, -4];
const SCENIC_PADDING_X = 220;
const SCENIC_PADDING_Y = 180;
const PASSING_PLANET_RESPAWN_MIN_X = 100;
const PASSING_PLANET_RESPAWN_MAX_X = 400;
const PASSING_PLANET_OFFSCREEN_PADDING = 220;
const MOON_SURFACE_MIN_MOTION_SPEED = 0.00005;
const MOON_SURFACE_MOTION_SPEED_SCALE = 0.0015;
const MOON_SURFACE_BASE_AMPLITUDE = 10;
const MOON_SURFACE_AMPLITUDE_SCALE = 80;
const RESIZE_REBUILD_DEBOUNCE_MS = 120;

/** Accent colors for colored accent stars (warm/cool variety) */
const STAR_ACCENT_COLORS = [0xffddaa, 0xaaddff, 0xffaa88, 0xaaffcc, 0xddaaff];

export class ParallaxBackground {
  private scene: Phaser.Scene | null = null;
  private levelConfig?: LevelConfig;
  private tileSprites: Phaser.GameObjects.TileSprite[] = [];
  private scenicLayers: ScenicLayerState[] = [];
  private planetLayer: PlanetLayerState | null = null;
  private debrisMotes: DebrisMote[] = [];
  private twinkles: TwinkleState[] = [];
  private moonSurface: MoonSurfaceState | null = null;
  private passingPlanetSprites: PassingPlanetState[] = [];
  private elapsed = 0;
  private currentWidth = 0;
  private currentHeight = 0;
  private pendingRebuildEvent: Phaser.Time.TimerEvent | null = null;
  private atmosphereAlpha = 1;
  private targetAtmosphereAlpha = 1;
  private atmosphereDrift = 1;
  private targetAtmosphereDrift = 1;
  private atmosphereTwinkle = 1;
  private targetAtmosphereTwinkle = 1;
  private landmarkAlpha = 1;
  private targetLandmarkAlpha = 1;
  private hazardOverlayAlpha = 0;
  private targetHazardOverlayAlpha = 0;
  private hazardResponseScale = 1;
  private activeHazards: ScriptedHazardConfig[] = [];
  private hazardOverlay: Phaser.GameObjects.Graphics | null = null;
  private foregroundSilhouettes: ForegroundSilhouetteState[] = [];

  create(scene: Phaser.Scene, levelConfig?: LevelConfig): void {
    this.destroy();

    this.scene = scene;
    this.levelConfig = levelConfig;
    this.tileSprites = [];
    this.scenicLayers = [];
    this.debrisMotes = [];
    this.foregroundSilhouettes = [];
    this.elapsed = 0;
    this.currentWidth = scene.cameras.main.width;
    this.currentHeight = scene.cameras.main.height;
    this.atmosphereAlpha = 1;
    this.targetAtmosphereAlpha = 1;
    this.atmosphereDrift = 1;
    this.targetAtmosphereDrift = 1;
    this.atmosphereTwinkle = 1;
    this.targetAtmosphereTwinkle = 1;
    this.landmarkAlpha = 1;
    this.targetLandmarkAlpha = 1;
    this.hazardOverlayAlpha = 0;
    this.targetHazardOverlayAlpha = 0;
    this.hazardResponseScale = 1;
    this.activeHazards = [];

    for (let i = 0; i < LAYER_CONFIGS.length; i++) {
      const config = LAYER_CONFIGS[i];
      const starColor = levelConfig
        ? mixColor(config.baseColor, levelConfig.accentColor, config.accentMix)
        : config.baseColor;
      const textureKey = `${config.name}-${starColor.toString(16)}-v2`;

      // Only generate texture if it doesn't exist
      if (!scene.textures.exists(textureKey)) {
        const g = scene.add.graphics();

        for (let s = 0; s < config.starCount; s++) {
          const x = Phaser.Math.Between(0, TILE_WIDTH);
          const y = Phaser.Math.Between(0, TILE_HEIGHT);
          const size = Phaser.Math.FloatBetween(config.starSize.min, config.starSize.max);
          const alpha = Phaser.Math.FloatBetween(config.starAlpha.min, config.starAlpha.max);

          g.fillStyle(starColor, alpha);
          g.fillCircle(x, y, size);
        }

        // Bright sparkle crosses for near stars
        if (config.sparkleFraction > 0) {
          const sparkleCount = Math.floor(config.starCount * config.sparkleFraction);
          for (let s = 0; s < sparkleCount; s++) {
            const x = Phaser.Math.Between(10, TILE_WIDTH - 10);
            const y = Phaser.Math.Between(10, TILE_HEIGHT - 10);
            const crossSize = Phaser.Math.FloatBetween(3, 6);
            const alpha = Phaser.Math.FloatBetween(0.3, 0.6);

            // Cross sparkle
            g.fillStyle(0xffffff, alpha);
            g.fillRect(x - crossSize, y, crossSize * 2, 0.7);
            g.fillRect(x, y - crossSize, 0.7, crossSize * 2);

            // Center dot
            g.fillStyle(0xffffff, alpha * 1.5);
            g.fillCircle(x, y, 0.8);
          }
        }

        // Colored accent stars
        for (let c = 0; c < config.colorStarCount; c++) {
          const x = Phaser.Math.Between(0, TILE_WIDTH);
          const y = Phaser.Math.Between(0, TILE_HEIGHT);
          const accentIdx = Phaser.Math.Between(0, STAR_ACCENT_COLORS.length - 1);
          const accentColor = levelConfig
            ? mixColor(STAR_ACCENT_COLORS[accentIdx], levelConfig.accentColor, 0.3)
            : STAR_ACCENT_COLORS[accentIdx];
          const size = Phaser.Math.FloatBetween(config.starSize.min * 1.2, config.starSize.max * 1.5);
          const alpha = Phaser.Math.FloatBetween(0.4, 0.8);

          g.fillStyle(accentColor, alpha);
          g.fillCircle(x, y, size);
          // Tiny glow ring
          g.fillStyle(accentColor, alpha * 0.3);
          g.fillCircle(x, y, size * 2);
        }

        g.generateTexture(textureKey, TILE_WIDTH, TILE_HEIGHT);
        g.destroy();
      }

      const tile = scene.add.tileSprite(
        this.currentWidth / 2,
        this.currentHeight / 2,
        this.currentWidth,
        this.currentHeight,
        textureKey
      );
      tile.setOrigin(0.5);
      tile.setDepth(DEPTHS[i]);
      this.tileSprites.push(tile);
    }

    if (levelConfig) {
      this.createLevelVisualLayers(scene, levelConfig);
    }

    this.hazardOverlay = scene.add.graphics();
    this.hazardOverlay.setDepth(-5);

    this.layoutTileSprites();
  }

  private createMoonSurfaceLayer(scene: Phaser.Scene, config: LevelConfig): void {
    if (!config.moonSurface) return;
    const ms = config.moonSurface;
    const width = Math.ceil(this.currentWidth + 300);
    const height = Math.ceil(this.currentHeight + 100);
    const textureKey = `moon-surface-${ms.surfaceColor.toString(16)}-${ms.accentColor.toString(16)}-${width}x${height}-v1`;

    if (!scene.textures.exists(textureKey)) {
      generateMoonSurfaceTexture(scene, textureKey, width, height, ms);
    }

    const centerX = this.currentWidth / 2;
    const bottomY = this.currentHeight * 0.75;
    const sprite = scene.add.image(centerX, bottomY, textureKey);
    sprite.setDepth(-3);
    sprite.setAlpha(0.45);

    this.moonSurface = {
      sprite,
      textureKey,
      baseX: centerX,
      baseY: bottomY,
      baseAlpha: 0.45,
      motionSpeed: Math.max(MOON_SURFACE_MIN_MOTION_SPEED, ms.scrollSpeed * MOON_SURFACE_MOTION_SPEED_SCALE),
      motionAmplitude: MOON_SURFACE_BASE_AMPLITUDE + ms.scrollSpeed * MOON_SURFACE_AMPLITUDE_SCALE,
    };
  }

  private createLevelVisualLayers(scene: Phaser.Scene, config: LevelConfig): void {
    this.createScenicLayers(scene, config);
    this.createMoonSurfaceLayer(scene, config);
    this.createPassingPlanetLayers(scene, config);
    this.createPlanetLayer(scene, config);
    this.createDebrisMotes(scene, config);
    this.createStarTwinkles(scene, config);
    this.createForegroundSilhouettes(scene, config);
  }

  private destroyLevelVisualLayers(): void {
    this.destroyScenicLayers();
    this.destroyMoonSurfaceLayer();
    this.destroyPassingPlanetLayers();
    this.destroyPlanetLayer();
    this.destroyDebrisMotes();
    this.destroyTwinkles();
    this.destroyForegroundSilhouettes();
  }

  private createForegroundSilhouettes(scene: Phaser.Scene, config: LevelConfig): void {
    const silhouetteColor = mixColor(config.accentColor, 0x000000, 0.82);
    const height = this.currentHeight;
    const width = this.currentWidth;
    const specs = [
      { edge: 'left' as const, w: 110, h: height * 0.62, y: height * 0.56 },
      { edge: 'right' as const, w: 128, h: height * 0.68, y: height * 0.54 },
    ];

    for (const spec of specs) {
      const textureKey = `foreground-silhouette-${spec.edge}-${Math.round(spec.w)}x${Math.round(spec.h)}-${config.accentColor.toString(16)}`;

      if (!scene.textures.exists(textureKey)) {
        const g = scene.add.graphics();
        g.fillStyle(silhouetteColor, 1);

        if (spec.edge === 'left') {
          g.beginPath();
          g.moveTo(0, spec.h);
          g.lineTo(spec.w * 0.22, spec.h * 0.12);
          g.lineTo(spec.w * 0.48, spec.h * 0.34);
          g.lineTo(spec.w * 0.65, spec.h * 0.18);
          g.lineTo(spec.w * 0.82, spec.h * 0.42);
          g.lineTo(spec.w, spec.h * 0.5);
          g.lineTo(spec.w, spec.h);
          g.closePath();
          g.fillPath();
        } else {
          g.beginPath();
          g.moveTo(0, spec.h * 0.5);
          g.lineTo(spec.w * 0.18, spec.h * 0.42);
          g.lineTo(spec.w * 0.35, spec.h * 0.14);
          g.lineTo(spec.w * 0.58, spec.h * 0.3);
          g.lineTo(spec.w * 0.82, spec.h * 0.08);
          g.lineTo(spec.w, spec.h);
          g.lineTo(0, spec.h);
          g.closePath();
          g.fillPath();
        }

        g.generateTexture(textureKey, Math.ceil(spec.w), Math.ceil(spec.h));
        g.destroy();
      }

      const x = spec.edge === 'left' ? spec.w * 0.5 : width - spec.w * 0.5;
      const sprite = scene.add.image(x, spec.y, textureKey);
      sprite.setDepth(-1);
      sprite.setAlpha(0.09);
      this.foregroundSilhouettes.push({
        sprite,
        baseX: x,
        baseY: spec.y,
        driftX: spec.edge === 'left' ? 6 : -8,
        driftY: 4,
        phase: Phaser.Math.FloatBetween(0, Math.PI * 2),
        alpha: 0.09,
      });
    }
  }

  private destroyForegroundSilhouettes(): void {
    for (const silhouette of this.foregroundSilhouettes) {
      silhouette.sprite.destroy();
    }
    this.foregroundSilhouettes = [];
  }

  private rebuildLevelVisualLayers(scene: Phaser.Scene, config: LevelConfig): void {
    this.destroyLevelVisualLayers();
    this.createLevelVisualLayers(scene, config);
  }

  private createPassingPlanetLayers(scene: Phaser.Scene, config: LevelConfig): void {
    if (!config.passingPlanets || config.passingPlanets.length === 0) return;

    const textureKeys = generatePassingPlanetTextures(scene, config.passingPlanets);

    for (let i = 0; i < config.passingPlanets.length; i++) {
      const pp = config.passingPlanets[i];
      const y = this.currentHeight * pp.yPosition;
      const sprite = scene.add.image(this.currentWidth, y, textureKeys[i]);
      sprite.setDepth(-12 - i);
      sprite.setAlpha(pp.alpha);

      this.passingPlanetSprites.push({
        sprite,
        scrollSpeed: pp.scrollSpeed,
        baseY: y,
        baseAlpha: pp.alpha,
      });

      this.resetPassingPlanetPosition(this.passingPlanetSprites[this.passingPlanetSprites.length - 1]);
    }
  }

  private resetPassingPlanetPosition(planet: PassingPlanetState): void {
    planet.sprite.x = this.currentWidth + Phaser.Math.Between(
      PASSING_PLANET_RESPAWN_MIN_X,
      PASSING_PLANET_RESPAWN_MAX_X
    );
    planet.sprite.y = planet.baseY;
  }

  private getPassingPlanetOffscreenThreshold(sprite: Phaser.GameObjects.Image): number {
    return -Math.max(PASSING_PLANET_OFFSCREEN_PADDING, sprite.displayWidth * 0.5);
  }

  resize(width: number, height: number): void {
    if (!this.scene || width <= 0 || height <= 0) {
      return;
    }

    const sizeChanged = this.currentWidth !== width || this.currentHeight !== height;
    this.currentWidth = width;
    this.currentHeight = height;

    this.layoutTileSprites();

    if (!this.levelConfig) {
      return;
    }

    if (sizeChanged) {
      this.scheduleLevelVisualRebuild();
      return;
    }

    this.layoutScenicLayers();
    this.layoutMoonSurfaceLayer();
    this.layoutPlanetLayer();
  }

  destroy(): void {
    if (this.pendingRebuildEvent) {
      this.pendingRebuildEvent.remove(false);
      this.pendingRebuildEvent = null;
    }

    this.destroyLevelVisualLayers();

    for (let i = 0; i < this.tileSprites.length; i++) {
      this.tileSprites[i].destroy();
    }

    this.tileSprites = [];
    this.scene = null;
    this.levelConfig = undefined;
    this.elapsed = 0;
    this.currentWidth = 0;
    this.currentHeight = 0;
    this.atmosphereAlpha = 1;
    this.targetAtmosphereAlpha = 1;
    this.atmosphereDrift = 1;
    this.targetAtmosphereDrift = 1;
    this.atmosphereTwinkle = 1;
    this.targetAtmosphereTwinkle = 1;
    this.landmarkAlpha = 1;
    this.targetLandmarkAlpha = 1;
    this.hazardOverlayAlpha = 0;
    this.targetHazardOverlayAlpha = 0;
    this.hazardResponseScale = 1;
    this.activeHazards = [];
    this.hazardOverlay?.destroy();
    this.hazardOverlay = null;
  }

  setSectionAtmosphere(section: LevelSectionConfig | null, sectionProgress: number): void {
    if (!section) {
      this.targetAtmosphereAlpha = 1;
      this.targetAtmosphereDrift = 1;
      this.targetAtmosphereTwinkle = 1;
      this.targetLandmarkAlpha = 1;
      this.targetHazardOverlayAlpha = 0;
      this.hazardResponseScale = 1;
      this.activeHazards = [];
      return;
    }

    const progress = Phaser.Math.Clamp(sectionProgress, 0, 1);
    const musicIntensity = section.musicIntensity ?? 0.5;
    const tension = Phaser.Math.Clamp(section.vatTarget?.tension ?? 0.4, 0, 1);
    const visualModifiers = section.visualModifiers;
    const atmosphereScale = visualModifiers?.atmosphereAlpha ?? 1;
    const driftScale = visualModifiers?.driftScale ?? 1;
    const twinkleScale = visualModifiers?.twinkleScale ?? 1;
    const landmarkScale = visualModifiers?.landmarkAlpha ?? 1;
    this.hazardResponseScale = visualModifiers?.hazardResponseScale ?? 1;
    this.activeHazards = section.hazardEvents ?? [];

    let phaseAlphaBias = 0;
    let phaseDriftBias = 0;
    let phaseTwinkleBias = 0;

    switch (section.phase) {
      case 'build':
        phaseAlphaBias = 0.04;
        phaseDriftBias = 0.03;
        phaseTwinkleBias = 0.03;
        break;
      case 'hazard':
        phaseAlphaBias = 0.07;
        phaseDriftBias = 0.06;
        phaseTwinkleBias = 0.04;
        break;
      case 'climax':
        phaseAlphaBias = 0.1;
        phaseDriftBias = 0.08;
        phaseTwinkleBias = 0.06;
        break;
      case 'boss-approach':
        phaseAlphaBias = -0.04;
        phaseDriftBias = -0.03;
        phaseTwinkleBias = -0.16;
        break;
      case 'intro':
      default:
        phaseAlphaBias = -0.02;
        phaseDriftBias = -0.01;
        phaseTwinkleBias = -0.03;
        break;
    }

    this.targetAtmosphereAlpha = Phaser.Math.Clamp(
      0.94 + musicIntensity * 0.14 + tension * 0.08 + progress * 0.04 + phaseAlphaBias,
      0.82,
      1.14
    ) * atmosphereScale;
    this.targetAtmosphereAlpha = Phaser.Math.Clamp(this.targetAtmosphereAlpha, 0.8, 1.18);

    this.targetAtmosphereDrift = Phaser.Math.Clamp(
      0.95 + musicIntensity * 0.08 + tension * 0.08 + phaseDriftBias,
      0.9,
      1.16
    ) * driftScale;
    this.targetAtmosphereDrift = Phaser.Math.Clamp(this.targetAtmosphereDrift, 0.88, 1.2);

    this.targetAtmosphereTwinkle = Phaser.Math.Clamp(
      0.92 + musicIntensity * 0.1 + tension * 0.06 + phaseTwinkleBias,
      0.72,
      1.18
    ) * twinkleScale;
    this.targetAtmosphereTwinkle = Phaser.Math.Clamp(this.targetAtmosphereTwinkle, 0.65, 1.22);

    this.targetLandmarkAlpha = Phaser.Math.Clamp(
      (0.94 + tension * 0.12 + progress * 0.05) * landmarkScale,
      0.78,
      1.22
    );

    const hazardIntensity = this.getHazardVisualIntensity(section.hazardEvents ?? []);
    this.targetHazardOverlayAlpha = Phaser.Math.Clamp(hazardIntensity * 0.18 * this.hazardResponseScale, 0, 0.22);
  }

  private getHazardVisualIntensity(hazards: ScriptedHazardConfig[]): number {
    if (hazards.length === 0) {
      return 0;
    }

    const total = hazards.reduce((sum, hazard) => sum + (hazard.intensity ?? 0.5), 0);
    return Phaser.Math.Clamp(total / hazards.length, 0, 1.2);
  }

  private getHazardIntensity(type: ScriptedHazardConfig['type']): number {
    return Phaser.Math.Clamp(
      this.activeHazards
        .filter((hazard) => hazard.type === type)
        .reduce((sum, hazard) => sum + (hazard.intensity ?? 0.5), 0),
      0,
      1.8
    );
  }

  private updateHazardOverlay(): void {
    const overlay = this.hazardOverlay;
    if (!overlay) {
      return;
    }

    overlay.clear();
    this.hazardOverlayAlpha = Phaser.Math.Linear(this.hazardOverlayAlpha, this.targetHazardOverlayAlpha, 0.12);

    if (this.hazardOverlayAlpha <= 0.005 || !this.scene) {
      return;
    }

    const width = this.currentWidth;
    const height = this.currentHeight;
    const time = this.elapsed;
    const accentColor = this.levelConfig?.accentColor ?? 0xffffff;

    const energyStorm = this.getHazardIntensity('energy-storm');
    if (energyStorm > 0) {
      const stormAlpha = this.hazardOverlayAlpha * 0.45 * energyStorm;
      for (const ratio of [0.18, 0.48, 0.78]) {
        const x = width * ratio;
        const pulse = (Math.sin(time * 0.01 + ratio * 10) + 1) / 2;
        overlay.lineStyle(2, mixColor(accentColor, 0xffffff, 0.35), stormAlpha * (0.35 + pulse * 0.45));
        overlay.lineBetween(x, 0, x + Math.sin(time * 0.004 + ratio) * 12, height * 0.34);
      }
    }

    const gravityWell = this.getHazardIntensity('gravity-well');
    if (gravityWell > 0) {
      const ringAlpha = this.hazardOverlayAlpha * 0.32 * gravityWell;
      const cx = width * 0.5 + Math.sin(time * 0.001) * 24;
      const cy = height * 0.24;
      overlay.lineStyle(2, mixColor(accentColor, 0xffffff, 0.25), ringAlpha);
      overlay.strokeEllipse(cx, cy, width * 0.18, height * 0.11);
      overlay.lineStyle(1, mixColor(accentColor, 0xffffff, 0.45), ringAlpha * 0.7);
      overlay.strokeEllipse(cx, cy, width * 0.26, height * 0.15);
    }

    const nebulaAmbush = this.getHazardIntensity('nebula-ambush');
    if (nebulaAmbush > 0) {
      const fogAlpha = this.hazardOverlayAlpha * 0.2 * nebulaAmbush;
      overlay.fillStyle(mixColor(accentColor, 0xffffff, 0.18), fogAlpha);
      overlay.fillEllipse(width * 0.08, height * 0.45, width * 0.18, height * 0.52);
      overlay.fillEllipse(width * 0.92, height * 0.42, width * 0.2, height * 0.46);
    }

    const ringCrossfire = this.getHazardIntensity('ring-crossfire');
    if (ringCrossfire > 0) {
      const arcAlpha = this.hazardOverlayAlpha * 0.26 * ringCrossfire;
      overlay.lineStyle(2, mixColor(accentColor, 0xffffff, 0.28), arcAlpha);
      overlay.beginPath();
      overlay.arc(width * 0.16, height * 0.26, width * 0.16, -0.35, 0.55);
      overlay.strokePath();
      overlay.beginPath();
      overlay.arc(width * 0.84, height * 0.26, width * 0.16, 2.59, 3.49);
      overlay.strokePath();
    }

    const debrisSurge = this.getHazardIntensity('debris-surge');
    if (debrisSurge > 0) {
      const streakAlpha = this.hazardOverlayAlpha * 0.18 * debrisSurge;
      overlay.lineStyle(1.5, mixColor(0x8899aa, accentColor, 0.2), streakAlpha);
      for (const ratio of [0.12, 0.28, 0.72, 0.88]) {
        const x = width * ratio;
        overlay.lineBetween(x - 20, height * 0.18, x + 18, height * 0.34);
      }
    }

    const minefield = this.getHazardIntensity('minefield');
    if (minefield > 0) {
      const mineAlpha = this.hazardOverlayAlpha * 0.16 * minefield;
      overlay.fillStyle(mixColor(accentColor, 0xffcc88, 0.35), mineAlpha);
      for (const ratio of [0.15, 0.24, 0.76, 0.85]) {
        overlay.fillCircle(width * ratio, height * 0.62, 2);
        overlay.fillCircle(width * (ratio + 0.02), height * 0.68, 1.6);
      }
    }

    const rockCorridor = this.getHazardIntensity('rock-corridor');
    if (rockCorridor > 0) {
      const edgeAlpha = this.hazardOverlayAlpha * 0.18 * rockCorridor;
      overlay.fillStyle(0x0b0d12, edgeAlpha);
      overlay.fillTriangle(0, height * 0.18, width * 0.11, height * 0.42, 0, height * 0.76);
      overlay.fillTriangle(width, height * 0.18, width * 0.89, height * 0.42, width, height * 0.76);
    }
  }

  private scheduleLevelVisualRebuild(): void {
    if (!this.scene || !this.levelConfig) {
      return;
    }

    if (this.pendingRebuildEvent) {
      this.pendingRebuildEvent.remove(false);
    }

    const targetWidth = this.currentWidth;
    const targetHeight = this.currentHeight;

    this.pendingRebuildEvent = this.scene.time.delayedCall(RESIZE_REBUILD_DEBOUNCE_MS, () => {
      this.pendingRebuildEvent = null;

      if (!this.scene || !this.levelConfig) {
        return;
      }

      if (this.currentWidth !== targetWidth || this.currentHeight !== targetHeight) {
        return;
      }

      this.rebuildLevelVisualLayers(this.scene, this.levelConfig);
    });
  }

  // ---------------------------------------------------------------------------
  // Scenic (nebula) layers
  // ---------------------------------------------------------------------------

  private createScenicLayers(scene: Phaser.Scene, config: LevelConfig): void {
    const scenicWidth = Math.ceil(this.currentWidth + SCENIC_PADDING_X * 2);
    const scenicHeight = Math.ceil(this.currentHeight + SCENIC_PADDING_Y * 2);
    const centerX = this.currentWidth / 2;
    const centerY = this.currentHeight / 2;
    const alphaKey = Math.round(config.nebulaAlpha * 1000);

    for (let i = 0; i < SCENIC_LAYER_CONFIGS.length; i++) {
      const layer = SCENIC_LAYER_CONFIGS[i];
      const textureKey = `${layer.name}-${config.nebulaColor.toString(16)}-${config.accentColor.toString(16)}-${alphaKey}-${scenicWidth}x${scenicHeight}-v2`;

      if (!scene.textures.exists(textureKey)) {
        generateScenicTexture(scene, textureKey, scenicWidth, scenicHeight, config, layer);
      }

      const sprite = scene.add.image(centerX, centerY, textureKey);
      sprite.setDepth(layer.depth);
      sprite.setAlpha(layer.alpha);

      this.scenicLayers.push({
        sprite,
        textureKey,
        baseX: centerX,
        baseY: centerY,
        baseAlpha: layer.alpha,
        driftX: layer.drift.x,
        driftY: layer.drift.y,
        speed: layer.speed,
        phase: Phaser.Math.FloatBetween(0, Math.PI * 2),
      });
    }

    this.layoutScenicLayers();
  }

  // ---------------------------------------------------------------------------
  // Distant planet layer
  // ---------------------------------------------------------------------------

  private createPlanetLayer(scene: Phaser.Scene, config: LevelConfig): void {
    const width = Math.ceil(this.currentWidth + 400);
    const height = Math.ceil(this.currentHeight + 400);
    const textureKey = `planet-${config.accentColor.toString(16)}-${config.nebulaColor.toString(16)}-${width}x${height}`;

    if (!scene.textures.exists(textureKey)) {
      generatePlanetTexture(scene, textureKey, width, height, config);
    }

    const centerX = this.currentWidth / 2;
    const centerY = this.currentHeight / 2;
    const sprite = scene.add.image(centerX, centerY, textureKey);
    sprite.setDepth(-11);
    sprite.setAlpha(0.25);

    this.planetLayer = {
      sprite,
      textureKey,
      baseX: centerX,
      baseY: centerY,
      baseAlpha: 0.25,
    };
  }

  // ---------------------------------------------------------------------------
  // Debris motes (small floating particles)
  // ---------------------------------------------------------------------------

  private createDebrisMotes(scene: Phaser.Scene, config: LevelConfig): void {
    const moteCount = Phaser.Math.Between(6, 12);

    for (let i = 0; i < moteCount; i++) {
      const size = Phaser.Math.FloatBetween(1.5, 4);
      const textureKey = `debris-mote-${Math.round(size * 10)}-${config.accentColor.toString(16)}`;

      if (!scene.textures.exists(textureKey)) {
        const g = scene.add.graphics();
        const moteColor = mixColor(0x888888, config.accentColor, 0.2);
        g.fillStyle(moteColor, 0.3);
        // Irregular small shape
        g.beginPath();
        g.moveTo(size, 0);
        g.lineTo(size * 1.5, size * 0.5);
        g.lineTo(size, size * 1.2);
        g.lineTo(0, size * 0.8);
        g.closePath();
        g.fillPath();
        g.generateTexture(textureKey, Math.ceil(size * 1.5), Math.ceil(size * 1.2));
        g.destroy();
      }

      const x = Phaser.Math.Between(0, this.currentWidth);
      const y = Phaser.Math.Between(0, this.currentHeight);
      const sprite = scene.add.image(x, y, textureKey);
      sprite.setDepth(-5);
      sprite.setAlpha(Phaser.Math.FloatBetween(0.15, 0.35));

      this.debrisMotes.push({
        sprite,
        baseX: x,
        baseY: y,
        baseAlpha: sprite.alpha,
        speed: Phaser.Math.FloatBetween(0.0003, 0.001),
        driftX: Phaser.Math.FloatBetween(10, 40),
        driftY: Phaser.Math.FloatBetween(5, 20),
        phase: Phaser.Math.FloatBetween(0, Math.PI * 2),
        rotSpeed: Phaser.Math.FloatBetween(-0.5, 0.5),
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Star twinkle shimmer
  // ---------------------------------------------------------------------------

  private createStarTwinkles(scene: Phaser.Scene, _config: LevelConfig): void {
    const twinkleCount = Phaser.Math.Between(12, 24);

    for (let i = 0; i < twinkleCount; i++) {
      const size = Phaser.Math.FloatBetween(2, 5);
      const textureKey = `twinkle-${Math.round(size * 10)}`;

      if (!scene.textures.exists(textureKey)) {
        const g = scene.add.graphics();
        // Four-point star twinkle
        const cx = size;
        const cy = size;
        const ts = size;

        // Soft outer glow
        g.fillStyle(0xffffff, 0.08);
        g.fillCircle(cx, cy, ts);

        g.fillStyle(0xffffff, 0.25);
        g.fillCircle(cx, cy, ts * 0.5);

        // Cross rays
        g.fillStyle(0xffffff, 0.5);
        g.fillRect(cx - ts, cy - 0.3, ts * 2, 0.6);
        g.fillRect(cx - 0.3, cy - ts, 0.6, ts * 2);

        // Hot center
        g.fillStyle(0xffffff, 1);
        g.fillCircle(cx, cy, 0.6);

        g.generateTexture(textureKey, Math.ceil(size * 2), Math.ceil(size * 2));
        g.destroy();
      }

      const x = Phaser.Math.Between(0, this.currentWidth);
      const y = Phaser.Math.Between(0, this.currentHeight);
      const depth = DEPTHS[Phaser.Math.Between(0, DEPTHS.length - 1)];
      const sprite = scene.add.image(x, y, textureKey);
      sprite.setDepth(depth + 1);
      sprite.setAlpha(0);

      this.twinkles.push({
        sprite,
        phase: Phaser.Math.FloatBetween(0, Math.PI * 2),
        speed: Phaser.Math.FloatBetween(0.0008, 0.003),
        minAlpha: Phaser.Math.FloatBetween(0, 0.15),
        maxAlpha: Phaser.Math.FloatBetween(0.3, 0.8),
        baseMinAlpha: 0,
        baseMaxAlpha: 0,
      });

      const state = this.twinkles[this.twinkles.length - 1];
      state.baseMinAlpha = state.minAlpha;
      state.baseMaxAlpha = state.maxAlpha;
    }
  }

  // ---------------------------------------------------------------------------
  // Update
  // ---------------------------------------------------------------------------

  update(delta: number): void {
    this.elapsed += delta;
    this.atmosphereAlpha = Phaser.Math.Linear(this.atmosphereAlpha, this.targetAtmosphereAlpha, 0.08);
    this.atmosphereDrift = Phaser.Math.Linear(this.atmosphereDrift, this.targetAtmosphereDrift, 0.08);
    this.atmosphereTwinkle = Phaser.Math.Linear(this.atmosphereTwinkle, this.targetAtmosphereTwinkle, 0.08);
    this.landmarkAlpha = Phaser.Math.Linear(this.landmarkAlpha, this.targetLandmarkAlpha, 0.08);

    // Star layers scroll
    for (let i = 0; i < this.tileSprites.length; i++) {
      const speed = LAYER_CONFIGS[i].scrollSpeed * SCROLL_SPEED * delta / 16;
      this.tileSprites[i].tilePositionY += speed;
    }

    // Nebula drift
    for (let i = 0; i < this.scenicLayers.length; i++) {
      const layer = this.scenicLayers[i];
      const phase = this.elapsed * layer.speed * this.atmosphereDrift + layer.phase;
      layer.sprite.x = layer.baseX + Math.sin(phase) * layer.driftX * this.atmosphereDrift;
      layer.sprite.y = layer.baseY + Math.cos(phase * 0.85) * layer.driftY * this.atmosphereDrift;
      layer.sprite.setAlpha(Phaser.Math.Clamp(layer.baseAlpha * this.atmosphereAlpha, 0.16, 0.95));
    }

    // Planet parallax drift (very slow)
    if (this.planetLayer) {
      const phase = this.elapsed * 0.00004;
      this.planetLayer.sprite.x = this.planetLayer.baseX + Math.sin(phase) * 30;
      this.planetLayer.sprite.y = this.planetLayer.baseY + Math.cos(phase * 0.6) * 15;
      this.planetLayer.sprite.setAlpha(
        Phaser.Math.Clamp(this.planetLayer.baseAlpha * (0.92 + (this.atmosphereAlpha - 1) * 0.6) * this.landmarkAlpha, 0.12, 0.4)
      );
    }

    // Debris mote floating
    for (let i = 0; i < this.debrisMotes.length; i++) {
      const mote = this.debrisMotes[i];
      const phase = this.elapsed * mote.speed + mote.phase;
      mote.sprite.x = mote.baseX + Math.sin(phase) * mote.driftX;
      mote.sprite.y = mote.baseY + Math.cos(phase * 0.7) * mote.driftY;
      mote.sprite.angle += mote.rotSpeed * delta / 16;
      mote.sprite.setAlpha(Phaser.Math.Clamp(mote.baseAlpha * this.atmosphereAlpha, 0.08, 0.45));
    }

    // Star twinkle shimmer
    for (let i = 0; i < this.twinkles.length; i++) {
      const twinkle = this.twinkles[i];
      const t = Math.sin(this.elapsed * twinkle.speed + twinkle.phase);
      const normalizedT = (t + 1) / 2;
      const minAlpha = twinkle.baseMinAlpha * this.atmosphereTwinkle;
      const maxAlpha = twinkle.baseMaxAlpha * this.atmosphereTwinkle;
      twinkle.sprite.setAlpha(minAlpha + normalizedT * (maxAlpha - minAlpha));
    }

    // Moon surface scroll
    if (this.moonSurface) {
      const phase = this.elapsed * this.moonSurface.motionSpeed;
      const scrollOffset = Math.sin(phase) * this.moonSurface.motionAmplitude;
      this.moonSurface.sprite.x = this.moonSurface.baseX + scrollOffset;
      this.moonSurface.sprite.y = this.moonSurface.baseY;
      this.moonSurface.sprite.setAlpha(
        Phaser.Math.Clamp(this.moonSurface.baseAlpha * (0.94 + (this.atmosphereAlpha - 1) * 0.5) * this.landmarkAlpha, 0.24, 0.62)
      );
    }

    // Passing planets drift
    for (let i = 0; i < this.passingPlanetSprites.length; i++) {
      const pp = this.passingPlanetSprites[i];
      pp.sprite.x -= pp.scrollSpeed * SCROLL_SPEED * delta / 16;
      pp.sprite.setAlpha(Phaser.Math.Clamp(pp.baseAlpha * this.atmosphereAlpha * this.landmarkAlpha, 0.05, 0.28));
      if (pp.sprite.x < this.getPassingPlanetOffscreenThreshold(pp.sprite)) {
        this.resetPassingPlanetPosition(pp);
      }
    }

    // Edge-only foreground silhouettes
    for (let i = 0; i < this.foregroundSilhouettes.length; i++) {
      const silhouette = this.foregroundSilhouettes[i];
      const phase = this.elapsed * 0.00022 + silhouette.phase;
      silhouette.sprite.x = silhouette.baseX + Math.sin(phase) * silhouette.driftX;
      silhouette.sprite.y = silhouette.baseY + Math.cos(phase * 0.7) * silhouette.driftY;
      silhouette.sprite.setAlpha(Phaser.Math.Clamp(silhouette.alpha * this.landmarkAlpha, 0.04, 0.14));
    }

    this.updateHazardOverlay();
  }

  // ---------------------------------------------------------------------------
  // Layout
  // ---------------------------------------------------------------------------

  private layoutTileSprites(): void {
    const centerX = this.currentWidth / 2;
    const centerY = this.currentHeight / 2;

    for (let i = 0; i < this.tileSprites.length; i++) {
      this.tileSprites[i].setPosition(centerX, centerY);
      this.tileSprites[i].setSize(this.currentWidth, this.currentHeight);
    }
  }

  private layoutScenicLayers(): void {
    const centerX = this.currentWidth / 2;
    const centerY = this.currentHeight / 2;

    for (let i = 0; i < this.scenicLayers.length; i++) {
      this.scenicLayers[i].baseX = centerX;
      this.scenicLayers[i].baseY = centerY;
      this.scenicLayers[i].sprite.setPosition(centerX, centerY);
    }
  }

  private layoutPlanetLayer(): void {
    if (!this.planetLayer) return;
    const centerX = this.currentWidth / 2;
    const centerY = this.currentHeight / 2;
    this.planetLayer.baseX = centerX;
    this.planetLayer.baseY = centerY;
    this.planetLayer.sprite.setPosition(centerX, centerY);
  }

  private layoutMoonSurfaceLayer(): void {
    if (!this.moonSurface) return;
    const centerX = this.currentWidth / 2;
    const baseY = this.currentHeight * 0.75;
    this.moonSurface.baseX = centerX;
    this.moonSurface.baseY = baseY;
    this.moonSurface.sprite.setPosition(centerX, baseY);
  }

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  private destroyScenicLayers(): void {
    for (let i = 0; i < this.scenicLayers.length; i++) {
      this.scenicLayers[i].sprite.destroy();

      if (this.scene?.textures.exists(this.scenicLayers[i].textureKey)) {
        this.scene.textures.remove(this.scenicLayers[i].textureKey);
      }
    }

    this.scenicLayers = [];
  }

  private destroyPlanetLayer(): void {
    if (!this.planetLayer) return;
    this.planetLayer.sprite.destroy();
    if (this.scene?.textures.exists(this.planetLayer.textureKey)) {
      this.scene.textures.remove(this.planetLayer.textureKey);
    }
    this.planetLayer = null;
  }

  private destroyDebrisMotes(): void {
    for (const mote of this.debrisMotes) {
      mote.sprite.destroy();
    }
    this.debrisMotes = [];
  }

  private destroyTwinkles(): void {
    for (const twinkle of this.twinkles) {
      twinkle.sprite.destroy();
    }
    this.twinkles = [];
  }

  private destroyMoonSurfaceLayer(): void {
    if (!this.moonSurface) return;
    this.moonSurface.sprite.destroy();
    if (this.scene?.textures.exists(this.moonSurface.textureKey)) {
      this.scene.textures.remove(this.moonSurface.textureKey);
    }
    this.moonSurface = null;
  }

  private destroyPassingPlanetLayers(): void {
    for (const pp of this.passingPlanetSprites) {
      pp.sprite.destroy();
    }
    this.passingPlanetSprites = [];
  }
}
