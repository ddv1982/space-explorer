import Phaser from 'phaser';
import { NEON_TEXT, neonLabelStyle } from '../../scenes/shared/neonUiTheme';
import { prefersReducedMotion } from '../../utils/device';
import { withCanvasTexture } from '../../utils/generatedTexture';
import { getViewportBounds } from '../../utils/layout';

function destroyTweenTargets(_tween: Phaser.Tweens.Tween, targets: unknown[]): void {
  for (const target of targets) {
    if (target instanceof Phaser.GameObjects.GameObject) {
      target.destroy();
    }
  }
}

const SPAWN_WARNING_KEY = 'spawn-warning';
const SPAWN_WARNING_SIZE = 28;
const SPAWN_WARNING_Y = 30;

function traceTriangle(context: CanvasRenderingContext2D, center: number, halfWidth: number, halfHeight: number): void {
  context.beginPath();
  context.moveTo(center - halfWidth, center - halfHeight);
  context.lineTo(center + halfWidth, center - halfHeight);
  context.lineTo(center, center + halfHeight);
  context.closePath();
}

/** Neon hazard chevron pointing down: wide glow pass, dark body, bright core outline, hot tip. */
function paintSpawnWarning(context: CanvasRenderingContext2D, size: number): void {
  const center = size / 2;
  traceTriangle(context, center, 7, 7);
  context.lineWidth = 4;
  context.strokeStyle = 'rgba(255,117,111,0.2)';
  context.stroke();
  traceTriangle(context, center, 6, 6);
  context.fillStyle = 'rgba(61,10,10,0.9)';
  context.fill();
  context.lineWidth = 1.5;
  context.strokeStyle = 'rgba(255,117,111,0.95)';
  context.stroke();
  traceTriangle(context, center, 2.5, 3);
  context.fillStyle = 'rgba(255,215,212,0.9)';
  context.fill();
}

/**
 * Chevron at the top edge above an incoming enemy. It is one shared texture: a wave warns for every
 * ship at once, and vector strokes cost a draw call each where sprites share a single batch.
 */
export function createSpawnWarning(scene: Phaser.Scene, x: number): void {
  withCanvasTexture(scene, SPAWN_WARNING_KEY, SPAWN_WARNING_SIZE, SPAWN_WARNING_SIZE, paintSpawnWarning, 2);
  const arrow = scene.add.image(x, SPAWN_WARNING_Y, SPAWN_WARNING_KEY).setDepth(150).setScrollFactor(0);

  scene.tweens.add({
    targets: arrow,
    alpha: { from: 1, to: 0 },
    duration: 600,
    ease: 'Power2',
    onComplete: destroyTweenTargets,
  });
}

/** Keeps floating text clear of the status bar and the screen edges for its whole flight. */
const HUD_CLEARANCE = 132;
const EDGE_MARGIN = 34;
const FLOAT_DEPTH = 50;
const INK_STROKE = '#06101c';

interface FloatingLabelLook {
  fontSize: number;
  color: string;
  rise: number;
  duration: number;
}

/** Bigger awards (heavy hulls, chain multipliers, bosses) read bigger, brighter and for longer. */
function scorePopupLook(score: number): FloatingLabelLook {
  if (score >= 1000) return { fontSize: 28, color: '#fff3cf', rise: 54, duration: 1100 };
  if (score >= 300) return { fontSize: 22, color: '#ffe09a', rise: 46, duration: 950 };
  return { fontSize: 17, color: NEON_TEXT.gold, rise: 38, duration: 800 };
}

/**
 * Floating combat text: pops in, then rises and fades. The outline is a stroke, not a blurred shadow,
 * so spawning one mid-fight stays cheap.
 */
function floatLabel(scene: Phaser.Scene, x: number, y: number, value: string, look: FloatingLabelLook): void {
  const viewport = getViewportBounds(scene);
  const startX = Math.min(Math.max(x, viewport.left + EDGE_MARGIN), viewport.right - EDGE_MARGIN);
  const startY = Math.max(y, viewport.top + HUD_CLEARANCE);
  const text = scene.add
    .text(startX, startY, value, {
      ...neonLabelStyle(look.fontSize, look.color, 1),
      stroke: INK_STROKE,
      strokeThickness: Math.max(3, Math.round(look.fontSize * 0.2)),
    })
    .setOrigin(0.5)
    .setDepth(FLOAT_DEPTH);

  if (!prefersReducedMotion()) {
    text.setScale(0.55);
    scene.tweens.add({ targets: text, scale: 1, duration: 170, ease: 'Back.easeOut' });
  }

  scene.tweens.add({
    targets: text,
    y: startY - look.rise,
    alpha: { from: 1, to: 0 },
    duration: look.duration,
    ease: 'Cubic.easeIn',
    onComplete: destroyTweenTargets,
  });
}

export function createScorePopup(scene: Phaser.Scene, x: number, y: number, score: number): void {
  floatLabel(scene, x, y, `+${score}`, scorePopupLook(score));
}

/** The bonus for killing a boss under par, labelled so it reads apart from the kill's own score. */
export function createFastKillPopup(scene: Phaser.Scene, x: number, y: number, bonus: number): void {
  floatLabel(scene, x, y, `FAST KILL +${bonus}`, scorePopupLook(bonus));
}

/** Short tracked label lifted off the ship: a pickup in its own colour, or the gun just swapped in. */
export function createShipLabel(scene: Phaser.Scene, x: number, y: number, label: string, color: string): void {
  floatLabel(scene, x, y - 34, label, { fontSize: 16, color, rise: 34, duration: 900 });
}
