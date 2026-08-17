import { describe, expect, test } from 'bun:test';

describe('architecture warning policy', () => {
  test('leaves no unexplained warning and reports reviewed categories', () => {
    const result = Bun.spawnSync(['bun', 'scripts/checkArchitecture.ts'], {
      cwd: process.cwd(),
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const output = `${result.stdout.toString()}${result.stderr.toString()}`;

    expect(result.exitCode).toBe(0);
    expect(output).toContain('Actionable architecture warnings: 0.');
    expect(output).toContain('Retained authored-data policies');
    expect(output).toContain('Retained drawing-recipe policies');
    expect(output).toContain('Retained pure-layout policies');
    expect(output).toContain('Retained test-narrative policies');
    expect(output).not.toContain('warning:');
    expect(output).not.toContain('stale or exceeded');
  });
});
