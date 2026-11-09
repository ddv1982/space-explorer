import Phaser from 'phaser';
import { getTotalLevels, getLevelConfig } from '../config/LevelsConfig';
import { ParallaxBackground } from '../systems/ParallaxBackground';
import { audioManager } from '../systems/AudioManager';
import { generateEffectsParticleTextures, PARTICLE } from '../systems/effects/particleTextureFactory';
import { getRunSummary } from '../systems/PlayerState';
import { getViewportLayout } from '../utils/layout';
import { mixColor } from '../utils/colorUtils';
import { withCanvasTexture } from '../utils/generatedTexture';
import { scaleUiGlowAlpha } from '../utils/renderingCompat';
import { bindProceedOnInput } from './shared/bindProceedOnInput';
import { mountAccessibleActionLayer, type AccessibleActionLayerHandle } from './shared/accessibleActionLayer';
import { CONTINUE_PROMPT, createPromptText } from './shared/createPromptText';
import {
  addNeonTitle,
  fitNeonTitleFontSize,
  NEON,
  NEON_TEXT,
  neonLabelStyle,
  prefersReducedMotion,
} from './shared/neonUiTheme';
import { registerRestartOnResize } from './shared/registerRestartOnResize';
import {
  addDriftingMotes,
  addEdgeVignette,
  addStatCell,
  countUp,
  formatScore,
  offsetRect,
  revealInSequence,
} from './shared/runSummaryPresentation';
import { createVictoryLayout } from './victoryScene/layout';

const RAYS_KEY = 'victory-rays';
const RAYS_SIZE = 512;

/** Fan of thin light rays that fades out toward the rim; painted white so the scene can tint it. */
function paintRays(context: CanvasRenderingContext2D, size: number): void {
  const center = size / 2;
  const rayCount = 36;
  context.translate(center, center);
  for (let ray = 0; ray < rayCount; ray++) {
    const angle = (ray / rayCount) * Math.PI * 2;
    const spread = (Math.PI / rayCount) * [0.42, 0.16, 0.28][ray % 3];
    context.beginPath();
    context.moveTo(0, 0);
    context.arc(0, 0, center, angle - spread, angle + spread);
    context.closePath();
    context.fillStyle = `rgba(255,255,255,${[0.5, 0.3, 0.4][ray % 3]})`;
    context.fill();
  }
  context.globalCompositeOperation = 'destination-in';
  const falloff = context.createRadialGradient(0, 0, 0, 0, 0, center);
  falloff.addColorStop(0, 'rgba(0,0,0,1)');
  falloff.addColorStop(0.3, 'rgba(0,0,0,0.5)');
  falloff.addColorStop(0.7, 'rgba(0,0,0,0.12)');
  falloff.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = falloff;
  context.fillRect(-center, -center, size, size);
}

export class VictoryScene extends Phaser.Scene {
  private parallax!: ParallaxBackground;
  private teardownAccessibleActions?: AccessibleActionLayerHandle;

  constructor() {
    super({ key: 'Victory' });
  }

  create(): void {
    audioManager.init();
    audioManager.stopMusic();
    registerRestartOnResize(this);

    const layout = getViewportLayout(this);

    this.cameras.main.setBackgroundColor('#02081c');

    // Animated star background via parallax
    const bgConfig = getLevelConfig(10);
    this.parallax = new ParallaxBackground();
    this.parallax.create(this, bgConfig);

    const { finalScore, totalLevels } = this.createSummary(layout);

    const continueToMenu = () => {
      audioManager.playClick();
      this.scene.start('Menu');
    };
    bindProceedOnInput(this, continueToMenu);
    this.teardownAccessibleActions = mountAccessibleActionLayer({
      label: 'Mission complete',
      summary: `All ${totalLevels} sectors cleared. Final score ${finalScore}.`,
      actions: [{ name: 'continue', label: 'Continue to command deck', activate: continueToMenu }],
    });

    // Play victory fanfare
    audioManager.playPowerUp();
    this.time.delayedCall(400, () => audioManager.playPowerUp());
    this.time.delayedCall(800, () => audioManager.playPowerUp());

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.teardownAccessibleActions?.();
      this.teardownAccessibleActions = undefined;
      this.parallax.destroy();
    });
  }

  /** Dark wash, a slow fan of light behind the title and gold motes rising through it. */
  private createAtmosphere(layout: ReturnType<typeof getViewportLayout>, haloY: number): void {
    const bounds = { x: layout.left, y: layout.top, width: layout.width, height: layout.height };
    this.add.rectangle(layout.centerX, layout.centerY, layout.width, layout.height, 0x02060f, 0.5).setDepth(0);
    addEdgeVignette(this, bounds, 0x01040c, 0.7);

    withCanvasTexture(this, RAYS_KEY, RAYS_SIZE, RAYS_SIZE, paintRays);
    const reach = Math.max(layout.width, layout.height) * 1.25;
    const rays = this.add
      .image(layout.centerX, haloY, RAYS_KEY)
      .setDisplaySize(reach, reach)
      .setTint(NEON.gold)
      .setAlpha(scaleUiGlowAlpha(0.34))
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(2);
    if (!prefersReducedMotion()) {
      this.tweens.add({ targets: rays, angle: 360, duration: 120_000, repeat: -1 });
    }
    generateEffectsParticleTextures(this);
    this.add
      .image(layout.centerX, haloY, PARTICLE.glow)
      .setDisplaySize(layout.width * 0.9, Math.min(layout.height, layout.width) * 0.6)
      .setTint(NEON.amber)
      .setAlpha(scaleUiGlowAlpha(0.22))
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(2);
    addDriftingMotes(this, bounds, [NEON.gold, NEON.amber, 0xffffff, NEON.teal], 1.4);
  }

  /** Title and run summary. Returns the numbers the accessible summary repeats. */
  private createSummary(layout: ReturnType<typeof getViewportLayout>): { finalScore: number; totalLevels: number } {
    const plan = createVictoryLayout(layout);
    const left = layout.centerX - plan.width / 2;
    const top = layout.centerY - plan.height / 2;
    const centerX = layout.centerX;
    const finalScore = getRunSummary(this.registry).finalScore;
    const totalLevels = getTotalLevels();

    this.createAtmosphere(layout, top + plan.titleY);

    const lines: Phaser.GameObjects.Text[] = [];
    const addLine = (y: number, text: string, size: number, color: string): void => {
      const line = this.add
        .text(centerX, top + y, text, neonLabelStyle(size, color))
        .setOrigin(0.5)
        .setDepth(12);
      line.setScale(Math.min(1, plan.width / Math.max(1, line.width)));
      lines.push(line);
    };

    addLine(plan.eyebrowY, 'COMMAND DECK', 13, NEON_TEXT.cyan);
    const titleSize = fitNeonTitleFontSize(this, 'MISSION COMPLETE', plan.titleSize, plan.width - 16);
    addNeonTitle(this, centerX, top + plan.titleY, 'MISSION COMPLETE', titleSize, 11, {
      glow: '#ffb84a',
      base: '#ffe2a6',
    });
    addLine(plan.subtitleY, 'ALL SECTORS CLEARED', 18, '#58f0d8');

    const score = addStatCell(this, offsetRect(plan.score, left, top), formatScore(finalScore), {
      label: 'FINAL SCORE',
      accent: NEON.gold,
      centered: true,
    });
    countUp(this, score, finalScore, 450);

    this.createSectorPips(centerX, top + plan.pips.y, plan.pips.width, plan.pips.height, totalLevels);
    addLine(plan.pipLabelY, `${totalLevels} / ${totalLevels} SECTORS`, 13, NEON_TEXT.secondary);

    const prompt = createPromptText(this, centerX, top + plan.promptY, CONTINUE_PROMPT, {
      color: '#dce8ff',
      fontSize: `${plan.promptSize}px`,
    });
    prompt.setDepth(12);
    prompt.setScale(Math.min(1, plan.width / Math.max(1, prompt.width)));

    revealInSequence(this, lines);
    return { finalScore, totalLevels };
  }

  /** One slanted pip per sector, lighting up left to right. */
  private createSectorPips(centerX: number, y: number, width: number, height: number, count: number): void {
    const gap = 6;
    const pipWidth = (width - gap * (count - 1)) / count;
    const slant = height * 0.6;
    const animate = !prefersReducedMotion();
    for (let index = 0; index < count; index++) {
      const x = centerX - width / 2 + index * (pipWidth + gap);
      const color = mixColor(NEON.teal, NEON.gold, index / Math.max(1, count - 1));
      const pip = this.add.graphics().setDepth(12);
      pip.fillStyle(color, 1);
      pip.beginPath();
      pip.moveTo(x + slant, y);
      pip.lineTo(x + pipWidth, y);
      pip.lineTo(x + pipWidth - slant, y + height);
      pip.lineTo(x, y + height);
      pip.closePath();
      pip.fillPath();
      if (animate) {
        pip.setAlpha(0.14);
        this.tweens.add({ targets: pip, alpha: 1, duration: 220, delay: 500 + index * 110 });
      }
    }
  }

  update(_time: number, delta: number): void {
    this.parallax?.update(delta);
  }
}
