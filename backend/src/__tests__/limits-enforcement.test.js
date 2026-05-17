/**
 * Limits + Control + Product Hardening — Integration Tests
 *
 * Tests all 10 required scenarios:
 * 1. Anonymous usage limits
 * 2. Authenticated usage limits
 * 3. API-key limits
 * 4. Execution blocked safely when limits exceeded
 * 5. Usage counters persist correctly
 * 6. Rate limiting behaviour
 * 7. State preserved when execution blocked
 * 8. Revoked API keys cannot continue
 * 9. Concurrent execution protection
 * 10. Warning / approaching-limit detection
 */

import { UsageService, SYNIQ_LIMITS } from '../session/UsageService.js';
import { ApiKeyService } from '../session/ApiKeyService.js';
import { AnonymousSessionService } from '../session/AnonymousSessionService.js';
import { DatabaseSessionStateRepository } from '../persistence/DatabaseSessionStateRepository.js';
import { RateLimiter } from '../server/RateLimiter.js';
import { SessionLockManager } from '../session/SessionLockManager.js';
import { isSessionDataConfigured, createSessionDataClient } from '../session/sessionDataAccess.js';
import { syniqSessions, usageTracking, apiKeys } from '../db/schema.js';
import { eq, like } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

let db;
let usageService;
let anonymousSessionService;
let apiKeyService;
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
function assertEq(a, b, label) { assert(a === b, `${label} (expected ${JSON.stringify(b)}, got ${JSON.stringify(a)})`); }
function assertTruthy(v, label) { assert(Boolean(v), label); }
function assertNull(v, label) { assert(v === null || v === undefined, label); }

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function createTestSession(authId = null) {
  const result = await anonymousSessionService.createAnonymousSession();
  if (authId) {
    await anonymousSessionService.upgradeAnonymousSession({
      anonymousToken: result.anonymousToken,
      authId,
    });
  }
  return result;
}

// ─── 1. Anonymous Usage Limits ────────────────────────────────────────────────

async function testAnonymousLimits() {
  console.log('\n── 1. Anonymous Usage Limits ──');

  const session = await createTestSession();
  const limits = SYNIQ_LIMITS.anonymous;

  // Record up to the limit
  for (let i = 0; i < limits.maxExecutionsPerSession; i++) {
    await usageService.recordExecution({ sessionId: session.sessionId, nodesProcessed: 2 });
  }

  const status = await usageService.getUsageStatus({ sessionId: session.sessionId });
  assertEq(status.tier, 'anonymous', 'Tier is anonymous');
  assertEq(status.usage.executionsCount, limits.maxExecutionsPerSession, 'Execution count at limit');
  assertTruthy(status.blockedLimit, 'Blocked limit is present');
  assertEq(status.blockedLimit.limit, 'maxExecutionsPerSession', 'Blocked on correct limit');

  // Should throw on assertExecutionAllowed
  let threw = false;
  try {
    await usageService.assertExecutionAllowed({ sessionId: session.sessionId });
  } catch (error) {
    threw = true;
    assertEq(error.code, 'limit_reached', 'Error code is limit_reached');
    assertEq(error.statusCode, 403, 'HTTP status is 403');
    assertTruthy(error.details.blockedLimit, 'Error contains blockedLimit details');
  }
  assert(threw, 'assertExecutionAllowed throws for anonymous at limit');

  return session.sessionId;
}

// ─── 2. Authenticated Usage Limits ────────────────────────────────────────────

async function testAuthenticatedLimits() {
  console.log('\n── 2. Authenticated Usage Limits ──');

  const authId = 'test-auth-limit-' + Date.now();
  const session = await createTestSession(authId);
  const limits = SYNIQ_LIMITS.authenticated;

  // Record many executions
  for (let i = 0; i < limits.maxExecutionsPerDay; i++) {
    await usageService.recordExecution({ sessionId: session.sessionId, nodesProcessed: 1 });
  }

  const status = await usageService.getUsageStatus({ sessionId: session.sessionId });
  assertEq(status.tier, 'authenticated', 'Tier is authenticated');
  assertEq(status.usage.executionsCount, limits.maxExecutionsPerDay, 'Execution count at limit');
  assertTruthy(status.blockedLimit, 'Blocked limit is present');
  assertEq(status.blockedLimit.limit, 'maxExecutionsPerDay', 'Blocked on correct daily limit');

  return session.sessionId;
}

async function testConnectionQuota() {
  console.log('\n── 2b. Connection Quota ──');

  const session = await createTestSession();
  for (let index = 0; index < SYNIQ_LIMITS.anonymous.maxConnectionsPerDay; index += 1) {
    await anonymousSessionService.markConnectedAgent(session.sessionId, {
      connectionId: `anon-connection-${index}`,
      agentId: `anon-agent-${index}`,
      agentName: `Anon Agent ${index + 1}`,
      connectionType: 'prompt',
      syncedAt: new Date(Date.now() + index * 1000).toISOString(),
    });
  }

  const anonymousStatus = await usageService.getUsageStatus({ sessionId: session.sessionId });
  assertEq(anonymousStatus.usage.connectionsCount, SYNIQ_LIMITS.anonymous.maxConnectionsPerDay, 'Anonymous connection count reaches the daily quota');
  assertTruthy(anonymousStatus.connectionBlockedLimit, 'Anonymous connection quota is blocked');
  assertEq(anonymousStatus.connectionBlockedLimit.limit, 'maxConnectionsPerDay', 'Anonymous quota blocks on connection count');

  let anonymousError = null;
  try {
    await usageService.assertAgentConnectionAllowed({ sessionId: session.sessionId });
  } catch (error) {
    anonymousError = error;
  }
  assertTruthy(anonymousError, 'Anonymous connection attempt is rejected at quota');
  assertTruthy(anonymousError?.details?.connectionBlockedLimit, 'Anonymous connection error includes connectionBlockedLimit');

  const authId = 'test-connection-quota-' + Date.now();
  const authenticatedSession = await createTestSession(authId);
  for (let index = 0; index < SYNIQ_LIMITS.authenticated.maxConnectionsPerDay; index += 1) {
    await anonymousSessionService.markConnectedAgent(authenticatedSession.sessionId, {
      connectionId: `auth-connection-${index}`,
      agentId: `auth-agent-${index}`,
      agentName: `Auth Agent ${index + 1}`,
      connectionType: 'sdk',
      syncedAt: new Date(Date.now() + index * 1000).toISOString(),
    });
  }

  const authenticatedStatus = await usageService.getUsageStatus({ sessionId: authenticatedSession.sessionId });
  assertEq(authenticatedStatus.usage.connectionsCount, SYNIQ_LIMITS.authenticated.maxConnectionsPerDay, 'Authenticated connection count reaches the daily quota');
  assertTruthy(authenticatedStatus.connectionBlockedLimit, 'Authenticated connection quota is blocked');
  assertEq(authenticatedStatus.connectionBlockedLimit.limit, 'maxConnectionsPerDay', 'Authenticated quota blocks on connection count');

  return [session.sessionId, authenticatedSession.sessionId];
}

async function testAnonymousQuotaResetsOnUpgrade() {
  console.log('\n── 2c. Anonymous Quota Resets On Upgrade ──');

  const authId = 'test-upgrade-quota-' + Date.now();
  const session = await createTestSession();

  for (let index = 0; index < SYNIQ_LIMITS.anonymous.maxConnectionsPerDay; index += 1) {
    await anonymousSessionService.markConnectedAgent(session.sessionId, {
      connectionId: `upgrade-connection-${index}`,
      agentId: `upgrade-agent-${index}`,
      agentName: `Upgrade Agent ${index + 1}`,
      connectionType: 'link',
      syncedAt: new Date(Date.now() + index * 1000).toISOString(),
    });
  }

  const anonymousStatus = await usageService.getUsageStatus({ sessionId: session.sessionId });
  assertTruthy(anonymousStatus.connectionBlockedLimit, 'Anonymous quota is exhausted before upgrade');

  await anonymousSessionService.upgradeAnonymousSession({
    anonymousToken: session.anonymousToken,
    authId,
  });

  const authenticatedStatus = await usageService.getUsageStatus({ sessionId: session.sessionId });
  assertEq(authenticatedStatus.tier, 'authenticated', 'Session becomes authenticated after upgrade');
  assertEq(authenticatedStatus.usage.connectionsCount, 0, 'Authenticated connection quota starts fresh after anonymous upgrade');
  assertNull(authenticatedStatus.connectionBlockedLimit, 'Authenticated session is no longer blocked by the anonymous connection quota');

  await usageService.assertAgentConnectionAllowed({ sessionId: session.sessionId });
  assert(true, 'Authenticated session can connect again immediately after sign-up upgrade');

  return session.sessionId;
}

// ─── 3. API-Key Limits ────────────────────────────────────────────────────────

async function testApiKeyLimits() {
  console.log('\n── 3. API-Key Limits ──');

  const authId = 'test-apikey-limit-' + Date.now();
  const session = await createTestSession(authId);
  const generated = await apiKeyService.generateApiKey(authId, 'Limit Test Key');

  // API key tier should be resolved
  const tier = usageService.resolveTier({ authId, apiKeyId: generated.record.id });
  assertEq(tier, 'api_key', 'Tier resolves to api_key when apiKeyId present');

  const limits = SYNIQ_LIMITS.api_key;
  assertEq(limits.maxExecutionsPerDay, 100, 'API key tier has 100 executions/day');
  assertEq(limits.maxConcurrentAgents, 10, 'API key tier has 10 concurrent agents');
  assertEq(limits.maxConcurrentSessions, 5, 'API key tier has 5 concurrent sessions');

  // Check the status includes api_key tier
  const status = await usageService.getUsageStatus({
    sessionId: session.sessionId,
    apiKeyId: generated.record.id,
  });
  assertEq(status.tier, 'api_key', 'Usage status reflects api_key tier');
  assertNull(status.blockedLimit, 'Not blocked yet');

  return session.sessionId;
}

// ─── 4. Execution Blocked Safely ──────────────────────────────────────────────

async function testBlockedExecution() {
  console.log('\n── 4. Execution Blocked Safely ──');

  const session = await createTestSession();

  // Max out executions
  for (let i = 0; i < SYNIQ_LIMITS.anonymous.maxExecutionsPerSession; i++) {
    await usageService.recordExecution({ sessionId: session.sessionId, nodesProcessed: 1 });
  }

  let error = null;
  try {
    await usageService.assertExecutionAllowed({ sessionId: session.sessionId });
  } catch (e) {
    error = e;
  }

  assertTruthy(error, 'Throws when blocked');
  assertEq(error.code, 'limit_reached', 'Error code is limit_reached');
  assertEq(error.statusCode, 403, 'Returns 403');
  assertTruthy(error.details.sessionId, 'Error has sessionId');
  assertEq(error.details.tier, 'anonymous', 'Error identifies tier');
  assertTruthy(error.details.blockedLimit.reason, 'Error has human-readable reason');

  return session.sessionId;
}

// ─── 5. Usage Counters Persist Correctly ──────────────────────────────────────

async function testUsagePersistence() {
  console.log('\n── 5. Usage Counters Persist ──');

  const session = await createTestSession();

  await usageService.recordExecution({ sessionId: session.sessionId, nodesProcessed: 7 });
  await usageService.recordExecution({ sessionId: session.sessionId, nodesProcessed: 3 });

  const status = await usageService.getUsageStatus({ sessionId: session.sessionId });
  assertEq(status.usage.executionsCount, 2, 'Execution count is 2');
  assertEq(status.usage.nodesProcessed, 10, 'Nodes processed is 10');
  assertEq(status.ok, true, 'Status ok is true');

  return session.sessionId;
}

// ─── 6. Rate Limiting ─────────────────────────────────────────────────────────

function testRateLimiting() {
  console.log('\n── 6. Rate Limiting ──');

  const limiter = new RateLimiter({
    windowMs: 60_000,
    defaultMax: 3,
    tiers: { anonymous: 3, authenticated: 5, api_key: 8 },
  });

  // Anonymous tier: 3 requests
  assert(limiter.check('1.1.1.1', 'anonymous'), 'Anonymous req 1 allowed');
  assert(limiter.check('1.1.1.1', 'anonymous'), 'Anonymous req 2 allowed');
  assert(limiter.check('1.1.1.1', 'anonymous'), 'Anonymous req 3 allowed');
  assert(!limiter.check('1.1.1.1', 'anonymous'), 'Anonymous req 4 blocked');

  // Authenticated tier: 5 requests from a different IP
  assert(limiter.check('2.2.2.2', 'authenticated'), 'Auth req 1 allowed');
  assert(limiter.check('2.2.2.2', 'authenticated'), 'Auth req 2 allowed');
  assert(limiter.check('2.2.2.2', 'authenticated'), 'Auth req 3 allowed');
  assert(limiter.check('2.2.2.2', 'authenticated'), 'Auth req 4 allowed');
  assert(limiter.check('2.2.2.2', 'authenticated'), 'Auth req 5 allowed');
  assert(!limiter.check('2.2.2.2', 'authenticated'), 'Auth req 6 blocked');

  // remaining() method
  const remaining = limiter.remaining('1.1.1.1', 'anonymous');
  assertEq(remaining, 0, 'Remaining is 0 after exhaustion');

  const freshRemaining = limiter.remaining('9.9.9.9', 'anonymous');
  assertEq(freshRemaining, 3, 'Fresh IP has full remaining');

  // Different IPs don't interfere
  assert(limiter.check('3.3.3.3', 'anonymous'), 'Different IP is not blocked');
}

// ─── 7. State Preserved When Blocked ──────────────────────────────────────────

async function testStatePreservedOnBlock() {
  console.log('\n── 7. State Preserved When Blocked ──');

  const session = await createTestSession();

  // Write graph state
  await sessionRepo.write({
    sessionId: session.sessionId,
    graph: { nodes: [{ id: 'n1' }], edges: [] },
    currentNodeId: 'n1',
    pendingNodeId: null,
    status: 'active',
    sessionContext: { mode: 'live' },
    blockedSkillIds: [],
  });

  // Max out executions to trigger block
  for (let i = 0; i < SYNIQ_LIMITS.anonymous.maxExecutionsPerSession; i++) {
    await usageService.recordExecution({ sessionId: session.sessionId, nodesProcessed: 1 });
  }

  // Attempt execution (should fail)
  try {
    await usageService.assertExecutionAllowed({ sessionId: session.sessionId });
  } catch {
    // Expected
  }

  // Verify graph state is untouched
  const state = await sessionRepo.read(session.sessionId);
  assertTruthy(state, 'Graph state still exists after block');
  assert(Array.isArray(state.nodes), 'Nodes array preserved');
  assertEq(state.nodes.length, 1, 'Node count preserved');

  return session.sessionId;
}

// ─── 8. Revoked API Keys ──────────────────────────────────────────────────────

async function testRevokedApiKeys() {
  console.log('\n── 8. Revoked API Keys ──');

  const authId = 'test-revoke-limit-' + Date.now();
  const session = await createTestSession(authId);
  const generated = await apiKeyService.generateApiKey(authId, 'Revoke Test Key');

  // Key should be valid
  const valid = await apiKeyService.validateApiKey(generated.key);
  assertTruthy(valid, 'Key is valid before revocation');

  // Revoke it
  await apiKeyService.revokeApiKey(authId, generated.record.id);

  // Key should no longer be valid
  const invalid = await apiKeyService.validateApiKey(generated.key);
  assertNull(invalid, 'Revoked key returns null');

  return session.sessionId;
}

// ─── 9. Concurrent Execution Protection ──────────────────────────────────────

function testConcurrentExecutionLock() {
  console.log('\n── 9. Concurrent Execution Protection ──');

  const lockManager = new SessionLockManager();
  const sessionId = 'test-lock-' + Date.now();

  // First acquire should succeed
  assert(lockManager.acquire(sessionId), 'First lock acquired');

  // Second acquire on same session should fail
  assert(!lockManager.acquire(sessionId), 'Second lock rejected');

  // isLocked check
  assert(lockManager.isLocked(sessionId), 'Session shows as locked');

  // Different session should not be affected
  assert(lockManager.acquire('other-session'), 'Different session can acquire');

  // Release and reacquire
  lockManager.release(sessionId);
  assert(!lockManager.isLocked(sessionId), 'Session is unlocked after release');
  assert(lockManager.acquire(sessionId), 'Session can be relocked after release');
  lockManager.release(sessionId);
  lockManager.release('other-session');

  // Null session should not lock
  assert(lockManager.acquire(null), 'Null session does not lock');
  assert(!lockManager.isLocked(null), 'Null session is not locked');
}

// ─── 10. Warning / Approaching Limit Detection ──────────────────────────────

async function testWarningDetection() {
  console.log('\n── 10. Warning / Approaching Limit ──');

  const session = await createTestSession();

  // For anonymous with maxExec=3: 2/3 = 66%, below 80% threshold
  await usageService.recordExecution({ sessionId: session.sessionId, nodesProcessed: 1 });
  await usageService.recordExecution({ sessionId: session.sessionId, nodesProcessed: 1 });

  const statusBefore = await usageService.getUsageStatus({ sessionId: session.sessionId });
  assertNull(statusBefore.warningLimit, 'No warning at 66% usage');
  assertNull(statusBefore.blockedLimit, 'Not blocked at 66% usage');

  // Use authenticated tier — drive usage to 80% of the configured daily cap.
  const authId = 'test-warning-' + Date.now();
  const session2 = await createTestSession(authId);
  const dailyMax = SYNIQ_LIMITS.authenticated.maxExecutionsPerDay;
  const warningTrigger = Math.max(1, Math.floor(dailyMax * 0.8));
  for (let i = 0; i < warningTrigger; i++) {
    await usageService.recordExecution({ sessionId: session2.sessionId, nodesProcessed: 1 });
  }

  const statusApproaching = await usageService.getUsageStatus({ sessionId: session2.sessionId });
  assertTruthy(statusApproaching.warningLimit, 'Warning at 80% of execution limit');
  assertEq(statusApproaching.warningLimit.status, 'approaching', 'Warning status is approaching');
  assertEq(statusApproaching.warningLimit.limit, 'maxExecutionsPerDay', 'Warning on correct limit');
  assertNull(statusApproaching.blockedLimit, 'Not yet blocked');

  return [session.sessionId, session2.sessionId];
}

// ─── 11. Policy Tier Structure ──────────────────────────────────────────────

function testPolicyStructure() {
  console.log('\n── 11. Policy Tier Structure ──');

  // Verify all three tiers exist
  assertTruthy(SYNIQ_LIMITS.anonymous, 'Anonymous tier exists');
  assertTruthy(SYNIQ_LIMITS.authenticated, 'Authenticated tier exists');
  assertTruthy(SYNIQ_LIMITS.api_key, 'API key tier exists');

  // Verify escalation: api_key > authenticated > anonymous
  assert(
    SYNIQ_LIMITS.api_key.maxExecutionsPerDay > SYNIQ_LIMITS.authenticated.maxExecutionsPerDay,
    'API key has more executions than authenticated'
  );
  assert(
    SYNIQ_LIMITS.api_key.maxConcurrentAgents > SYNIQ_LIMITS.authenticated.maxConcurrentAgents,
    'API key allows more agents than authenticated'
  );
  assert(
    SYNIQ_LIMITS.api_key.maxConcurrentSessions > SYNIQ_LIMITS.authenticated.maxConcurrentSessions,
    'API key allows more sessions than authenticated'
  );

  // Verify billing-ready structure
  for (const tier of ['anonymous', 'authenticated', 'api_key']) {
    assertTruthy(SYNIQ_LIMITS[tier].maxConnectionsPerDay, `${tier} has maxConnectionsPerDay`);
    assertTruthy(SYNIQ_LIMITS[tier].warningThreshold, `${tier} has warningThreshold`);
    assertTruthy(SYNIQ_LIMITS[tier].maxSessionDurationMinutes, `${tier} has maxSessionDurationMinutes`);
    assertTruthy(SYNIQ_LIMITS[tier].maxConcurrentAgents, `${tier} has maxConcurrentAgents`);
    assertTruthy(SYNIQ_LIMITS[tier].maxConcurrentSessions, `${tier} has maxConcurrentSessions`);
  }
}

// ─── Cleanup ──────────────────────────────────────────────────────────────────

async function cleanup(sessionIds) {
  console.log('\n── Cleanup ──');
  for (const id of sessionIds) {
    try {
      await db.delete(usageTracking).where(eq(usageTracking.session_id, id));
      await db.delete(syniqSessions).where(eq(syniqSessions.id, id));
    } catch { /* best effort */ }
  }
  try {
    await db.delete(apiKeys).where(like(apiKeys.auth_id, 'test-auth-limit-%'));
    await db.delete(apiKeys).where(like(apiKeys.auth_id, 'test-apikey-limit-%'));
    await db.delete(apiKeys).where(like(apiKeys.auth_id, 'test-revoke-limit-%'));
    await db.delete(apiKeys).where(like(apiKeys.auth_id, 'test-warning-%'));
  } catch { /* best effort */ }
  console.log('  ✓ Test data cleaned up');
}

// ─── Runner ───────────────────────────────────────────────────────────────────

async function run() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Syniq Limits + Control + Hardening Tests');
  console.log('═══════════════════════════════════════════════════════');

  if (!isSessionDataConfigured()) {
    console.log('\n⚠ DATABASE_URL not set — skipping.\n');
    process.exit(0);
  }

  db = createSessionDataClient();
  usageService = new UsageService({ client: db });
  anonymousSessionService = new AnonymousSessionService({ client: db });
  apiKeyService = new ApiKeyService({ client: db });
  sessionRepo = new DatabaseSessionStateRepository({ client: db });

  const sessionIds = [];

  try {
    const s1 = await testAnonymousLimits();
    sessionIds.push(s1);

    const s2 = await testAuthenticatedLimits();
    sessionIds.push(s2);

    const s2b = await testConnectionQuota();
    sessionIds.push(...s2b);

    const s2c = await testAnonymousQuotaResetsOnUpgrade();
    sessionIds.push(s2c);

    const s3 = await testApiKeyLimits();
    sessionIds.push(s3);

    const s4 = await testBlockedExecution();
    sessionIds.push(s4);

    const s5 = await testUsagePersistence();
    sessionIds.push(s5);

    testRateLimiting();

    const s7 = await testStatePreservedOnBlock();
    sessionIds.push(s7);

    const s8 = await testRevokedApiKeys();
    sessionIds.push(s8);

    testConcurrentExecutionLock();

    const s10 = await testWarningDetection();
    sessionIds.push(...s10);

    testPolicyStructure();

  } catch (error) {
    console.error('\n💥 Test suite error:', error);
    failed++;
    failures.push('SUITE ERROR: ' + error.message);
  }

  await cleanup(sessionIds);

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
