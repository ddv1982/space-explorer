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

const requestedFiles = process.argv.slice(2);
const testFiles = requestedFiles.length > 0 ? requestedFiles : collectTestFiles('tests').sort();

for (const file of testFiles) {
  const displayPath = relative(process.cwd(), file);
  const result = spawnSync('bun', ['test', file], { encoding: 'utf8' });

  if (result.status !== 0) {
    process.stdout.write(result.stdout);
    process.stderr.write(result.stderr);
    process.exit(result.status ?? 1);
  }

  console.log(`${displayPath}: passed`);
}
