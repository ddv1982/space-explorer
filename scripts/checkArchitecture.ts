import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, normalize, relative, resolve } from 'node:path';

const SOURCE_ROOT = resolve('src');
const WARN_LINES = 500;
const WARN_IMPORTS = 25;
const CONCENTRATION_BUDGETS: Record<string, { lines: number; imports: number; reason: string }> = {
  'src/browserHarness.ts': {
    lines: 925,
    imports: 8,
    reason: 'browser-only diagnostics surface',
  },
  'src/scenes/GameScene.ts': {
    lines: 500,
    imports: 36,
    reason: 'Phaser gameplay composition root',
  },
  'src/systems/parallax/neonBackgroundGenerator.ts': {
    lines: 650,
    imports: 8,
    reason: 'procedural drawing recipe collection',
  },
  'src/systems/WaveManager.ts': {
    lines: 525,
    imports: 16,
    reason: 'encounter composition root under active decomposition',
  },
  'src/entities/enemies/Boss.ts': {
    lines: 510,
    imports: 12,
    reason: 'boss entity facade after guard-policy extraction',
  },
};

function collectTypeScriptFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? collectTypeScriptFiles(path) : extname(path) === '.ts' ? [path] : [];
  });
}

function resolveSourceImport(importer: string, specifier: string): string | null {
  if (!specifier.startsWith('.') && !specifier.startsWith('@/')) return null;
  const candidate = specifier.startsWith('@/')
    ? resolve(SOURCE_ROOT, specifier.slice(2))
    : resolve(dirname(importer), specifier);
  for (const path of [`${candidate}.ts`, join(candidate, 'index.ts')]) {
    if (files.has(normalize(path))) return normalize(path);
  }
  return null;
}

const sourceFiles = collectTypeScriptFiles(SOURCE_ROOT).map(normalize).sort();
const files = new Set(sourceFiles);
const graph = new Map<string, string[]>();
const concentrations: Array<{ file: string; lines: number; imports: number }> = [];

for (const file of sourceFiles) {
  const source = readFileSync(file, 'utf8');
  const imports = [...source.matchAll(/(?:import|export)\s+(?:[^'";]+?\s+from\s+)?['"]([^'"]+)['"]/g)]
    .map((match) => resolveSourceImport(file, match[1]))
    .filter((dependency): dependency is string => dependency !== null);
  graph.set(file, [...new Set(imports)]);
  concentrations.push({
    file: relative(process.cwd(), file),
    lines: source.split(/\r?\n/).length,
    imports: imports.length,
  });
}

const visiting = new Set<string>();
const visited = new Set<string>();
const stack: string[] = [];
const cycles = new Set<string>();

function visit(file: string): void {
  if (visited.has(file)) return;
  if (visiting.has(file)) {
    const start = stack.indexOf(file);
    const cycle = [...stack.slice(start), file].map((entry) => relative(process.cwd(), entry));
    cycles.add(cycle.join(' -> '));
    return;
  }
  visiting.add(file);
  stack.push(file);
  for (const dependency of graph.get(file) ?? []) visit(dependency);
  stack.pop();
  visiting.delete(file);
  visited.add(file);
}

for (const file of sourceFiles) visit(file);

const warnings = concentrations
  .filter(({ file, lines, imports }) => {
    const budget = CONCENTRATION_BUDGETS[file];
    return lines > (budget?.lines ?? WARN_LINES) || imports > (budget?.imports ?? WARN_IMPORTS);
  })
  .sort((a, b) => Math.max(b.lines / WARN_LINES, b.imports / WARN_IMPORTS) - Math.max(a.lines / WARN_LINES, a.imports / WARN_IMPORTS));

console.log(`Architecture report: ${sourceFiles.length} source modules, ${[...graph.values()].reduce((sum, entries) => sum + entries.length, 0)} internal edges.`);
for (const warning of warnings) {
  console.warn(`warning: ${warning.file} (${warning.lines} lines, ${warning.imports} internal imports)`);
}

const trackedConcentrations = concentrations.filter(({ file }) => CONCENTRATION_BUDGETS[file]);
if (trackedConcentrations.length > 0) {
  console.log(`Tracked concentration budgets: ${trackedConcentrations.map(({ file }) => file).join(', ')}.`);
}

if (cycles.size > 0) {
  for (const cycle of cycles) console.error(`cycle: ${cycle}`);
  process.exit(1);
}

console.log('Architecture check passed (no source dependency cycles).');
