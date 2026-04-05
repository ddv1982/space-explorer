import Phaser from 'phaser';
import { SCROLL_SPEED } from '../utils/constants';
import { LevelConfig } from '../config/LevelsConfig';

export interface StarLayerConfig {
  name: string;
  scrollSpeed: number;
  starCount: number;
  starSize: { min: number; max: number };
  starAlpha: { min: number; max: number };
  color: number;
}

const LAYER_CONFIGS: StarLayerConfig[] = [
  { name: 'far-stars', scrollSpeed: 0.15, starCount: 80, starSize: { min: 0.5, max: 1 }, starAlpha: { min: 0.2, max: 0.5 }, color: 0x8888aa },
  { name: 'mid-stars', scrollSpeed: 0.35, starCount: 50, starSize: { min: 1, max: 1.5 }, starAlpha: { min: 0.4, max: 0.7 }, color: 0xaaaacc },
  { name: 'near-stars', scrollSpeed: 0.6, starCount: 30, starSize: { min: 1.5, max: 2.5 }, starAlpha: { min: 0.6, max: 1.0 }, color: 0xccccee },
  { name: 'dust', scrollSpeed: 0.85, starCount: 15, starSize: { min: 0.5, max: 1 }, starAlpha: { min: 0.1, max: 0.25 }, color: 0x6666aa },
];

const TILE_WIDTH = 512;
const TILE_HEIGHT = 2048;
const DEPTHS = [-10, -8, -6, -4];
const NEBULA_DEPTH = -9;
const NEBULA_TILE_WIDTH = 512;
const NEBULA_TILE_HEIGHT = 2048;

export class ParallaxBackground {
  private tileSprites: Phaser.GameObjects.TileSprite[] = [];
  private nebulaSprites: Phaser.GameObjects.TileSprite[] = [];

  create(scene: Phaser.Scene, levelConfig?: LevelConfig): void {
    for (let i = 0; i < LAYER_CONFIGS.length; i++) {
      const config = LAYER_CONFIGS[i];

      // Only generate texture if it doesn't exist
      if (!scene.textures.exists(config.name)) {
        const g = scene.add.graphics();

        for (let s = 0; s < config.starCount; s++) {
          const x = Phaser.Math.Between(0, TILE_WIDTH);
          const y = Phaser.Math.Between(0, TILE_HEIGHT);
          const size = Phaser.Math.FloatBetween(config.starSize.min, config.starSize.max);
          const alpha = Phaser.Math.FloatBetween(config.starAlpha.min, config.starAlpha.max);

          g.fillStyle(config.color, alpha);
          g.fillCircle(x, y, size);
        }

        g.generateTexture(config.name, TILE_WIDTH, TILE_HEIGHT);
        g.destroy();
      }

      const tile = scene.add.tileSprite(
        scene.cameras.main.width / 2,
        scene.cameras.main.height / 2,
        scene.cameras.main.width,
        scene.cameras.main.height,
        config.name
      );
      tile.setOrigin(0.5);
      tile.setScrollFactor(config.scrollSpeed);
      tile.setDepth(DEPTHS[i]);
      this.tileSprites.push(tile);
    }

    // Add nebula layers if level config provided
    if (levelConfig) {
      this.createNebulaLayers(scene, levelConfig);
    }
  }

  private createNebulaLayers(scene: Phaser.Scene, config: LevelConfig): void {
    const nebulaKey = `nebula-${config.nebulaColor}`;

    if (!scene.textures.exists(nebulaKey)) {
      const g = scene.add.graphics();

      // Create several soft nebula clouds
      const cloudCount = 8;
      for (let i = 0; i < cloudCount; i++) {
        const cx = Phaser.Math.Between(50, NEBULA_TILE_WIDTH - 50);
        const cy = Phaser.Math.Between(100, NEBULA_TILE_HEIGHT - 100);
        const radius = Phaser.Math.Between(60, 160);

        // Draw soft gradient circle using multiple overlapping circles
        for (let r = radius; r > 0; r -= 4) {
          const alpha = config.nebulaAlpha * (1 - r / radius) * 0.5;
          g.fillStyle(config.nebulaColor, alpha);
          g.fillCircle(cx, cy, r);
        }
      }

      g.generateTexture(nebulaKey, NEBULA_TILE_WIDTH, NEBULA_TILE_HEIGHT);
      g.destroy();
    }

    // Two nebula layers at different scroll speeds for parallax depth
    const nebula1 = scene.add.tileSprite(
      scene.cameras.main.width / 2,
      scene.cameras.main.height / 2,
      scene.cameras.main.width,
      scene.cameras.main.height,
      nebulaKey
    );
    nebula1.setOrigin(0.5);
    nebula1.setScrollFactor(0.1);
    nebula1.setDepth(NEBULA_DEPTH);
    this.nebulaSprites.push(nebula1);

    const nebula2 = scene.add.tileSprite(
      scene.cameras.main.width / 2,
      scene.cameras.main.height / 2,
      scene.cameras.main.width,
      scene.cameras.main.height,
      nebulaKey
    );
    nebula2.setOrigin(0.5);
    nebula2.setScrollFactor(0.25);
    nebula2.setDepth(NEBULA_DEPTH + 1);
    nebula2.setAlpha(0.6);
    this.nebulaSprites.push(nebula2);
  }

  update(delta: number): void {
    for (let i = 0; i < this.tileSprites.length; i++) {
      const speed = LAYER_CONFIGS[i].scrollSpeed * SCROLL_SPEED * delta / 16;
      this.tileSprites[i].tilePositionY += speed;
    }

    // Scroll nebula layers slowly
    for (let i = 0; i < this.nebulaSprites.length; i++) {
      const speed = (0.08 + i * 0.1) * SCROLL_SPEED * delta / 16;
      this.nebulaSprites[i].tilePositionY += speed;
    }
  }
}
