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
}

interface ScenicLayerConfig {
  name: string;
  depth: number;
  alpha: number;
  hazeCount: number;
  cloudCount: number;
  shadowCount: number;
  sparkleCount: number;
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

const LAYER_CONFIGS: StarLayerConfig[] = [
  { name: 'far-stars', scrollSpeed: 0.15, starCount: 80, starSize: { min: 0.5, max: 1 }, starAlpha: { min: 0.2, max: 0.5 }, baseColor: 0x8888aa, accentMix: 0.08 },
  { name: 'mid-stars', scrollSpeed: 0.35, starCount: 50, starSize: { min: 1, max: 1.5 }, starAlpha: { min: 0.4, max: 0.7 }, baseColor: 0xaaaacc, accentMix: 0.14 },
  { name: 'near-stars', scrollSpeed: 0.6, starCount: 30, starSize: { min: 1.5, max: 2.5 }, starAlpha: { min: 0.6, max: 1.0 }, baseColor: 0xccccee, accentMix: 0.22 },
  { name: 'dust', scrollSpeed: 0.85, starCount: 15, starSize: { min: 0.5, max: 1 }, starAlpha: { min: 0.1, max: 0.25 }, baseColor: 0x6666aa, accentMix: 0.32 },
];

const SCENIC_LAYER_CONFIGS: ScenicLayerConfig[] = [
  {
    name: 'nebula-far',
    depth: -9,
    alpha: 0.82,
    hazeCount: 3,
    cloudCount: 7,
    shadowCount: 3,
    sparkleCount: 10,
    radius: { min: 140, max: 280 },
    drift: { x: 18, y: 12 },
    speed: 0.00012,
    accentMix: 0.24,
  },
  {
    name: 'nebula-near',
    depth: -7,
    alpha: 0.52,
    hazeCount: 2,
    cloudCount: 6,
    shadowCount: 4,
    sparkleCount: 16,
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

export class ParallaxBackground {
  private scene: Phaser.Scene | null = null;
  private levelConfig?: LevelConfig;
  private tileSprites: Phaser.GameObjects.TileSprite[] = [];
  private scenicLayers: ScenicLayerState[] = [];
  private elapsed = 0;
  private currentWidth = 0;
  private currentHeight = 0;

  create(scene: Phaser.Scene, levelConfig?: LevelConfig): void {
    this.destroy();

    this.scene = scene;
    this.levelConfig = levelConfig;
    this.tileSprites = [];
    this.scenicLayers = [];
    this.elapsed = 0;
    this.currentWidth = scene.cameras.main.width;
    this.currentHeight = scene.cameras.main.height;

    for (let i = 0; i < LAYER_CONFIGS.length; i++) {
      const config = LAYER_CONFIGS[i];
      const starColor = levelConfig
        ? mixColor(config.baseColor, levelConfig.accentColor, config.accentMix)
        : config.baseColor;
      const textureKey = `${config.name}-${starColor.toString(16)}`;

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
      this.createScenicLayers(this.scene, this.levelConfig);
      return;
    }

    this.layoutScenicLayers();
  }

  destroy(): void {
    this.destroyScenicLayers();

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

  private createScenicLayers(scene: Phaser.Scene, config: LevelConfig): void {
    const scenicWidth = Math.ceil(this.currentWidth + SCENIC_PADDING_X * 2);
    const scenicHeight = Math.ceil(this.currentHeight + SCENIC_PADDING_Y * 2);
    const centerX = this.currentWidth / 2;
    const centerY = this.currentHeight / 2;
    const alphaKey = Math.round(config.nebulaAlpha * 1000);

    for (let i = 0; i < SCENIC_LAYER_CONFIGS.length; i++) {
      const layer = SCENIC_LAYER_CONFIGS[i];
      const textureKey = `${layer.name}-${config.nebulaColor.toString(16)}-${config.accentColor.toString(16)}-${alphaKey}-${scenicWidth}x${scenicHeight}`;

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

    for (let i = 0; i < layerConfig.cloudCount; i++) {
      const cx = Phaser.Math.Between(-60, width + 60);
      const cy = Phaser.Math.Between(-60, height + 60);
      const radius = Phaser.Math.Between(layerConfig.radius.min, layerConfig.radius.max);
      const offsetX = Phaser.Math.Between(-Math.floor(radius * 0.18), Math.floor(radius * 0.18));
      const offsetY = Phaser.Math.Between(-Math.floor(radius * 0.12), Math.floor(radius * 0.12));

      drawSoftCircle(
        graphics,
        cx + offsetX,
        cy + offsetY,
        Math.floor(radius * 0.96),
        shadowColor,
        levelConfig.nebulaAlpha * 0.14,
        12
      );
      drawSoftCircle(
        graphics,
        cx,
        cy,
        radius,
        cloudColor,
        levelConfig.nebulaAlpha * 0.34,
        10
      );
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

    for (let i = 0; i < 3; i++) {
      const cx = Phaser.Math.Between(0, width);
      const cy = Phaser.Math.Between(0, height);
      const radius = Phaser.Math.Between(80, 180);

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

  update(delta: number): void {
    this.elapsed += delta;

    for (let i = 0; i < this.tileSprites.length; i++) {
      const speed = LAYER_CONFIGS[i].scrollSpeed * SCROLL_SPEED * delta / 16;
      this.tileSprites[i].tilePositionY += speed;
    }

    for (let i = 0; i < this.scenicLayers.length; i++) {
      const layer = this.scenicLayers[i];
      const phase = this.elapsed * layer.speed + layer.phase;
      layer.sprite.x = layer.baseX + Math.sin(phase) * layer.driftX;
      layer.sprite.y = layer.baseY + Math.cos(phase * 0.85) * layer.driftY;
    }
  }

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

  private destroyScenicLayers(): void {
    for (let i = 0; i < this.scenicLayers.length; i++) {
      this.scenicLayers[i].sprite.destroy();

      if (this.scene?.textures.exists(this.scenicLayers[i].textureKey)) {
        this.scene.textures.remove(this.scenicLayers[i].textureKey);
      }
    }

    this.scenicLayers = [];
  }
}

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
