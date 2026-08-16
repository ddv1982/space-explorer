import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, normalize, relative, resolve } from 'node:path';
import ts from 'typescript';

const SOURCE_ROOT = resolve('src');
const WARN_LINES = 500;
const WARN_IMPORTS = 25;
const WARN_EXPORTS = 20;
const WARN_FUNCTION_LINES = 100;
const WARN_COMPLEXITY = 20;
const WARN_TEST_LINES = 500;
const CONCENTRATION_BUDGETS: Record<string, { lines: number; imports: number; reason: string }> = {
  'src/browserHarness.ts': {
    lines: 950,
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
const surfaceWarnings: Array<{ file: string; exports: number }> = [];
const functionWarnings: Array<{ file: string; name: string; lines: number; complexity: number }> = [];

function getFunctionName(node: ts.FunctionLikeDeclarationBase): string {
  if ('name' in node && node.name) return node.name.getText();
  const parent = node.parent;
  if (ts.isPropertyAssignment(parent) || ts.isVariableDeclaration(parent)) return parent.name.getText();
  return '<anonymous>';
}

function inspectFunctions(file: string, source: string): void {
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const visit = (node: ts.Node): void => {
    if (ts.isFunctionLike(node) && 'body' in node && node.body) {
      const functionNode = node as ts.FunctionLikeDeclaration;
      const body = functionNode.body;
      if (!body) return;
      let complexity = 1;
      const countBranches = (child: ts.Node): void => {
        if (
          ts.isIfStatement(child) ||
          ts.isIterationStatement(child, false) ||
          ts.isCaseClause(child) ||
          ts.isCatchClause(child) ||
          ts.isConditionalExpression(child) ||
          (ts.isBinaryExpression(child) && ['&&', '||', '??'].includes(child.operatorToken.getText()))
        )
          complexity += 1;
        ts.forEachChild(child, countBranches);
      };
      ts.forEachChild(body, countBranches);
      const lines =
        sourceFile.getLineAndCharacterOfPosition(node.end).line -
        sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line +
        1;
      if (lines > WARN_FUNCTION_LINES || complexity > WARN_COMPLEXITY) {
        functionWarnings.push({
          file: relative(process.cwd(), file),
          name: getFunctionName(functionNode),
          lines,
          complexity,
        });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
}

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
  const exports = [
    ...source.matchAll(
      /^export\s+(?:default\s+)?(?:abstract\s+)?(?:class|function|const|let|var|type|interface|enum)\s+/gm
    ),
  ].length;
  if (exports > WARN_EXPORTS) surfaceWarnings.push({ file: relative(process.cwd(), file), exports });
  inspectFunctions(file, source);
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
  .sort(
    (a, b) =>
      Math.max(b.lines / WARN_LINES, b.imports / WARN_IMPORTS) -
      Math.max(a.lines / WARN_LINES, a.imports / WARN_IMPORTS)
  );

console.log(
  `Architecture report: ${sourceFiles.length} source modules, ${[...graph.values()].reduce((sum, entries) => sum + entries.length, 0)} internal edges.`
);
for (const warning of warnings) {
  console.warn(`warning: ${warning.file} (${warning.lines} lines, ${warning.imports} internal imports)`);
}
for (const warning of surfaceWarnings) {
  console.warn(`warning: ${warning.file} (${warning.exports} exported declarations)`);
}
for (const warning of functionWarnings) {
  console.warn(`warning: ${warning.file}#${warning.name} (${warning.lines} lines, complexity ${warning.complexity})`);
}

const testConcentrations = collectTypeScriptFiles(resolve('tests'))
  .map((file) => ({ file: relative(process.cwd(), file), lines: readFileSync(file, 'utf8').split(/\r?\n/).length }))
  .filter(({ lines }) => lines > WARN_TEST_LINES)
  .sort((a, b) => b.lines - a.lines);
for (const warning of testConcentrations) {
  console.warn(`warning: ${warning.file} (${warning.lines} test lines)`);
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
