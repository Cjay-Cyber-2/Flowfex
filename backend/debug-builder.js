import fs from 'fs';

const builderPath = 'c:/Users/chiji/Documents/Flowfex/backend/src/orchestration-engine/ExecutionGraphBuilder.js';
let content = fs.readFileSync(builderPath, 'utf8');

content = content.replace(
  '        const decisionsBySourceStepId = new Map();',
  "        const decisionsBySourceStepId = new Map();\n        console.log('--- DECISION NODES:', selection.decisionNodes.map(d => ({ source: d.sourceStepId, alt: d.alternateTargetStepId })));"
);

fs.writeFileSync(builderPath, content, 'utf8');
console.log('Patched builder.');
