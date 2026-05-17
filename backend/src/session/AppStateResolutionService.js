import { sessionHasLiveAgentFromRecord } from './agentPresenceServer.js';
import { isProAuthId } from './proTier.js';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function parseTimestamp(value) {
  const ms = Date.parse(value || '');
  return Number.isNaN(ms) ? null : ms;
}

function anonymousIdleStaleDays() {
  const n = Number(process.env.SYNIQ_ANONYMOUS_IDLE_STALE_DAYS || '14');
  return Number.isFinite(n) && n > 0 ? n : 14;
}

/**
 * Single authoritative product snapshot for routing and UI.
 * Identity (Better Auth) is separate from workspace (Syniq session row).
 */
export class AppStateResolutionService {
  constructor(config = {}) {
    this.anonymousSessionService = config.anonymousSessionService;
    this.usageService = config.usageService;
  }

  /**
   * @param {{ authUser: { id: string } | null, anonymousToken: string | null }} input
   */
  async resolve(input) {
    const resolvedAt = new Date().toISOString();
    const authUser = input.authUser || null;
    const anonymousToken = typeof input.anonymousToken === 'string' && input.anonymousToken.trim()
      ? input.anonymousToken.trim()
      : null;

    const visitorPayload = () => ({
      ok: true,
      version: 1,
      resolvedAt,
      visitor: true,
      identity: { kind: 'none', authUserId: null },
      workspace: null,
      usage: null,
      productMode: 'visitor',
      lifecycle: { code: 'none', clearAnonymousTokenSuggested: false },
      gates: {
        allowDashboard: false,
        requireAgentAttach: true,
        quotaBlocksExecution: false,
        agentConnectedServer: false,
      },
      routingHints: {
        primaryPath: '/onboarding',
        reason: 'no_workspace',
      },
    });

    if (!this.anonymousSessionService || !this.usageService) {
      return visitorPayload();
    }

    let session = null;
    let sessionSource = 'none';

    if (authUser?.id) {
      session = await this.anonymousSessionService.getMostRecentSessionForUser(authUser.id);
      sessionSource = 'authenticated_recent';
    }

    if (!session && anonymousToken) {
      const candidate = await this.anonymousSessionService.validateAnonymousSession(anonymousToken);
      if (candidate) {
        if (authUser?.id) {
          if (candidate.authId && String(candidate.authId) === String(authUser.id)) {
            session = candidate;
            sessionSource = 'anonymous_token_matched_account';
          }
        } else {
          session = candidate;
          sessionSource = 'anonymous_token';
        }
      }
    }

    if (!session) {
      return visitorPayload();
    }

    if (authUser?.id && session.authId && String(session.authId) !== String(authUser.id)) {
      return {
        ok: false,
        version: 1,
        resolvedAt,
        error: {
          code: 'session_identity_mismatch',
          message: 'This Syniq session does not belong to the signed-in account.',
        },
      };
    }

    if (!authUser?.id && session.authId) {
      return {
        ok: false,
        version: 1,
        resolvedAt,
        error: {
          code: 'session_requires_signin',
          message: 'This workspace is tied to a signed-in account. Sign in to continue.',
        },
      };
    }

    const agentConnectedServer = sessionHasLiveAgentFromRecord(session);
    const usage = await this.usageService.getUsageStatus({ sessionId: session.id });
    const isPro = authUser?.id ? isProAuthId(authUser.id) : false;
    const identityKind = session.authId ? 'authenticated' : 'anonymous';
    const blocked = Boolean(usage?.blockedLimit || usage?.connectionBlockedLimit);

    const lastActiveMs = parseTimestamp(session.lastActiveAt);
    const createdMs = parseTimestamp(session.createdAt);
    const now = Date.now();
    let lifecycleCode = 'fresh';
    let clearAnonymousTokenSuggested = false;

    if (identityKind === 'anonymous' && !agentConnectedServer && lastActiveMs !== null) {
      const idleMs = anonymousIdleStaleDays() * ONE_DAY_MS;
      if (now - lastActiveMs > idleMs) {
        lifecycleCode = 'anonymous_idle_stale';
        clearAnonymousTokenSuggested = true;
      }
    }

    if (identityKind === 'anonymous' && createdMs !== null) {
      const maxAgeMs = 90 * ONE_DAY_MS;
      if (now - createdMs > maxAgeMs) {
        lifecycleCode = 'anonymous_expired_wall';
        clearAnonymousTokenSuggested = true;
      }
    }

    let productMode = 'visitor';
    if (identityKind === 'anonymous') {
      if (blocked) {
        productMode = 'anonymous_blocked';
      } else if (agentConnectedServer) {
        productMode = 'anonymous_workspace';
      } else {
        productMode = 'anonymous_onboarding';
      }
    } else if (isPro) {
      if (blocked) {
        productMode = 'pro_blocked';
      } else if (agentConnectedServer) {
        productMode = 'pro_workspace';
      } else {
        productMode = 'pro_onboarding';
      }
    } else if (identityKind === 'authenticated') {
      if (blocked) {
        productMode = 'authenticated_blocked';
      } else if (agentConnectedServer) {
        productMode = 'authenticated_workspace';
      } else {
        productMode = 'authenticated_onboarding';
      }
    }

    const allowDashboard = agentConnectedServer;
    const quotaBlocksExecution = Boolean(blocked);

    return {
      ok: true,
      version: 1,
      resolvedAt,
      visitor: false,
      identity: {
        kind: identityKind,
        authUserId: session.authId || null,
        billing: isPro ? 'pro' : session.authId ? 'free' : 'none',
      },
      workspace: {
        sessionId: session.id,
        authId: session.authId || null,
        anonymousTokenPresent: Boolean(anonymousToken),
        agentConnectedServer,
        sessionSource,
        createdAt: session.createdAt || null,
        lastActiveAt: session.lastActiveAt || null,
      },
      usage,
      productMode,
      lifecycle: {
        code: lifecycleCode,
        clearAnonymousTokenSuggested,
      },
      gates: {
        allowDashboard,
        requireAgentAttach: !agentConnectedServer,
        quotaBlocksExecution,
        agentConnectedServer,
      },
      routingHints: {
        primaryPath: allowDashboard ? '/dashboard' : '/onboarding',
        reason: allowDashboard ? 'agent_verified' : 'awaiting_agent',
      },
    };
  }
}
