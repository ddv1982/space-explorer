import Phaser from 'phaser';
import { getVisualQualityProfile } from '../../config/visualQuality';
import { generateEffectsParticleTextures, PARTICLE } from '../../systems/effects/particleTextureFactory';
import { colorToHexString } from '../../utils/colorUtils';
import { withCanvasTexture } from '../../utils/generatedTexture';
import { drawNeonFrame, NEON_FONT, NEON_TEXT, neonLabelStyle, prefersReducedMotion } from './neonUiTheme';

/** Shared building blocks of the run-summary screens (Game Over and Victory). */

const CONTENT_DEPTH = 12;
const VIGNETTE_KEY = 'run-summary-vignette';

export interface StatCellRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function offsetRect(rect: StatCellRect, dx: number, dy: number): StatCellRect {
  return { ...rect, x: rect.x + dx, y: rect.y + dy };
}

export function formatScore(score: number): string {
  return score.toLocaleString('en-US');
}

/** Screen-edge wash in one colour; the centre stays clear so the summary reads. */
export function addEdgeVignette(
  scene: Phaser.Scene,
  bounds: StatCellRect,
  color: number,
  alpha: number
): Phaser.GameObjects.Image {
  withCanvasTexture(scene, VIGNETTE_KEY, 128, 128, (context, size) => {
    const gradient = context.createRadialGradient(size / 2, size / 2, size * 0.18, size / 2, size / 2, size * 0.72);
    gradient.addColorStop(0, 'rgba(255,255,255,0)');
    gradient.addColorStop(1, 'rgba(255,255,255,1)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
  });
  return scene.add
    .image(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2, VIGNETTE_KEY)
    .setDisplaySize(bounds.width, bounds.height)
    .setTint(color)
    .setAlpha(alpha)
    .setDepth(1);
}

/** Slow motes of light drifting up the screen. Skipped entirely under reduced motion. */
export function addDriftingMotes(scene: Phaser.Scene, bounds: StatCellRect, tints: number[], density: number): void {
  if (prefersReducedMotion()) return;
  generateEffectsParticleTextures(scene);
  const quantityScale = getVisualQualityProfile().particleQuantityScale;
  scene.add
    .particles(0, 0, PARTICLE.glow, {
      x: { min: bounds.x, max: bounds.x + bounds.width },
      y: bounds.y + bounds.height + 12,
      lifespan: { min: 5200, max: 9000 },
      speedY: { min: -70, max: -24 },
      speedX: { min: -14, max: 14 },
      scale: { start: 0.2, end: 0.03 },
      alpha: { start: 0.55, end: 0 },
      tint: tints,
      blendMode: Phaser.BlendModes.ADD,
      frequency: Math.round(260 / (density * quantityScale)),
      advance: 6000,
    })
    .setDepth(2);
}

interface StatCellOptions {
  label: string;
  accent: number;
  /** Small right-aligned note on the value line, e.g. the sector's name. */
  note?: string;
  /** Centre the label and value instead of anchoring them left. */
  centered?: boolean;
}

/**
 * Glass cell with a small tracked label over one large numeral. Returns the value text so
 * the caller can count it up.
 */
export function addStatCell(
  scene: Phaser.Scene,
  rect: StatCellRect,
  value: string,
  options: StatCellOptions
): Phaser.GameObjects.Text {
  const frame = scene.add.graphics().setDepth(CONTENT_DEPTH - 1);
  drawNeonFrame(frame, rect.x, rect.y, rect.width, rect.height, {
    accentColor: options.accent,
    fillAlpha: 0.7,
    strokeAlpha: 0.8,
    cornerCut: Math.min(14, rect.height * 0.2),
  });

  const pad = Math.min(18, rect.height * 0.2);
  const labelSize = rect.height < 70 ? 11 : 13;
  const valueSize = Math.round(rect.height * 0.54);
  const baseline = rect.y + rect.height - pad * 0.35;

  const anchorX = options.centered ? rect.x + rect.width / 2 : rect.x + pad;
  const originX = options.centered ? 0.5 : 0;
  scene.add
    .text(anchorX, rect.y + pad * 0.75, options.label, neonLabelStyle(labelSize, NEON_TEXT.secondary))
    .setOrigin(originX, 0)
    .setDepth(CONTENT_DEPTH);

  const accentHex = colorToHexString(options.accent);
  const valueText = scene.add
    .text(anchorX, baseline, value, {
      fontSize: `${valueSize}px`,
      color: accentHex,
      fontFamily: NEON_FONT.label,
      fontStyle: 'bold',
      letterSpacing: valueSize * 0.04,
    })
    .setOrigin(originX, 1)
    .setDepth(CONTENT_DEPTH);
  const innerWidth = rect.width - pad * 2;
  valueText.setScale(Math.min(1, innerWidth / Math.max(1, valueText.width)));

  if (options.note) {
    const note = scene.add
      .text(rect.x + rect.width - pad, baseline - valueSize * 0.2, options.note, neonLabelStyle(labelSize + 3))
      .setOrigin(1, 1)
      .setDepth(CONTENT_DEPTH);
    const room = innerWidth - valueText.displayWidth - 12;
    note.setScale(Math.min(1, room / Math.max(1, note.width)));
  }

  return valueText;
}

/** Rolls a numeral up from zero. Reduced motion (or nothing to count) shows the final value at once. */
export function countUp(scene: Phaser.Scene, text: Phaser.GameObjects.Text, target: number, delayMs: number): void {
  if (target <= 0 || prefersReducedMotion()) return;
  text.setText('0');
  scene.tweens.addCounter({
    from: 0,
    to: target,
    delay: delayMs,
    duration: Phaser.Math.Clamp(500 + Math.log10(target + 1) * 260, 600, 1900),
    ease: Phaser.Math.Easing.Cubic.Out,
    onUpdate: (tween) => text.setText(formatScore(Math.round(tween.getValue() ?? target))),
    onComplete: () => text.setText(formatScore(target)),
  });
}

/** Fades summary lines in one after another; a no-op under reduced motion. */
export function revealInSequence(
  scene: Phaser.Scene,
  targets: Array<Phaser.GameObjects.Components.Alpha & Phaser.GameObjects.GameObject>,
  startDelayMs = 120,
  stepMs = 90
): void {
  if (prefersReducedMotion()) return;
  targets.forEach((target, index) => {
    const alpha = target.alpha;
    target.setAlpha(0);
    scene.tweens.add({ targets: target, alpha, duration: 380, delay: startDelayMs + index * stepMs });
  });
}
