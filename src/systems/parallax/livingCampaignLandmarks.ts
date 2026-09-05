import Phaser from 'phaser';
import { withGeneratedTexture } from '../../utils/generatedTexture';
import type { LandmarkKind, LivingWorld } from './livingBackgroundProfile';
import { createLivingRing } from './livingBackgroundTextures';

type Graphics = Phaser.GameObjects.Graphics;
const point = (x: number, y: number) => new Phaser.Math.Vector2(x, y);

function plate(g: Graphics, points: Phaser.Math.Vector2[], color: number, edge: number): void {
  g.fillStyle(0x02050a, 0.8);
  g.fillPoints(
    points.map((p) => point(p.x + 4, p.y + 6)),
    true
  );
  g.fillStyle(color, 0.9);
  g.fillPoints(points, true);
  g.lineStyle(1.4, edge, 0.35);
  g.strokePoints(points, true);
}

function crystals(g: Graphics, random: Phaser.Math.RandomDataGenerator, world: LivingWorld): void {
  const glass = world === 'tideglass';
  const body = glass ? 0x193844 : 0x36233f;
  const face = glass ? 0x376879 : 0x69476e;
  const edge = glass ? 0x91bfc8 : 0xcb94c0;
  for (let index = 0; index < 14; index += 1) {
    const x = random.between(105, 380);
    const y = random.between(260, 460);
    const height = random.between(90, 240);
    const width = random.between(13, 30);
    const tip = point(x + random.between(-65, 65), y - height);
    const left = point(x - width, y - height * 0.22);
    const right = point(x + width, y - height * 0.16);
    plate(g, [tip, right, point(x + width * 0.5, y), point(x - width * 0.5, y), left], body, edge);
    g.fillStyle(face, 0.65);
    g.fillTriangle(tip.x, tip.y, right.x, right.y, x, y);
    g.lineStyle(1, edge, 0.45);
    g.lineBetween(tip.x, tip.y, x, y);
  }
}

function wreckage(g: Graphics, random: Phaser.Math.RandomDataGenerator): void {
  for (let index = 0; index < 12; index += 1) {
    const x = random.between(80, 325);
    const y = random.between(40, 400);
    const width = random.between(75, 155);
    const height = random.between(38, 100);
    const corners = [
      point(x, y + 10),
      point(x + width - 15, y),
      point(x + width, y + height * 0.7),
      point(x + 18, y + height),
    ];
    plate(g, corners, index % 3 === 0 ? 0x3d4e56 : 0x26353f, 0x8a9a9d);
    g.fillStyle(0x091019, 0.85);
    g.fillRect(x + 20, y + 20, width * 0.45, height * 0.3);
    g.lineStyle(2, 0x5d7987, 0.42);
    g.lineBetween(x + 16, y + height - 9, x + width - 8, y + height * 0.65);
    g.lineStyle(1.4, 0xc79660, 0.35);
    g.lineBetween(x + 12, y + 17, x + 12, y + height - 8);
  }
}

function arches(g: Graphics, random: Phaser.Math.RandomDataGenerator): void {
  for (let index = 0; index < 6; index += 1) {
    const x = 95 + index * 60;
    const top = random.between(65, 220);
    const width = random.between(22, 30);
    plate(
      g,
      [
        point(x - width, 470),
        point(x - width, top + 42),
        point(x, top),
        point(x + width, top + 42),
        point(x + width, 470),
      ],
      0x424c5e,
      0xa8b3c7
    );
    g.fillStyle(0x080e19, 0.92);
    g.fillPoints(
      [
        point(x - width + 8, 470),
        point(x - width + 8, top + 50),
        point(x, top + 18),
        point(x + width - 8, top + 50),
        point(x + width - 8, 470),
      ],
      true
    );
    g.lineStyle(2, 0x91b2c6, 0.3);
    g.lineBetween(x - width + 3, top + 43, x - width + 3, 460);
  }
}

function hive(g: Graphics, random: Phaser.Math.RandomDataGenerator): void {
  for (let row = 0; row < 5; row += 1) {
    for (let column = 0; column < 4; column += 1) {
      if ((row === 0 && column === 3) || (row === 4 && column === 0)) continue;
      const x = 108 + column * 77 + (row % 2) * 37;
      const y = 100 + row * 68;
      const radius = random.between(35, 44);
      const polygon = (scale: number) =>
        Array.from({ length: 6 }, (_, side) =>
          point(
            x + Math.cos((side * Math.PI) / 3) * radius * scale,
            y + Math.sin((side * Math.PI) / 3) * radius * scale
          )
        );
      plate(g, polygon(1), row % 2 ? 0x3a4027 : 0x30371f, 0x969867);
      g.fillStyle(0x141d14, 0.9);
      g.fillPoints(polygon(0.65), true);
      g.lineStyle(1, 0xa6aa67, 0.25);
      g.strokePoints(polygon(0.65), true);
      g.fillStyle(0xc2b86b, 0.3);
      g.fillCircle(x, y, 3);
    }
  }
}

export function createLivingLandmark(scene: Phaser.Scene, key: string, world: LivingWorld, kind: LandmarkKind): void {
  if (kind === 'mechanism' || kind === 'broken-ring') {
    createLivingRing(scene, key, world, kind === 'mechanism');
    return;
  }
  const random = new Phaser.Math.RandomDataGenerator([world, 'landmarks-v1']);
  withGeneratedTexture(scene, key, 512, 512, (g) => {
    switch (kind) {
      case 'crystal':
        crystals(g, random, world);
        break;
      case 'wreckage':
        wreckage(g, random);
        break;
      case 'arches':
        arches(g, random);
        break;
      case 'hive':
        hive(g, random);
        break;
    }
  });
}
