import { describe, expect, test } from 'bun:test';

import {
  BUDGET_SLACK_LINES,
  getFunctionPolicyIssue,
  isConcentrationBudgetLoose,
  measureFunctions,
} from '../scripts/architectureBudget';

describe('architecture concentration slack', () => {
  test('fails a retained budget that sits far above the measured size', () => {
    expect(BUDGET_SLACK_LINES).toBe(80);
    expect(isConcentrationBudgetLoose(100, 300)).toBe(true);
    expect(isConcentrationBudgetLoose(100, 180)).toBe(false);
    expect(isConcentrationBudgetLoose(100, 181)).toBe(true);
  });
});

describe('architecture function policies', () => {
  const budget = { lines: 4, complexity: 2 };
  const find = (source: string, name: string) => measureFunctions(source).filter((entry) => entry.name === name);

  test('rejects policies after the function is removed or renamed', () => {
    expect(getFunctionPolicyIssue(find('export const value = 1;', 'oldName'), budget)).toBe('missing');
    expect(getFunctionPolicyIssue(find('function newName() {}', 'oldName'), budget)).toBe('missing');
    expect(getFunctionPolicyIssue(find('function newName() {}', 'newName'), budget)).toBeNull();
  });

  test('rejects an allowance left far above a shrunken function', () => {
    const measured = find('function compose() { return 1; }', 'compose');
    expect(getFunctionPolicyIssue(measured, { lines: 82, complexity: 2 })).toBe('loose');
    expect(getFunctionPolicyIssue(measured, { lines: 4, complexity: 12 })).toBe('loose');
    expect(getFunctionPolicyIssue(measured, budget)).toBeNull();
  });

  test('rejects functions exceeding either allowance', () => {
    const measured = find('function compose() {\n  if (ready) run();\n  return done;\n}', 'compose');
    expect(getFunctionPolicyIssue(measured, { lines: 3, complexity: 2 })).toBe('exceeded');
    expect(getFunctionPolicyIssue(measured, { lines: 4, complexity: 1 })).toBe('exceeded');
    expect(getFunctionPolicyIssue(measured, budget)).toBeNull();
  });

  test('measures nested functions even when their enclosing function has a policy', () => {
    expect(measureFunctions('function outer() {\n  return () => ready ? yes : no;\n}')).toEqual([
      { name: 'outer', lines: 3, complexity: 2 },
      { name: '<anonymous>', lines: 1, complexity: 2 },
    ]);
  });

  test('checks every declaration that shares a policy key', () => {
    const measured = find('class A { update() {} }\nclass B { update() { if (a) one(); if (b) two(); } }', 'update');
    expect(getFunctionPolicyIssue(measured, budget)).toBe('exceeded');
  });
});
