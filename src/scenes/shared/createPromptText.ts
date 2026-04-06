import Phaser from 'phaser';

export const CONTINUE_PROMPT = 'Click, Tap, or Press Any Key';

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
  const prompt = scene.add.text(x, y, text, {
    fontSize: options.fontSize ?? '24px',
    color: options.color ?? '#cfefff',
    fontFamily: 'monospace',
    stroke: '#040b12',
    strokeThickness: 2,
  }).setOrigin(0.5);

  scene.tweens.add({
    targets: prompt,
    alpha: { from: 1, to: 0.35 },
    duration: 900,
    yoyo: true,
    repeat: -1,
  });

  return prompt;
}
