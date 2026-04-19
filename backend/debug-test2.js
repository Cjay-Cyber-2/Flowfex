import fs from 'fs';

const testPath = 'c:/Users/chiji/Documents/Flowfex/backend/src/__tests__/orchestration-engine.test.js';
let content = fs.readFileSync(testPath, 'utf8');

content = content.replace(
  "  console.log('--- ACTUAL TRACE:', result.trace.map(t => t.nodeType));",
  "  console.log('--- ACTUAL TRACE:', result.trace.map(t => t.nodeType));\n  console.log('--- SELECTION DECISION NODES:', require('util').inspect(orchestrator.getSessionState(result.sessionId).selection.decisionNodes, { depth: null }));"
);

fs.writeFileSync(testPath, content, 'utf8');
console.log('Patched test.');
