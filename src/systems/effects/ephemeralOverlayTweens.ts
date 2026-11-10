import Phaser from 'phaser';
import { NEON_TEXT, neonLabelStyle, prefersReducedMotion } from '../../scenes/shared/neonUiTheme';
import { getViewportBounds } from '../../utils/layout';

function destroyTweenTargets(_tween: Phaser.Tweens.Tween, targets: unknown[]): void {
  for (const target of targets) {
    if (target instanceof Phaser.GameObjects.GameObject) {
      target.destroy();
    }
  }
}

export function createSpawnWarning(scene: Phaser.Scene, x: number): void {
  // Small downward-pointing triangle at top edge
  const arrow = scene.add.graphics();
  arrow.setDepth(150);
  arrow.setScrollFactor(0);

  const ay = 30;
  // Neon hazard chevron: wide glow pass, bright core, hot tip.
  arrow.lineStyle(4, 0xff756f, 0.2);
  arrow.strokeTriangle(x - 7, ay - 7, x + 7, ay - 7, x, ay + 7);
  arrow.fillStyle(0x3d0a0a, 0.9);
  arrow.fillTriangle(x - 6, ay - 6, x + 6, ay - 6, x, ay + 6);
  arrow.lineStyle(1.5, 0xff756f, 0.95);
  arrow.strokeTriangle(x - 6, ay - 6, x + 6, ay - 6, x, ay + 6);
  arrow.fillStyle(0xffd7d4, 0.9);
  arrow.fillTriangle(x - 2.5, ay - 3, x + 2.5, ay - 3, x, ay + 3);

  // Flash and fade
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

/** Short tracked label in the pickup's own colour, lifted off the ship that collected it. */
export function createPickupLabel(scene: Phaser.Scene, x: number, y: number, label: string, color: string): void {
  floatLabel(scene, x, y - 34, label, { fontSize: 16, color, rise: 34, duration: 900 });
}
