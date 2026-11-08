import ts from 'typescript';

export const BUDGET_SLACK_LINES = 80;

export function isConcentrationBudgetLoose(
  measuredLines: number,
  budgetLines: number,
  slackLines: number = BUDGET_SLACK_LINES
): boolean {
  return measuredLines + slackLines < budgetLines;
}

export interface FunctionMeasurement {
  name: string;
  lines: number;
  complexity: number;
}

export function measureFunctions(source: string): FunctionMeasurement[] {
  const sourceFile = ts.createSourceFile('source.ts', source, ts.ScriptTarget.Latest, true);
  const measurements: FunctionMeasurement[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isFunctionLike(node) && 'body' in node && node.body) {
      let name = '<anonymous>';
      if ('name' in node && node.name) name = node.name.getText(sourceFile);
      else if (ts.isPropertyAssignment(node.parent) || ts.isVariableDeclaration(node.parent)) {
        name = node.parent.name.getText(sourceFile);
      }
      let complexity = 1;
      const countBranches = (child: ts.Node): void => {
        if (
          ts.isIfStatement(child) ||
          ts.isIterationStatement(child, false) ||
          ts.isCaseClause(child) ||
          ts.isCatchClause(child) ||
          ts.isConditionalExpression(child) ||
          (ts.isBinaryExpression(child) && ['&&', '||', '??'].includes(child.operatorToken.getText(sourceFile)))
        )
          complexity += 1;
        ts.forEachChild(child, countBranches);
      };
      countBranches(node.body);
      const lines =
        sourceFile.getLineAndCharacterOfPosition(node.end).line -
        sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line +
        1;
      measurements.push({ name, lines, complexity });
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return measurements;
}

export function getFunctionPolicyIssue(
  measurements: readonly FunctionMeasurement[],
  budget: { lines: number; complexity: number }
): 'missing' | 'exceeded' | 'loose' | null {
  if (measurements.length === 0) return 'missing';
  const lines = Math.max(...measurements.map((measurement) => measurement.lines));
  const complexity = Math.max(...measurements.map((measurement) => measurement.complexity));
  if (lines > budget.lines || complexity > budget.complexity) return 'exceeded';
  if (isConcentrationBudgetLoose(lines, budget.lines) || complexity + 10 < budget.complexity) return 'loose';
  return null;
}
