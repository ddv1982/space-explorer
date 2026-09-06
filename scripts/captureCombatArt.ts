import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const directory = process.argv[2] ?? 'output/combat-art';
const origin = process.env.COMBAT_ART_ORIGIN ?? 'http://127.0.0.1:4194';
mkdirSync(directory, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 880, height: 808 }, deviceScaleFactor: 1 });
  const failures: string[] = [];
  page.on('pageerror', (error) => failures.push(error.message));
  await page.route('**/combat-art-sheet', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<!doctype html><body style="margin:0;background:#020816">' })
  );
  await page.goto(`${origin}/combat-art-sheet`);
  await page.addScriptTag({ type: 'module', url: `${origin}/scripts/combatArtSheet.ts` });
  await page.waitForFunction(() => document.body.dataset.sheetReady === 'true');
  if (failures.length) throw new Error(failures.join('\n'));
  await page.locator('#combat-art-sheet').screenshot({ path: `${directory}/contact-sheet.png` });
  const metrics = await page.locator('#combat-art-metrics').textContent();
  if (!metrics) throw new Error('Contact sheet produced no measurements');
  writeFileSync(`${directory}/texture-metrics.json`, metrics);
  process.stdout.write(`Verified nine generated textures across low, standard, high. ${directory}/contact-sheet.png\n`);
} finally {
  await browser.close();
}
