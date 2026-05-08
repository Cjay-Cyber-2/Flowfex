import http from 'node:http';
import { URL } from 'node:url';
import zlib from 'node:zlib';
import { defaultConnectionService } from '../connection/index.js';
import { FlowfexSocketServer, initSocketServer, getSocketServer } from '../ws/server.js';
import { ControlController } from '../control/ControlController.js';
import { executionRateLimiter, controlRateLimiter, connectRateLimiter } from './RateLimiter.js';
import { sessionLockManager } from '../session/SessionLockManager.js';
import { defaultSessionStateRepository } from '../persistence/defaultSessionStateRepository.js';
import { isSessionDataConfigured, resolveAuthenticatedUser } from '../session/sessionDataAccess.js';
import { AnonymousSessionService } from '../session/AnonymousSessionService.js';
import { ApiKeyService } from '../session/ApiKeyService.js';
import { UsageService } from '../session/UsageService.js';
import { auth } from '../auth/betterAuth.js';
import { toNodeHandler } from 'better-auth/node';
import { 
  executeSchema, ingestSchema, createApiKeySchema, 
  approveSchema, rejectSchema, rerouteSchema, constrainSchema,
  anonymousValidateSchema, sessionUpgradeSchema, skillsSearchSchema, emptySchema,
  formatZodError 
} from './ValidationSchemas.js';
import { connectRequestSchema } from '../../../shared/connection-contracts.js';

const authHandler = toNodeHandler(auth);

/**
 * Minimal HTTP surface for external agent connections.
 */
export class FlowfexServer {
  constructor(config = {}) {
    const sessionStateRepository = config.sessionStateRepository || defaultSessionStateRepository;

    this.connectionService = config.connectionService || defaultConnectionService;
    this.controlController = config.controlController || new ControlController({
      orchestrator: this.connectionService.orchestrator,
      sessionStateRepository,
      lockManager: config.lockManager,
      socketServer: config.socketServer || null,
    });
    this.sessionStateRepository = sessionStateRepository;
    this.host = config.host || process.env.FLOWFEX_HOST || undefined;
    this.port = Number(config.port ?? process.env.PORT ?? process.env.FLOWFEX_PORT ?? 10000);
    this.maxBodySize = config.maxBodySize || 1024 * 1024;
    this.sessionDataEnabled = config.sessionDataEnabled ?? isSessionDataConfigured();
    this.anonymousSessionService = config.anonymousSessionService
      || (this.sessionDataEnabled ? new AnonymousSessionService() : null);
    this.apiKeyService = config.apiKeyService
      || (this.sessionDataEnabled ? new ApiKeyService() : null);
    this.usageService = config.usageService
      || (this.sessionDataEnabled ? new UsageService() : null);
    this.sessionLockManager = config.sessionLockManager || sessionLockManager;
    this.server = null;
    this.socketServer = null;
  }

  async start(overrides = {}) {
    if (this.server) {
      return this.getAddress();
    }

    const host = overrides.host || this.host;
    const port = Number(overrides.port ?? this.port);
    this.server = http.createServer((request, response) => {
      console.log("[FLOWFEX ENTRY HIT]", request.url);
      // Health check MUST respond immediately for Render
      if (request.url === '/health' || request.url === '/') {
        response.writeHead(200, { 'Content-Type': 'text/plain' });
        response.end('ok');
        return;
      }

      this._setCorsHeaders(response, request);
      if (request.method === 'OPTIONS') {
        response.writeHead(204);
        response.end();
        return;
      }
      this._handleRequest(request, response).catch(error => {
        this._writeError(response, error);
      });
    });

    // Attach Socket.io directly to this server (avoid stale singletons)
    this.socketServer = new FlowfexSocketServer(this.server, {
      corsOrigin: process.env.ALLOWED_ORIGINS || '*',
    });
    if (this.connectionService?.orchestrator?.setSocketServer) {
      this.connectionService.orchestrator.setSocketServer(this.socketServer);
    }
    if (this.controlController?.setSocketServer) {
      this.controlController.setSocketServer(this.socketServer);
    }
    if (this.usageService?.setSocketServer) {
      this.usageService.setSocketServer(this.socketServer);
    }
    console.log('[Flowfex] Socket.io server attached with /orchestration, /session, /control namespaces');

    await this._listenWithFallback(port, host);

    return this.getAddress();
  }

  async stop() {
    if (!this.server) {
      return;
    }

    const activeServer = this.server;
    const activeSocketServer = this.socketServer;
    this.server = null;
    this.socketServer = null;

    await this.connectionService?.orchestrator?.flushStateStore?.();

    if (activeSocketServer?.io) {
      await new Promise((resolve) => {
        activeSocketServer.io.close(() => resolve());
      });
    }

    await new Promise((resolve, reject) => {
      activeServer.close(error => {
        if (error && error.code !== 'ERR_SERVER_NOT_RUNNING') {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }

  getAddress() {
    if (!this.server) {
      return null;
    }

    const address = this.server.address();
    if (!address || typeof address === 'string') {
      return address;
    }

    return {
      host: address.address,
      port: address.port
    };
  }

  async _handleRequest(request, response) {
    const url = new URL(request.url, 'http://flowfex.local');
    const ip = request.headers['x-forwarded-for'] || request.socket?.remoteAddress || 'unknown';
    const accessToken = this._extractBearerToken(request);
    const authUser = accessToken && this.sessionDataEnabled
      ? await resolveAuthenticatedUser(accessToken).catch(() => null)
      : null;
    const anonymousToken = this._extractAnonymousSessionToken(request);
    const rateLimitIdentity = authUser?.id
      ? `auth:${authUser.id}`
      : anonymousToken
        ? `anon:${anonymousToken}`
        : String(ip);

    console.log("[FLOWFEX ROUTER HIT]", url.pathname);

    // ─── Identity-Aware Rate Limiting ──────────────────────────────────
    if (authUser) {
      request.user = authUser;
    }
    const tier = authUser?.id ? 'authenticated' : 'anonymous';

    const isExecutionEndpoint = (request.method === 'POST' && (
      url.pathname === '/connect' || 
      url.pathname === '/ingest' || 
      url.pathname.match(/^\/sessions\/([^/]+)\/execute$/)
    ));
    const isControlEndpoint = (request.method === 'POST' && (
      url.pathname.match(/^\/session\/([^/]+)\/(pause|resume|constrain)$/) ||
      url.pathname.match(/^\/node\/([^/]+)\/(approve|reject|reroute)$/)
    ));
    const isConnectEndpoint = (request.method === 'POST' && url.pathname === '/connect');

    if (isExecutionEndpoint && !executionRateLimiter.check(rateLimitIdentity, tier)) {
      if (this.socketServer) {
        const sessionId = url.pathname.match(/^\/sessions\/([^/]+)\/execute$/)?.[1] || null;
        if (sessionId) {
          this.socketServer.emitLimitEvent(sessionId, 'limit:rate_limited', {
            sessionId, tier, endpoint: 'execution',
            timestamp: new Date().toISOString(),
          });
        }
      }
      return this._writeJson(response, 429, { error: { message: 'Too many execution requests. Please wait.' } });
    }
    if (isControlEndpoint && !controlRateLimiter.check(rateLimitIdentity, tier)) {
      return this._writeJson(response, 429, { error: { message: 'Too many control requests. Please wait.' } });
    }
    if (isConnectEndpoint && !connectRateLimiter.check(rateLimitIdentity, tier)) {
      return this._writeJson(response, 429, { error: { message: 'Too many connection requests. Please wait.' } });
    }

    const sessionMatch = url.pathname.match(/^\/sessions\/([^/]+)$/);
    const executionMatch = url.pathname.match(/^\/sessions\/([^/]+)\/execute$/);
    const connectLiveMatch = url.pathname.match(/^\/connect\/live\/([^/]+)$/);
    const sessionStateMatch = url.pathname.match(/^\/session\/([^/]+)\/state$/);
    const pauseMatch = url.pathname.match(/^\/session\/([^/]+)\/pause$/);
    const resumeMatch = url.pathname.match(/^\/session\/([^/]+)\/resume$/);
    const approveMatch = url.pathname.match(/^\/node\/([^/]+)\/approve$/);
    const rejectMatch = url.pathname.match(/^\/node\/([^/]+)\/reject$/);
    const rerouteMatch = url.pathname.match(/^\/node\/([^/]+)\/reroute$/);
    const constrainMatch = url.pathname.match(/^\/session\/([^/]+)\/constrain$/);
    const skillsMatch = url.pathname === '/skills';
    const skillsSearchMatch = url.pathname === '/skills/search';
    const skillsCategoriesMatch = url.pathname === '/skills/categories';
    const ingestMatch = url.pathname === '/ingest';
    const sseStreamMatch = url.pathname.match(/^\/session\/([^/]+)\/stream$/);
    const anonymousSessionCreateMatch = request.method === 'POST' && url.pathname === '/api/session/create-anonymous';
    const anonymousSessionValidateMatch = request.method === 'POST' && url.pathname === '/api/session/validate-anonymous';
    const sessionUpgradeMatch = request.method === 'POST' && url.pathname === '/api/session/upgrade';
    const recentSessionMatch = request.method === 'GET' && url.pathname === '/api/session/recent';
    const sessionUsageMatch = request.method === 'GET' && url.pathname === '/api/session/usage';
    const apiKeysMatch = url.pathname === '/api/api-keys';
    const apiKeyRevokeMatch = url.pathname.match(/^\/api\/api-keys\/([^/]+)$/);

    if (request.method === 'GET' && url.pathname === '/health') {
      response.writeHead(200, { 'content-type': 'text/plain' });
      response.end('ok');
      return;
    }



    if (url.pathname.startsWith('/api/auth')) {
      try {
        await authHandler(request, response);
      } catch (err) {
        console.error("[AUTH HANDLER ERROR]", err);
        response.writeHead(500, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ ok: false, error: err.message, stack: err.stack }));
      }
      return;
    }

    // --- JWT Enforcement ---
    const isJwtEnforced = 
      url.pathname === '/api/session/upgrade' || 
      url.pathname === '/api/session/recent' || 
      url.pathname.startsWith('/api/api-keys');

    if (isJwtEnforced && !authUser) {
      return this._writeJson(response, 401, { error: { message: 'Unauthorized: Invalid or expired JWT token.' } });
    }
    if (!accessToken && isJwtEnforced) {
      return this._writeJson(response, 401, { error: { message: 'Unauthorized: Missing JWT token.' } });
    }
    // -----------------------

    if (anonymousSessionCreateMatch) {
      this._assertSessionDataEnabled();
      const payload = await this.anonymousSessionService.createAnonymousSession();
      const session = await this.anonymousSessionService.validateAnonymousSession(payload.anonymousToken);

      this._setCookie(response, 'fx_session', payload.anonymousToken, {
        httpOnly: true,
        sameSite: this._resolveCookieSameSite(request),
        secure: this._shouldUseSecureCookies(request),
        path: '/',
      });

      return this._writeJson(response, 200, {
        ok: true,
        anonymousToken: payload.anonymousToken,
        session,
      });
    }

    if (anonymousSessionValidateMatch) {
      this._assertSessionDataEnabled();
      const body = await this._readAndValidateJsonBody(request, anonymousValidateSchema);
      const anonymousToken = body.anonymousToken || this._readCookie(request, 'fx_session');
      const session = anonymousToken
        ? await this.anonymousSessionService.validateAnonymousSession(anonymousToken)
        : null;

      if (!session) {
        return this._writeJson(response, 404, {
          error: {
            message: 'Anonymous session not found',
          },
        });
      }

      return this._writeJson(response, 200, {
        ok: true,
        anonymousToken,
        session,
      });
    }

    if (sessionUpgradeMatch) {
      this._assertSessionDataEnabled();
      const body = await this._readAndValidateJsonBody(request, sessionUpgradeSchema);
      const accessToken = this._extractBearerToken(request) || body.accessToken || null;
      const anonymousToken = body.anonymousToken || this._readCookie(request, 'fx_session');
      const user = await this._requireAuthenticatedUser(accessToken);
      const session = await this.anonymousSessionService.upgradeAnonymousSession({
        anonymousToken,
        authId: user.id,
        displayName: user.user_metadata?.full_name || user.user_metadata?.name || null,
        avatarUrl: user.user_metadata?.avatar_url || null,
      });

      this._clearCookie(response, 'fx_session', {
        path: '/',
        sameSite: this._resolveCookieSameSite(request),
        secure: this._shouldUseSecureCookies(request),
      });

      return this._writeJson(response, 200, {
        ok: true,
        session,
      });
    }

    if (recentSessionMatch) {
      this._assertSessionDataEnabled();
      const user = await this._requireAuthenticatedUser(this._extractBearerToken(request));
      const session = await this.anonymousSessionService.getMostRecentSessionForUser(user.id);

      return this._writeJson(response, 200, {
        ok: true,
        session,
      });
    }

    if (sessionUsageMatch) {
      this._assertSessionDataEnabled();
      const sessionId = url.searchParams.get('sessionId') || null;
      const status = await this.usageService.getUsageStatus({ sessionId });

      if (!status) {
        return this._writeJson(response, 404, {
          error: {
            message: 'Session usage was not found.',
          },
        });
      }

      if (status.authId) {
        const user = await this._requireAuthenticatedUser(this._extractBearerToken(request));
        if (user.id !== status.authId) {
          return this._writeJson(response, 403, {
            error: {
              message: 'You do not have access to this session usage record.',
            },
          });
        }
      } else if (status.anonymousToken !== this._extractAnonymousSessionToken(request)) {
        return this._writeJson(response, 403, {
          error: {
            message: 'Anonymous session usage requires the active Flowfex session token.',
          },
        });
      }

      return this._writeJson(response, 200, status);
    }

    if (request.method === 'GET' && apiKeysMatch) {
      this._assertSessionDataEnabled();
      const user = await this._requireAuthenticatedUser(this._extractBearerToken(request));
      const apiKeys = await this.apiKeyService.listApiKeys(user.id);

      return this._writeJson(response, 200, {
        ok: true,
        apiKeys,
      });
    }

    if (request.method === 'POST' && apiKeysMatch) {
      this._assertSessionDataEnabled();
      const user = await this._requireAuthenticatedUser(this._extractBearerToken(request));
      const body = await this._readAndValidateJsonBody(request, createApiKeySchema);
      const label = typeof body.label === 'string' ? body.label.trim() : '';

      if (!label) {
        return this._writeJson(response, 400, {
          error: {
            message: 'API key label is required',
          },
        });
      }

      const result = await this.apiKeyService.generateApiKey(user.id, label);

      return this._writeJson(response, 200, {
        ok: true,
        apiKey: result.key,
        record: result.record,
      });
    }

    if (request.method === 'DELETE' && apiKeyRevokeMatch) {
      this._assertSessionDataEnabled();
      const user = await this._requireAuthenticatedUser(this._extractBearerToken(request));
      const record = await this.apiKeyService.revokeApiKey(user.id, apiKeyRevokeMatch[1]);

      // Broadcast key revocation event — any session using this key should be notified
      if (this.socketServer && record) {
        this.socketServer.emitLimitEvent(null, 'limit:key_revoked', {
          keyId: apiKeyRevokeMatch[1],
          authId: user.id,
          timestamp: new Date().toISOString(),
        });
      }

      return this._writeJson(response, 200, {
        ok: true,
        record,
      });
    }

    if (request.method === 'POST' && url.pathname === '/connect') {
      const body = await this._readAndValidateJsonBody(request, connectRequestSchema);
      const validatedApiKey = this.apiKeyService
        ? await this.apiKeyService.validateApiKey(this._extractApiKey(request))
        : null;

      const anonymousRealtimeAllowed = (body.mode === 'sdk' || body.mode === 'live')
        ? await this._isAuthorizedAnonymousRealtimeSession(body.sessionId, request)
        : false;

      if (this.apiKeyService && (body.mode === 'sdk' || body.mode === 'live') && !validatedApiKey && !authUser && !anonymousRealtimeAllowed) {
        return this._writeJson(response, 401, {
          error: {
            code: 'invalid_api_key',
            message: 'SDK and live channel connections require a valid Flowfex API key, an authenticated account, or the active anonymous Flowfex session.',
          },
        });
      }

      // Enforce agent concurrency limit before connecting
      if (this.usageService && body.sessionId) {
        await this.usageService.assertAgentConnectionAllowed({
          sessionId: body.sessionId,
          apiKeyId: validatedApiKey?.keyId || null,
        });
      }

      const payload = await this.connectionService.connect(body, {
        apiKey: this._extractApiKey(request),
        validatedApiKey,
        authUserId: authUser?.id || null,
        baseUrl: this._buildBaseUrl(request),
      });

      return this._writeJson(response, 200, payload);
    }

    if (request.method === 'GET' && connectLiveMatch) {
      const payload = this.connectionService.resolveLiveConnection(connectLiveMatch[1], {
        baseUrl: this._buildBaseUrl(request),
        token: url.searchParams.get('token') || this._extractBearerToken(request) || null,
      });

      if (this._shouldEmitAttachConfirmation(request, payload?.mode || 'live')) {
        this._emitAgentConnectedForSession(payload?.connection?.session, payload?.mode || 'live');
      }

      return this._writeJson(response, 200, payload);
    }

    if (request.method === 'GET' && sessionStateMatch) {
      const payload = await this.controlController.getSessionState({
        sessionId: sessionStateMatch[1],
      });
      return this._writeJson(response, 200, {
        ok: true,
        sessionId: sessionStateMatch[1],
        snapshot: payload,
      });
    }

    if (request.method === 'POST' && pauseMatch) {
      const body = await this._readAndValidateJsonBody(request, emptySchema);
      const payload = await this.controlController.pauseSession({
        sessionId: pauseMatch[1],
      }, body);
      return this._writeJson(response, 200, payload);
    }

    if (request.method === 'POST' && resumeMatch) {
      const body = await this._readAndValidateJsonBody(request, emptySchema);
      const payload = await this.controlController.resumeSession({
        sessionId: resumeMatch[1],
      }, body);
      return this._writeJson(response, 200, payload);
    }

    if (request.method === 'POST' && approveMatch) {
      const body = await this._readAndValidateJsonBody(request, approveSchema);
      const payload = await this.controlController.approveNode({
        nodeId: approveMatch[1],
      }, body);
      return this._writeJson(response, 200, payload);
    }

    if (request.method === 'POST' && rejectMatch) {
      const body = await this._readAndValidateJsonBody(request, rejectSchema);
      const payload = await this.controlController.rejectNode({
        nodeId: rejectMatch[1],
      }, body);
      return this._writeJson(response, 200, payload);
    }

    if (request.method === 'POST' && rerouteMatch) {
      const body = await this._readAndValidateJsonBody(request, rerouteSchema);
      const payload = await this.controlController.rerouteNode({
        nodeId: rerouteMatch[1],
      }, body);
      return this._writeJson(response, 200, payload);
    }

    if (request.method === 'POST' && constrainMatch) {
      const body = await this._readAndValidateJsonBody(request, constrainSchema);
      const payload = await this.controlController.constrainSession({
        sessionId: constrainMatch[1],
      }, {
        ...body,
        blockedSkillIds: body.blockedSkillIds || body.skillIds || [],
      });
      return this._writeJson(response, 200, payload);
    }

    // ─── Skills API ───────────────────────────────────────────────────
    if (request.method === 'GET' && skillsMatch) {
      const registry = this.connectionService?.orchestrator?.registry || this.connectionService?.registry;
      if (!registry) {
        return this._writeJson(response, 200, { tools: [] });
      }
      const tools = registry.getCanonicalSkillRecords();

      const markdownTools = tools.filter(tool => Boolean(tool.metadata?.sourcePath));
      const summary = markdownTools.reduce((accumulator, tool) => {
        accumulator.totalTools += 1;
        accumulator.categories.add(tool.category);
        const sourceType = tool.metadata?.sourceType || 'unknown';
        const trustLevel = tool.metadata?.trustLevel || 'unknown';
        const validationStatus = tool.metadata?.validationStatus || 'unknown';
        accumulator.sourceTypes[sourceType] = (accumulator.sourceTypes[sourceType] || 0) + 1;
        accumulator.trustLevels[trustLevel] = (accumulator.trustLevels[trustLevel] || 0) + 1;
        accumulator.validationStatuses[validationStatus] = (accumulator.validationStatuses[validationStatus] || 0) + 1;
        return accumulator;
      }, {
        totalTools: 0,
        categories: new Set(),
        sourceTypes: {},
        trustLevels: {},
        validationStatuses: {}
      });

      return this._writeJson(response, 200, {
        tools,
        summary: {
          totalRegistryTools: tools.length,
          totalTools: summary.totalTools,
          totalCategories: summary.categories.size,
          sourceTypes: summary.sourceTypes,
          trustLevels: summary.trustLevels,
          validationStatuses: summary.validationStatuses,
          markdownTools: markdownTools.length
        }
      });
    }

    if (request.method === 'GET' && skillsCategoriesMatch) {
      const registry = this.connectionService?.orchestrator?.registry || this.connectionService?.registry;
      if (!registry) {
        return this._writeJson(response, 200, { categories: {} });
      }
      return this._writeJson(response, 200, { categories: registry.getIndex('category') });
    }

    if (request.method === 'POST' && skillsSearchMatch) {
      const body = await this._readAndValidateJsonBody(request, skillsSearchSchema);
      const query = body.query || '';
      const registry = this.connectionService?.orchestrator?.registry
        || this.connectionService?.registry;

      if (!registry) {
        return this._writeJson(response, 200, { results: [], query });
      }

      const retrieval = registry.retrieveTools(query, { topK: 10 });
      const results = retrieval.matches.map(match => ({
        ...registry.getCanonicalSkillRecord(match.tool.id),
        score: match.score,
        strategy: match.strategy,
      }));

      return this._writeJson(response, 200, { results, query, strategy: retrieval.strategy });
    }

    // ─── Agent Ingest (prompt-based connection) ────────────────────────
    if (request.method === 'POST' && ingestMatch) {
      const body = await this._readAndValidateJsonBody(request, ingestSchema);
      const ingestRequest = this._resolvePromptIngestRequest(body, request);
      const executionPayload = {
        sessionId: ingestRequest.sessionId,
        input: ingestRequest.task,
        token: ingestRequest.token,
      };

      if (this.usageService) {
        await this.usageService.assertExecutionAllowed({
          sessionId: executionPayload.sessionId,
        });
      }

      // Acquire execution lock
      if (!this.sessionLockManager.acquire(executionPayload.sessionId)) {
        return this._writeJson(response, 409, {
          error: { code: 'concurrent_execution', message: 'Another execution is already running on this session.' },
        });
      }

      try {
        if (this._wantsEventStream(request, url, body)) {
          this._emitAgentConnectedForSessionId(executionPayload.sessionId, 'prompt');
          return this._writeEventStream(response, executionPayload);
        }

        this._emitAgentConnectedForSessionId(executionPayload.sessionId, 'prompt');
        const payload = await this.connectionService.execute(executionPayload);
        if (this.usageService) {
          await this.usageService.recordExecution({
            sessionId: executionPayload.sessionId,
            nodesProcessed: Array.isArray(payload?.graph?.nodes) ? payload.graph.nodes.length : 0,
          });
        }
        return this._writeJson(response, 200, {
          ...payload,
          sessionId: executionPayload.sessionId,
        });
      } finally {
        this.sessionLockManager.release(executionPayload.sessionId);
      }
    }

    // ─── SSE Stream ───────────────────────────────────────────────────
    if (request.method === 'GET' && sseStreamMatch) {
      const sessionId = sseStreamMatch[1];
      return this._writeSSEStream(response, sessionId);
    }

    if (request.method === 'POST' && executionMatch) {
      const body = await this._readAndValidateJsonBody(request, executeSchema);
      const executionPayload = {
        ...body,
        sessionId: executionMatch[1],
        token: this._extractBearerToken(request)
      };

      if (this.usageService) {
        await this.usageService.assertExecutionAllowed({
          sessionId: executionPayload.sessionId,
        });
      }

      // Acquire execution lock
      if (!this.sessionLockManager.acquire(executionPayload.sessionId)) {
        return this._writeJson(response, 409, {
          error: { code: 'concurrent_execution', message: 'Another execution is already running on this session.' },
        });
      }

      try {
        if (this._wantsEventStream(request, url, body)) {
          this._emitAgentConnectedForSessionId(executionPayload.sessionId, null);
          return this._writeEventStream(response, executionPayload);
        }

        this._emitAgentConnectedForSessionId(executionPayload.sessionId, null);
        const payload = await this.connectionService.execute(executionPayload);
        if (this.usageService) {
          await this.usageService.recordExecution({
            sessionId: executionPayload.sessionId,
            nodesProcessed: Array.isArray(payload?.graph?.nodes) ? payload.graph.nodes.length : 0,
          });
        }
        return this._writeJson(response, 200, payload);
      } finally {
        this.sessionLockManager.release(executionPayload.sessionId);
      }
    }

    if (request.method === 'GET' && sessionMatch) {
      const payload = this.connectionService.getSession(
        sessionMatch[1],
        this._extractBearerToken(request)
      );
      return this._writeJson(response, 200, payload);
    }

    if (request.method === 'DELETE' && sessionMatch) {
      const payload = this.connectionService.disconnect(
        sessionMatch[1],
        this._extractBearerToken(request)
      );
      return this._writeJson(response, 200, payload);
    }

    return this._writeJson(response, 404, {
      error: {
        message: 'Route not found'
      }
    });
  }

  async _readJsonBody(request) {
    const chunks = [];
    let size = 0;

    for await (const chunk of request) {
      size += chunk.length;
      if (size > this.maxBodySize) {
        throw createHttpError('Request body too large', 413);
      }

      chunks.push(chunk);
    }

    if (chunks.length === 0) {
      return {};
    }

    try {
      return JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch (error) {
      throw createHttpError(`Invalid JSON body: ${error.message}`, 400);
    }
  }

  async _readAndValidateJsonBody(request, schema) {
    const body = await this._readJsonBody(request);
    if (!schema) return body;
    
    const result = schema.safeParse(body);
    if (!result.success) {
      const errorMsg = formatZodError(result.error).join(' | ');
      throw createHttpError(`Validation failed: ${errorMsg}`, 400);
    }
    return result.data;
  }

  _extractApiKey(request) {
    return request.headers['x-flowfex-api-key'] || null;
  }

  _extractAnonymousSessionToken(request) {
    const headerValue = request.headers['x-flowfex-anonymous-token'];
    if (typeof headerValue === 'string' && headerValue.trim().length > 0) {
      return headerValue.trim();
    }

    if (Array.isArray(headerValue)) {
      const firstValue = headerValue.find((value) => typeof value === 'string' && value.trim().length > 0);
      if (firstValue) {
        return firstValue.trim();
      }
    }

    return this._readCookie(request, 'fx_session');
  }

  _extractBearerToken(request) {
    const header = request.headers.authorization || '';
    if (!header.toLowerCase().startsWith('bearer ')) {
      return null;
    }

    return header.slice(7).trim();
  }

  _assertSessionDataEnabled() {
    if (!this.sessionDataEnabled || !this.anonymousSessionService) {
      throw createHttpError('Database-backed sessions are not configured on this server yet.', 503);
    }
  }

  async _requireAuthenticatedUser(accessToken) {
    if (!accessToken) {
      throw createHttpError('Authentication is required for this route.', 401);
    }

    const user = await resolveAuthenticatedUser(accessToken);
    if (!user) {
      throw createHttpError('The authenticated user could not be resolved from the provided token.', 401);
    }

    return user;
  }

  _readCookie(request, name) {
    const source = request.headers.cookie || '';
    const pairs = String(source).split(';');

    for (const pair of pairs) {
      const trimmed = pair.trim();
      if (!trimmed) {
        continue;
      }

      const separatorIndex = trimmed.indexOf('=');
      if (separatorIndex === -1) {
        continue;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      if (key !== name) {
        continue;
      }

      return decodeURIComponent(trimmed.slice(separatorIndex + 1).trim());
    }

    return null;
  }

  _setCookie(response, name, value, options = {}) {
    const serialized = this._serializeCookie(name, value, options);
    const existing = response.getHeader('Set-Cookie');
    const next = Array.isArray(existing)
      ? [...existing, serialized]
      : existing
        ? [existing, serialized]
        : [serialized];

    response.setHeader('Set-Cookie', next);
  }

  _clearCookie(response, name, options = {}) {
    this._setCookie(response, name, '', {
      ...options,
      expires: new Date(0),
      maxAge: 0,
    });
  }

  _serializeCookie(name, value, options = {}) {
    const parts = [`${name}=${encodeURIComponent(value)}`];

    parts.push(`Path=${options.path || '/'}`);

    if (typeof options.maxAge === 'number') {
      parts.push(`Max-Age=${Math.floor(options.maxAge)}`);
    }

    if (options.expires instanceof Date) {
      parts.push(`Expires=${options.expires.toUTCString()}`);
    }

    if (options.httpOnly) {
      parts.push('HttpOnly');
    }

    if (options.sameSite) {
      parts.push(`SameSite=${options.sameSite}`);
    }

    if (options.secure) {
      parts.push('Secure');
    }

    return parts.join('; ');
  }

  _shouldUseSecureCookies(request) {
    const origin = request.headers.origin || '';
    const host = request.headers.host || '';
    const source = `${origin} ${host}`.toLowerCase();

    return !(source.includes('localhost') || source.includes('127.0.0.1'));
  }

  _resolveCookieSameSite(request) {
    if (!this._shouldUseSecureCookies(request)) {
      return 'Lax';
    }

    const origin = request.headers.origin || '';
    if (!origin) {
      return 'Strict';
    }

    try {
      const requestOrigin = new URL(origin).origin;
      const apiOrigin = new URL(this._buildBaseUrl(request)).origin;
      return requestOrigin === apiOrigin ? 'Strict' : 'None';
    } catch {
      return 'Strict';
    }
  }

  async _isAuthorizedAnonymousRealtimeSession(sessionId, request) {
    if (!sessionId || !this.sessionDataEnabled || !this.anonymousSessionService) {
      return false;
    }

    const anonymousToken = this._extractAnonymousSessionToken(request);
    if (!anonymousToken) {
      return false;
    }

    const session = await this.anonymousSessionService.validateAnonymousSession(anonymousToken).catch(() => null);
    return Boolean(session?.id && session.id === sessionId && !session.authId);
  }

  _shouldEmitAttachConfirmation(request, mode) {
    if (mode === 'link') {
      return true;
    }

    const attachHeader = request.headers['x-flowfex-agent-attach'];
    const normalized = Array.isArray(attachHeader) ? attachHeader[0] : attachHeader;
    return /^(1|true|yes)$/i.test(String(normalized || '').trim());
  }

  _resolvePromptIngestRequest(body, request) {
    if (!body || typeof body !== 'object') {
      throw createHttpError('Prompt ingest requires a JSON object body', 400);
    }

    const parsedTask = this._extractPromptTaskToken(body.task);
    const explicitToken = body.sessionToken || body.token || null;
    const bearerToken = this._extractBearerToken(request);
    const sessionToken = explicitToken || bearerToken || parsedTask.token;

    if (explicitToken && parsedTask.token && explicitToken !== parsedTask.token) {
      throw createHttpError('Prompt ingest received conflicting session tokens', 400);
    }

    if (!sessionToken) {
      throw createHttpError('Prompt ingest requires a session token or a token-prefixed task', 400);
    }

    const session = this.connectionService?.sessionManager?.findSessionByToken?.(sessionToken);
    if (!session) {
      throw createHttpError('Invalid or expired session token', 401);
    }

    const task = typeof parsedTask.task === 'string' && parsedTask.task.trim().length > 0
      ? parsedTask.task
      : typeof body.task === 'string'
        ? body.task.trim()
        : '';

    if (!task) {
      throw createHttpError('Prompt ingest requires a non-empty task', 400);
    }

    return {
      sessionId: body.sessionId || session.id,
      token: sessionToken,
      task,
    };
  }

  _extractPromptTaskToken(task) {
    if (typeof task !== 'string') {
      return { token: null, task: '' };
    }

    const normalizedTask = task.replace(/\r\n/g, '\n');
    const patterns = [
      /^\s*\[\[\s*FLOWFEX_SESSION_TOKEN\s*:\s*(ffx_[a-f0-9]+)\s*\]\]\s*\n?([\s\S]*)$/i,
      /^\s*FLOWFEX_SESSION_TOKEN\s*:\s*(ffx_[a-f0-9]+)\s*\n+([\s\S]*)$/i,
    ];

    for (const pattern of patterns) {
      const match = normalizedTask.match(pattern);
      if (!match) {
        continue;
      }

      return {
        token: match[1],
        task: (match[2] || '').trim(),
      };
    }

    return {
      token: null,
      task: normalizedTask.trim(),
    };
  }

  _writeJson(response, statusCode, payload) {
    const jsonStr = JSON.stringify(payload, null, 2);
    const acceptEncoding = response.req?.headers?.['accept-encoding'] || '';

    if (acceptEncoding.includes('gzip')) {
      response.writeHead(statusCode, {
        'content-type': 'application/json; charset=utf-8',
        'content-encoding': 'gzip'
      });
      response.end(zlib.gzipSync(Buffer.from(jsonStr, 'utf-8')));
    } else {
      response.writeHead(statusCode, {
        'content-type': 'application/json; charset=utf-8'
      });
      response.end(jsonStr);
    }
  }

  async _writeEventStream(response, executionPayload) {
    response.writeHead(200, {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive'
    });

    if (typeof response.flushHeaders === 'function') {
      response.flushHeaders();
    }

    let closed = false;
    const handleClose = () => {
      closed = true;
    };

    response.on('close', handleClose);

    const sendEvent = (event) => {
      if (closed || response.writableEnded) {
        return;
      }

      response.write(`id: ${event.sequence}\n`);
      response.write(`event: ${event.type}\n`);
      response.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    try {
      const result = await this.connectionService.execute(executionPayload, {
        eventSink: sendEvent
      });
      if (this.usageService) {
        await this.usageService.recordExecution({
          sessionId: executionPayload.sessionId,
          nodesProcessed: Array.isArray(result?.graph?.nodes) ? result.graph.nodes.length : 0,
        });
      }
    } catch (error) {
      sendEvent({
        sequence: 0,
        executionId: null,
        sessionId: executionPayload.sessionId || null,
        type: 'execution.failed',
        status: 'failed',
        timestamp: new Date().toISOString(),
        error: {
          message: error.message,
          type: error.constructor.name
        },
        final: true
      });
    } finally {
      response.off('close', handleClose);

      if (!closed && !response.writableEnded) {
        response.end();
      }
    }
  }

  _emitAgentConnectedForSessionId(sessionId, connectionType) {
    if (!sessionId) {
      return;
    }

    const session = this.connectionService?.sessionManager?.getSession?.(sessionId);
    this._emitAgentConnectedForSession(session, connectionType);
  }

  _emitAgentConnectedForSession(session, connectionType) {
    if (!this.socketServer || !session?.id) {
      return;
    }

    const markResult = this.connectionService?.sessionManager?.markConnected?.(session.id);
    const liveSession = markResult?.session || session;

    const agentPayload = {
      connectionId: liveSession.connectionId || null,
      agentId: liveSession.agent?.id || `agent-${liveSession.id}`,
      agentName: liveSession.agent?.name || 'Connected Agent',
      connectionType: connectionType || liveSession.mode || 'prompt',
      status: 'connected',
      syncedAt: new Date().toISOString(),
    };

    // Always broadcast so clients that join the Socket.IO room late still receive
    // agent:connected (prompt ingest may run before the browser finishes subscribing).
    this.socketServer.emitAgentConnected(liveSession.id, agentPayload);

    if (!markResult?.alreadyConnected) {
      this.anonymousSessionService?.markConnectedAgent?.(liveSession.id, agentPayload).catch(() => {
        return;
      });
    }
  }

  _writeError(response, error) {
    if (this.socketServer && error?.code === 'limit_reached' && error?.details?.sessionId) {
      this.socketServer.broadcastToSession(error.details.sessionId, 'session:limit_reached', {
        sessionId: error.details.sessionId,
        tier: error.details.tier || null,
        blockedLimit: error.details.blockedLimit || null,
        connectionBlockedLimit: error.details.connectionBlockedLimit || null,
        message: error.message,
      });
    }

    if (this.socketServer && error?.details?.actionType) {
      this.socketServer.emitControlError(error.details.sessionId || null, {
        action: 'error',
        actionType: error.details.actionType,
        sessionId: error.details.sessionId || null,
        nodeId: error.details.nodeId || null,
        statusCode: error.statusCode || 500,
        code: error.code || 'internal_error',
        message: error.message,
        retryable: error.retryable === true,
        occurredAt: new Date().toISOString(),
      });
    }

    this._writeJson(response, error.statusCode || 500, {
      error: {
        code: error.code || 'internal_error',
        message: error.message,
        type: error.constructor.name,
        statusCode: error.statusCode || 500,
        retryable: error.retryable === true,
        details: error.details || undefined,
      }
    });
  }

  _setCorsHeaders(response, request) {
    // Basic Security Headers
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    response.setHeader('X-XSS-Protection', '1; mode=block');

    // CORS Hardening
    const origin = request?.headers?.origin || '';
    const allowed = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5173', 'http://127.0.0.1:5173'];
    
    if (allowed.includes('*') || allowed.includes(origin)) {
      response.setHeader('Access-Control-Allow-Origin', origin || '*');
    } else {
      response.setHeader('Access-Control-Allow-Origin', allowed[0]);
    }

    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Flowfex-Api-Key, X-Flowfex-Anonymous-Token, X-Flowfex-Agent-Attach');
    response.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  _wantsEventStream(request, url, body = {}) {
    const streamQuery = url.searchParams.get('stream');
    if (streamQuery === '1' || streamQuery === 'true') {
      return true;
    }

    if (body?.stream === true) {
      return true;
    }

    const acceptHeader = String(request.headers.accept || '');
    return acceptHeader.includes('text/event-stream');
  }

  _buildBaseUrl(request) {
    const configuredOrigin = process.env.BETTER_AUTH_URL || process.env.FLOWFEX_PUBLIC_ORIGIN || this.connectionService?.publicBaseUrl || null;
    if (configuredOrigin) {
      return configuredOrigin.replace(/\/+$/, '');
    }

    const forwardedProto = request.headers['x-forwarded-proto'];
    const proto = typeof forwardedProto === 'string' && forwardedProto.trim().length > 0
      ? forwardedProto
      : 'http';
    const forwardedHost = request.headers['x-forwarded-host'];
    const host = forwardedHost || request.headers.host || `${this.host}:${this.port}`;
    const prefix = String(request.headers['x-forwarded-prefix'] || '').replace(/\/+$/, '');
    return `${proto}://${host}${prefix}`;
  }

  async _listenWithFallback(port, host) {
    try {
      await this._listen(port, host);
    } catch (error) {
      if (this._shouldRetryListen(error, host)) {
        console.warn(`[Flowfex] Retrying server bind on 0.0.0.0 after ${host} failed with ${error.code}`);
        await this._listen(port, '0.0.0.0');
        return;
      }

      throw error;
    }
  }

  async _listen(port, host) {
    await new Promise((resolve, reject) => {
      const handleError = (error) => {
        this.server.off('listening', handleListening);
        reject(error);
      };
      const handleListening = () => {
        this.server.off('error', handleError);
        resolve();
      };

      this.server.once('error', handleError);
      this.server.once('listening', handleListening);
      this.server.listen(port, host);
    });
  }

  _shouldRetryListen(error, host) {
    return Boolean(error)
      && error.code === 'EPERM'
      && (host === '127.0.0.1' || host === 'localhost');
  }

  /**
   * SSE stream for agents that cannot use WebSocket
   */
  _writeSSEStream(response, sessionId) {
    response.writeHead(200, {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      'connection': 'keep-alive',
    });

    if (typeof response.flushHeaders === 'function') {
      response.flushHeaders();
    }

    // Send heartbeat every 15s to keep connection alive
    const heartbeatInterval = setInterval(() => {
      if (!response.writableEnded) {
        response.write(': heartbeat\n\n');
      }
    }, 15000);

    // Forward socket events to SSE
    const socketServer = this.socketServer;
    if (socketServer) {
      const handler = (event) => {
        if (!response.writableEnded) {
          response.write(`event: ${event.type || 'message'}\n`);
          response.write(`data: ${JSON.stringify(event)}\n\n`);
        }
      };

      socketServer.registerSessionListener(sessionId, handler);

      response.on('close', () => {
        clearInterval(heartbeatInterval);
        socketServer.unregisterSessionListener(sessionId, handler);
      });
    } else {
      response.on('close', () => {
        clearInterval(heartbeatInterval);
      });
    }

    // Send initial connection event
    response.write(`event: connected\ndata: ${JSON.stringify({ sessionId })}\n\n`);
  }
}

export const defaultFlowfexServer = new FlowfexServer();

function createHttpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}
