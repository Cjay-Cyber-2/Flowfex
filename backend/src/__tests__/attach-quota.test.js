import test from 'node:test';
import assert from 'node:assert/strict';
import { isSyniqAttachOnlyTask } from '../../../shared/syniqIngestTasks.js';

test('isSyniqAttachOnlyTask recognizes bare attach', () => {
  assert.equal(isSyniqAttachOnlyTask('syniq.attach'), true);
  assert.equal(isSyniqAttachOnlyTask('SYNIQ.attach'), true);
});

test('isSyniqAttachOnlyTask recognizes token-prefixed attach', () => {
  const task = 'SYNIQ_SESSION_TOKEN: ffx_abc123\nsyniq.attach';
  assert.equal(isSyniqAttachOnlyTask(task), true);
});

test('isSyniqAttachOnlyTask rejects real work', () => {
  assert.equal(isSyniqAttachOnlyTask('summarize my logs'), false);
  assert.equal(isSyniqAttachOnlyTask('SYNIQ_SESSION_TOKEN: ffx_abc\nfix the bug'), false);
});
