import test from 'node:test';
import assert from 'node:assert/strict';
import { AppStateResolutionService } from '../session/AppStateResolutionService.js';

const now = new Date().toISOString();

function baseSession(overrides = {}) {
  return {
    id: 'sess-1',
    authId: null,
    anonymousToken: 'anon-1',
    connectedAgents: [],
    graphState: {},
    createdAt: now,
    lastActiveAt: now,
    ...overrides,
  };
}

await test('visitor when no session can be loaded', async () => {
  const svc = new AppStateResolutionService({
    anonymousSessionService: {
      getMostRecentSessionForUser: async () => null,
      validateAnonymousSession: async () => null,
    },
    usageService: { getUsageStatus: async () => null },
  });
  const r = await svc.resolve({ authUser: null, anonymousToken: null });
  assert.equal(r.productMode, 'visitor');
  assert.equal(r.gates.allowDashboard, false);
});

await test('anonymous onboarding when session exists but no live agent', async () => {
  const session = baseSession();
  const svc = new AppStateResolutionService({
    anonymousSessionService: {
      getMostRecentSessionForUser: async () => null,
      validateAnonymousSession: async () => session,
    },
    usageService: {
      getUsageStatus: async () => ({
        ok: true,
        tier: 'anonymous',
        sessionId: session.id,
        authId: null,
        anonymousToken: session.anonymousToken,
        usage: { connectionsCount: 0, executionsCount: 0, nodesProcessed: 0, sessionDurationSeconds: 0, concurrentAgents: 0 },
        limits: {},
        blockedLimit: null,
        connectionBlockedLimit: null,
        warningLimit: null,
        resetAt: null,
      }),
    },
  });
  const r = await svc.resolve({ authUser: null, anonymousToken: 'anon-1' });
  assert.equal(r.productMode, 'anonymous_onboarding');
  assert.equal(r.gates.allowDashboard, false);
});

await test('anonymous workspace when server sees live agent', async () => {
  const recent = new Date(Date.now() - 60 * 1000).toISOString();
  const session = baseSession({
    connectedAgents: [
      { id: 'a1', name: 'Agent', type: 'prompt', status: 'connected', lastSeen: recent },
    ],
  });
  const svc = new AppStateResolutionService({
    anonymousSessionService: {
      getMostRecentSessionForUser: async () => null,
      validateAnonymousSession: async () => session,
    },
    usageService: {
      getUsageStatus: async () => ({
        ok: true,
        tier: 'anonymous',
        sessionId: session.id,
        authId: null,
        anonymousToken: session.anonymousToken,
        usage: { connectionsCount: 0, executionsCount: 0, nodesProcessed: 0, sessionDurationSeconds: 0, concurrentAgents: 1 },
        limits: {},
        blockedLimit: null,
        connectionBlockedLimit: null,
        warningLimit: null,
        resetAt: null,
      }),
    },
  });
  const r = await svc.resolve({ authUser: null, anonymousToken: 'anon-1' });
  assert.equal(r.productMode, 'anonymous_workspace');
  assert.equal(r.gates.allowDashboard, true);
  assert.equal(r.gates.agentConnectedServer, true);
});

await test('authenticated user does not inherit unclaimed anonymous token session', async () => {
  const orphan = baseSession({ id: 'sess-orphan', authId: null });
  const svc = new AppStateResolutionService({
    anonymousSessionService: {
      getMostRecentSessionForUser: async () => null,
      validateAnonymousSession: async () => orphan,
    },
    usageService: { getUsageStatus: async () => null },
  });
  const r = await svc.resolve({ authUser: { id: 'user-1' }, anonymousToken: 'stale-anon' });
  assert.equal(r.productMode, 'visitor');
});

await test('session identity mismatch returns error object', async () => {
  const session = baseSession({ authId: 'user-other' });
  const svc = new AppStateResolutionService({
    anonymousSessionService: {
      getMostRecentSessionForUser: async () => session,
      validateAnonymousSession: async () => null,
    },
    usageService: { getUsageStatus: async () => null },
  });
  const r = await svc.resolve({ authUser: { id: 'user-1' }, anonymousToken: null });
  assert.equal(r.ok, false);
  assert.equal(r.error?.code, 'session_identity_mismatch');
});
