import { createSeededRandom } from '../../utils/seededRandom';
import Phaser from 'phaser';
import { withCanvasTexture } from '../../utils/generatedTexture';

/**
 * Three-depth starfield over the living atmosphere: a dense field of faint distant stars, a mid layer
 * of brighter haloed stars, and a sparse near layer of bright stars with diffraction spikes. Each layer
 * scrolls at its own speed, so flight reads as depth. Stars take real stellar colours — blue-white,
 * white, warm yellow and orange — and the mid layer is tinted toward the world's accent.
 *
 * The layer textures are painted once and shared by every world: repainting 1.5M pixels of canvas per
 * scene start stalls software renderers for seconds.
 */
interface StarLayerSpec {
  name: string;
  size: number;
  count: number;
  /** Scroll speed in px per ms at drift 1. */
  speed: number;
  alpha: number;
  additive: boolean;
  /** How far the layer's tint moves from white toward the world accent. */
  accentTint: number;
  paint: (context: CanvasRenderingContext2D, x: number, y: number, color: string, random: () => number) => void;
}

const STELLAR_COLORS = ['#aec4ff', '#cfdcff', '#ffffff', '#fff4e0', '#ffe2b0', '#ffc690'] as const;

function glow(context: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string, alpha: number) {
  const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  context.globalAlpha = alpha;
  context.fillStyle = gradient;
  context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  context.globalAlpha = 1;
}

function dot(context: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string, alpha: number) {
  context.globalAlpha = alpha;
  context.fillStyle = color;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
  context.globalAlpha = 1;
}

function spike(context: CanvasRenderingContext2D, x: number, y: number, dx: number, dy: number, color: string) {
  const gradient = context.createLinearGradient(x - dx, y - dy, x + dx, y + dy);
  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(0.5, color);
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  context.strokeStyle = gradient;
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(x - dx, y - dy);
  context.lineTo(x + dx, y + dy);
  context.stroke();
}

const LAYERS: readonly StarLayerSpec[] = [
  {
    name: 'far',
    size: 512,
    count: 420,
    speed: 0.004,
    alpha: 1,
    additive: false,
    accentTint: 0,
    paint: (context, x, y, color, random) => dot(context, x, y, 0.35 + random() * 0.45, color, 0.22 + random() * 0.5),
  },
  {
    name: 'mid',
    size: 512,
    count: 64,
    speed: 0.009,
    alpha: 0.95,
    additive: true,
    accentTint: 0.45,
    paint: (context, x, y, color, random) => {
      glow(context, x, y, 3 + random() * 2.5, color, 0.35);
      dot(context, x, y, 0.7 + random() * 0.5, '#ffffff', 0.75 + random() * 0.25);
    },
  },
  {
    name: 'near',
    size: 1024,
    count: 10,
    speed: 0.017,
    alpha: 0.9,
    additive: true,
    accentTint: 0,
    paint: (context, x, y, color, random) => {
      const reach = 9 + random() * 9;
      glow(context, x, y, reach * 0.75, color, 0.5);
      spike(context, x, y, reach, 0, color);
      spike(context, x, y, 0, reach, color);
      dot(context, x, y, 1.3, '#ffffff', 1);
    },
  },
];

function paintLayer(context: CanvasRenderingContext2D, spec: StarLayerSpec): void {
  const random = createSeededRandom(`starfield-${spec.name}`);
  const margin = 12;
  for (let index = 0; index < spec.count; index += 1) {
    const x = margin + random() * (spec.size - margin * 2);
    const y = margin + random() * (spec.size - margin * 2);
    const color = STELLAR_COLORS[Math.floor(random() * STELLAR_COLORS.length)]!;
    spec.paint(context, x, y, color, random);
  }
}

function towardAccent(accent: number, amount: number): number {
  const mix = (shift: number): number => {
    const channel = (accent >> shift) & 0xff;
    return Math.round(255 + (channel - 255) * amount) << shift;
  };
  return mix(16) | mix(8) | mix(0);
}

const VIGNETTE_KEY = 'space-vignette';

/** Darkens the corners of space; drawn under gameplay and UI so they keep full contrast. */
export function addSpaceVignette(scene: Phaser.Scene, depth: number): Phaser.GameObjects.Image {
  withCanvasTexture(scene, VIGNETTE_KEY, 256, 144, (context, width, height) => {
    const gradient = context.createRadialGradient(
      width / 2,
      height / 2,
      height * 0.35,
      width / 2,
      height / 2,
      width * 0.75
    );
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, 'rgba(0,0,4,0.75)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
  });
  return scene.add.image(0, 0, VIGNETTE_KEY).setDepth(depth);
}

export class LivingStarfield {
  private readonly layers: Array<{ sprite: Phaser.GameObjects.TileSprite; spec: StarLayerSpec }> = [];

  /** `offsets` starts each layer at a share of its tile, so every run sees a different sky. */
  constructor(
    scene: Phaser.Scene,
    accent: number,
    depth: number,
    offsets: ReadonlyArray<readonly [number, number]> = []
  ) {
    for (const [index, spec] of LAYERS.entries()) {
      const key = `starfield-${spec.name}`;
      withCanvasTexture(scene, key, spec.size, spec.size, (context) => paintLayer(context, spec));
      const sprite = scene.add.tileSprite(0, 0, 1, 1, key).setDepth(depth).setAlpha(spec.alpha);
      if (spec.additive) sprite.setBlendMode(Phaser.BlendModes.ADD);
      if (spec.accentTint > 0) sprite.setTint(towardAccent(accent, spec.accentTint));
      const [offsetX, offsetY] = offsets[index] ?? [0, 0];
      sprite.setTilePosition(offsetX * spec.size, offsetY * spec.size);
      this.layers.push({ sprite, spec });
    }
  }

  resize(width: number, height: number): void {
    for (const { sprite } of this.layers) sprite.setSize(width, height).setPosition(width / 2, height / 2);
  }

  scroll(deltaMs: number, drift: number): void {
    for (const { sprite, spec } of this.layers) sprite.tilePositionY -= deltaMs * spec.speed * drift;
  }

  destroy(): void {
    for (const { sprite } of this.layers) sprite.destroy();
    this.layers.length = 0;
  }
}
