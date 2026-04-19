import fs from 'fs';
import { execSync } from 'child_process';

const tsPath = 'c:/Users/chiji/Documents/Flowfex/backend/src/orchestration-engine-src/ExecutionPlanSelector.ts';

// Revert the file first
console.log('Reverting checkout...');
try {
  execSync('git checkout -- ' + tsPath);
} catch (e) {
  console.log('Git checkout failed', e.message);
}

let content = fs.readFileSync(tsPath, 'utf8');

// The exact string to replace
const targetStr = `decisionNodes.push({
      id: stableId('decision', branch.id, selectedSteps[sourceIndex]?.id || '', alternateTarget.id),
      sourceStepId: selectedSteps[sourceIndex]?.id || '',
      title: branch.sourceStepTitle || 'Branch decision',
      condition: branch.condition,
      alternateTargetStepId: alternateTarget.id,`;

const replacementStr = `decisionNodes.push({
      id: stableId('decision', branch.id, selectedSteps[sourceIndex]?.stepId || '', alternateTarget.stepId),
      sourceStepId: selectedSteps[sourceIndex]?.stepId || '',
      title: branch.sourceStepTitle || 'Branch decision',
      condition: branch.condition,
      alternateTargetStepId: alternateTarget.stepId,`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, replacementStr);
  fs.writeFileSync(tsPath, content, 'utf8');
  console.log('Fixed correctly!');
} else {
  console.log('Target string NOT FOUND in TS file!');
}
