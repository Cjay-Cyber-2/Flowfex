import fs from 'fs';
import { execSync } from 'child_process';

const testPath = 'c:/Users/chiji/Documents/Flowfex/backend/src/__tests__/orchestration-engine.test.js';

console.log('Restoring test file...');
execSync(`git checkout -- "${testPath}"`);
console.log('Running tests...');
try {
  const result = execSync('npm run build:orchestration && node src/__tests__/orchestration-engine.test.js', { encoding: 'utf8' });
  console.log(result);
} catch (e) {
  console.log(e.stdout);
  console.log(e.stderr);
}
