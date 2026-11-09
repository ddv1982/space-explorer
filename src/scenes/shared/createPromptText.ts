import Phaser from 'phaser';
import { NEON_TEXT, neonLabelStyle, prefersReducedMotion } from './neonUiTheme';

export const CONTINUE_PROMPT = 'CLICK, TAP, OR PRESS ANY KEY';

interface PromptTextOptions {
  color?: string;
  fontSize?: string;
}

export function createPromptText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  options: PromptTextOptions = {}
): Phaser.GameObjects.Text {
  const fontSize = Number.parseFloat(options.fontSize ?? '24px');
  const prompt = scene.add
    .text(x, y, text, neonLabelStyle(fontSize, options.color ?? NEON_TEXT.secondary, fontSize * 0.14))
    .setOrigin(0.5);

  if (!prefersReducedMotion()) {
    scene.tweens.add({
      targets: prompt,
      alpha: { from: 1, to: 0.35 },
      duration: 900,
      yoyo: true,
      repeat: -1,
    });
  }

  return prompt;
}
