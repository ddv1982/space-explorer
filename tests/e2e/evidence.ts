import { execFileSync } from 'node:child_process';
import { test } from '@playwright/test';

export const evidenceRevision =
  execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim() +
  (execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim() ? '-dirty' : '');

export async function saveBrowserEvidence(name: string, value: unknown): Promise<void> {
  await test.info().attach(`${name}.json`, {
    body: JSON.stringify({ revision: evidenceRevision, evidence: value }, null, 2),
    contentType: 'application/json',
  });
}
