import { spawnSync } from 'child_process';
import fs from 'fs';

const runnerPath = 'c:/Users/chiji/Documents/Flowfex/backend/src/orchestration-engine/ExecutionRunner.js';
let content = fs.readFileSync(runnerPath, 'utf8');

// Insert a log before breaking the loop
content = content.replace(
  '            const runtimeNode = buildResult.runtimeNodes[currentNodeId];\n            if (!runtimeNode) {\n                break;\n            }',
  `            const runtimeNode = buildResult.runtimeNodes[currentNodeId];\n            if (!runtimeNode) {\n                console.log('!!! BROKE LOOP BECAUSE NO RUNTIME NODE FOR: ' + currentNodeId, Object.keys(buildResult.runtimeNodes));\n                break;\n            }`
);

fs.writeFileSync(runnerPath, content, 'utf8');
console.log('Patched runner.');
