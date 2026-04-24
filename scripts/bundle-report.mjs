import { gzipSync } from 'node:zlib';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const DIST_DIR = path.resolve(process.cwd(), 'dist');
const DEFAULT_MAX_ASSET_KB = 3500;
const DEFAULT_MAX_TOTAL_KB = 30000;
const DEFAULT_MAX_JS_ASSET_KB = 1500;
const DEFAULT_MAX_TOTAL_JS_KB = 1800;

async function walkFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        return walkFiles(fullPath);
      }

      return [fullPath];
    }),
  );

  return files.flat();
}

function parseNumber(value, name) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${name}: ${value}`);
  }

  return parsed;
}

function parseArgs(argv) {
  const result = {
    check: false,
    maxAssetKb: undefined,
    maxTotalKb: undefined,
    maxJsAssetKb: undefined,
    maxTotalJsKb: undefined,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--check') {
      result.check = true;
      continue;
    }

    if (arg.startsWith('--max-asset-kb=')) {
      result.maxAssetKb = parseNumber(arg.split('=')[1], '--max-asset-kb');
      continue;
    }

    if (arg === '--max-asset-kb') {
      const value = argv[i + 1];
      result.maxAssetKb = parseNumber(value, '--max-asset-kb');
      i += 1;
      continue;
    }

    if (arg.startsWith('--max-total-kb=')) {
      result.maxTotalKb = parseNumber(arg.split('=')[1], '--max-total-kb');
      continue;
    }

    if (arg === '--max-total-kb') {
      const value = argv[i + 1];
      result.maxTotalKb = parseNumber(value, '--max-total-kb');
      i += 1;
      continue;
    }

    if (arg.startsWith('--max-js-asset-kb=')) {
      result.maxJsAssetKb = parseNumber(arg.split('=')[1], '--max-js-asset-kb');
      continue;
    }

    if (arg === '--max-js-asset-kb') {
      const value = argv[i + 1];
      result.maxJsAssetKb = parseNumber(value, '--max-js-asset-kb');
      i += 1;
      continue;
    }

    if (arg.startsWith('--max-total-js-kb=')) {
      result.maxTotalJsKb = parseNumber(arg.split('=')[1], '--max-total-js-kb');
      continue;
    }

    if (arg === '--max-total-js-kb') {
      const value = argv[i + 1];
      result.maxTotalJsKb = parseNumber(value, '--max-total-js-kb');
      i += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return result;
}

function formatKb(bytes) {
  return `${(bytes / 1024).toFixed(2)} kB`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const maxAssetKb =
    args.maxAssetKb ??
    (process.env.BUNDLE_MAX_ASSET_KB
      ? parseNumber(process.env.BUNDLE_MAX_ASSET_KB, 'BUNDLE_MAX_ASSET_KB')
      : DEFAULT_MAX_ASSET_KB);
  const maxTotalKb =
    args.maxTotalKb ??
    (process.env.BUNDLE_MAX_TOTAL_KB
      ? parseNumber(process.env.BUNDLE_MAX_TOTAL_KB, 'BUNDLE_MAX_TOTAL_KB')
      : DEFAULT_MAX_TOTAL_KB);
  const maxJsAssetKb =
    args.maxJsAssetKb ??
    (process.env.BUNDLE_MAX_JS_ASSET_KB
      ? parseNumber(process.env.BUNDLE_MAX_JS_ASSET_KB, 'BUNDLE_MAX_JS_ASSET_KB')
      : DEFAULT_MAX_JS_ASSET_KB);
  const maxTotalJsKb =
    args.maxTotalJsKb ??
    (process.env.BUNDLE_MAX_TOTAL_JS_KB
      ? parseNumber(process.env.BUNDLE_MAX_TOTAL_JS_KB, 'BUNDLE_MAX_TOTAL_JS_KB')
      : DEFAULT_MAX_TOTAL_JS_KB);

  let files;

  try {
    files = await walkFiles(DIST_DIR);
  } catch {
    console.error('No dist directory found. Run "bun run build" first.');
    process.exit(1);
  }

  const relevantFiles = files
    .filter((filePath) => !filePath.endsWith('.map'))
    .sort((a, b) => a.localeCompare(b));

  if (relevantFiles.length === 0) {
    console.error('No build files found in dist. Run "bun run build" first.');
    process.exit(1);
  }

  const report = await Promise.all(
    relevantFiles.map(async (filePath) => {
      const content = await fs.readFile(filePath);

      return {
        file: path.relative(process.cwd(), filePath),
        rawBytes: content.byteLength,
        gzipBytes: gzipSync(content).byteLength,
      };
    }),
  );

  report.sort((a, b) => b.rawBytes - a.rawBytes);

  const totalRawBytes = report.reduce((sum, item) => sum + item.rawBytes, 0);
  const totalGzipBytes = report.reduce((sum, item) => sum + item.gzipBytes, 0);
  const jsReport = report.filter((item) => item.file.endsWith('.js'));
  const totalJsRawBytes = jsReport.reduce((sum, item) => sum + item.rawBytes, 0);
  const largestJs = jsReport[0];

  console.log(`Bundle report (${report.length} files in dist)`);
  console.log(`Total: ${formatKb(totalRawBytes)} raw / ${formatKb(totalGzipBytes)} gzip`);
  console.log(`JavaScript total: ${formatKb(totalJsRawBytes)} raw`);

  for (const item of report.slice(0, 8)) {
    console.log(`- ${item.file}: ${formatKb(item.rawBytes)} raw / ${formatKb(item.gzipBytes)} gzip`);
  }

  if (!args.check) {
    return;
  }

  const violations = [];
  const largest = report[0];

  if ((largest?.rawBytes ?? 0) > maxAssetKb * 1024) {
    violations.push(
      `Largest asset ${largest.file} is ${formatKb(largest.rawBytes)} (max ${maxAssetKb.toFixed(2)} kB)`,
    );
  }

  if (totalRawBytes > maxTotalKb * 1024) {
    violations.push(
      `Total dist size is ${formatKb(totalRawBytes)} (max ${maxTotalKb.toFixed(2)} kB)`,
    );
  }

  if ((largestJs?.rawBytes ?? 0) > maxJsAssetKb * 1024) {
    violations.push(
      `Largest JS asset ${largestJs.file} is ${formatKb(largestJs.rawBytes)} (max ${maxJsAssetKb.toFixed(2)} kB)`,
    );
  }

  if (totalJsRawBytes > maxTotalJsKb * 1024) {
    violations.push(
      `Total JS size is ${formatKb(totalJsRawBytes)} (max ${maxTotalJsKb.toFixed(2)} kB)`,
    );
  }

  if (violations.length === 0) {
    console.log(
      `CHECK PASSED (largest <= ${maxAssetKb.toFixed(2)} kB, total <= ${maxTotalKb.toFixed(2)} kB, largest JS <= ${maxJsAssetKb.toFixed(2)} kB, total JS <= ${maxTotalJsKb.toFixed(2)} kB)`,
    );
    return;
  }

  console.error('CHECK FAILED');

  for (const violation of violations) {
    console.error(`- ${violation}`);
  }

  process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
