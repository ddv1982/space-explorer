import Phaser from 'phaser';
import { PARTICLE, generateEffectsParticleTextures } from '../../systems/effects/particleTextureFactory';
import { withCanvasTexture } from '../../utils/generatedTexture';
import { prefersReducedMotion } from '../../utils/device';

const PLANET_KEY = 'menu-horizon-planet';
const PLANET_TEXTURE_SIZE = 1024;
/** Shooting stars cross the sky at random intervals in this range. */
const METEOR_INTERVAL_MS = { min: 2600, max: 6800 } as const;

export interface MenuVista {
  destroy: () => void;
}

/**
 * A night-side world seen from orbit: dark ocean bands, a lit crescent where the star catches the upper
 * left limb, and a thick cyan atmosphere that glows past the edge.
 */
function paintPlanet(context: CanvasRenderingContext2D, size: number): void {
  const c = size / 2;
  const radius = size * 0.42;

  const halo = context.createRadialGradient(c, c, radius * 0.9, c, c, radius * 1.18);
  halo.addColorStop(0, 'rgba(110,230,255,0.85)');
  halo.addColorStop(0.3, 'rgba(60,170,255,0.35)');
  halo.addColorStop(1, 'rgba(20,60,140,0)');
  context.fillStyle = halo;
  context.fillRect(0, 0, size, size);

  context.save();
  context.beginPath();
  context.arc(c, c, radius, 0, Math.PI * 2);
  context.clip();
  const body = context.createRadialGradient(c - radius * 0.35, c - radius * 0.55, radius * 0.1, c, c, radius);
  body.addColorStop(0, '#3a86b8');
  body.addColorStop(0.5, '#164a78');
  body.addColorStop(1, '#071a33');
  context.fillStyle = body;
  context.fillRect(0, 0, size, size);
  // Soft cloud bands, drawn as wide translucent ellipses across the disc.
  for (let band = 0; band < 9; band += 1) {
    const y = c - radius + (band + 0.5) * ((radius * 2) / 9);
    context.globalAlpha = 0.05 + (band % 3) * 0.03;
    context.fillStyle = band % 2 ? '#7fd8ff' : '#2a7fb8';
    context.beginPath();
    context.ellipse(c + Math.sin(band * 1.7) * radius * 0.2, y, radius * 1.1, radius * 0.06, 0.08, 0, Math.PI * 2);
    context.fill();
  }
  context.globalAlpha = 1;
  // Night-side shadow sweeping in from the lower right.
  const night = context.createRadialGradient(c + radius * 0.5, c + radius * 0.6, radius * 0.2, c, c, radius * 1.4);
  night.addColorStop(0, 'rgba(1,3,8,0.8)');
  night.addColorStop(0.55, 'rgba(1,3,8,0.45)');
  night.addColorStop(1, 'rgba(1,3,8,0)');
  context.fillStyle = night;
  context.fillRect(0, 0, size, size);
  context.restore();

  // Atmosphere: a lit band just inside the limb, brightest on the day side, then a thin bright edge.
  const atmosphere = context.createRadialGradient(c, c, radius * 0.9, c, c, radius);
  atmosphere.addColorStop(0, 'rgba(80,200,255,0)');
  atmosphere.addColorStop(0.8, 'rgba(90,210,255,0.35)');
  atmosphere.addColorStop(1, 'rgba(160,240,255,0.75)');
  context.fillStyle = atmosphere;
  context.beginPath();
  context.arc(c, c, radius, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = 'rgba(200,248,255,0.9)';
  context.lineWidth = size * 0.0025;
  context.beginPath();
  context.arc(c, c, radius, Math.PI * 1.08, Math.PI * 1.92);
  context.stroke();
}

function launchMeteor(scene: Phaser.Scene, width: number, height: number): void {
  const fromLeft = Math.random() < 0.5;
  const startX = fromLeft ? Phaser.Math.Between(-80, width * 0.4) : Phaser.Math.Between(width * 0.6, width + 80);
  const startY = Phaser.Math.Between(-40, height * 0.3);
  const angle = Phaser.Math.DegToRad(fromLeft ? Phaser.Math.Between(18, 34) : Phaser.Math.Between(146, 162));
  const travel = Phaser.Math.Between(260, 520);
  const meteor = scene.add
    .image(startX, startY, PARTICLE.spark)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setTint(0xdff6ff)
    .setRotation(angle)
    .setScale(3.2, 0.9)
    .setAlpha(0)
    .setDepth(1);
  scene.tweens.add({
    targets: meteor,
    x: startX + Math.cos(angle) * travel,
    y: startY + Math.sin(angle) * travel,
    alpha: { from: 0.95, to: 0 },
    duration: Phaser.Math.Between(650, 1100),
    ease: 'Quad.easeIn',
    onComplete: () => meteor.destroy(),
  });
}

/**
 * The menu's view out of the command deck: a planet horizon rising behind the run tiles and the odd
 * shooting star over the living backdrop. Meteors stop under reduced motion.
 */
export function createMenuVista(scene: Phaser.Scene): MenuVista {
  const width = Number(scene.scale.width);
  const height = Number(scene.scale.height);
  generateEffectsParticleTextures(scene);
  withCanvasTexture(scene, PLANET_KEY, PLANET_TEXTURE_SIZE, PLANET_TEXTURE_SIZE, (context, size) =>
    paintPlanet(context, size)
  );

  const diameter = Math.max(width * 1.5, height * 1.2);
  const planet = scene.add
    .image(width * 0.5, height * 0.84 + diameter / 2, PLANET_KEY)
    .setDisplaySize(diameter / 0.84, diameter / 0.84)
    .setDepth(-10);

  let meteorTimer: Phaser.Time.TimerEvent | null = null;
  const scheduleMeteor = (): void => {
    meteorTimer = scene.time.delayedCall(Phaser.Math.Between(METEOR_INTERVAL_MS.min, METEOR_INTERVAL_MS.max), () => {
      launchMeteor(scene, width, height);
      scheduleMeteor();
    });
  };
  if (!prefersReducedMotion()) scheduleMeteor();

  return {
    destroy() {
      meteorTimer?.remove();
      planet.destroy();
    },
  };
}
