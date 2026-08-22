import { expect, type Page } from '@playwright/test';

const entityDimensions = {
  'player-ship': { width: 36, height: 44 },
  'scout-texture': { width: 26, height: 28 },
  'fighter-texture': { width: 36, height: 36 },
  'diver-texture': { width: 24, height: 30 },
  'asteroid-texture': { width: 44, height: 44 },
  'player-bullet': { width: 8, height: 18 },
  'enemy-bullet': { width: 8, height: 8 },
} as const;

export interface LevelOneEvidenceEntity {
  textureKey: string;
  active: boolean;
  x: number;
  y: number;
  displayScale: number;
  logicalWidth: number;
  logicalHeight: number;
  sourceCanvasWidth: number;
  sourceCanvasHeight: number;
  sourceIsCanvas: boolean;
}

export function assertLevelOneEvidenceEntities(entities: LevelOneEvidenceEntity[]): void {
  expect(entities.map((entity) => entity.textureKey)).toEqual(Object.keys(entityDimensions));
  for (const entity of entities) {
    const expected = entityDimensions[entity.textureKey as keyof typeof entityDimensions];
    expect(entity.active).toBe(true);
    expect(entity.displayScale).toBe(1);
    expect(expected).toBeDefined();
    expect({ width: entity.logicalWidth, height: entity.logicalHeight }).toEqual(expected);
    expect(entity.sourceIsCanvas).toBe(true);
    expect({ width: entity.sourceCanvasWidth, height: entity.sourceCanvasHeight }).toEqual(expected);
  }
}

export async function sampleGameplayLaneLuminance(page: Page): Promise<{ center: number; edges: number }> {
  const screenshot = await page.screenshot();
  return page.evaluate(async (base64) => {
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Screenshot sampling canvas is unavailable');
    context.drawImage(bitmap, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    bitmap.close();

    const average = (ranges: ReadonlyArray<readonly [number, number]>): number => {
      let luminance = 0;
      let samples = 0;
      const step = Math.max(1, Math.floor(Math.min(canvas.width, canvas.height) / 160));
      for (let y = Math.floor(canvas.height * 0.15); y < canvas.height * 0.85; y += step) {
        for (const [start, end] of ranges) {
          for (let x = Math.floor(canvas.width * start); x < canvas.width * end; x += step) {
            const offset = (y * canvas.width + x) * 4;
            luminance += pixels[offset] * 0.2126 + pixels[offset + 1] * 0.7152 + pixels[offset + 2] * 0.0722;
            samples += 1;
          }
        }
      }
      return luminance / Math.max(1, samples);
    };

    return {
      center: average([[0.38, 0.62]]),
      edges: average([
        [0.05, 0.29],
        [0.71, 0.95],
      ]),
    };
  }, screenshot.toString('base64'));
}

export async function sampleEvidenceThreatContrast(
  page: Page,
  entities: LevelOneEvidenceEntity[]
): Promise<{ center45To55: number; threats: number }> {
  const screenshot = await page.screenshot();
  return page.evaluate(
    async ({ base64, evidenceEntities }) => {
      const binary = atob(base64);
      const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
      const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Screenshot sampling canvas is unavailable');
      context.drawImage(bitmap, 0, 0);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      bitmap.close();
      const luminanceAt = (x: number, y: number): number => {
        const offset = (y * canvas.width + x) * 4;
        return pixels[offset] * 0.2126 + pixels[offset + 1] * 0.7152 + pixels[offset + 2] * 0.0722;
      };

      let centerTotal = 0;
      let centerSamples = 0;
      const step = Math.max(1, Math.floor(Math.min(canvas.width, canvas.height) / 160));
      for (let y = Math.floor(canvas.height * 0.15); y < canvas.height * 0.85; y += step) {
        for (let x = Math.floor(canvas.width * 0.45); x < canvas.width * 0.55; x += step) {
          centerTotal += luminanceAt(x, y);
          centerSamples += 1;
        }
      }

      const threatKeys = new Set([
        'scout-texture',
        'fighter-texture',
        'diver-texture',
        'asteroid-texture',
        'enemy-bullet',
      ]);
      const threatSamples: number[] = [];
      for (const entity of evidenceEntities.filter((candidate) => threatKeys.has(candidate.textureKey))) {
        const left = Math.max(0, Math.floor(entity.x - entity.logicalWidth / 2));
        const right = Math.min(canvas.width, Math.ceil(entity.x + entity.logicalWidth / 2));
        const top = Math.max(0, Math.floor(entity.y - entity.logicalHeight / 2));
        const bottom = Math.min(canvas.height, Math.ceil(entity.y + entity.logicalHeight / 2));
        for (let y = top; y < bottom; y += 1) {
          for (let x = left; x < right; x += 1) threatSamples.push(luminanceAt(x, y));
        }
      }
      threatSamples.sort((a, b) => b - a);
      const brightThreatSampleCount = Math.max(1, Math.ceil(threatSamples.length * 0.25));
      const threats =
        threatSamples.slice(0, brightThreatSampleCount).reduce((total, sample) => total + sample, 0) /
        brightThreatSampleCount;
      return { center45To55: centerTotal / Math.max(1, centerSamples), threats };
    },
    { base64: screenshot.toString('base64'), evidenceEntities: entities }
  );
}
