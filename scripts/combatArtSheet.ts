import Phaser from 'phaser';
import { setVisualQualityTier } from '../src/config/visualQuality';
import { ensureDiverTexture, ensureGunshipTexture, ensureSowerTexture } from '../src/utils/spriteFactory/shipTextures';

const families = [
  { name: 'Diver', ensure: ensureDiverTexture, width: 24, height: 30 },
  { name: 'Gunship', ensure: ensureGunshipTexture, width: 40, height: 40 },
  { name: 'Sower', ensure: ensureSowerTexture, width: 34, height: 34 },
];

class CombatArtSheet extends Phaser.Scene {
  preload(): void {
    this.load.image('reference', '/assets/cinematic/fighter.webp');
  }

  create(): void {
    const sheet = document.createElement('canvas');
    sheet.id = 'combat-art-sheet';
    sheet.width = 880;
    sheet.height = 808;
    const context = sheet.getContext('2d');
    if (!context) throw new Error('Contact sheet requires Canvas2D');
    context.fillStyle = '#020816';
    context.fillRect(0, 0, sheet.width, sheet.height);
    context.fillStyle = '#f4fdff';
    context.font = '18px monospace';
    context.fillText('Combat hulls / native size and 4x inspection', 24, 30);
    context.font = '13px monospace';
    context.fillStyle = '#92a4b9';
    context.fillText('Native row: 1 texture pixel = 1 screen pixel. Same silhouette at every quality.', 24, 54);
    const metrics = [];
    for (const [index, tier] of (['low', 'standard', 'high'] as const).entries()) {
      setVisualQualityTier(tier);
      const top = 78 + index * 238;
      context.fillStyle = '#92a4b9';
      context.fillText(tier.toUpperCase(), 24, top + 20);
      for (const [column, family] of families.entries()) {
        const key = family.ensure(this);
        const texture = this.textures.get(key);
        const source = texture.getSourceImage();
        if (!(source instanceof HTMLCanvasElement)) throw new Error(`${key} is not a generated canvas`);
        if (source.width !== family.width || source.height !== family.height)
          throw new Error(`${key} changed its logical size`);
        const x = 160 + column * 192;
        context.fillStyle = '#f4fdff';
        context.fillText(`${family.name} ${source.width}x${source.height}`, x - 52, top + 8);
        context.drawImage(source, x - source.width / 2, top + 20);
        context.imageSmoothingEnabled = false;
        context.drawImage(source, x - source.width * 2, top + 72, source.width * 4, source.height * 4);
        const pixels = source.getContext('2d')?.getImageData(0, 0, source.width, source.height).data;
        if (!pixels) throw new Error(`${key} pixels are unavailable`);
        let opaquePixels = 0;
        let maximumLuminance = 0;
        for (let pixel = 0; pixel < pixels.length; pixel += 4) {
          if (pixels[pixel + 3] > 240) opaquePixels += 1;
          maximumLuminance = Math.max(
            maximumLuminance,
            (pixels[pixel] * 0.2126 + pixels[pixel + 1] * 0.7152 + pixels[pixel + 2] * 0.0722) *
              (pixels[pixel + 3] / 255)
          );
        }
        if (opaquePixels < source.width * source.height * 0.15) throw new Error(`${key} hull disappeared`);
        if (maximumLuminance < 100) throw new Error(`${key} lost its readable highlights`);
        metrics.push({ tier, key, width: source.width, height: source.height, opaquePixels, maximumLuminance });
        this.textures.remove(key);
      }
      const reference = this.textures.get('reference').getSourceImage();
      if (!(reference instanceof HTMLImageElement)) throw new Error('Cinematic reference did not load');
      context.fillStyle = '#92a4b9';
      context.fillText('Cinematic fighter', 688, top + 8);
      context.imageSmoothingEnabled = true;
      context.drawImage(reference, 744, top + 20, 36, 36);
      context.drawImage(reference, 690, top + 72, 144, 144);
    }
    document.body.append(sheet);
    const evidence = document.createElement('pre');
    evidence.id = 'combat-art-metrics';
    evidence.textContent = JSON.stringify(metrics);
    evidence.hidden = true;
    document.body.append(evidence);
    this.game.canvas.hidden = true;
    document.body.dataset.sheetReady = 'true';
    this.game.loop.stop();
  }
}

new Phaser.Game({ type: Phaser.CANVAS, width: 32, height: 32, audio: { noAudio: true }, scene: CombatArtSheet });
