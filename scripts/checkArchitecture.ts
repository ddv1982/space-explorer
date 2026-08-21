import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, normalize, relative, resolve } from 'node:path';
import ts from 'typescript';

import { isConcentrationBudgetLoose } from './architectureBudget';

const SOURCE_ROOT = resolve('src');
const WARN_LINES = 500;
const WARN_IMPORTS = 25;
const WARN_EXPORTS = 20;
const WARN_FUNCTION_LINES = 100;
const WARN_COMPLEXITY = 20;
const WARN_TEST_LINES = 500;
type PolicyCategory =
  | 'authored-data'
  | 'composition-root'
  | 'drawing-recipe'
  | 'presentation-builder'
  | 'pure-layout'
  | 'runtime-coordinator'
  | 'test-narrative';

interface PolicyRationale {
  category: PolicyCategory;
  reason: string;
  evidence: string;
}

interface FunctionPolicy extends PolicyRationale {
  lines: number;
  complexity: number;
}

interface ConcentrationPolicy extends PolicyRationale {
  lines: number;
  imports: number;
}

const FUNCTION_POLICIES: Record<string, FunctionPolicy> = {
  'src/browserHarness.ts#createBrowserHarnessApi': {
    lines: 370,
    complexity: 50,
    category: 'composition-root',
    reason: 'development-only diagnostics composition root backed by focused command modules',
    evidence: 'browser harness API contract and production bundle exclusion checks',
  },
  'src/browserHarness/performanceProbes.ts#probeFramePacing': {
    lines: 230,
    complexity: 45,
    category: 'runtime-coordinator',
    reason: 'single sampling transaction with symmetric instrumentation cleanup',
    evidence: 'browser performance probe coverage',
  },
  'src/scenes/gameScene/pauseOverlay/view.ts#getPauseOverlayLayout': {
    lines: 205,
    complexity: 60,
    category: 'pure-layout',
    reason: 'pure responsive policy covered by the viewport scenario matrix',
    evidence: 'responsive layout matrix and browser visual evidence',
  },
  'src/scenes/menuScene/layout.ts#createMenuLayoutPlan': {
    lines: 130,
    complexity: 58,
    category: 'pure-layout',
    reason: 'pure responsive policy covered by the viewport scenario matrix',
    evidence: 'responsive layout matrix and browser visual evidence',
  },
  'src/scenes/planetIntermission/presentation.ts#getIntermissionLayout': {
    lines: 145,
    complexity: 38,
    category: 'pure-layout',
    reason: 'four explicit responsive profiles covered by visual evidence',
    evidence: 'responsive layout matrix and browser visual evidence',
  },
  'src/browserHarness/snapshot.ts#createBrowserHarnessSnapshot': {
    lines: 105,
    complexity: 18,
    category: 'presentation-builder',
    reason: 'single serializable diagnostic projection assembled from optional runtime state',
    evidence: 'browser snapshot schema and smoke projects',
  },
  'src/config/levels/definitions/reimaginedMusic.ts#createSignatureMusic': {
    lines: 135,
    complexity: 10,
    category: 'authored-data',
    reason: 'one readable authored arrangement whose ordering is part of the score',
    evidence: 'level music validation and procedural music tests',
  },
  'src/scenes/gameScene/PauseOverlay.ts#create': {
    lines: 112,
    complexity: 5,
    category: 'presentation-builder',
    reason: 'cohesive Phaser display-list construction with visible z-order',
    evidence: 'pause overlay tests and responsive browser visuals',
  },
  'src/scenes/gameScene/PauseOverlay.ts#applyState': {
    lines: 67,
    complexity: 32,
    category: 'presentation-builder',
    reason: 'atomic projection of pause state across mutually dependent controls',
    evidence: 'pause overlay state tests',
  },
  'src/scenes/VictoryScene.ts#create': {
    lines: 104,
    complexity: 1,
    category: 'presentation-builder',
    reason: 'cohesive victory display-list construction with visible animation order',
    evidence: 'victory scene tests and browser visual evidence',
  },
  'src/scenes/gameScene/combatFeedbackHandlers.ts#createGameSceneCombatFeedbackHandlers': {
    lines: 245,
    complexity: 16,
    category: 'runtime-coordinator',
    reason: 'discoverable event-to-feedback mapping backed by focused terminal-flow helpers',
    evidence: 'combat feedback handler regression suite',
  },
  'src/scenes/gameScene/gameplayFrameBehavior.ts#createGameSceneGameplayFrameBehavior': {
    lines: 148,
    complexity: 31,
    category: 'runtime-coordinator',
    reason: 'stable frame-order policy with named delegated stages and no per-frame factory allocation',
    evidence: 'gameplay frame behavior tests and frame-pacing probes',
  },
  'src/scenes/menuScene/panels.ts#createSaveSlotEntryPanel': {
    lines: 168,
    complexity: 34,
    category: 'presentation-builder',
    reason: 'one save-slot row lifecycle whose geometry, state, and input behavior change together',
    evidence: 'save-slot panel tests and menu browser visuals',
  },
  'src/scenes/menuScene/panels.ts#<anonymous>': {
    lines: 110,
    complexity: 30,
    category: 'presentation-builder',
    reason: 'local relayout closure intentionally retains access to the constructed row objects',
    evidence: 'responsive layout matrix and menu browser visuals',
  },
  'src/scenes/planetIntermission/planetVisuals.ts#createPlanetArrivalVisual': {
    lines: 135,
    complexity: 14,
    category: 'drawing-recipe',
    reason: 'ordered arrival-planet display recipe with coupled layering and animation',
    evidence: 'intermission browser visual evidence',
  },
  'src/scenes/planetIntermission/presentation.ts#createIntermissionHeader': {
    lines: 145,
    complexity: 26,
    category: 'presentation-builder',
    reason: 'cohesive header construction and responsive projection',
    evidence: 'responsive layout matrix and intermission browser visuals',
  },
  'src/scenes/planetIntermission/shared.ts#getUpgradeGridLayout': {
    lines: 98,
    complexity: 35,
    category: 'pure-layout',
    reason: 'pure grid policy expressing mutually dependent breakpoint geometry',
    evidence: 'responsive layout matrix',
  },
  'src/scenes/shared/actionButtonControl.ts#createActionButtonControl': {
    lines: 108,
    complexity: 18,
    category: 'presentation-builder',
    reason: 'small control lifecycle keeping construction, state, input, and disposal adjacent',
    evidence: 'shared control tests and browser interaction coverage',
  },
  'src/scenes/shared/accessibleActionLayer.ts#mountAccessibleActionLayer': {
    lines: 137,
    complexity: 31,
    category: 'presentation-builder',
    reason: 'single semantic action-layer lifecycle with shared focus and announcement state',
    evidence: 'accessible action-layer tests and browser accessibility coverage',
  },
  'src/scenes/shared/accessibleActionLayer.ts#update': {
    lines: 76,
    complexity: 21,
    category: 'presentation-builder',
    reason: 'atomic projection of scene actions into the semantic DOM layer',
    evidence: 'accessible action-layer tests and browser accessibility coverage',
  },
  'src/scenes/shared/settingsPanel.ts#createSettingsPanel': {
    lines: 110,
    complexity: 8,
    category: 'presentation-builder',
    reason: 'cohesive settings control construction and responsive relayout wiring',
    evidence: 'settings tests and browser interaction coverage',
  },
  'src/scenes/shared/musicSliderControl.ts#createMusicSliderControl': {
    lines: 262,
    complexity: 31,
    category: 'presentation-builder',
    reason: 'single accessible slider lifecycle with tightly coupled pointer, keyboard, rendering, and cleanup state',
    evidence: 'music slider control tests and settings browser coverage',
  },
  'src/scenes/shared/musicSliderControl.ts#redraw': {
    lines: 112,
    complexity: 17,
    category: 'drawing-recipe',
    reason: 'ordered slider drawing recipe whose layers share calculated geometry',
    evidence: 'music slider control tests and browser visual evidence',
  },
  'src/systems/audio/procedural/synthesis.ts#scheduleTone': {
    lines: 138,
    complexity: 17,
    category: 'runtime-coordinator',
    reason: 'one Web Audio scheduling transaction with symmetric node setup and teardown',
    evidence: 'procedural synthesis scheduling tests',
  },
  'src/systems/hud/bootstrapRelayout.ts#createHudWidgets': {
    lines: 140,
    complexity: 3,
    category: 'presentation-builder',
    reason: 'declarative HUD display-list construction with visible ownership and ordering',
    evidence: 'HUD layout tests and gameplay browser visuals',
  },
  'src/systems/hud/bootstrapRelayout.ts#relayoutHudWidgets': {
    lines: 118,
    complexity: 6,
    category: 'pure-layout',
    reason: 'single projection of responsive HUD geometry onto the widget set',
    evidence: 'HUD responsive layout tests',
  },
  'src/systems/parallax/neonBackgroundGenerator.ts#ensureNeonBackgroundTextures': {
    lines: 94,
    complexity: 24,
    category: 'drawing-recipe',
    reason: 'idempotent texture registration whose branch structure mirrors generated texture variants',
    evidence: 'parallax texture lifecycle tests and visual evidence',
  },
  'src/systems/parallax/planetTextureGenerator.ts#generatePlanetTexture': {
    lines: 112,
    complexity: 9,
    category: 'drawing-recipe',
    reason: 'ordered deterministic planet texture recipe',
    evidence: 'planet texture cache tests and intermission visual evidence',
  },
  'src/systems/parallax/planetTextureGenerator.ts#<anonymous>': {
    lines: 104,
    complexity: 9,
    category: 'drawing-recipe',
    reason: 'local canvas recipe retains one coordinate system and explicit draw order',
    evidence: 'planet texture cache tests and intermission visual evidence',
  },
  'src/utils/spriteFactory/bossTextures.ts#ensureBossTextureVariant': {
    lines: 245,
    complexity: 11,
    category: 'drawing-recipe',
    reason: 'idempotent boss-variant recipe whose visual passes share variant geometry',
    evidence: 'boss texture registration tests and gameplay visual evidence',
  },
  'src/utils/spriteFactory/bossTextures.ts#<anonymous>': {
    lines: 236,
    complexity: 11,
    category: 'drawing-recipe',
    reason: 'local canvas recipe preserves explicit layer order and shared coordinate state',
    evidence: 'boss texture registration tests and gameplay visual evidence',
  },
};
const TEST_CONCENTRATION_BUDGETS: Record<string, { lines: number; reason: string; evidence: string }> = {
  'tests/CollisionManager.test.ts': {
    lines: 675,
    reason: 'shared typed collision fixture with source-specific narratives',
    evidence: 'collision manager regression suite',
  },
  'tests/SaveSlotStorage.test.ts': {
    lines: 615,
    reason: 'single persistence compatibility matrix',
    evidence: 'save compatibility regression suite',
  },
  'tests/WaveManager.test.ts': {
    lines: 590,
    reason: 'shared deterministic encounter fixture',
    evidence: 'wave manager regression suite',
  },
  'tests/combatFeedbackHandlers.test.ts': {
    lines: 570,
    reason: 'shared terminal-flow handler fixture',
    evidence: 'combat feedback regression suite',
  },
  'tests/responsiveLayout.test.ts': {
    lines: 540,
    reason: 'cross-scene viewport scenario matrix',
    evidence: 'responsive layout regression suite',
  },
  'tests/EnemyPool.test.ts': {
    lines: 535,
    reason: 'single pooled-enemy registry contract',
    evidence: 'enemy pool regression suite',
  },
  'tests/PicketTurretSystem.test.ts': {
    lines: 515,
    reason: 'single turret lifecycle fixture',
    evidence: 'picket turret regression suite',
  },
  'tests/e2e/performance.evidence.spec.ts': {
    lines: 575,
    reason: 'single normal-and-synthetic performance-gate evidence narrative',
    evidence: 'desktop and mobile performance projects with threshold-marker verification',
  },
};
const CONCENTRATION_POLICIES: Record<string, ConcentrationPolicy> = {
  'src/config/levels/music/patterns/arpeggiatorPatterns.ts': {
    lines: 870,
    imports: 1,
    category: 'authored-data',
    reason: 'single discoverable catalog of related arpeggiator motifs and variants',
    evidence: 'level music validation and procedural music tests',
  },
  'src/config/levels/music/patterns/bassPatterns.ts': {
    lines: 515,
    imports: 1,
    category: 'authored-data',
    reason: 'single discoverable catalog of related bass motifs and variants',
    evidence: 'level music validation and procedural music tests',
  },
  'src/browserHarness.ts': {
    lines: 140,
    imports: 15,
    category: 'composition-root',
    reason: 'browser-only diagnostics composition root after command extraction',
    evidence: 'browser harness contract and production bundle exclusion checks',
  },
  'src/scenes/gameScene/PauseOverlay.ts': {
    lines: 525,
    imports: 10,
    category: 'presentation-builder',
    reason: 'single pause-overlay view lifecycle with shared controls and responsive state',
    evidence: 'pause overlay tests and responsive browser visuals',
  },
  'src/scenes/GameScene.ts': {
    lines: 455,
    imports: 36,
    category: 'composition-root',
    reason: 'Phaser gameplay composition root',
    evidence: 'game scene composition and lifecycle tests',
  },
  'src/systems/parallax/neonBackgroundGenerator.ts': {
    lines: 680,
    imports: 8,
    category: 'drawing-recipe',
    reason: 'procedural drawing recipe collection',
    evidence: 'parallax texture lifecycle tests, visual evidence, and frame-pacing probes',
  },
  'src/systems/WaveManager.ts': {
    lines: 460,
    imports: 16,
    category: 'composition-root',
    reason: 'encounter composition root under active decomposition',
    evidence: 'deterministic encounter regression suite',
  },
  'src/entities/enemies/Boss.ts': {
    lines: 460,
    imports: 12,
    category: 'composition-root',
    reason: 'boss entity facade after guard-policy extraction',
    evidence: 'boss phase and lifecycle tests',
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
        const relativeFile = relative(process.cwd(), file);
        const name = getFunctionName(functionNode);
        const budget = FUNCTION_POLICIES[`${relativeFile}#${name}`];
        if (budget && lines <= budget.lines && complexity <= budget.complexity) return;
        functionWarnings.push({
          file: relativeFile,
          name,
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
      /^export\s+(?:default\s+)?(?:abstract\s+)?(?:class|function|const|let|var|type|interface|enum)\s+[A-Za-z_$]/gm
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
    const budget = CONCENTRATION_POLICIES[file];
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
const trackedFunctions = Object.entries(FUNCTION_POLICIES).filter(([name]) => {
  const separator = name.lastIndexOf('#');
  const file = name.slice(0, separator);
  const symbol = name.slice(separator + 1);
  return (
    sourceFiles.some((sourceFile) => relative(process.cwd(), sourceFile) === file) &&
    !functionWarnings.some((warning) => warning.file === file && warning.name === symbol)
  );
});
const staleFunctionPolicies = Object.keys(FUNCTION_POLICIES).filter(
  (name) => !trackedFunctions.some(([trackedName]) => trackedName === name)
);
if (staleFunctionPolicies.length > 0) {
  for (const name of staleFunctionPolicies) console.error(`stale or exceeded function policy: ${name}`);
}

const testConcentrations = collectTypeScriptFiles(resolve('tests'))
  .map((file) => ({ file: relative(process.cwd(), file), lines: readFileSync(file, 'utf8').split(/\r?\n/).length }))
  .filter(({ file, lines }) => lines > (TEST_CONCENTRATION_BUDGETS[file]?.lines ?? WARN_TEST_LINES))
  .sort((a, b) => b.lines - a.lines);
for (const warning of testConcentrations) {
  console.warn(`warning: ${warning.file} (${warning.lines} test lines)`);
}
const trackedTestConcentrations = Object.entries(TEST_CONCENTRATION_BUDGETS)
  .map(([file, budget]) => ({ file, ...budget }))
  .filter(({ file }) => testConcentrations.every((warning) => warning.file !== file));
const trackedConcentrations = concentrations.filter(({ file }) => CONCENTRATION_POLICIES[file]);
const staleConcentrationPolicies = Object.keys(CONCENTRATION_POLICIES).filter(
  (file) => !trackedConcentrations.some((concentration) => concentration.file === file)
);
if (staleConcentrationPolicies.length > 0) {
  for (const file of staleConcentrationPolicies) console.error(`stale concentration policy: ${file}`);
}
const looseConcentrationPolicies = trackedConcentrations.filter(({ file, lines }) => {
  const budget = CONCENTRATION_POLICIES[file];
  return Boolean(budget && isConcentrationBudgetLoose(lines, budget.lines));
});
for (const { file, lines } of looseConcentrationPolicies) {
  console.error(
    `stale concentration budget: ${file} is ${lines} lines but budget is ${CONCENTRATION_POLICIES[file].lines}`
  );
}

const retainedPolicies = [
  ...trackedFunctions.map(([name, policy]) => ({ name, ...policy })),
  ...trackedConcentrations.map(({ file }) => ({ name: file, ...CONCENTRATION_POLICIES[file] })),
  ...trackedTestConcentrations.map(({ file, lines: _lines, ...policy }) => ({
    name: file,
    category: 'test-narrative' as const,
    ...policy,
  })),
];
const retainedByCategory = new Map<PolicyCategory, typeof retainedPolicies>();
for (const policy of retainedPolicies) {
  const categoryPolicies = retainedByCategory.get(policy.category) ?? [];
  categoryPolicies.push(policy);
  retainedByCategory.set(policy.category, categoryPolicies);
}
console.log(`Actionable architecture warnings: ${warnings.length + surfaceWarnings.length + functionWarnings.length}.`);
for (const [category, policies] of [...retainedByCategory].sort(([left], [right]) => left.localeCompare(right))) {
  console.log(`Retained ${category} policies (${policies.length}):`);
  for (const policy of policies) console.log(`  ${policy.name} — ${policy.reason}; evidence: ${policy.evidence}.`);
}

if (
  cycles.size > 0 ||
  warnings.length > 0 ||
  surfaceWarnings.length > 0 ||
  functionWarnings.length > 0 ||
  testConcentrations.length > 0 ||
  staleFunctionPolicies.length > 0 ||
  staleConcentrationPolicies.length > 0 ||
  looseConcentrationPolicies.length > 0
) {
  for (const cycle of cycles) console.error(`cycle: ${cycle}`);
  process.exit(1);
}

console.log('Architecture check passed (no source dependency cycles).');
