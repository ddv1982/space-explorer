import Phaser from 'phaser';
import { bankToFrame, PLAYER_SPRITE } from '../../config/shipyardSprites';
import { getVisualQualityProfile } from '../../config/visualQuality';
import { PARTICLE, generateEffectsParticleTextures } from '../../systems/effects/particleTextureFactory';
import { scaleUiGlowAlpha } from '../../utils/renderingCompat';
import { NEON, prefersReducedMotion } from '../shared/neonUiTheme';
import type { MenuLayoutPlan } from './layout';

/** One slow bank sway from left to right and back. */
const SWAY_PERIOD_MS = 7200;
const BOB_PERIOD_MS = 2600;
/** One revolution of the key light around the hull. */
const ORBIT_PERIOD_MS = 9000;
/** A scan ring leaves the launch pad this often. */
const SCAN_PERIOD_MS = 2400;

export interface MenuHero {
  update: (delta: number) => void;
  destroy: () => void;
}

interface HeroLights {
  key: Phaser.GameObjects.Light;
  engine: Phaser.GameObjects.Light;
}

/**
 * Real normal-mapped lighting for the hero: a warm key light orbits the hull so highlights roll across
 * its plates, and a cyan engine light washes the tail.
 */
function lightHero(scene: Phaser.Scene, ship: Phaser.GameObjects.Image, shipHeight: number): HeroLights | null {
  // Low tier keeps the baked look, matching gameplay (no normal-map lighting, no dynamic lights).
  if (!getVisualQualityProfile().normalMapLighting || ship.texture.dataSource.length === 0) return null;
  scene.lights.enable();
  scene.lights.setAmbientColor(0x8c96a8);
  ship.setLighting(true);
  const key = scene.lights.addLight(ship.x, ship.y, shipHeight * 2.4, 0xfff0dc, 1.6);
  key.z = shipHeight * 0.9;
  const engine = scene.lights.addLight(ship.x, ship.y + shipHeight * 0.6, shipHeight * 0.9, 0x5ff2ff, 1.2);
  engine.z = shipHeight * 0.3;
  return { key, engine };
}

type HeroPlan = NonNullable<MenuLayoutPlan['hero']>;

function glowImage(scene: Phaser.Scene, x: number, y: number, texture: string, tint: number) {
  return scene.add.image(x, y, texture).setBlendMode(Phaser.BlendModes.ADD).setTint(tint).setDepth(10);
}

/** The launch pad under the hero: rings, a soft glow and a scan ring that ripples outward. */
function createLaunchPad(scene: Phaser.Scene, hero: HeroPlan) {
  const y = hero.y + hero.shipHeight * 0.62;
  const width = hero.shipHeight * 1.5;
  const rings = scene.add.graphics().setDepth(10);
  rings.fillStyle(NEON.cyan, scaleUiGlowAlpha(0.07));
  rings.fillEllipse(hero.x, y, width, width * 0.2);
  rings.lineStyle(1.5, NEON.cyan, scaleUiGlowAlpha(0.5));
  rings.strokeEllipse(hero.x, y, width, width * 0.2);
  rings.lineStyle(1, NEON.blue, scaleUiGlowAlpha(0.35));
  rings.strokeEllipse(hero.x, y, width * 1.35, width * 0.27);
  const glow = glowImage(scene, hero.x, y, PARTICLE.glow, NEON.cyan)
    .setAlpha(0.35)
    .setDisplaySize(width * 1.1, width * 0.3);
  const scan = glowImage(scene, hero.x, y, PARTICLE.ring, NEON.cyan).setAlpha(0);
  return {
    objects: [rings, glow, scan],
    pose(elapsed: number) {
      const life = (elapsed % SCAN_PERIOD_MS) / SCAN_PERIOD_MS;
      scan.setDisplaySize(width * (0.4 + life * 1.2), width * (0.08 + life * 0.24)).setAlpha(0.55 * (1 - life));
    },
  };
}

/** Twin white-hot flame cores in a blue plume, plus a trickle of exhaust, held to the ship's tail. */
function createHeroEngines(scene: Phaser.Scene, hero: HeroPlan) {
  const nozzleOffset = hero.shipHeight * 0.075;
  const flames = [-1, 1].map(() => glowImage(scene, hero.x, hero.y, PARTICLE.glow, 0xbff6ff).setOrigin(0.5, 0.3));
  const plume = glowImage(scene, hero.x, hero.y, PARTICLE.glow, 0x2f94ff).setOrigin(0.5, 0.25).setAlpha(0.55);
  const exhaust = scene.add
    .particles(hero.x, hero.y, PARTICLE.glow, {
      speedY: { min: hero.shipHeight * 0.9, max: hero.shipHeight * 1.6 },
      speedX: { min: -8, max: 8 },
      scale: { start: (hero.shipHeight / 64) * 0.16, end: 0 },
      alpha: { start: 0.7, end: 0 },
      lifespan: { min: 180, max: 340 },
      frequency: 28,
      blendMode: Phaser.BlendModes.ADD,
      color: [0xffffff, 0x9fe9ff, 0x2f94ff, 0x0b2a66],
    })
    .setDepth(10);
  return {
    objects: [...flames, plume, exhaust],
    exhaust,
    /** Places the engines at the ship's tail and returns it. */
    pose(ship: Phaser.GameObjects.Image, flicker: number) {
      const tailX = ship.x - Math.sin(ship.rotation) * hero.shipHeight * 0.5;
      const tailY = ship.y + Math.cos(ship.rotation) * hero.shipHeight * 0.5;
      flames.forEach((flame, index) => {
        flame
          .setPosition(tailX + (index === 0 ? -1 : 1) * nozzleOffset * Math.cos(ship.rotation), tailY)
          .setDisplaySize(hero.shipHeight * 0.12, hero.shipHeight * 0.34 * flicker)
          .setRotation(ship.rotation);
      });
      plume
        .setPosition(tailX, tailY)
        .setDisplaySize(hero.shipHeight * 0.34, hero.shipHeight * 0.8 * flicker)
        .setRotation(ship.rotation);
      exhaust.setPosition(tailX, tailY + hero.shipHeight * 0.08);
      return { x: tailX, y: tailY };
    },
  };
}

/**
 * The player's lit, code-built ship idling over a launch pad: it bobs and sways through its rendered
 * bank frames, a key light orbits it, its twin engines burn with a flickering plume and exhaust, and
 * scan rings ripple out from the pad. Static under reduced motion.
 */
export function createMenuHero(scene: Phaser.Scene, plan: MenuLayoutPlan): MenuHero | null {
  const hero = plan.hero;
  if (!hero || !scene.textures.exists(PLAYER_SPRITE.key)) return null;
  generateEffectsParticleTextures(scene);

  const pad = createLaunchPad(scene, hero);
  const engines = createHeroEngines(scene, hero);
  const ship = scene.add
    .image(hero.x, hero.y, PLAYER_SPRITE.key, String(bankToFrame(0, PLAYER_SPRITE.frames)))
    .setScale(hero.scale)
    .setDepth(11);
  const lights = lightHero(scene, ship, hero.shipHeight);
  const reducedMotion = prefersReducedMotion();
  let elapsed = 0;

  const pose = (): void => {
    const bob = Math.sin((elapsed / BOB_PERIOD_MS) * Math.PI * 2) * hero.shipHeight * 0.05;
    const bank = Math.sin((elapsed / SWAY_PERIOD_MS) * Math.PI * 2) * 0.75;
    ship.setPosition(hero.x + bank * hero.shipHeight * 0.12, hero.y + bob).setRotation(bank * 0.06);
    const frame = String(bankToFrame(bank, PLAYER_SPRITE.frames));
    if (ship.frame.name !== frame) ship.setFrame(frame);
    const flicker = 0.85 + 0.15 * Math.sin(elapsed / 37) * Math.sin(elapsed / 23);
    const tail = engines.pose(ship, flicker);
    pad.pose(elapsed);
    if (lights) {
      const orbit = (elapsed / ORBIT_PERIOD_MS) * Math.PI * 2;
      lights.key.setPosition(ship.x + Math.cos(orbit) * hero.shipHeight * 1.1, ship.y - hero.shipHeight * 0.4);
      lights.engine.setPosition(tail.x, tail.y).setIntensity(1.2 * flicker);
    }
  };
  pose();
  if (reducedMotion) engines.exhaust.stop();

  return {
    update(delta) {
      if (reducedMotion || !Number.isFinite(delta)) return;
      elapsed += delta;
      pose();
    },
    destroy() {
      for (const object of [ship, ...pad.objects, ...engines.objects]) object.destroy();
      if (lights) {
        scene.lights.removeLight(lights.key);
        scene.lights.removeLight(lights.engine);
      }
    },
  };
}
