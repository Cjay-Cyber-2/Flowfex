import fs from 'fs';

const testPath = 'c:/Users/chiji/Documents/Flowfex/backend/src/__tests__/orchestration-engine.test.js';
let content = fs.readFileSync(testPath, 'utf8');

content = content.replace(
  "assert.ok(result.trace.some(entry => entry.nodeType === 'decision'));",
  "if (!result.trace.some(entry => entry.nodeType === 'decision')) console.log('!!! MISSING DECISION IN TRACE:', result.trace);\n  assert.ok(result.trace.some(entry => entry.nodeType === 'decision'));"
);

fs.writeFileSync(testPath, content, 'utf8');
console.log('Patched test.');
