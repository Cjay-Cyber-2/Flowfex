/**
 * Visitor anchor — anonymous quota must survive clear-and-reconnect flows.
 */

import { AnonymousSessionService } from '../session/AnonymousSessionService.js';
import { UsageService } from '../session/UsageService.js';
import { isSessionDataConfigured, createSessionDataClient } from '../session/sessionDataAccess.js';

let db;
let anonymousSessionService;
let usageService;

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, label) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    failures.push(label);
    console.log(`  ✗ ${label}`);
  }
}

function assertEq(actual, expected, label) {
  assert(actual === expected, `${label} (expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)})`);
}

async function testVisitorAnchorReusesSessionAndQuota() {
  console.log('\n── Visitor anchor reuses session and preserves quota ──');

  const anchor = `test-visitor-${Date.now()}`;
  const first = await anonymousSessionService.createAnonymousSession(anchor);
  const second = await anonymousSessionService.createAnonymousSession(anchor);

  assertEq(second.sessionId, first.sessionId, 'Second create with same anchor returns same session');
  assertEq(second.anonymousToken, first.anonymousToken, 'Anonymous token is preserved on resume');
  assert(second.resumed === true, 'Resume flag is set when reusing visitor anchor');

  await usageService.recordExecution({
    sessionId: first.sessionId,
    nodesProcessed: 1,
  });

  const usageAfter = await usageService.getUsageStatus({ sessionId: first.sessionId });
  assertEq(usageAfter.usage.executionsCount, 1, 'Execution recorded on shared session');

  const third = await anonymousSessionService.createAnonymousSession(anchor);
  assertEq(third.sessionId, first.sessionId, 'Third create still reuses same session');

  const usageAgain = await usageService.getUsageStatus({ sessionId: third.sessionId });
  assertEq(usageAgain.usage.executionsCount, 1, 'Quota not reset after another create with same anchor');
}

async function testClearAgentsPreservesSessionRow() {
  console.log('\n── Clear connected agents preserves session identity ──');

  const anchor = `test-clear-${Date.now()}`;
  const created = await anonymousSessionService.createAnonymousSession(anchor);
  await anonymousSessionService.markConnectedAgent(created.sessionId, {
    id: 'agent-a',
    name: 'Agent A',
    type: 'cursor',
    lastSeen: new Date().toISOString(),
  });

  const cleared = await anonymousSessionService.clearConnectedAgents(created.sessionId);
  assertEq(cleared.id, created.sessionId, 'Session id unchanged after clear');
  assert(Array.isArray(cleared.connectedAgents) && cleared.connectedAgents.length === 0, 'Connected agents cleared');
  assertEq(cleared.graphState?.status, 'waiting', 'Graph status set to waiting');
}

async function main() {
  if (!isSessionDataConfigured()) {
    console.log('Skipping visitor-anchor tests — database not configured.');
    process.exit(0);
  }

  db = createSessionDataClient();
  anonymousSessionService = new AnonymousSessionService({ client: db });
  usageService = new UsageService({ client: db });

  await testVisitorAnchorReusesSessionAndQuota();
  await testClearAgentsPreservesSessionRow();

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failures.length > 0) {
    console.log('Failures:', failures.join(', '));
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
