import { readFileSync } from 'node:fs';
import { spawnSync, YAML } from 'bun';

interface BrowserLane {
  name: string;
  command: string;
}

interface ListedSuite {
  suites?: ListedSuite[];
  specs?: Array<{ id: string; tests: Array<{ projectName: string }> }>;
}

interface ListedTests {
  errors: unknown[];
  suites: ListedSuite[];
}

const workflow = YAML.parse(readFileSync('.github/workflows/quality.yml', 'utf8')) as {
  jobs: { browser: { strategy: { matrix: { include: BrowserLane[] } } } };
};
const lanes = workflow.jobs.browser.strategy.matrix.include;
if (new Set(lanes.map(({ name }) => name)).size !== lanes.length) throw new Error('Duplicate browser lane names');

function listTests(project: string, shard?: string): string[] {
  const args = [
    'node',
    'node_modules/@playwright/test/cli.js',
    'test',
    '--list',
    '--reporter=json',
    `--project=${project}`,
    ...(shard ? [`--shard=${shard}`] : []),
  ];
  const result = spawnSync(args, { env: { ...process.env, CI: '1' }, stdout: 'pipe', stderr: 'pipe' });
  if (result.exitCode !== 0) throw new Error(`Playwright discovery failed: ${result.stderr.toString()}`);
  const report = JSON.parse(result.stdout.toString()) as ListedTests;
  if (report.errors.length) throw new Error(`Playwright discovery errors: ${JSON.stringify(report.errors)}`);
  const collect = (suite: ListedSuite): string[] => [
    ...(suite.specs ?? []).flatMap((spec) => spec.tests.map((test) => `${test.projectName}:${spec.id}`)),
    ...(suite.suites ?? []).flatMap(collect),
  ];
  return report.suites.flatMap(collect);
}

for (const project of ['chromium-desktop', 'chromium-mobile', 'chromium-portrait-polish']) {
  const expected = listTests(project).sort();
  if (expected.length === 0) throw new Error(`No tests discovered for ${project}`);
  const selections = lanes.flatMap(({ command }) => {
    const match = /^bunx playwright test --project=(\S+)(?: --shard=(\d+\/\d+))?$/.exec(command);
    return match?.[1] === project ? [{ shard: match[2] }] : [];
  });
  const actual = selections.flatMap(({ shard }) => listTests(project, shard)).sort();
  if (new Set(actual).size !== actual.length) throw new Error(`Duplicate test coverage for ${project}`);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Incomplete test coverage for ${project}: expected ${expected.length}, found ${actual.length}`);
  }
  console.log(`${project}: ${actual.length} tests covered exactly once across ${selections.length} lanes`);
}
