import Phaser from 'phaser';
import { SCROLL_SPEED } from '../utils/constants';
import type { LevelConfig } from '../config/LevelsConfig';
import { mixColor } from '../utils/colorUtils';

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
  { name: 'far-stars', scrollSpeed: 0.15, starCount: 125, starSize: { min: 0.35, max: 1.4 }, starAlpha: { min: 0.15, max: 0.55 }, baseColor: 0x8888aa, accentMix: 0.08, sparkleFraction: 0.04, colorStarCount: 4 },
  { name: 'mid-stars', scrollSpeed: 0.35, starCount: 84, starSize: { min: 0.8, max: 2.0 }, starAlpha: { min: 0.3, max: 0.8 }, baseColor: 0xaaaacc, accentMix: 0.14, sparkleFraction: 0.08, colorStarCount: 6 },
  { name: 'near-stars', scrollSpeed: 0.6, starCount: 48, starSize: { min: 1.1, max: 3.1 }, starAlpha: { min: 0.5, max: 1.0 }, baseColor: 0xccccee, accentMix: 0.22, sparkleFraction: 0.12, colorStarCount: 6 },
  { name: 'dust', scrollSpeed: 0.85, starCount: 28, starSize: { min: 0.4, max: 1.25 }, starAlpha: { min: 0.08, max: 0.24 }, baseColor: 0x6666aa, accentMix: 0.32, sparkleFraction: 0, colorStarCount: 3 },
];

const SCENIC_LAYER_CONFIGS: ScenicLayerConfig[] = [
  {
    name: 'nebula-far',
    depth: -9,
      alpha: 0.86,
      hazeCount: 5,
      cloudCount: 9,
    shadowCount: 4,
      sparkleCount: 18,
    filamentCount: 3,
    radius: { min: 140, max: 280 },
    drift: { x: 18, y: 12 },
    speed: 0.00012,
    accentMix: 0.24,
  },
  {
    name: 'nebula-near',
    depth: -7,
      alpha: 0.58,
    hazeCount: 3,
      cloudCount: 8,
    shadowCount: 5,
      sparkleCount: 26,
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
      const textureKey = `${config.name}-${starColor.toString(16)}-v3`;

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

          if (size > 1.35) {
            g.fillStyle(starColor, alpha * 0.22);
            g.fillCircle(x, y, size * 2.2);
          }
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
      const textureKey = `${layer.name}-${config.nebulaColor.toString(16)}-${config.accentColor.toString(16)}-${alphaKey}-${scenicWidth}x${scenicHeight}-v3`;

      if (!scene.textures.exists(textureKey)) {
        this.generateScenicTexture(scene, textureKey, scenicWidth, scenicHeight, config, layer);
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

  private generateScenicTexture(
    scene: Phaser.Scene,
    textureKey: string,
    width: number,
    height: number,
    levelConfig: LevelConfig,
    layerConfig: ScenicLayerConfig
  ): void {
    const graphics = scene.add.graphics();
    const bgColor = parseHexColor(levelConfig.bgColor);
    const hazeColor = mixColor(levelConfig.nebulaColor, bgColor, 0.38);
    const cloudColor = mixColor(levelConfig.nebulaColor, levelConfig.accentColor, layerConfig.accentMix);
    const glowColor = mixColor(levelConfig.accentColor, 0xffffff, 0.35);
    const shadowColor = mixColor(bgColor, 0x000000, 0.58);
    const filamentColor = mixColor(levelConfig.nebulaColor, levelConfig.accentColor, 0.6);

    // Large background haze
    for (let i = 0; i < layerConfig.hazeCount; i++) {
      const radius = Phaser.Math.Between(
        Math.floor(Math.min(width, height) * 0.28),
        Math.floor(Math.min(width, height) * 0.46)
      );
      drawSoftCircle(
        graphics,
        Phaser.Math.Between(-80, width + 80),
        Phaser.Math.Between(-80, height + 80),
        radius,
        hazeColor,
        levelConfig.nebulaAlpha * (0.16 + i * 0.03),
        18
      );
    }

    // Deep shadows
    for (let i = 0; i < layerConfig.shadowCount; i++) {
      const radius = Phaser.Math.Between(
        Math.floor(layerConfig.radius.min * 0.75),
        Math.floor(layerConfig.radius.max * 1.1)
      );
      drawSoftCircle(
        graphics,
        Phaser.Math.Between(-40, width + 40),
        Phaser.Math.Between(-40, height + 40),
        radius,
        shadowColor,
        0.12 + i * 0.02,
        14
      );
    }

    // Cloud formations with layered depth
    for (let i = 0; i < layerConfig.cloudCount; i++) {
      const cx = Phaser.Math.Between(-60, width + 60);
      const cy = Phaser.Math.Between(-60, height + 60);
      const radius = Phaser.Math.Between(layerConfig.radius.min, layerConfig.radius.max);
      const offsetX = Phaser.Math.Between(-Math.floor(radius * 0.18), Math.floor(radius * 0.18));
      const offsetY = Phaser.Math.Between(-Math.floor(radius * 0.12), Math.floor(radius * 0.12));

      // Shadow underneath
      drawSoftCircle(
        graphics,
        cx + offsetX,
        cy + offsetY,
        Math.floor(radius * 0.96),
        shadowColor,
        levelConfig.nebulaAlpha * 0.14,
        12
      );
      // Main cloud body
      drawSoftCircle(
        graphics,
        cx,
        cy,
        radius,
        cloudColor,
        levelConfig.nebulaAlpha * 0.34,
        10
      );
      // Inner bright core
      drawSoftCircle(
        graphics,
        cx + Phaser.Math.Between(-Math.floor(radius * 0.16), Math.floor(radius * 0.16)),
        cy + Phaser.Math.Between(-Math.floor(radius * 0.16), Math.floor(radius * 0.16)),
        Math.floor(radius * Phaser.Math.FloatBetween(0.32, 0.52)),
        glowColor,
        levelConfig.nebulaAlpha * 0.18,
        12
      );
    }

    // Bright glow spots
    for (let i = 0; i < 4; i++) {
      const cx = Phaser.Math.Between(0, width);
      const cy = Phaser.Math.Between(0, height);
      const radius = Phaser.Math.Between(80, 200);

      drawSoftCircle(
        graphics,
        cx,
        cy,
        radius,
        glowColor,
        levelConfig.nebulaAlpha * 0.12,
        16
      );
    }

    // Filament/tendril shapes for organic feel
    for (let i = 0; i < layerConfig.filamentCount; i++) {
      const startX = Phaser.Math.Between(0, width);
      const startY = Phaser.Math.Between(0, height);
      const length = Phaser.Math.Between(120, 400);
      const segments = Phaser.Math.Between(4, 8);
      const curveStrength = Phaser.Math.Between(30, 80);

      graphics.lineStyle(Phaser.Math.FloatBetween(3, 8), filamentColor, levelConfig.nebulaAlpha * 0.15);
      graphics.beginPath();
      graphics.moveTo(startX, startY);

      for (let s = 0; s < segments; s++) {
        const progress = (s + 1) / segments;
        const segX = startX + Math.sin(progress * Math.PI * 1.5 + i) * curveStrength + Phaser.Math.Between(-20, 20);
        const segY = startY + progress * length;
        graphics.lineTo(segX, segY);
      }
      graphics.strokePath();

      // Soft glow along filament
      for (let s = 0; s < segments; s++) {
        const progress = (s + 0.5) / segments;
        const fx = startX + Math.sin(progress * Math.PI * 1.5 + i) * curveStrength;
        const fy = startY + progress * length;
        drawSoftCircle(graphics, fx, fy, Phaser.Math.Between(15, 35), filamentColor, levelConfig.nebulaAlpha * 0.08, 8);
      }
    }

    // Sparkle points
    for (let i = 0; i < layerConfig.sparkleCount; i++) {
      const sparkleX = Phaser.Math.Between(0, width);
      const sparkleY = Phaser.Math.Between(0, height);
      const sparkleAlpha = Phaser.Math.FloatBetween(0.08, 0.22);
      const sparkleSize = Phaser.Math.FloatBetween(0.8, 1.8);
      graphics.fillStyle(glowColor, sparkleAlpha);
      graphics.fillCircle(sparkleX, sparkleY, sparkleSize);
    }

    graphics.generateTexture(textureKey, width, height);
    graphics.destroy();
  }

  // ---------------------------------------------------------------------------
  // Distant planet layer
  // ---------------------------------------------------------------------------

  private createPlanetLayer(scene: Phaser.Scene, config: LevelConfig): void {
    const width = Math.ceil(this.currentWidth + 400);
    const height = Math.ceil(this.currentHeight + 400);
    const textureKey = `planet-${config.accentColor.toString(16)}-${config.nebulaColor.toString(16)}-${width}x${height}`;

    if (!scene.textures.exists(textureKey)) {
      this.generatePlanetTexture(scene, textureKey, width, height, config);
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

  private generatePlanetTexture(
    scene: Phaser.Scene,
    textureKey: string,
    width: number,
    height: number,
    config: LevelConfig
  ): void {
    const graphics = scene.add.graphics();
    const palette = config.planetPalette;

    // Position planet in upper portion, offset to one side
    const planetX = width * Phaser.Math.FloatBetween(0.6, 0.85);
    const planetY = height * Phaser.Math.FloatBetween(0.08, 0.25);
    const planetRadius = Phaser.Math.Between(80, 160);

    // Planet body shadow
    drawSoftCircle(graphics, planetX + 4, planetY + 4, planetRadius + 2, 0x000000, 0.15, 8);

    // Planet body
    drawSoftCircle(graphics, planetX, planetY, planetRadius, palette[0], 0.3, 6);

    // Planet lit side highlight
    drawSoftCircle(
      graphics,
      planetX - planetRadius * 0.2,
      planetY - planetRadius * 0.15,
      Math.floor(planetRadius * 0.7),
      palette[1],
      0.2,
      8
    );

    // Atmosphere glow
    const atmoColor = mixColor(config.accentColor, 0xffffff, 0.3);
    drawSoftCircle(graphics, planetX, planetY, planetRadius + 15, atmoColor, 0.06, 10);

    // Ring hint for gas giants (partial arc)
    if (Phaser.Math.Between(0, 1) === 1) {
      const ringColor = mixColor(palette[0], palette[1], 0.5);
      graphics.lineStyle(3, ringColor, 0.15);
      graphics.beginPath();
      graphics.arc(planetX, planetY, planetRadius * 1.5, -0.4, 0.4);
      graphics.strokePath();
      graphics.lineStyle(2, ringColor, 0.1);
      graphics.beginPath();
      graphics.arc(planetX, planetY, planetRadius * 1.6, -0.35, 0.35);
      graphics.strokePath();
    }

    graphics.generateTexture(textureKey, width, height);
    graphics.destroy();
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
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function drawSoftCircle(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  radius: number,
  color: number,
  peakAlpha: number,
  step: number
): void {
  for (let r = radius; r > 0; r -= step) {
    const falloff = 1 - r / radius;
    const alpha = peakAlpha * (0.08 + falloff * falloff * 0.92);
    graphics.fillStyle(color, alpha);
    graphics.fillCircle(x, y, r);
  }
}

function parseHexColor(color: string): number {
  return Number.parseInt(color.replace('#', ''), 16);
}
