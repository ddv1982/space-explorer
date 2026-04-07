import Phaser from 'phaser';
import { SCROLL_SPEED } from '../utils/constants';
import type { LevelConfig } from '../config/LevelsConfig';
import { mixColor } from '../utils/colorUtils';
import { generateScenicTexture } from './parallax/scenicTextureGenerator';
import { generatePlanetTexture } from './parallax/planetTextureGenerator';

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
}

interface ScenicLayerState {
  sprite: Phaser.GameObjects.Image;
  textureKey: string;
  baseX: number;
  baseY: number;
  driftX: number;
  driftY: number;
  speed: number;
  phase: number;
}

interface PlanetLayerState {
  sprite: Phaser.GameObjects.Image;
  textureKey: string;
  scrollSpeed: number;
  baseX: number;
  baseY: number;
}

interface DebrisMote {
  sprite: Phaser.GameObjects.Image;
  baseX: number;
  baseY: number;
  speed: number;
  driftX: number;
  driftY: number;
  phase: number;
  rotSpeed: number;
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
  private elapsed = 0;
  private currentWidth = 0;
  private currentHeight = 0;

  create(scene: Phaser.Scene, levelConfig?: LevelConfig): void {
    this.destroy();

    this.scene = scene;
    this.levelConfig = levelConfig;
    this.tileSprites = [];
    this.scenicLayers = [];
    this.debrisMotes = [];
    this.elapsed = 0;
    this.currentWidth = scene.cameras.main.width;
    this.currentHeight = scene.cameras.main.height;

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

    // Add nebula layers if level config provided
    if (levelConfig) {
      this.createScenicLayers(scene, levelConfig);
      this.createPlanetLayer(scene, levelConfig);
      this.createDebrisMotes(scene, levelConfig);
      this.createStarTwinkles(scene, levelConfig);
    }

    this.layoutTileSprites();
  }

  resize(width: number, height: number): void {
    if (!this.scene || width <= 0 || height <= 0) {
      return;
    }

    const sizeChanged = this.currentWidth !== width || this.currentHeight !== height;
    this.currentWidth = width;
    this.currentHeight = height;

    this.layoutTileSprites();

    if (!this.levelConfig || this.scenicLayers.length === 0) {
      return;
    }

    if (sizeChanged) {
      this.destroyScenicLayers();
      this.destroyPlanetLayer();
      this.destroyDebrisMotes();
      this.createScenicLayers(this.scene, this.levelConfig);
      this.createPlanetLayer(this.scene, this.levelConfig);
      this.createDebrisMotes(this.scene, this.levelConfig);
      return;
    }

    this.layoutScenicLayers();
    this.layoutPlanetLayer();
  }

  destroy(): void {
    this.destroyScenicLayers();
    this.destroyPlanetLayer();
    this.destroyDebrisMotes();
    this.destroyTwinkles();

    for (let i = 0; i < this.tileSprites.length; i++) {
      this.tileSprites[i].destroy();
    }

    this.tileSprites = [];
    this.scene = null;
    this.levelConfig = undefined;
    this.elapsed = 0;
    this.currentWidth = 0;
    this.currentHeight = 0;
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
      scrollSpeed: 0.03,
      baseX: centerX,
      baseY: centerY,
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
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Update
  // ---------------------------------------------------------------------------

  update(delta: number): void {
    this.elapsed += delta;

    // Star layers scroll
    for (let i = 0; i < this.tileSprites.length; i++) {
      const speed = LAYER_CONFIGS[i].scrollSpeed * SCROLL_SPEED * delta / 16;
      this.tileSprites[i].tilePositionY += speed;
    }

    // Nebula drift
    for (let i = 0; i < this.scenicLayers.length; i++) {
      const layer = this.scenicLayers[i];
      const phase = this.elapsed * layer.speed + layer.phase;
      layer.sprite.x = layer.baseX + Math.sin(phase) * layer.driftX;
      layer.sprite.y = layer.baseY + Math.cos(phase * 0.85) * layer.driftY;
    }

    // Planet parallax drift (very slow)
    if (this.planetLayer) {
      const phase = this.elapsed * 0.00004;
      this.planetLayer.sprite.x = this.planetLayer.baseX + Math.sin(phase) * 30;
      this.planetLayer.sprite.y = this.planetLayer.baseY + Math.cos(phase * 0.6) * 15;
    }

    // Debris mote floating
    for (let i = 0; i < this.debrisMotes.length; i++) {
      const mote = this.debrisMotes[i];
      const phase = this.elapsed * mote.speed + mote.phase;
      mote.sprite.x = mote.baseX + Math.sin(phase) * mote.driftX;
      mote.sprite.y = mote.baseY + Math.cos(phase * 0.7) * mote.driftY;
      mote.sprite.angle += mote.rotSpeed * delta / 16;
    }

    // Star twinkle shimmer
    for (let i = 0; i < this.twinkles.length; i++) {
      const twinkle = this.twinkles[i];
      const t = Math.sin(this.elapsed * twinkle.speed + twinkle.phase);
      const normalizedT = (t + 1) / 2;
      twinkle.sprite.setAlpha(twinkle.minAlpha + normalizedT * (twinkle.maxAlpha - twinkle.minAlpha));
    }
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
}

