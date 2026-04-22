import Phaser from 'phaser';
import type { LevelConfig } from '../../config/LevelsConfig';
import { mixColor } from '../../utils/colorUtils';
import { withGeneratedTexture } from '../../utils/generatedTexture';
import { drawSoftCircle, parseHexColor } from './textureUtils';

interface ScenicTextureLayerConfig {
  accentMix: number;
  hazeCount: number;
  cloudCount: number;
  shadowCount: number;
  sparkleCount: number;
  filamentCount: number;
  radius: { min: number; max: number };
}

export function generateScenicTexture(
  scene: Phaser.Scene,
  textureKey: string,
  width: number,
  height: number,
  levelConfig: LevelConfig,
  layerConfig: ScenicTextureLayerConfig
): void {
  withGeneratedTexture(scene, textureKey, width, height, (graphics) => {
    const bgColor = parseHexColor(levelConfig.bgColor);
    const hazeColor = mixColor(levelConfig.nebulaColor, bgColor, 0.38);
    const cloudColor = mixColor(levelConfig.nebulaColor, levelConfig.accentColor, layerConfig.accentMix);
    const glowColor = mixColor(levelConfig.accentColor, 0xffffff, 0.35);
    const shadowColor = mixColor(bgColor, 0x000000, 0.58);
    const filamentColor = mixColor(levelConfig.nebulaColor, levelConfig.accentColor, 0.6);

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

    for (let s = 0; s < segments; s++) {
      const progress = (s + 0.5) / segments;
      const fx = startX + Math.sin(progress * Math.PI * 1.5 + i) * curveStrength;
      const fy = startY + progress * length;
      drawSoftCircle(graphics, fx, fy, Phaser.Math.Between(15, 35), filamentColor, levelConfig.nebulaAlpha * 0.08, 8);
    }
  }

    const vortexCount = Phaser.Math.Between(1, 2);
    for (let v = 0; v < vortexCount; v++) {
    const vcx = Phaser.Math.Between(Math.floor(width * 0.15), Math.floor(width * 0.85));
    const vcy = Phaser.Math.Between(Math.floor(height * 0.15), Math.floor(height * 0.85));
    const vortexR = Phaser.Math.Between(80, 200);
    const swirlColor = mixColor(levelConfig.accentColor, levelConfig.nebulaColor, 0.55);

    const armCount = Phaser.Math.Between(2, 4);
    for (let arm = 0; arm < armCount; arm++) {
      const startAngle = (arm / armCount) * Math.PI * 2;
      const armSegments = 12;
      graphics.lineStyle(Phaser.Math.FloatBetween(2, 5), swirlColor, levelConfig.nebulaAlpha * 0.1);

      graphics.beginPath();
      for (let s = 0; s < armSegments; s++) {
        const t = s / armSegments;
        const angle = startAngle + t * Math.PI * 1.8;
        const r = t * vortexR;
        const px = vcx + Math.cos(angle) * r;
        const py = vcy + Math.sin(angle) * r;
        if (s === 0) {
          graphics.moveTo(px, py);
        } else {
          graphics.lineTo(px, py);
        }
      }
      graphics.strokePath();

      for (let s = 2; s < armSegments; s += 3) {
        const t = s / armSegments;
        const angle = startAngle + t * Math.PI * 1.8;
        const r = t * vortexR;
        const px = vcx + Math.cos(angle) * r;
        const py = vcy + Math.sin(angle) * r;
        drawSoftCircle(graphics, px, py, Phaser.Math.Between(12, 28), swirlColor, levelConfig.nebulaAlpha * 0.07, 6);
      }
    }

    drawSoftCircle(graphics, vcx, vcy, Math.floor(vortexR * 0.25), glowColor, levelConfig.nebulaAlpha * 0.1, 10);
  }

    const clusterCount = Phaser.Math.Between(1, 3);
    for (let c = 0; c < clusterCount; c++) {
    const clusterCx = Phaser.Math.Between(0, width);
    const clusterCy = Phaser.Math.Between(0, height);
    const clusterSpread = Phaser.Math.Between(60, 150);
    const clusterClouds = Phaser.Math.Between(4, 8);

    for (let cc = 0; cc < clusterClouds; cc++) {
      const cx = clusterCx + Phaser.Math.Between(-clusterSpread, clusterSpread);
      const cy = clusterCy + Phaser.Math.Between(-clusterSpread, clusterSpread);
      const radius = Phaser.Math.Between(40, 100);

      const clusterCloudColor = mixColor(cloudColor, glowColor, Phaser.Math.FloatBetween(0, 0.4));
      drawSoftCircle(graphics, cx, cy, radius, clusterCloudColor, levelConfig.nebulaAlpha * 0.22, 8);

      if (cc % 2 === 0) {
        drawSoftCircle(graphics, cx + 8, cy - 6, Math.floor(radius * 0.4), glowColor, levelConfig.nebulaAlpha * 0.1, 8);
      }
    }
  }

    const bandY = Phaser.Math.Between(Math.floor(height * 0.2), Math.floor(height * 0.8));
    const bandColor = mixColor(levelConfig.accentColor, levelConfig.nebulaColor, 0.4);
    for (let bx = 0; bx < width; bx += 30) {
      const by = bandY + Math.sin(bx * 0.02) * 20;
      drawSoftCircle(graphics, bx, by, Phaser.Math.Between(40, 80), bandColor, levelConfig.nebulaAlpha * 0.06, 8);
    }

    for (let i = 0; i < layerConfig.sparkleCount; i++) {
      const sparkleX = Phaser.Math.Between(0, width);
      const sparkleY = Phaser.Math.Between(0, height);
      const sparkleAlpha = Phaser.Math.FloatBetween(0.08, 0.22);
      const sparkleSize = Phaser.Math.FloatBetween(0.8, 1.8);
      graphics.fillStyle(glowColor, sparkleAlpha);
      graphics.fillCircle(sparkleX, sparkleY, sparkleSize);
    }
  });
}
