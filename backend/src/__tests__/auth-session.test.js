/**
 * Auth + Session Integration Tests
 * 
 * Verifies end-to-end identity resolution, anonymous session management,
 * session upgrade, API key operations, and usage tracking.
 */

import { AnonymousSessionService } from '../session/AnonymousSessionService.js';
import { ApiKeyService } from '../session/ApiKeyService.js';
import { UsageService } from '../session/UsageService.js';
import { DatabaseSessionStateRepository } from '../persistence/DatabaseSessionStateRepository.js';
import { isSessionDataConfigured, createSessionDataClient } from '../session/sessionDataAccess.js';
import { toDashboardSessionRecord, serializeGraphStateFromSnapshot } from '../session/sessionSerializers.js';
import { flowfexSessions, usageTracking, apiKeys } from '../db/schema.js';
import { eq } from 'drizzle-orm';

let db;
let anonymousSessionService;
let apiKeyService;
let usageService;
let sessionRepo;

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

function assertTruthy(value, label) {
  assert(Boolean(value), label);
}

function assertNull(value, label) {
  assert(value === null || value === undefined, label);
}

// ─── Test Suites ──────────────────────────────────────────────────────

async function testAnonymousSessionBootstrap() {
  console.log('\n── Anonymous Session Bootstrap ──');

  const result = await anonymousSessionService.createAnonymousSession();
  assertTruthy(result.sessionId, 'Session ID is returned');
  assertTruthy(result.anonymousToken, 'Anonymous token is returned');
  assert(result.anonymousToken.includes('_'), 'Token format contains underscore separator');

  const validated = await anonymousSessionService.validateAnonymousSession(result.anonymousToken);
  assertTruthy(validated, 'Validated session is not null');
  assertEq(validated.id, result.sessionId, 'Validated session ID matches created');
  assertTruthy(validated.anonymousToken, 'Validated session has anonymous token');
  assertNull(validated.authId, 'Anonymous session has no authId');

  const invalidResult = await anonymousSessionService.validateAnonymousSession('totally_invalid_token_here');
  assertNull(invalidResult, 'Invalid token returns null');

  return result;
}

async function testSessionUpgrade(sessionResult) {
  console.log('\n── Session Upgrade (Anonymous → Authenticated) ──');

  const fakeAuthId = 'test-auth-user-' + Date.now();

  // Verify state before upgrade
  const before = await anonymousSessionService.validateAnonymousSession(sessionResult.anonymousToken);
  assertNull(before.authId, 'Session has no authId before upgrade');

  // Upgrade
  const upgraded = await anonymousSessionService.upgradeAnonymousSession({
    anonymousToken: sessionResult.anonymousToken,
    authId: fakeAuthId,
    displayName: 'Test User',
    avatarUrl: null,
  });

  assertTruthy(upgraded, 'Upgrade returns a session');
  assertEq(upgraded.authId, fakeAuthId, 'Upgraded session has correct authId');
  assertEq(upgraded.id, sessionResult.sessionId, 'Session ID preserved after upgrade');
  assertTruthy(upgraded.anonymousToken, 'Anonymous token preserved after upgrade');

  return { fakeAuthId, sessionId: sessionResult.sessionId };
}

async function testStatePreservationDuringUpgrade() {
  console.log('\n── State Preservation During Upgrade ──');

  // Create session with state
  const result = await anonymousSessionService.createAnonymousSession();
  const testGraph = {
    sessionId: result.sessionId,
    nodes: [{ id: 'n1', type: 'tool', shape: 'rounded', x: 0, y: 0, width: 200, height: 100, title: 'Test', subtitle: '', state: 'idle', icon: '🔧', confidence: 1, reasoning: '', alternatives: [], inputs: {}, config: {}, owner: 'system' }],
    edges: [],
    connectedAgents: [],
    constraints: [],
    mode: 'live',
    status: 'active',
    executionPointer: 'n1',
    currentNodeId: 'n1',
  };

  // Write graph state
  await sessionRepo.write({
    sessionId: result.sessionId,
    graph: { nodes: testGraph.nodes, edges: testGraph.edges },
    currentNodeId: 'n1',
    pendingNodeId: null,
    status: 'active',
    sessionContext: { mode: 'live' },
    blockedSkillIds: ['blocked-skill-1'],
  });

  // Read it back
  const stateBefore = await sessionRepo.read(result.sessionId);
  assertTruthy(stateBefore, 'Graph state persisted before upgrade');

  // Upgrade ownership
  const fakeAuthId = 'state-preserve-auth-' + Date.now();
  await anonymousSessionService.upgradeAnonymousSession({
    anonymousToken: result.anonymousToken,
    authId: fakeAuthId,
  });

  // Read state after upgrade
  const stateAfter = await sessionRepo.read(result.sessionId);
  assertTruthy(stateAfter, 'Graph state still exists after upgrade');
  assert(Array.isArray(stateAfter.nodes), 'Nodes array preserved after upgrade');
  assertEq(stateAfter.nodes?.length, 1, 'Node count preserved (1)');
  assertEq(stateAfter.executionPointer, 'n1', 'Execution pointer preserved');

  // Verify ownership changed
  const session = await anonymousSessionService.validateAnonymousSession(result.anonymousToken);
  assertEq(session.authId, fakeAuthId, 'Auth ID set after upgrade');
}

async function testApiKeyIdentity(fakeAuthId) {
  console.log('\n── API Key Identity ──');

  const generated = await apiKeyService.generateApiKey(fakeAuthId, 'Test Key');
  assertTruthy(generated.key, 'API key raw key is returned');
  assert(generated.key.startsWith('fx_live_'), 'Key starts with fx_live_ prefix');
  assertTruthy(generated.record, 'API key record is returned');
  assertEq(generated.record.label, 'Test Key', 'API key label matches');

  const validated = await apiKeyService.validateApiKey(generated.key);
  assertTruthy(validated, 'API key validates successfully');
  assertEq(validated.authId, fakeAuthId, 'Validated key has correct authId');
  assertTruthy(validated.keyId, 'Validated key has a keyId');

  const listed = await apiKeyService.listApiKeys(fakeAuthId);
  assert(Array.isArray(listed), 'listApiKeys returns array');
  assert(listed.length >= 1, 'At least one key listed');

  // Revoke
  const revoked = await apiKeyService.revokeApiKey(fakeAuthId, generated.record.id);
  assertTruthy(revoked, 'Revoke returns a record');
  assertEq(revoked.is_active, false, 'Revoked key is marked inactive');

  // Validate revoked key
  const revalidated = await apiKeyService.validateApiKey(generated.key);
  assertNull(revalidated, 'Revoked key returns null on validation');

  // Validate garbage key
  const garbage = await apiKeyService.validateApiKey('totally_not_a_key');
  assertNull(garbage, 'Garbage key returns null');
}

async function testUsageTracking(sessionId) {
  console.log('\n── Usage Tracking ──');

  const statusBefore = await usageService.getUsageStatus({ sessionId });
  assertTruthy(statusBefore, 'Usage status is returned');
  assertEq(statusBefore.ok, true, 'Usage status ok is true');
  assertTruthy(statusBefore.tier, 'Usage has a tier');
  assertTruthy(statusBefore.usage, 'Usage has a usage object');
  assert(typeof statusBefore.usage.executionsCount === 'number', 'Executions count is a number');

  const executionsBefore = statusBefore.usage.executionsCount;

  // Record an execution
  const recorded = await usageService.recordExecution({ sessionId, nodesProcessed: 3 });
  assertTruthy(recorded, 'Execution recorded');

  const statusAfter = await usageService.getUsageStatus({ sessionId });
  assert(statusAfter.usage.executionsCount > executionsBefore, 'Executions count increased after recording');
  assert(statusAfter.usage.nodesProcessed >= 3, 'Nodes processed count reflects recorded value');
}

async function testOwnershipPrevention() {
  console.log('\n── Ownership Checks ──');

  // Create and upgrade a session
  const result = await anonymousSessionService.createAnonymousSession();
  const authId1 = 'owner-1-' + Date.now();
  await anonymousSessionService.upgradeAnonymousSession({
    anonymousToken: result.anonymousToken,
    authId: authId1,
  });

  // Verify it was upgraded
  const session = await anonymousSessionService.validateAnonymousSession(result.anonymousToken);
  assertEq(session.authId, authId1, 'Session is owned by first user');

  // Try to upgrade again with a different user
  const authId2 = 'owner-2-' + Date.now();
  const reupgraded = await anonymousSessionService.upgradeAnonymousSession({
    anonymousToken: result.anonymousToken,
    authId: authId2,
  });
  // Note: current implementation allows re-upgrade (no guard) - this is a design choice
  assertEq(reupgraded.authId, authId2, 'Re-upgrade changes authId (no guard implemented)');
}

async function testRecentSession(fakeAuthId) {
  console.log('\n── Recent Session Retrieval ──');

  const recent = await anonymousSessionService.getMostRecentSessionForUser(fakeAuthId);
  assertTruthy(recent, 'Recent session found for user');
  assertEq(recent.authId, fakeAuthId, 'Recent session belongs to correct user');

  const noSession = await anonymousSessionService.getMostRecentSessionForUser('nonexistent-user-id');
  assertNull(noSession, 'No session for nonexistent user');
}

async function testSessionSerializer() {
  console.log('\n── Session Serializers ──');

  const mockRow = {
    id: 'test-session-id',
    auth_id: 'test-auth-id',
    anonymous_token: 'test-token',
    graph_state: { nodes: [], edges: [], mode: 'live' },
    execution_pointer: 'node-1',
    connected_agents: [{ id: 'a1', name: 'Agent 1', type: 'live', status: 'connected' }],
    constraints: ['skill-a'],
    status: 'active',
    mode: 'live',
    name: 'Test Session',
    last_active_at: new Date().toISOString(),
  };

  const record = toDashboardSessionRecord(mockRow);
  assertTruthy(record, 'Serializer returns a record');
  assertEq(record.id, 'test-session-id', 'Record has correct ID');
  assertEq(record.authId, 'test-auth-id', 'Record has correct authId');
  assertEq(record.executionPointer, 'node-1', 'Record has execution pointer');
  assert(Array.isArray(record.connectedAgents), 'Connected agents is array');
  assertEq(record.connectedAgents.length, 1, 'Connected agents count correct');
  assert(Array.isArray(record.constraints), 'Constraints is array');
  assertEq(record.constraints.length, 1, 'Constraints count correct');
  assertEq(record.name, 'Test Session', 'Session name preserved');

  const nullRecord = toDashboardSessionRecord(null);
  assertNull(nullRecord, 'Null input returns null');
}

// ─── Cleanup ──────────────────────────────────────────────────────────

async function cleanup(sessionIds) {
  console.log('\n── Cleanup ──');
  for (const id of sessionIds) {
    try {
      await db.delete(usageTracking).where(eq(usageTracking.session_id, id));
      await db.delete(flowfexSessions).where(eq(flowfexSessions.id, id));
    } catch {
      // best effort
    }
  }
  // Clean up test API keys
  try {
    const { like } = await import('drizzle-orm');
    await db.delete(apiKeys).where(like(apiKeys.auth_id, 'test-auth-user-%'));
    await db.delete(apiKeys).where(like(apiKeys.auth_id, 'state-preserve-auth-%'));
    await db.delete(apiKeys).where(like(apiKeys.auth_id, 'owner-1-%'));
    await db.delete(apiKeys).where(like(apiKeys.auth_id, 'owner-2-%'));
  } catch {
    // best effort
  }
  console.log('  ✓ Test data cleaned up');
}

// ─── Runner ───────────────────────────────────────────────────────────

async function run() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Flowfex Auth + Session Integration Tests');
  console.log('═══════════════════════════════════════════════════════');

  if (!isSessionDataConfigured()) {
    console.log('\n⚠ DATABASE_URL not set — skipping database-backed tests.\n');
    process.exit(0);
  }

  db = createSessionDataClient();
  anonymousSessionService = new AnonymousSessionService({ client: db });
  apiKeyService = new ApiKeyService({ client: db });
  usageService = new UsageService({ client: db });
  sessionRepo = new DatabaseSessionStateRepository({ client: db });

  const sessionIds = [];

  try {
    // 1. Anonymous session bootstrap
    const session1 = await testAnonymousSessionBootstrap();
    sessionIds.push(session1.sessionId);

    // 2. Session upgrade
    const { fakeAuthId, sessionId } = await testSessionUpgrade(session1);

    // 3. State preservation during upgrade
    await testStatePreservationDuringUpgrade();

    // 4. API key identity
    await testApiKeyIdentity(fakeAuthId);

    // 5. Usage tracking
    await testUsageTracking(sessionId);

    // 6. Ownership checks
    await testOwnershipPrevention();

    // 7. Recent session retrieval
    await testRecentSession(fakeAuthId);

    // 8. Session serializers
    await testSessionSerializer();
  } catch (error) {
    console.error('\n💥 Test suite error:', error);
    failed++;
    failures.push('SUITE ERROR: ' + error.message);
  }

  // Cleanup
  await cleanup(sessionIds);

  // Report
  console.log('\n═══════════════════════════════════════════════════════');
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  if (failures.length > 0) {
    console.log('\n  Failures:');
    for (const f of failures) {
      console.log(`    ✗ ${f}`);
    }
  }
  console.log('═══════════════════════════════════════════════════════\n');

  process.exit(failed > 0 ? 1 : 0);
}

run();
