import Phaser from 'phaser';
import { bankToFrame, V2_SHIPS } from '../../config/v2Ships';
import { scaleUiGlowAlpha } from '../../utils/renderingCompat';
import { NEON, prefersReducedMotion } from '../shared/neonUiTheme';
import type { MenuLayoutPlan } from './layout';

const PLAYER_SHIP = V2_SHIPS[0];
/** Seconds for one slow bank sway from left to right and back. */
const SWAY_PERIOD_MS = 7200;
const BOB_PERIOD_MS = 2600;

export interface MenuHero {
  update: (delta: number) => void;
  destroy: () => void;
}

/**
 * The player's lit, code-built ship idling over a launch pad: it bobs, sways through its rendered
 * bank frames, and its engines pulse. Static under reduced motion.
 */
export function createMenuHero(scene: Phaser.Scene, plan: MenuLayoutPlan): MenuHero | null {
  const hero = plan.hero;
  if (!hero || !scene.textures.exists(PLAYER_SHIP.key)) return null;

  const padY = hero.y + hero.shipHeight * 0.62;
  const padWidth = hero.shipHeight * 1.5;
  const pad = scene.add.graphics().setDepth(10);
  pad.fillStyle(NEON.cyan, scaleUiGlowAlpha(0.07));
  pad.fillEllipse(hero.x, padY, padWidth, padWidth * 0.2);
  pad.lineStyle(1.5, NEON.cyan, scaleUiGlowAlpha(0.5));
  pad.strokeEllipse(hero.x, padY, padWidth, padWidth * 0.2);
  pad.lineStyle(1, NEON.blue, scaleUiGlowAlpha(0.35));
  pad.strokeEllipse(hero.x, padY, padWidth * 1.35, padWidth * 0.27);

  // A slim exhaust plume just behind the twin engines.
  const engineY = hero.y + hero.shipHeight * 0.56;
  const engine = scene.add
    .ellipse(hero.x, engineY, hero.shipHeight * 0.14, hero.shipHeight * 0.2, 0x5ff2ff, 0.45)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setDepth(10);
  const ship = scene.add
    .image(hero.x, hero.y, PLAYER_SHIP.key, String(bankToFrame(0, PLAYER_SHIP.bankFrames)))
    .setScale(hero.scale)
    .setDepth(11);

  const reducedMotion = prefersReducedMotion();
  let elapsed = 0;
  let frame = -1;

  return {
    update(delta) {
      if (reducedMotion || !Number.isFinite(delta)) return;
      elapsed += delta;
      const bob = Math.sin((elapsed / BOB_PERIOD_MS) * Math.PI * 2) * hero.shipHeight * 0.05;
      const bank = Math.sin((elapsed / SWAY_PERIOD_MS) * Math.PI * 2) * 0.75;
      ship.setY(hero.y + bob);
      ship.setX(hero.x + bank * hero.shipHeight * 0.12);
      ship.setRotation(bank * 0.06);
      const nextFrame = bankToFrame(bank, PLAYER_SHIP.bankFrames);
      if (nextFrame !== frame) {
        frame = nextFrame;
        ship.setFrame(String(nextFrame));
      }
      const pulse = 0.35 + 0.2 * Math.sin((elapsed / 180) * Math.PI);
      engine.setPosition(ship.x, engineY + bob).setAlpha(pulse);
    },
    destroy() {
      ship.destroy();
      engine.destroy();
      pad.destroy();
    },
  };
}
