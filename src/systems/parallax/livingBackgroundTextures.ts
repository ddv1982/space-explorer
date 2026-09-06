import Phaser from 'phaser';
import { withGeneratedTexture } from '../../utils/generatedTexture';
import { LIVING_WORLD_PROFILES, visualNoise, type LivingWorld } from './livingBackgroundProfile';

export function createLivingNoise(scene: Phaser.Scene, key: string): void {
  const texture = scene.textures.createCanvas(key, 65, 65);
  if (!texture) throw new Error('Could not create the procedural noise texture');
  const pixels = texture.context.createImageData(65, 65);
  for (let y = 0; y < 65; y += 1) {
    for (let x = 0; x < 65; x += 1) {
      const offset = (y * 65 + x) * 4;
      const value = Math.round(visualNoise(x % 64, y % 64) * 255);
      pixels.data[offset] = value;
      pixels.data[offset + 1] = value;
      pixels.data[offset + 2] = value;
      pixels.data[offset + 3] = 255;
    }
  }
  texture.context.putImageData(pixels, 0, 0);
  texture.refresh();
}

export function createLivingStars(scene: Phaser.Scene, key: string, world: LivingWorld): void {
  const random = new Phaser.Math.RandomDataGenerator([world, 'living-stars-v1']);
  withGeneratedTexture(scene, key, 512, 512, (graphics) => {
    for (let index = 0; index < 68; index += 1) {
      const x = random.between(4, 508);
      const y = random.between(4, 508);
      graphics.fillStyle(
        index % 7 === 0 ? LIVING_WORLD_PROFILES[world].starAccent : 0xa0a9b5,
        random.realInRange(0.1, 0.3)
      );
      graphics.fillCircle(x, y, index % 11 === 0 ? 1.15 : 0.65);
    }
  });
}

export function createLivingRing(scene: Phaser.Scene, key: string, world: LivingWorld, isClockwork: boolean): void {
  const random = new Phaser.Math.RandomDataGenerator([world, 'living-ring-v1']);
  withGeneratedTexture(scene, key, 512, 512, (g) => {
    const point = (angle: number, radius: number) =>
      new Phaser.Math.Vector2(256 + Math.cos(angle) * radius, 256 + Math.sin(angle) * radius);
    const metal = isClockwork ? 0x8d998f : 0x9483b1;
    if (isClockwork) {
      g.lineStyle(7, 0x17242c, 0.8);
      g.strokeCircle(256, 256, 165);
      g.lineStyle(1.5, metal, 0.28);
      g.strokeCircle(256, 256, 163);
      g.strokeCircle(256, 256, 238);
    }
    for (let index = 0; index < 64; index += 1) {
      if (!isClockwork && index % 11 < 3) continue;
      const start = (index * Math.PI) / 32;
      const end = start + Math.PI / 34;
      const inner = random.between(173, 183);
      const outer = index % 3 === 0 ? 249 : 233;
      const corners = [point(start, inner), point(start, outer), point(end, outer), point(end, inner)];
      g.fillStyle(0x02050a, 0.8);
      g.fillPoints(
        corners.map((p) => new Phaser.Math.Vector2(p.x + 4, p.y + 5)),
        true
      );
      const face = isClockwork ? 0x4b565c : 0x423c53;
      g.fillStyle(face, 0.7 + Math.cos(start - 0.8) * 0.2);
      g.fillPoints(corners, true);
      g.lineStyle(1, metal, 0.34);
      g.strokePoints(corners, true);
      g.fillStyle(0x0b111b, 0.75);
      g.fillPoints(
        [
          point(start + 0.016, inner + 12),
          point(start + 0.016, outer - 9),
          point(end - 0.016, outer - 9),
          point(end - 0.016, inner + 12),
        ],
        true
      );
      g.lineStyle(2, metal, 0.22 + Math.max(0, Math.cos(start - 0.8)) * 0.18);
      const bevelA = point(start, outer - 2);
      const bevelB = point(end, outer - 2);
      g.lineBetween(bevelA.x, bevelA.y, bevelB.x, bevelB.y);
      g.lineStyle(2, isClockwork ? 0xb88543 : 0x886baa, index % 4 === 0 ? 0.46 : 0.12);
      const a = point(start + 0.01, inner + 4);
      const b = point(end - 0.01, inner + 4);
      g.lineBetween(a.x, a.y, b.x, b.y);
      if (index % 3 === 0) {
        const rivet = point(start + 0.04, outer - 8);
        g.fillStyle(0xb0a68e, 0.28);
        g.fillCircle(rivet.x, rivet.y, 1.4);
      }
      if (index % 8 === 0) {
        const brace = [
          point(start + 0.01, 132),
          point(start + 0.01, 173),
          point(end - 0.01, 173),
          point(end - 0.01, 132),
        ];
        g.fillStyle(face, 0.8);
        g.fillPoints(brace, true);
        g.lineStyle(1, metal, 0.25);
        g.strokePoints(brace, true);
      }
    }
  });
}
