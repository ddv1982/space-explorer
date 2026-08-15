import Phaser from 'phaser';
import { getLevelConfig, type LevelConfig } from '../../config/LevelsConfig';
import { mixColor } from '../../utils/colorUtils';
import { withGeneratedTexture } from '../../utils/generatedTexture';
import { getPremiumBackgroundManifest } from './premiumBackgroundManifest';
import { drawSoftCircle } from './textureUtils';

type NeonMotif =
  | 'aurora'
  | 'glassTide'
  | 'emberStorm'
  | 'clockwork'
  | 'coralReef'
  | 'wreckageRamparts'
  | 'cathedral'
  | 'eclipse'
  | 'hive'
  | 'singularityEngine';

const LEVEL_MOTIFS: Record<number, NeonMotif> = {
  1: 'aurora',
  2: 'glassTide',
  3: 'emberStorm',
  4: 'clockwork',
  5: 'coralReef',
  6: 'wreckageRamparts',
  7: 'cathedral',
  8: 'eclipse',
  9: 'hive',
  10: 'singularityEngine',
};

/** Central gameplay corridor (fraction of width) kept dark and calm. */
const LANE_EDGE_MIN = 0.34;
const LANE_EDGE_MAX = 0.66;

/** Draw at y, and again one tile up/down when close to an edge, for seamless vertical tiling. */
function forWrappedY(size: number, y: number, margin: number, draw: (drawY: number) => void): void {
  draw(y);
  if (y < margin) {
    draw(y + size);
  }
  if (y > size - margin) {
    draw(y - size);
  }
}

/** Draw at x, and again one tile left/right when close to an edge, for seamless horizontal tiling. */
function forWrappedX(size: number, x: number, margin: number, draw: (drawX: number) => void): void {
  draw(x);
  if (x < margin) {
    draw(x + size);
  }
  if (x > size - margin) {
    draw(x - size);
  }
}

/** Edge-biased x: picks a point outside the central gameplay lane. */
function edgeBiasedX(size: number, margin: number): number {
  const laneMin = size * LANE_EDGE_MIN;
  const laneMax = size * LANE_EDGE_MAX;
  const pickLeft = Phaser.Math.Between(0, 1) === 0;
  if (pickLeft) {
    return Phaser.Math.FloatBetween(margin, Math.max(margin, laneMin - margin));
  }
  return Phaser.Math.FloatBetween(Math.min(size - margin, laneMax + margin), size - margin);
}

/** Thin neon two-pass stroke used for motif line work. */
function neonStroke(
  g: Phaser.GameObjects.Graphics,
  color: number,
  width: number,
  alpha: number,
  trace: () => void
): void {
  g.lineStyle(width * 2.6, color, alpha * 0.3);
  trace();
  g.strokePath();
  g.lineStyle(width, color, alpha);
  trace();
  g.strokePath();
}

function drawFarLayer(g: Phaser.GameObjects.Graphics, config: LevelConfig, size: number): void {
  const baseColor = Phaser.Display.Color.HexStringToColor(config.bgColor).color;
  const liftColor = mixColor(baseColor, config.nebulaColor, 0.45);

  // Vertically symmetric gradient: identical at top and bottom for seamless tiling.
  const strips = 96;
  for (let i = 0; i < strips; i++) {
    const t = i / (strips - 1);
    const lift = Math.sin(Math.PI * t) * 0.55;
    g.fillStyle(mixColor(baseColor, liftColor, lift), 1);
    g.fillRect(0, Math.floor(t * size), size, Math.ceil(size / strips) + 1);
  }

  // Sparse dim stars, brighter toward the edges, none dominating the center lane.
  const starCount = 150;
  for (let i = 0; i < starCount; i++) {
    const x = Phaser.Math.FloatBetween(0, size);
    const y = Phaser.Math.FloatBetween(0, size);
    const edgeBias = Math.min(1, Math.abs(x - size / 2) / (size / 2));
    const alpha = Phaser.Math.FloatBetween(0.05, 0.2 + edgeBias * 0.3);
    const radius = Phaser.Math.FloatBetween(0.5, 1.5);
    const tinted = Phaser.Math.Between(0, 6) === 0;
    const color = tinted ? mixColor(0xffffff, config.accentColor, 0.55) : 0xcfd8ff;

    forWrappedY(size, y, radius * 2, (drawY) => {
      forWrappedX(size, x, radius * 2, (drawX) => {
        g.fillStyle(color, alpha);
        g.fillCircle(drawX, drawY, radius);
      });
    });
  }
}

function drawNebulaLayer(g: Phaser.GameObjects.Graphics, config: LevelConfig, size: number): void {
  const blobCount = 5;
  for (let i = 0; i < blobCount; i++) {
    const radius = Phaser.Math.Between(170, 330);
    const x = edgeBiasedX(size, radius * 0.4);
    const y = Phaser.Math.FloatBetween(0, size);
    const color = i % 2 === 0 ? config.nebulaColor : mixColor(config.nebulaColor, config.accentColor, 0.4);
    const peakAlpha = config.nebulaAlpha * Phaser.Math.FloatBetween(0.35, 0.6);

    forWrappedY(size, y, radius, (drawY) => {
      forWrappedX(size, x, radius, (drawX) => {
        drawSoftCircle(g, drawX, drawY, radius, color, peakAlpha, 18);
      });
    });
  }

  // Tight accent cores inside two of the blobs for neon depth.
  for (let i = 0; i < 2; i++) {
    const radius = Phaser.Math.Between(60, 110);
    const x = edgeBiasedX(size, radius);
    const y = Phaser.Math.FloatBetween(0, size);

    forWrappedY(size, y, radius, (drawY) => {
      forWrappedX(size, x, radius, (drawX) => {
        drawSoftCircle(g, drawX, drawY, radius, mixColor(config.accentColor, 0xffffff, 0.25), 0.05, 10);
      });
    });
  }
}

function traceArc(g: Phaser.GameObjects.Graphics, x: number, y: number, radius: number, start: number, end: number): () => void {
  return () => {
    g.beginPath();
    g.arc(x, y, radius, start, end);
  };
}

function traceLine(g: Phaser.GameObjects.Graphics, x1: number, y1: number, x2: number, y2: number): () => void {
  return () => {
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
  };
}

function tracePolygon(g: Phaser.GameObjects.Graphics, points: { x: number; y: number }[]): () => void {
  return () => {
    g.beginPath();
    g.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      g.lineTo(points[i].x, points[i].y);
    }
    g.closePath();
  };
}

function drawMotifAurora(g: Phaser.GameObjects.Graphics, size: number, accent: number): void {
  // Aurora curtains: tall shimmering ribbons hugging the edges.
  for (let ribbon = 0; ribbon < 4; ribbon++) {
    const baseX = edgeBiasedX(size, 70);
    const phase = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const amplitude = Phaser.Math.Between(14, 30);
    const hue = mixColor(accent, [0x8fffd8, 0xa8b8ff, 0xd88fff][ribbon % 3], 0.35);

    forWrappedX(size, baseX, amplitude + 6, (drawX) => {
      for (let y = 0; y < size; y += 26) {
        const sway = Math.sin(phase + y * 0.012) * amplitude;
        const alpha = Math.max(0.03, 0.08 + 0.06 * Math.sin(phase + y * 0.05));
        neonStroke(g, hue, 1.5, alpha, traceLine(g, drawX + sway, y, drawX + sway * 0.7, y + 22));
      }
    });
  }
}

function drawMotifGlassTide(g: Phaser.GameObjects.Graphics, size: number, accent: number): void {
  // Glass tide: layered sine swells sliding along the edges with bright crest glints.
  for (let band = 0; band < 6; band++) {
    const x = edgeBiasedX(size, 90);
    const y = Phaser.Math.FloatBetween(0, size);
    const length = Phaser.Math.Between(140, 240);
    const amplitude = Phaser.Math.Between(8, 20);
    const phase = Phaser.Math.FloatBetween(0, Math.PI * 2);

    forWrappedY(size, y, amplitude + 24, (drawY) => {
      forWrappedX(size, x, length / 2 + 6, (drawX) => {
        const points: { x: number; y: number }[] = [];
        for (let i = 0; i <= 8; i++) {
          points.push({
            x: drawX - length / 2 + (length * i) / 8,
            y: drawY + Math.sin(phase + (i / 8) * Math.PI * 2) * amplitude,
          });
        }
        neonStroke(g, accent, 1.25, 0.14, () => {
          g.beginPath();
          g.moveTo(points[0].x, points[0].y);
          for (let i = 1; i < points.length; i++) {
            g.lineTo(points[i].x, points[i].y);
          }
        });
        g.fillStyle(mixColor(accent, 0xffffff, 0.5), 0.35);
        g.fillCircle(points[2].x, points[2].y, 1.6);
      });
    });
  }
}

function drawMotifEmberStorm(g: Phaser.GameObjects.Graphics, size: number, accent: number): void {
  // Ember storm: wind-slanted rain streaks with glowing ash motes at the edges.
  for (let i = 0; i < 22; i++) {
    const x = edgeBiasedX(size, 20);
    const y = Phaser.Math.FloatBetween(0, size);
    const length = Phaser.Math.Between(18, 46);
    const slant = length * 0.35;
    const alpha = Phaser.Math.FloatBetween(0.12, 0.3);

    forWrappedY(size, y, length + 8, (drawY) => {
      forWrappedX(size, x, slant + 8, (drawX) => {
        neonStroke(g, accent, 1.25, alpha, traceLine(g, drawX - slant, drawY - length * 0.5, drawX + slant, drawY + length * 0.5));
        if (i % 2 === 0) {
          g.fillStyle(mixColor(accent, 0xffffff, 0.35), alpha + 0.08);
          g.fillCircle(drawX + slant, drawY + length * 0.5, 1.5);
        }
      });
    });
  }
}

function drawMotifClockwork(g: Phaser.GameObjects.Graphics, size: number, accent: number): void {
  // Clockwork: interlocked gear rings with radial teeth pinned to the edges.
  for (let gear = 0; gear < 4; gear++) {
    const x = edgeBiasedX(size, 110);
    const y = Phaser.Math.FloatBetween(0, size);
    const radius = Phaser.Math.Between(46, 96);
    const teeth = 10;

    forWrappedY(size, y, radius + 18, (drawY) => {
      forWrappedX(size, x, radius + 18, (drawX) => {
        neonStroke(g, accent, 1.25, 0.15, traceArc(g, drawX, drawY, radius, 0, Math.PI * 2));
        neonStroke(g, accent, 1, 0.1, traceArc(g, drawX, drawY, radius * 0.55, 0, Math.PI * 2));
        for (let tooth = 0; tooth < teeth; tooth++) {
          const angle = (tooth / teeth) * Math.PI * 2 + gear * 0.3;
          neonStroke(g, accent, 1.5, 0.18, traceLine(
            g,
            drawX + Math.cos(angle) * radius,
            drawY + Math.sin(angle) * radius,
            drawX + Math.cos(angle) * (radius + 10),
            drawY + Math.sin(angle) * (radius + 10)
          ));
        }
      });
    });
  }
}

function drawMotifCoralReef(g: Phaser.GameObjects.Graphics, size: number, accent: number): void {
  // Coral reef: branching neon fans growing from the top and bottom edges, stray bubbles.
  for (let fan = 0; fan < 6; fan++) {
    const baseX = edgeBiasedX(size, 40);
    const growUp = fan % 2 === 0;
    const baseY = growUp ? size + 10 : -10;
    const direction = growUp ? 1 : -1;
    const height = Phaser.Math.Between(120, 240);
    const branches = 3 + (fan % 3);

    forWrappedY(size, baseY, height, (drawBaseY) => {
      forWrappedX(size, baseX, height * 0.4 + 6, (drawX) => {
        for (let b = 0; b < branches; b++) {
          const lean = ((b / Math.max(branches - 1, 1)) - 0.5) * height * 0.8;
          const tipX = drawX + lean;
          const tipY = drawBaseY - height * direction;
          neonStroke(g, accent, 1.25, 0.15, () => {
            g.beginPath();
            g.moveTo(drawX, drawBaseY);
            g.lineTo(drawX + lean * 0.3, drawBaseY - height * 0.5 * direction);
            g.lineTo(tipX, tipY);
          });
          g.fillStyle(mixColor(accent, 0xffffff, 0.3), 0.3);
          g.fillCircle(tipX, tipY, 2);
        }
      });
    });
  }

  for (let i = 0; i < 10; i++) {
    const x = edgeBiasedX(size, 8);
    const y = Phaser.Math.FloatBetween(0, size);
    const radius = Phaser.Math.FloatBetween(1.5, 3.5);
    forWrappedY(size, y, 8, (drawY) => {
      forWrappedX(size, x, 8, (drawX) => {
        neonStroke(g, accent, 1, 0.16, traceArc(g, drawX, drawY, radius, 0, Math.PI * 2));
      });
    });
  }
}

function drawMotifWreckageRamparts(g: Phaser.GameObjects.Graphics, size: number, accent: number): void {
  // Wreckage ramparts: massive broken hull plates with rivet seams at the edges.
  for (let i = 0; i < 5; i++) {
    const x = edgeBiasedX(size, 90);
    const y = Phaser.Math.FloatBetween(0, size);
    const w = Phaser.Math.Between(90, 170);
    const h = Phaser.Math.Between(60, 130);

    forWrappedY(size, y, h, (drawY) => {
      forWrappedX(size, x, w, (drawX) => {
        neonStroke(g, accent, 1.5, 0.13, tracePolygon(g, [
          { x: drawX - w / 2, y: drawY - h / 2 },
          { x: drawX + w / 2, y: drawY - h * 0.38 },
          { x: drawX + w * 0.42, y: drawY + h / 2 },
          { x: drawX - w * 0.38, y: drawY + h * 0.46 },
        ]));
        neonStroke(g, accent, 1, 0.09, traceLine(g, drawX - w / 2, drawY, drawX + w / 2, drawY + h * 0.08));
        for (let rivet = 0; rivet < 4; rivet++) {
          g.fillStyle(accent, 0.3);
          g.fillCircle(drawX - w / 2 + (w * (rivet + 0.5)) / 4, drawY - h / 2 + 6, 1.6);
        }
      });
    });
  }
}

function drawMotifCathedral(g: Phaser.GameObjects.Graphics, size: number, accent: number): void {
  // Hollow choir: tall pointed arches rising along both edges like choir stalls.
  const columnWidth = size * 0.15;
  const archWidth = columnWidth * 0.5;
  const archHeight = 120;

  for (const columnX of [columnWidth * 0.5, size - columnWidth * 0.5]) {
    forWrappedX(size, columnX, archWidth + 6, (drawX) => {
      for (let y = -40; y < size + 80; y += 150) {
        neonStroke(g, accent, 1.25, 0.14, () => {
          g.beginPath();
          g.moveTo(drawX - archWidth / 2, y);
          g.lineTo(drawX - archWidth / 2, y - archHeight * 0.6);
          g.lineTo(drawX, y - archHeight);
          g.lineTo(drawX + archWidth / 2, y - archHeight * 0.6);
          g.lineTo(drawX + archWidth / 2, y);
        });
        g.fillStyle(accent, 0.25);
        g.fillCircle(drawX, y - archHeight * 0.55, 2);
      }
    });
  }
}

function drawMotifEclipse(g: Phaser.GameObjects.Graphics, size: number, accent: number): void {
  // Eclipse: dark discs with bright corona rings and flare ticks anchored near corners.
  const anchors = [
    { x: size * 0.14, y: size * 0.22 },
    { x: size * 0.86, y: size * 0.5 },
    { x: size * 0.16, y: size * 0.82 },
  ];

  for (const anchor of anchors) {
    const radius = Phaser.Math.Between(50, 90);
    forWrappedY(size, anchor.y, radius + 26, (drawY) => {
      forWrappedX(size, anchor.x, radius + 26, (drawX) => {
        drawSoftCircle(g, drawX, drawY, radius, 0x000000, 0.55, 10);
        neonStroke(g, accent, 1.5, 0.2, traceArc(g, drawX, drawY, radius, 0, Math.PI * 2));
        neonStroke(g, mixColor(accent, 0xffffff, 0.45), 1, 0.12, traceArc(g, drawX, drawY, radius + 8, Math.PI * 0.1, Math.PI * 0.9));
        for (let flare = 0; flare < 6; flare++) {
          const angle = (flare / 6) * Math.PI * 2 + 0.3;
          neonStroke(g, accent, 1, 0.16, traceLine(
            g,
            drawX + Math.cos(angle) * (radius + 4),
            drawY + Math.sin(angle) * (radius + 4),
            drawX + Math.cos(angle) * (radius + 16),
            drawY + Math.sin(angle) * (radius + 16)
          ));
        }
      });
    });
  }
}

function drawMotifHive(g: Phaser.GameObjects.Graphics, size: number, accent: number): void {
  // Hive: honeycomb clusters with glowing occupied cells at the edges.
  const cell = 26;

  for (let cluster = 0; cluster < 4; cluster++) {
    const cx = edgeBiasedX(size, 90);
    const cy = Phaser.Math.FloatBetween(0, size);
    const cells: { x: number; y: number }[] = [{ x: 0, y: 0 }];
    for (let ring = 0; ring < 6; ring++) {
      const angle = (ring / 6) * Math.PI * 2;
      cells.push({ x: Math.cos(angle) * cell * 1.55, y: Math.sin(angle) * cell * 1.55 });
    }

    forWrappedY(size, cy, cell * 3, (drawY) => {
      forWrappedX(size, cx, cell * 3, (drawX) => {
        for (let c = 0; c < cells.length; c++) {
          const cellX = drawX + cells[c].x;
          const cellY = drawY + cells[c].y;
          const points: { x: number; y: number }[] = [];
          for (let v = 0; v < 6; v++) {
            const angle = (v / 6) * Math.PI * 2 + Math.PI / 6;
            points.push({ x: cellX + Math.cos(angle) * cell * 0.5, y: cellY + Math.sin(angle) * cell * 0.5 });
          }
          neonStroke(g, accent, 1, 0.14, tracePolygon(g, points));
          if ((c + cluster) % 3 === 0) {
            g.fillStyle(accent, 0.14);
            g.fillCircle(cellX, cellY, cell * 0.22);
          }
        }
      });
    });
  }
}

function drawMotifSingularityEngine(g: Phaser.GameObjects.Graphics, size: number, accent: number): void {
  // Singularity engine: accretion swirl caged by a containment ring with radial spokes.
  const cx = size / 2;
  const cy = size / 2;

  for (let i = 0; i < 5; i++) {
    const radius = 200 + i * 58;
    const start = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const sweep = Phaser.Math.FloatBetween(Math.PI * 0.5, Math.PI * 1.2);
    neonStroke(g, accent, 1.5, 0.12, traceArc(g, cx, cy, radius, start, start + sweep));
  }

  neonStroke(g, accent, 1.25, 0.16, traceArc(g, cx, cy, 170, 0, Math.PI * 2));
  for (let spoke = 0; spoke < 8; spoke++) {
    const angle = (spoke / 8) * Math.PI * 2;
    neonStroke(g, accent, 1, 0.12, traceLine(
      g,
      cx + Math.cos(angle) * 170,
      cy + Math.sin(angle) * 170,
      cx + Math.cos(angle) * 205,
      cy + Math.sin(angle) * 205
    ));
  }

  drawSoftCircle(g, cx, cy, 130, 0x000000, 0.5, 12);
  drawSoftCircle(g, cx, cy, 100, mixColor(accent, 0x000000, 0.55), 0.14, 12);
}

const MOTIF_DRAWERS: Record<NeonMotif, (g: Phaser.GameObjects.Graphics, size: number, accent: number) => void> = {
  aurora: drawMotifAurora,
  glassTide: drawMotifGlassTide,
  emberStorm: drawMotifEmberStorm,
  clockwork: drawMotifClockwork,
  coralReef: drawMotifCoralReef,
  wreckageRamparts: drawMotifWreckageRamparts,
  cathedral: drawMotifCathedral,
  eclipse: drawMotifEclipse,
  hive: drawMotifHive,
  singularityEngine: drawMotifSingularityEngine,
};

function drawMidLayer(g: Phaser.GameObjects.Graphics, config: LevelConfig, size: number, motif: NeonMotif): void {
  MOTIF_DRAWERS[motif](g, size, config.accentColor);
}

function drawNearLayer(g: Phaser.GameObjects.Graphics, config: LevelConfig, size: number): void {
  // Rare dark silhouette flecks drifting near the edges.
  const fleckCount = 12;
  for (let i = 0; i < fleckCount; i++) {
    const radius = Phaser.Math.Between(6, 22);
    const x = edgeBiasedX(size, radius * 2);
    const y = Phaser.Math.FloatBetween(0, size);

    const vertexOffsets: { x: number; y: number }[] = [];
    const vertexCount = Phaser.Math.Between(5, 7);
    for (let v = 0; v < vertexCount; v++) {
      const angle = (v / vertexCount) * Math.PI * 2;
      const dist = radius * Phaser.Math.FloatBetween(0.6, 1.1);
      vertexOffsets.push({ x: Math.cos(angle) * dist, y: Math.sin(angle) * dist });
    }

    forWrappedY(size, y, radius * 2, (drawY) => {
      forWrappedX(size, x, radius * 1.2, (drawX) => {
        const points = vertexOffsets.map((offset) => ({ x: drawX + offset.x, y: drawY + offset.y }));

        g.fillStyle(0x04060e, 0.55);
        tracePolygon(g, points)();
        g.fillPath();
        g.lineStyle(1, mixColor(config.accentColor, 0x000000, 0.4), 0.14);
        tracePolygon(g, points)();
        g.strokePath();
      });
    });
  }
}

function drawOverlayLayer(g: Phaser.GameObjects.Graphics, config: LevelConfig, size: number): void {
  // Tiny bright motes, additive at runtime: keep them sparse and lane-averse.
  const moteCount = 46;
  for (let i = 0; i < moteCount; i++) {
    const x = edgeBiasedX(size, 6);
    const y = Phaser.Math.FloatBetween(0, size);
    const radius = Phaser.Math.FloatBetween(0.8, 1.9);
    const alpha = Phaser.Math.FloatBetween(0.25, 0.7);
    const color = i % 3 === 0 ? config.accentColor : mixColor(0xffffff, config.accentColor, 0.35);

    forWrappedY(size, y, radius * 4, (drawY) => {
      forWrappedX(size, x, radius * 4, (drawX) => {
        g.fillStyle(color, alpha * 0.35);
        g.fillCircle(drawX, drawY, radius * 2.2);
        g.fillStyle(color, alpha);
        g.fillCircle(drawX, drawY, radius);
      });
    });
  }
}

/**
 * Generate (once per texture key) every neon background layer for a level.
 * Safe to call repeatedly: existing keys are skipped, and the texture cache is
 * bounded by releasePremiumBackgroundTexturesOutsideWindow.
 */
export function ensureNeonBackgroundTextures(scene: Phaser.Scene, levelNumber: number): void {
  const config = getLevelConfig(levelNumber);
  const manifest = getPremiumBackgroundManifest(config.name);
  if (!manifest) {
    return;
  }

  if (manifest.runtimeLayers.every((layer) => scene.textures.exists(layer.key))) {
    return;
  }

  const motif = LEVEL_MOTIFS[levelNumber] ?? 'aurora';
  const size = manifest.baseSize.width;

  for (const layer of manifest.layers) {
    if (scene.textures.exists(layer.key)) {
      continue;
    }

    withGeneratedTexture(scene, layer.key, size, size, (g) => {
      switch (layer.role) {
        case 'far':
          drawFarLayer(g, config, size);
          break;
        case 'nebula':
          drawNebulaLayer(g, config, size);
          break;
        case 'mid':
          drawMidLayer(g, config, size, motif);
          break;
        case 'near':
          drawNearLayer(g, config, size);
          break;
        case 'overlay':
          drawOverlayLayer(g, config, size);
          break;
      }
    });
  }

  // Preserve three independently moving depth planes while still collapsing
  // the five authored canvases into a bounded runtime set.
  const groups = [
    { runtime: manifest.runtimeLayers[0], sourceRoles: ['far', 'nebula'] },
    { runtime: manifest.runtimeLayers[1], sourceRoles: ['mid', 'near'] },
    { runtime: manifest.runtimeLayers[2], sourceRoles: ['overlay'] },
  ] as const;

  for (const group of groups) {
    if (scene.textures.exists(group.runtime.key)) {
      continue;
    }
    const composite = scene.textures.createCanvas(group.runtime.key, size, size);
    if (!composite) {
      continue;
    }
    const context = composite.context;
    context.clearRect(0, 0, size, size);
    for (const layer of manifest.layers) {
      if (!(group.sourceRoles as readonly string[]).includes(layer.role)) {
        continue;
      }
      const source = scene.textures.get(layer.key).getSourceImage() as CanvasImageSource;
      context.globalAlpha = layer.alpha;
      context.globalCompositeOperation = layer.blendMode === 'ADD' ? 'lighter' : 'source-over';
      context.drawImage(source, 0, 0);
    }
    context.globalAlpha = 1;
    context.globalCompositeOperation = 'source-over';
    composite.refresh();
  }

  // Release the five authoring canvases; gameplay keeps only three 1024px
  // planes (two on the low tier) instead of five full-screen textures.
  for (const layer of manifest.layers) {
    if (scene.textures.exists(layer.key)) {
      scene.textures.remove(layer.key);
    }
  }
}
