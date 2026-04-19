import fs from 'fs';

const selectorPath = 'c:/Users/chiji/Documents/Flowfex/backend/src/orchestration-engine/ExecutionPlanSelector.js';
let content = fs.readFileSync(selectorPath, 'utf8');

content = content.replace(
  'function resolveDecisionNodes(intent, selectedSteps) {\n    if (selectedSteps.length < 2) {',
  "function resolveDecisionNodes(intent, selectedSteps) {\n    console.error('--- resolveDecisionNodes intent:', JSON.stringify(intent.branchPoints));\n    console.error('--- resolveDecisionNodes selectedSteps:', JSON.stringify(selectedSteps.map(s => s.stepId)));\n    if (selectedSteps.length < 2) {"
);
fs.writeFileSync(selectorPath, content, 'utf8');

const testPath = 'c:/Users/chiji/Documents/Flowfex/backend/src/__tests__/orchestration-engine.test.js';
fs.writeFileSync(testPath, fs.readFileSync(testPath, 'utf8').replace('require is not defined', ''), 'utf8');

console.log('Patched selector to dump.');
