import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { sheetLayout, type V2ShipSpec } from '../../src/config/v2Ships';
import { buildFighter } from './models/fighter';
import { buildPlayerShip } from './models/playerShip';

/**
 * Runs inside headless Chromium (bundled by renderShips.ts). Renders each bank frame twice:
 * an albedo pass with baked key light from the upper left, and a view-space normal pass that
 * Phaser's lighting decodes green-up. Frames are supersampled 2× and downsampled for clean edges.
 */

const SUPERSAMPLE = 2;
/** Transparent border kept around every frame, in logical pixels. */
export const FRAME_MARGIN = 2;

const BUILDERS: Record<string, () => THREE.Object3D> = {
  player: buildPlayerShip,
  fighter: buildFighter,
  probe: () => {
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(14, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: '#808080' })
    );
    dome.rotation.x = Math.PI / 2;
    // Banking sets the root's rotation, so the dome's own orientation lives one level down.
    const root = new THREE.Group();
    root.add(dome);
    return root;
  },
};

interface RenderRequest {
  spec: V2ShipSpec;
  density: number;
}

interface RenderResult {
  albedo: string;
  normal: string;
  borderClear: boolean;
}

function createRenderer(width: number, height: number): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height, false);
  renderer.setClearColor(0x000000, 0);
  return renderer;
}

function createLitScene(renderer: THREE.WebGLRenderer): THREE.Scene {
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;
  scene.add(new THREE.HemisphereLight('#b8c8ff', '#1c232c', 0.7));
  const key = new THREE.DirectionalLight('#fff4e6', 2.4);
  key.position.set(-50, 60, 65);
  scene.add(key);
  const fill = new THREE.DirectionalLight('#6f86ff', 0.45);
  fill.position.set(60, -40, 50);
  scene.add(fill);
  return scene;
}

function drawDownsampled(source: HTMLCanvasElement, target: CanvasRenderingContext2D, x: number, w: number, h: number) {
  target.imageSmoothingEnabled = true;
  target.imageSmoothingQuality = 'high';
  target.drawImage(source, 0, 0, source.width, source.height, x, 0, w, h);
}

function borderIsClear(context: CanvasRenderingContext2D, x: number, w: number, h: number, border: number): boolean {
  const pixels = context.getImageData(x, 0, w, h).data;
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const inside = px >= border && px < w - border && py >= border && py < h - border;
      if (!inside && pixels[(py * w + px) * 4 + 3]! > 8) return false;
    }
  }
  return true;
}

/**
 * Uniformly scales a model so its level pose fits the logical frame minus the transparent margin,
 * and returns a root whose rotation is free for banking.
 */
function fitToFrame(model: THREE.Object3D, spec: V2ShipSpec): THREE.Group {
  const bounds = new THREE.Box3().setFromObject(model);
  const halfX = Math.max(Math.abs(bounds.min.x), Math.abs(bounds.max.x));
  const halfY = Math.max(Math.abs(bounds.min.y), Math.abs(bounds.max.y));
  const scale = Math.min(
    1,
    (spec.width / 2 - FRAME_MARGIN - 0.25) / halfX,
    (spec.height / 2 - FRAME_MARGIN - 0.25) / halfY
  );
  model.scale.multiplyScalar(scale);
  const root = new THREE.Group();
  root.add(model);
  return root;
}

function renderShipSheet({ spec, density }: RenderRequest): RenderResult {
  const layout = sheetLayout(spec, density);
  const renderer = createRenderer(layout.frameWidth * SUPERSAMPLE, layout.frameHeight * SUPERSAMPLE);
  const scene = createLitScene(renderer);
  const camera = new THREE.OrthographicCamera(
    -spec.width / 2,
    spec.width / 2,
    spec.height / 2,
    -spec.height / 2,
    0.1,
    400
  );
  camera.position.set(0, 0, 200);
  camera.up.set(0, 1, 0);
  camera.lookAt(0, 0, 0);

  const built = BUILDERS[spec.file]?.();
  if (!built) throw new Error(`No shipyard model for "${spec.file}"`);
  const model = fitToFrame(built, spec);
  scene.add(model);
  const normalMaterial = new THREE.MeshNormalMaterial();

  const sheets = { albedo: document.createElement('canvas'), normal: document.createElement('canvas') };
  for (const canvas of Object.values(sheets)) {
    canvas.width = layout.sheetWidth;
    canvas.height = layout.sheetHeight;
  }
  const albedoContext = sheets.albedo.getContext('2d', { willReadFrequently: true })!;
  const normalContext = sheets.normal.getContext('2d')!;
  let borderClear = true;

  layout.frameBankDeg.forEach((bankDeg, frame) => {
    // Banking right dips the right wing away from the camera: roll about the forward (Y) axis.
    model.rotation.set(0, THREE.MathUtils.degToRad(bankDeg), 0);
    const x = frame * layout.frameWidth;

    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    scene.overrideMaterial = null;
    renderer.render(scene, camera);
    drawDownsampled(renderer.domElement, albedoContext, x, layout.frameWidth, layout.frameHeight);

    // Normals must stay linear and untoned: they are data, not colour.
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    scene.overrideMaterial = normalMaterial;
    renderer.render(scene, camera);
    drawDownsampled(renderer.domElement, normalContext, x, layout.frameWidth, layout.frameHeight);

    borderClear &&= borderIsClear(albedoContext, x, layout.frameWidth, layout.frameHeight, FRAME_MARGIN * density);
  });

  renderer.dispose();
  return { albedo: sheets.albedo.toDataURL('image/png'), normal: sheets.normal.toDataURL('image/png'), borderClear };
}

declare global {
  interface Window {
    renderShipSheet: typeof renderShipSheet;
    shipyardReady: boolean;
  }
}

window.renderShipSheet = renderShipSheet;
window.shipyardReady = true;
