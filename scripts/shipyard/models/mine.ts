import * as THREE from 'three';
import { MATERIALS, ellipsoid } from './kit';
import { disc, paint, shell } from './heavyParts';

const RED = '#ff6a3d';
/** Deep emissive red-orange: tone mapping keeps the hue instead of washing it to white. */
const RED_GLOW = '#e02800';
const RED_HOT = '#ff7a3a';

/** A conical spike from the mine's centre outward along angle `a` (radians, in the screen plane). */
function spike(a: number, inner: number, length: number, radius: number, material: THREE.Material): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.ConeGeometry(radius, length, 12), material);
  // Cone points along +Y; rotate it to point along `a`.
  mesh.rotation.z = a - Math.PI / 2;
  const r = inner + length / 2;
  mesh.position.set(Math.cos(a) * r, Math.sin(a) * r, 0.6);
  return mesh;
}

/**
 * Sower mine: armoured gunmetal sphere with eight spikes (four long cardinal, four short diagonal),
 * a red-orange armour band and a glowing core eye. 16×16 logical.
 */
export function buildMine(): THREE.Group {
  const mine = new THREE.Group();
  const metal = shell();
  const titanium = MATERIALS.titanium();
  const recess = MATERIALS.recess();
  const armour = paint(RED, 0.42);
  const glow = MATERIALS.glow(RED_GLOW, 3);
  const hot = MATERIALS.glow(RED_HOT, 2.6);

  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    mine.add(spike(a, 3.0, 3.2, 1.15, titanium));
    mine.add(spike(a + Math.PI / 4, 3.0, 2.0, 0.95, armour));
  }

  mine.add(ellipsoid(0, 0, 0, 4.0, 4.0, 3.4, metal));
  mine.add(disc(0, 0, 1.6, 3.6, 1.2, armour, 32));
  mine.add(disc(0, 0, 2.3, 2.6, 0.6, recess, 28));
  mine.add(ellipsoid(0, 0, 2.4, 1.9, 1.9, 1.0, glow));
  mine.add(ellipsoid(0.2, 0.3, 3.1, 0.8, 0.8, 0.4, hot));

  return mine;
}
