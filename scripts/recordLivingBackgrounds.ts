import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { LIVING_CAMPAIGN } from '../src/systems/parallax/livingBackgroundProfile';

const directory = 'output/campaign-backgrounds/recordings';
mkdirSync(directory, { recursive: true });
const browser = await chromium.launch({ headless: !process.argv.includes('--headed') });
const hold = (milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

try {
  for (const mode of ['desktop', 'portrait'] as const) {
    for (const { level, world } of LIVING_CAMPAIGN) {
      const viewport = mode === 'desktop' ? { width: 1280, height: 720 } : { width: 390, height: 844 };
      const context = await browser.newContext({
        viewport,
        hasTouch: mode === 'portrait',
        recordVideo: { dir: directory, size: viewport },
      });
      try {
        const began = Date.now();
        const page = await context.newPage();
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        await page.goto(`http://127.0.0.1:4173/?browserHarness=1&startLevel=${level}`);
        await page.waitForFunction(() => {
          const shot = window.__SPACE_EXPLORER_BROWSER_HARNESS__?.snapshot();
          return (
            shot?.activeScenes.includes('Game') &&
            !shot.texts.some((item) => /WASD|joystick|Tap the right/.test(item.text))
          );
        });
        const startSeconds = (Date.now() - began) / 1000;
        await page.keyboard.down('Space');
        for (let step = 0; step < 6; step += 1) {
          const key = step % 2 === 0 ? 'ArrowLeft' : 'ArrowRight';
          await page.keyboard.down(key);
          await hold(350);
          await page.keyboard.up(key);
          await hold(1450);
          if (step === 3) await page.screenshot({ path: `${directory}/${world}-${mode}.png` });
        }
        await page.keyboard.up('Space');
        const video = page.video();
        await page.close();
        if (!video) throw new Error('Expected a gameplay recording');
        const raw = `${directory}/${world}-${mode}.webm`;
        await video.saveAs(raw);
        await video.delete();
        const result = Bun.spawnSync([
          'ffmpeg',
          '-hide_banner',
          '-loglevel',
          'error',
          '-ss',
          String(startSeconds),
          '-i',
          raw,
          '-an',
          '-c:v',
          'libx264',
          '-preset',
          'fast',
          '-crf',
          '20',
          '-movflags',
          '+faststart',
          `${directory}/${world}-${mode}.mp4`,
          '-y',
        ]);
        if (result.exitCode !== 0) throw new Error(result.stderr.toString());
        process.stdout.write(`${world} ${mode} recording saved\n`);
      } finally {
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
}

writeFileSync(
  'output/campaign-backgrounds/gallery.html',
  `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Space Explorer · campaign backgrounds</title>
<style>
body{margin:0;background:#070c16;color:#dce8f3;font:16px/1.5 system-ui}main{max-width:1400px;margin:auto;padding:32px}
h1{font-size:32px;margin-bottom:8px}p{color:#aab9cd}section{margin:32px 0;padding:24px;background:#101a29;border-radius:12px}
h2{font-size:22px;margin:0 0 16px}a{color:#8dd9e4} .views{display:grid;grid-template-columns:3fr 1fr;gap:16px;align-items:start}
video{width:100%;max-height:620px;background:#030711;border-radius:6px}label{display:block;color:#aab9cd;margin-bottom:6px}
@media(max-width:600px){main{padding:16px}.views{grid-template-columns:1fr}video{max-height:500px}}
</style><main><h1>Ten living worlds</h1><p>Phaser-generated atmospheres and landmarks. Play each clip, or jump directly into a level on the local server.</p>
${LIVING_CAMPAIGN.map(
  ({
    level,
    world,
    name,
  }) => `<section><h2>${level}. ${name} · <a href="http://localhost:4173/?startLevel=${level}">Play level</a></h2><div class="views">
${['desktop', 'portrait']
  .map(
    (mode) =>
      `<div><label>${mode}</label><video controls preload="none" poster="recordings/${world}-${mode}.png" src="recordings/${world}-${mode}.mp4"></video></div>`
  )
  .join('')}</div></section>`
).join('')}
</main></html>`
);
