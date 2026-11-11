import Phaser from 'phaser';
import { getTotalLevels, getLevelConfig } from '../config/LevelsConfig';
import { ParallaxBackground } from '../systems/ParallaxBackground';
import { audioManager } from '../systems/AudioManager';
import { generateEffectsParticleTextures, PARTICLE } from '../systems/effects/particleTextureFactory';
import { getRunSummary } from '../systems/PlayerState';
import { getViewportLayout } from '../utils/layout';
import { withCanvasTexture } from '../utils/generatedTexture';
import { scaleUiGlowAlpha } from '../utils/renderingCompat';
import { h, liveRegion, measureInGame, mountUiLayer } from '../ui/dom';
import { countUp, formatScore, statCell } from '../ui/summary';
import { bindProceedOnInput } from './shared/bindProceedOnInput';
import { NEON, prefersReducedMotion } from './shared/neonUiTheme';
import { registerRestartOnResize } from './shared/registerRestartOnResize';
import { addDriftingMotes, addEdgeVignette } from './shared/runSummaryPresentation';

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

  constructor() {
    super({ key: 'Victory' });
  }

  create(): void {
    audioManager.init();
    audioManager.stopMusic();
    registerRestartOnResize(this);

    this.cameras.main.setBackgroundColor('#02081c');
    this.parallax = new ParallaxBackground();
    this.parallax.create(this, getLevelConfig(10));

    let left = false;
    const continueToMenu = (): void => {
      if (left) return;
      left = true;
      audioManager.playUi();
      this.scene.start('Menu');
    };
    bindProceedOnInput(this, continueToMenu);
    const layer = this.createSummary(continueToMenu);
    this.createAtmosphere(layer.querySelector('.summary__title'));

    audioManager.playSfx('victory');

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      left = true;
      layer.remove();
      this.parallax.destroy();
    });
  }

  /** Dark wash, a slow fan of light behind the title and gold motes rising through it. */
  private createAtmosphere(title: Element | null): void {
    const layout = getViewportLayout(this);
    const bounds = { x: layout.left, y: layout.top, width: layout.width, height: layout.height };
    this.add.rectangle(layout.centerX, layout.centerY, layout.width, layout.height, 0x02060f, 0.5).setDepth(0);
    addEdgeVignette(this, bounds, 0x01040c, 0.7);

    // The fan radiates from the HTML title, wherever the layout put it.
    const titleBox = title && measureInGame(this, title);
    const haloY = titleBox ? titleBox.top + titleBox.height / 2 : layout.centerY;

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

  /** Title, final score, one lit pip per sector and the continue prompt, in HTML over the canvas art. */
  private createSummary(onContinue: () => void): HTMLElement {
    const finalScore = getRunSummary(this.registry).finalScore;
    const totalLevels = getTotalLevels();
    const score = statCell('FINAL SCORE', formatScore(finalScore), '255 210 122');
    countUp(score.value, finalScore, 450);

    const pips = h('div', { className: 'summary__pips', 'aria-hidden': 'true' });
    for (let index = 0; index < totalLevels; index++) {
      const pip = h('i');
      pip.style.setProperty('--i', String(index));
      pip.style.background = `color-mix(in srgb, #ffd27a ${Math.round((index / Math.max(1, totalLevels - 1)) * 100)}%, #58f0d8)`;
      pips.append(pip);
    }
    const prompt = h(
      'button',
      { type: 'button', className: 'summary__prompt', 'aria-label': 'Continue to command deck' },
      'CLICK, TAP, OR PRESS ANY KEY'
    );
    prompt.addEventListener('click', onContinue);

    const layer = mountUiLayer();
    layer.append(
      h(
        'section',
        { className: 'summary summary--victory', 'aria-label': 'Mission complete' },
        h('p', { className: 'summary__eyebrow' }, 'COMMAND DECK'),
        h('h1', { className: 'ui-title summary__title' }, 'MISSION COMPLETE'),
        h('p', { className: 'summary__line' }, 'ALL SECTORS CLEARED'),
        h('div', { className: 'summary__cells' }, score.element),
        pips,
        h('p', { className: 'summary__line summary__pip-label' }, `${totalLevels} / ${totalLevels} SECTORS`),
        prompt,
        liveRegion(`All ${totalLevels} sectors cleared. Final score ${finalScore}.`)
      )
    );
    return layer;
  }

  update(_time: number, delta: number): void {
    this.parallax?.update(delta);
  }
}
