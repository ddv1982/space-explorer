import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

function collectTestFiles(directory) {
  const files = [];

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
  console.log(`\n${displayPath}`);

  const result = spawnSync('bun', ['test', file], { stdio: 'inherit' });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
