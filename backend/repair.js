import fs from 'fs';

const tsPath = 'c:/Users/chiji/Documents/Flowfex/backend/src/orchestration-engine-src/ExecutionPlanSelector.ts';
let content = fs.readFileSync(tsPath, 'utf8');

const targetFunction = `function findSourceStepIndex(`;
content = content.substring(0, content.indexOf(targetFunction));

content += `function findSourceStepIndex(
  branch: TaskIntent['branchPoints'][number],
  steps: SelectedExecutionStep[]
): number {
  if (typeof branch.sourceStepIndex === 'number') {
    return Math.max(0, branch.sourceStepIndex - 1);
  }

  if (branch.sourceStepId) {
    return steps.findIndex(step => step.stepId === branch.sourceStepId || step.id === branch.sourceStepId);
  }

  if (branch.sourceStepTitle) {
    return steps.findIndex(step => includesLoosePhrase(step.title, branch.sourceStepTitle || ''));
  }

  return -1;
}

function findAlternateTarget(
  branch: TaskIntent['branchPoints'][number],
  steps: SelectedExecutionStep[],
  sourceIndex: number
): SelectedExecutionStep | null {
  const futureSteps = steps.slice(sourceIndex + 1);

  if (branch.onTrue) {
    const trueTarget = futureSteps.find(step =>
      includesLoosePhrase(\`\${step.title} \${step.objective}\`, branch.onTrue || '')
    );
    if (trueTarget) {
      return trueTarget;
    }
  }

  if (branch.onFalse) {
    const falseTarget = futureSteps.find(step =>
      includesLoosePhrase(\`\${step.title} \${step.objective}\`, branch.onFalse || '')
    );
    if (falseTarget) {
      return falseTarget;
    }
  }

  const fallbackStep = steps[sourceIndex + 2];
  return fallbackStep || null;
}

function inferAlternateTiming(
  branch: TaskIntent['branchPoints'][number],
  alternateTitle: string
): 'if_true' | 'if_false' {
  if (branch.onTrue && includesLoosePhrase(alternateTitle, branch.onTrue)) {
    return 'if_true';
  }

  if (branch.onFalse && includesLoosePhrase(alternateTitle, branch.onFalse)) {
    return 'if_false';
  }

  return 'if_true';
}
`;

fs.writeFileSync(tsPath, content, 'utf8');
