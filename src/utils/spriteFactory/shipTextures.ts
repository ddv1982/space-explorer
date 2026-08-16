import Phaser from 'phaser';
import { withGeneratedEntityTexture } from '../generatedTexture';
import { NEON_ENTITY, fillCanopy, fillHotCore, fillNeonCircle, fillNeonPolygon, strokeNeonLine } from './neonStyle';

export function ensurePlayerTexture(scene: Phaser.Scene): string {
  return withGeneratedEntityTexture(scene, 'player-ship', 36, 44, (g) => {
    const palette = NEON_ENTITY.player;

    // Sleek forward dart hull with swept wings.
    fillNeonPolygon(
      g,
      [
        { x: 18, y: 3 },
        { x: 24, y: 12 },
        { x: 31, y: 30 },
        { x: 25, y: 34 },
        { x: 21, y: 31 },
        { x: 18, y: 34 },
        { x: 15, y: 31 },
        { x: 11, y: 34 },
        { x: 5, y: 30 },
        { x: 12, y: 12 },
      ],
      palette
    );

    // Spine and wing edge light strips.
    strokeNeonLine(g, 18, 7, 18, 29, palette.outline, 1);
    strokeNeonLine(g, 8, 27, 13, 15, palette.glow, 1);
    strokeNeonLine(g, 28, 27, 23, 15, palette.glow, 1);

    fillCanopy(g, 18, 13, 6, 5, palette);
    fillHotCore(g, 18, 12, 1.7, palette.hot);
    strokeNeonLine(g, 14, 22, 16, 18, palette.hot, 1);
    strokeNeonLine(g, 22, 22, 20, 18, palette.hot, 1);

    // Twin engine cores.
    fillNeonCircle(g, 11.5, 38, 2.1, palette, { haloScale: 1.5, midScale: 1.25, outlineWidth: 0 });
    fillNeonCircle(g, 24.5, 38, 2.1, palette, { haloScale: 1.5, midScale: 1.25, outlineWidth: 0 });
    fillHotCore(g, 11.5, 38, 0.8, palette.hot);
    fillHotCore(g, 24.5, 38, 0.8, palette.hot);
  });
}

export function ensureHelperShipTexture(scene: Phaser.Scene): string {
  return withGeneratedEntityTexture(scene, 'helper-ship', 24, 30, (g) => {
    const palette = NEON_ENTITY.helper;

    fillNeonPolygon(
      g,
      [
        { x: 12, y: 2 },
        { x: 17, y: 8 },
        { x: 20, y: 20 },
        { x: 15, y: 25 },
        { x: 12, y: 23 },
        { x: 9, y: 25 },
        { x: 4, y: 20 },
        { x: 7, y: 8 },
      ],
      palette,
      { haloScale: 1.12 }
    );

    strokeNeonLine(g, 12, 6, 12, 20, palette.outline, 1);
    fillCanopy(g, 12, 10, 5, 4, palette);
    fillHotCore(g, 12, 9, 1.3, palette.hot);

    fillNeonCircle(g, 8, 26, 1.6, palette, { haloScale: 1.5, midScale: 1.25, outlineWidth: 0 });
    fillNeonCircle(g, 16, 26, 1.6, palette, { haloScale: 1.5, midScale: 1.25, outlineWidth: 0 });
    fillHotCore(g, 8, 26, 0.6, palette.hot);
    fillHotCore(g, 16, 26, 0.6, palette.hot);
  });
}

export function ensureScoutTexture(scene: Phaser.Scene): string {
  return withGeneratedEntityTexture(scene, 'scout-texture', 26, 28, (g) => {
    const palette = NEON_ENTITY.scout;

    // Narrow aggressive arrow hull.
    fillNeonPolygon(
      g,
      [
        { x: 13, y: 1 },
        { x: 17, y: 9 },
        { x: 15, y: 22 },
        { x: 13, y: 27 },
        { x: 11, y: 22 },
        { x: 9, y: 9 },
      ],
      palette,
      { haloScale: 1.12 }
    );

    // Swept fins.
    fillNeonPolygon(
      g,
      [
        { x: 9, y: 12 },
        { x: 3, y: 21 },
        { x: 9, y: 19 },
      ],
      palette,
      { haloScale: 1.1, outlineWidth: 1 }
    );
    fillNeonPolygon(
      g,
      [
        { x: 17, y: 12 },
        { x: 23, y: 21 },
        { x: 17, y: 19 },
      ],
      palette,
      { haloScale: 1.1, outlineWidth: 1 }
    );

    strokeNeonLine(g, 13, 5, 13, 21, palette.outline, 1);
    fillHotCore(g, 13, 10, 1.4, palette.hot);
    fillNeonCircle(g, 13, 25, 1.3, palette, { haloScale: 1.5, midScale: 1.2, outlineWidth: 0 });
  });
}

export function ensureFighterTexture(scene: Phaser.Scene): string {
  return withGeneratedEntityTexture(scene, 'fighter-texture', 36, 36, (g) => {
    const palette = NEON_ENTITY.fighter;

    // Broad chevron hull.
    fillNeonPolygon(
      g,
      [
        { x: 18, y: 1 },
        { x: 24, y: 9 },
        { x: 30, y: 27 },
        { x: 24, y: 33 },
        { x: 18, y: 30 },
        { x: 12, y: 33 },
        { x: 6, y: 27 },
        { x: 12, y: 9 },
      ],
      palette
    );

    // Wing slash light strips.
    strokeNeonLine(g, 10, 25, 14, 13, palette.outline, 1);
    strokeNeonLine(g, 26, 25, 22, 13, palette.outline, 1);
    strokeNeonLine(g, 18, 6, 18, 26, palette.glow, 1);

    fillHotCore(g, 18, 11, 1.8, palette.hot);

    fillNeonCircle(g, 14, 32, 1.7, palette, { haloScale: 1.5, midScale: 1.2, outlineWidth: 0 });
    fillNeonCircle(g, 22, 32, 1.7, palette, { haloScale: 1.5, midScale: 1.2, outlineWidth: 0 });
    fillHotCore(g, 14, 32, 0.7, palette.hot);
    fillHotCore(g, 22, 32, 0.7, palette.hot);
  });
}

export function ensureBomberTexture(scene: Phaser.Scene): string {
  return withGeneratedEntityTexture(scene, 'bomber-texture', 44, 38, (g) => {
    const palette = NEON_ENTITY.bomber;

    // Heavy armored hex hull.
    fillNeonPolygon(
      g,
      [
        { x: 22, y: 2 },
        { x: 33, y: 7 },
        { x: 40, y: 17 },
        { x: 37, y: 30 },
        { x: 30, y: 36 },
        { x: 14, y: 36 },
        { x: 7, y: 30 },
        { x: 4, y: 17 },
        { x: 11, y: 7 },
      ],
      palette
    );

    // Armor plate seams.
    strokeNeonLine(g, 13, 22, 31, 22, palette.glow, 1);
    strokeNeonLine(g, 13, 22, 13, 32, palette.glow, 1);
    strokeNeonLine(g, 31, 22, 31, 32, palette.glow, 1);

    // Ordnance pods.
    fillNeonCircle(g, 7, 24, 2.6, palette, { haloScale: 1.6, midScale: 1.3 });
    fillNeonCircle(g, 37, 24, 2.6, palette, { haloScale: 1.6, midScale: 1.3 });
    fillHotCore(g, 7, 24, 1, palette.hot);
    fillHotCore(g, 37, 24, 1, palette.hot);

    // Canopy slit.
    strokeNeonLine(g, 17, 10, 27, 10, palette.hot, 1.5);
  });
}

export function ensureGunshipTexture(scene: Phaser.Scene): string {
  return withGeneratedEntityTexture(scene, 'gunship-texture', 40, 40, (g) => {
    const palette = NEON_ENTITY.gunship;

    // Twin long prongs.
    fillNeonPolygon(
      g,
      [
        { x: 6, y: 9 },
        { x: 12, y: 9 },
        { x: 12, y: 31 },
        { x: 6, y: 31 },
      ],
      palette,
      { haloScale: 1.1, outlineWidth: 1 }
    );
    fillNeonPolygon(
      g,
      [
        { x: 28, y: 9 },
        { x: 34, y: 9 },
        { x: 34, y: 31 },
        { x: 28, y: 31 },
      ],
      palette,
      { haloScale: 1.1, outlineWidth: 1 }
    );

    // Center command pod.
    fillNeonPolygon(
      g,
      [
        { x: 20, y: 3 },
        { x: 25, y: 10 },
        { x: 25, y: 26 },
        { x: 20, y: 33 },
        { x: 15, y: 26 },
        { x: 15, y: 10 },
      ],
      palette
    );

    // Cannon tips and cross-brace.
    fillHotCore(g, 9, 8, 1.5, palette.hot);
    fillHotCore(g, 31, 8, 1.5, palette.hot);
    strokeNeonLine(g, 12, 22, 28, 22, palette.glow, 1);

    fillHotCore(g, 20, 12, 1.7, palette.hot);

    fillNeonCircle(g, 17, 34, 1.6, palette, { haloScale: 1.5, midScale: 1.2, outlineWidth: 0 });
    fillNeonCircle(g, 23, 34, 1.6, palette, { haloScale: 1.5, midScale: 1.2, outlineWidth: 0 });
    fillHotCore(g, 17, 34, 0.6, palette.hot);
    fillHotCore(g, 23, 34, 0.6, palette.hot);
  });
}

export function ensureSwarmTexture(scene: Phaser.Scene): string {
  return withGeneratedEntityTexture(scene, 'swarm-texture', 20, 20, (g) => {
    const palette = NEON_ENTITY.swarm;

    // Tri-shard arrowhead.
    fillNeonPolygon(
      g,
      [
        { x: 10, y: 2 },
        { x: 17, y: 15 },
        { x: 10, y: 12 },
        { x: 3, y: 15 },
      ],
      palette,
      { haloScale: 1.12, outlineWidth: 1 }
    );

    strokeNeonLine(g, 10, 5, 10, 11, palette.outline, 1);
    fillHotCore(g, 10, 8, 1.3, palette.hot);
  });
}

export function ensureDiverTexture(scene: Phaser.Scene): string {
  return withGeneratedEntityTexture(scene, 'diver-texture', 24, 30, (g) => {
    const palette = NEON_ENTITY.diver;

    // Swept crescent hull built for dive runs.
    fillNeonPolygon(
      g,
      [
        { x: 12, y: 1 },
        { x: 18, y: 10 },
        { x: 21, y: 24 },
        { x: 15, y: 20 },
        { x: 12, y: 26 },
        { x: 9, y: 20 },
        { x: 3, y: 24 },
        { x: 6, y: 10 },
      ],
      palette,
      { haloScale: 1.12 }
    );

    strokeNeonLine(g, 12, 5, 12, 22, palette.outline, 1);
    strokeNeonLine(g, 6, 13, 10, 18, palette.glow, 1);
    strokeNeonLine(g, 18, 13, 14, 18, palette.glow, 1);

    fillHotCore(g, 12, 11, 1.5, palette.hot);
    fillNeonCircle(g, 12, 27, 1.3, palette, { haloScale: 1.5, midScale: 1.2, outlineWidth: 0 });
  });
}

export function ensureDodgerTexture(scene: Phaser.Scene): string {
  return withGeneratedEntityTexture(scene, 'dodger-texture', 30, 24, (g) => {
    const palette = NEON_ENTITY.dodger;

    // Wide slim wing built for lateral evasion.
    fillNeonPolygon(
      g,
      [
        { x: 15, y: 2 },
        { x: 19, y: 8 },
        { x: 28, y: 14 },
        { x: 22, y: 19 },
        { x: 15, y: 16 },
        { x: 8, y: 19 },
        { x: 2, y: 14 },
        { x: 11, y: 8 },
      ],
      palette,
      { haloScale: 1.12 }
    );

    strokeNeonLine(g, 4, 14, 12, 9, palette.outline, 1);
    strokeNeonLine(g, 26, 14, 18, 9, palette.outline, 1);

    fillHotCore(g, 15, 10, 1.4, palette.hot);
    fillNeonCircle(g, 11, 20, 1.2, palette, { haloScale: 1.5, midScale: 1.2, outlineWidth: 0 });
    fillNeonCircle(g, 19, 20, 1.2, palette, { haloScale: 1.5, midScale: 1.2, outlineWidth: 0 });
  });
}

export function ensureSowerTexture(scene: Phaser.Scene): string {
  return withGeneratedEntityTexture(scene, 'sower-texture', 34, 34, (g) => {
    const palette = NEON_ENTITY.sower;

    // Bulbous minelayer pod.
    fillNeonPolygon(
      g,
      [
        { x: 17, y: 2 },
        { x: 27, y: 8 },
        { x: 30, y: 18 },
        { x: 25, y: 29 },
        { x: 17, y: 32 },
        { x: 9, y: 29 },
        { x: 4, y: 18 },
        { x: 7, y: 8 },
      ],
      palette
    );

    // Mine bay doors.
    fillNeonCircle(g, 11, 20, 2.4, palette, { haloScale: 1.6, midScale: 1.3 });
    fillNeonCircle(g, 23, 20, 2.4, palette, { haloScale: 1.6, midScale: 1.3 });
    fillHotCore(g, 11, 20, 0.9, palette.hot);
    fillHotCore(g, 23, 20, 0.9, palette.hot);

    strokeNeonLine(g, 10, 12, 24, 12, palette.glow, 1);
    fillHotCore(g, 17, 9, 1.6, palette.hot);
  });
}

export function ensureLancerTexture(scene: Phaser.Scene): string {
  return withGeneratedEntityTexture(scene, 'lancer-texture', 22, 40, (g) => {
    const palette = NEON_ENTITY.lancer;

    // Long needle hull with a charged lance tip.
    fillNeonPolygon(
      g,
      [
        { x: 11, y: 2 },
        { x: 15, y: 10 },
        { x: 14, y: 30 },
        { x: 11, y: 38 },
        { x: 8, y: 30 },
        { x: 7, y: 10 },
      ],
      palette,
      { haloScale: 1.12 }
    );

    // Stabilizer fins.
    fillNeonPolygon(
      g,
      [
        { x: 7, y: 22 },
        { x: 2, y: 30 },
        { x: 7, y: 29 },
      ],
      palette,
      { haloScale: 1.1, outlineWidth: 1 }
    );
    fillNeonPolygon(
      g,
      [
        { x: 15, y: 22 },
        { x: 20, y: 30 },
        { x: 15, y: 29 },
      ],
      palette,
      { haloScale: 1.1, outlineWidth: 1 }
    );

    strokeNeonLine(g, 11, 6, 11, 34, palette.outline, 1);
    fillHotCore(g, 11, 8, 1.6, palette.hot);
    fillNeonCircle(g, 11, 4, 1.4, palette, { haloScale: 1.8, midScale: 1.35, outlineWidth: 0 });
  });
}

export function ensureSplitterTexture(scene: Phaser.Scene): string {
  return withGeneratedEntityTexture(scene, 'splitter-texture', 30, 26, (g) => {
    const palette = NEON_ENTITY.splitter;

    // Twin-lobed pod held by a light bridge.
    fillNeonCircle(g, 9, 13, 6.5, palette, { haloScale: 1.25, midScale: 1.1 });
    fillNeonCircle(g, 21, 13, 6.5, palette, { haloScale: 1.25, midScale: 1.1 });
    strokeNeonLine(g, 9, 13, 21, 13, palette.outline, 1.5);

    fillHotCore(g, 9, 13, 1.6, palette.hot);
    fillHotCore(g, 21, 13, 1.6, palette.hot);
    fillNeonCircle(g, 15, 13, 1.2, palette, { haloScale: 1.6, midScale: 1.25, outlineWidth: 0 });
  });
}

export function ensureSwarmlingTexture(scene: Phaser.Scene): string {
  return withGeneratedEntityTexture(scene, 'swarmling-texture', 14, 14, (g) => {
    const palette = NEON_ENTITY.swarmling;

    // Tiny shard spawned by the splitter.
    fillNeonPolygon(
      g,
      [
        { x: 7, y: 1 },
        { x: 12, y: 10 },
        { x: 7, y: 8 },
        { x: 2, y: 10 },
      ],
      palette,
      { haloScale: 1.15, outlineWidth: 1 }
    );

    fillHotCore(g, 7, 6, 1, palette.hot);
  });
}
