/// <reference types="bun" />

import { spawnSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

function collectTestFiles(directory: string): string[] {
  const files: string[] = [];

  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    const stat = statSync(path);

    if (stat.isDirectory()) {
      files.push(...collectTestFiles(path));
    } else if (entry.endsWith('.test.ts')) {
      files.push(path);
    }
  }

  return files;
}

const argv = process.argv.slice(2);
const verbose = argv.includes('--verbose');
const requestedFiles = argv.filter((value) => value !== '--verbose');
const testFiles = requestedFiles.length > 0 ? requestedFiles : collectTestFiles('tests').sort();
const suiteTimeoutMs = Number(process.env.TEST_SUITE_TIMEOUT_MS ?? 60_000);

for (const file of testFiles) {
  const displayPath = relative(process.cwd(), file);
  const result = spawnSync('bun', ['test', file], { encoding: 'utf8', timeout: suiteTimeoutMs });

  if (result.error || result.status !== 0 || result.signal) {
    process.stdout.write(result.stdout ?? '');
    process.stderr.write(result.stderr ?? '');
    if (result.error) {
      process.stderr.write(`${displayPath}: ${result.error.message}\n`);
    }
    if (result.signal === 'SIGTERM') {
      process.stderr.write(`${displayPath}: timed out after ${suiteTimeoutMs}ms\n`);
    }
    process.exit(result.status ?? 1);
  }

  if (verbose) {
    process.stdout.write(result.stdout);
    process.stderr.write(result.stderr);
  }

  console.log(`${displayPath}: passed`);
}
