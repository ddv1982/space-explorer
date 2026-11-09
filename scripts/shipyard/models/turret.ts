import * as THREE from 'three';
import { MATERIALS, box, ellipsoid, podY, slab } from './kit';
import { bar, disc, gunmetal, paint, plating, shell, taperY } from './heavyParts';

const GOLD = '#ffc25d';
/** Deep emissive amber-gold: tone mapping keeps the hue instead of washing it to white. */
const GOLD_GLOW = '#e08a00';
const GOLD_HOT = '#ffc04a';

function octagon(radius: number): Array<readonly [number, number]> {
  return Array.from({ length: 8 }, (_, i) => {
    const a = Math.PI / 8 + (i * Math.PI) / 4;
    return [Math.cos(a) * radius, Math.sin(a) * radius] as const;
  });
}

/**
 * Picket turret: octagonal gunmetal emplacement with gold armour, a domed gun head and a twin-rail
 * barrel pointing down the screen, glowing chamber core. 24×24 logical, built in screen space.
 */
export function buildTurret(): THREE.Group {
  const turret = new THREE.Group();
  const metal = gunmetal();
  const titanium = MATERIALS.titanium();
  const plate = plating();
  const recess = MATERIALS.recess();
  const armour = paint(GOLD, 0.28);
  const glow = MATERIALS.glow(GOLD_GLOW, 3);
  const hot = MATERIALS.glow(GOLD_HOT, 2.6);

  // Footing and octagonal housing.
  turret.add(slab(octagon(9.6), 1.2, 0.4, metal));
  turret.add(slab(octagon(8.2), 0.8, 0.25, armour, 1.4));
  // Corner anchor bolts and armour seams on the diagonals.
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    turret.add(disc(Math.cos(a) * 7.4, Math.sin(a) * 7.4, 2.5, 0.85, 0.5, plate, 14));
    turret.add(bar(Math.cos(a) * 4.6, Math.sin(a) * 4.6, Math.cos(a) * 6.4, Math.sin(a) * 6.4, 0.7, 2.45, 0.3, recess));
  }
  // Gold status lights on the flanks.
  for (const s of [1, -1]) turret.add(box(s * 7.9, 0, 2.3, 0.8, 3.2, 0.5, glow));

  // Slewing ring and gun head.
  turret.add(disc(0, 0, 2.6, 5.6, 0.6, recess, 32));
  turret.add(disc(0, 0, 2.9, 5.2, 0.6, titanium, 32));
  turret.add(ellipsoid(0, 0.4, 3.2, 4.4, 4.6, 2.0, shell()));
  turret.add(ellipsoid(0, 1.0, 4.0, 3.2, 3.0, 1.6, armour));

  // Barrel: armoured mantlet, twin rails and a glowing muzzle, pointing down the screen.
  turret.add(box(0, -4.2, 3.8, 3.6, 2.4, 1.6, titanium));
  turret.add(podY(0, -6.6, 3.8, 1.05, 5, plate));
  for (const s of [1, -1]) turret.add(box(s * 1.3, -6.4, 3.8, 0.6, 4.4, 0.9, recess));
  turret.add(taperY(0, -9.2, 3.8, 0.95, 1.2, 1.0, titanium));
  turret.add(ellipsoid(0, -9.6, 3.8, 0.75, 0.5, 0.75, glow));

  // Chamber core.
  turret.add(disc(0, 0.6, 5.1, 1.7, 0.4, recess, 24));
  turret.add(ellipsoid(0, 0.6, 5.2, 1.25, 1.25, 0.6, glow));
  turret.add(ellipsoid(0, 0.8, 5.6, 0.6, 0.6, 0.3, hot));

  return turret;
}
