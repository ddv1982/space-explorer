import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { test, type Page } from '@playwright/test';

export const evidenceRevision =
  execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim() +
  (execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim() ? '-dirty' : '');

export async function saveBrowserEvidence(page: Page, name: string, value: unknown): Promise<void> {
  const info = test.info();
  const directory = join('output', 'verification', basename(info.outputDir));
  mkdirSync(directory, { recursive: true });
  const dataPath = join(directory, `${name}.json`);
  const screenshotPath = join(directory, `${name}.png`);
  writeFileSync(dataPath, JSON.stringify({ revision: evidenceRevision, evidence: value }, null, 2));
  await page.screenshot({ path: screenshotPath });
  await info.attach(`${name}.json`, { path: dataPath, contentType: 'application/json' });
  await info.attach(`${name}.png`, { path: screenshotPath, contentType: 'image/png' });
}
