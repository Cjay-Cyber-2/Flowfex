import fs from 'fs';

const tsPath = 'c:/Users/chiji/Documents/Flowfex/backend/src/orchestration-engine-src/ExecutionPlanSelector.ts';
let content = fs.readFileSync(tsPath, 'utf8');

content = content.replace(
  "id: stableId('decision', branch.id, selectedSteps[sourceIndex]?.id || '', alternateTarget.id),",
  "id: stableId('decision', branch.id, selectedSteps[sourceIndex]?.stepId || '', alternateTarget.stepId),"
);
content = content.replace(
  "sourceStepId: selectedSteps[sourceIndex]?.id || '',",
  "sourceStepId: selectedSteps[sourceIndex]?.stepId || '',"
);
content = content.replace(
  "alternateTargetStepId: alternateTarget.id,",
  "alternateTargetStepId: alternateTarget.stepId,"
);

fs.writeFileSync(tsPath, content, 'utf8');
console.log('Fixed TS file.');
