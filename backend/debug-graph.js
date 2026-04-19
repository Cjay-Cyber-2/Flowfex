import fs from 'fs';

const testPath = 'c:/Users/chiji/Documents/Flowfex/backend/src/__tests__/orchestration-engine.test.js';
let content = fs.readFileSync(testPath, 'utf8');

// I will insert a console log to dump result.graph right before the assert
content = content.replace(
  "  assert.ok(result.trace.some(entry => entry.nodeType === 'decision'));",
  "  console.log('--- ACTUAL TRACE:', result.trace.map(t => t.nodeType));\n  console.log('--- GRAPH NODES:', result.graph.nodes.map(n => n.type));\n  assert.ok(result.trace.some(entry => entry.nodeType === 'decision'));"
);

fs.writeFileSync(testPath, content, 'utf8');
console.log('Patched test.');
