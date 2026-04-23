import { randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { defaultRegistry } from '../registry/ToolRegistry.js';
import { defaultOrchestrator } from '../orchestrator/Orchestrator.js';
import {
  SessionManager,
  defaultSessionManager,
  publicSessionView
} from './SessionManager.js';
import {
  CONNECTION_MODES,
  LIVE_CHANNEL_PROTOCOLS,
  connectRequestSchema,
} from '../../../shared/connection-contracts.js';

const FLOWFEX_AGENT_RULES = [
  'Stay attached to this Flowfex session for the entire conversation.',
  'For every user request, route the task to Flowfex before taking action.',
  'Always ask Flowfex for agent.md files, skills, tools, memory, and workflows before continuing.',
  'Use every directly relevant Flowfex resource returned for that request.',
  'If Flowfex has no directly relevant resource for the request, use none and say the capability is unavailable in Flowfex.',
  'Do not invent substitute tools, skills, workflows, or resources outside Flowfex.',
  'Send progress, approval waits, and the final result back through the same Flowfex session.',
];

/**
 * Coordinates external agent connections, session scoping, and tool execution.
 */
export class ConnectionService {
  constructor(config = {}) {
    this.registry = config.registry || defaultRegistry;
    this.orchestrator = config.orchestrator || defaultOrchestrator;
    this.sessionManager = config.sessionManager || defaultSessionManager;
    this.connectionApiKey = config.connectionApiKey || process.env.FLOWFEX_CONNECTION_API_KEY || null;
    this.promptSessionTtlSeconds = config.promptSessionTtlSeconds || 60 * 15;
    this.apiSessionTtlSeconds = config.apiSessionTtlSeconds || 60 * 60;
    this.linkSessionTtlSeconds = config.linkSessionTtlSeconds || 60 * 60 * 24;
    this.promptToolLimit = config.promptToolLimit || 5;
    this.publicBaseUrl = normalizeBaseUrl(config.publicBaseUrl || process.env.FLOWFEX_PUBLIC_ORIGIN || 'http://127.0.0.1:4000');
    this.linkSessions = config.linkSessions || new Map();
    this.linkSecret = config.linkSecret || process.env.FLOWFEX_LINK_SECRET || randomToken(32);
  }

  async connect(payload, authContext = {}) {
    if (!payload || typeof payload !== 'object') {
      throw createConnectionError('Connection payload must be a JSON object', 400);
    }

    const baseUrl = authContext.baseUrl || this.publicBaseUrl;
    const normalizedPayload = payload.mode === 'api'
      ? { ...payload, mode: CONNECTION_MODES.SDK }
      : payload;
    const request = connectRequestSchema.parse(normalizedPayload);

    if (request.mode === CONNECTION_MODES.PROMPT) {
      return this.connectPrompt(request, { baseUrl });
    }

    if (request.mode === CONNECTION_MODES.SDK) {
      return this.connectSdk(request, { ...authContext, baseUrl });
    }

    if (request.mode === CONNECTION_MODES.LINK) {
      return this.connectLink(request, { ...authContext, baseUrl });
    }

    if (request.mode === CONNECTION_MODES.LIVE) {
      return this.connectLive(request, { ...authContext, baseUrl });
    }

    throw createConnectionError('Unsupported connection mode', 400);
  }

  async connectPrompt(payload, context = {}) {
    const retrieval = this.registry.retrieveTools(payload.prompt, {
      topK: payload.topK || Math.max(this.promptToolLimit, 12),
      minScore: payload.minScore ?? 0.18,
      allowKeywordFallback: false
    });
    const recommendedToolIds = retrieval.matches.map(match => match.tool.id);
    const { session, token } = this.sessionManager.createSession({
      id: payload.sessionId,
      mode: 'prompt',
      agent: payload.agent,
      metadata: payload.metadata,
      prompt: payload.prompt,
      capabilities: payload.capabilities,
      allowedToolIds: null,
      recommendedToolIds,
      ttlSeconds: payload.ttlSeconds || this.promptSessionTtlSeconds
    });

    const taskPrefix = this._buildPromptTaskPrefix(token);
    const sessionResponse = this._buildSessionResponse(session, token, { baseUrl: context.baseUrl });
    return {
      success: true,
      mode: 'prompt',
      connection: {
        session: sessionResponse,
        retrieval: this._serializeRetrieval(retrieval),
        instructions: {
          sessionUrl: this._buildConnectUrl(context.baseUrl, session.id, token),
          taskPrefix,
          prompt: this._buildPromptInstruction(payload.prompt, session.id, token, context.baseUrl),
          summary: 'Flowfex remains the orchestration layer for the entire conversation and only directly relevant Flowfex resources may be used.',
          rules: this._buildConnectionRules(),
        },
      }
    };
  }

  async connectSdk(payload, authContext = {}) {
    this._authorizeApiConnection(payload, authContext);

    const requestedTools = this._resolveRequestedTools(payload.requestedTools);
    const allowedToolIds = requestedTools.length > 0
      ? requestedTools.map(tool => tool.id)
      : null;
    const { session, token } = this.sessionManager.createSession({
      id: payload.sessionId,
      mode: CONNECTION_MODES.SDK,
      agent: payload.agent,
      metadata: payload.metadata,
      capabilities: payload.capabilities,
      allowedToolIds,
      recommendedToolIds: allowedToolIds,
      ttlSeconds: payload.ttlSeconds || this.apiSessionTtlSeconds
    });
    const sessionResponse = this._buildSessionResponse(session, token, { baseUrl: authContext.baseUrl });
    const transport = this._buildTransport(authContext.baseUrl, session.id, LIVE_CHANNEL_PROTOCOLS.SOCKET_IO);

    return {
      success: true,
      mode: CONNECTION_MODES.SDK,
      connection: {
        session: sessionResponse,
        transport,
        instructions: {
          summary: 'Keep the SDK client attached to Flowfex and send every user request through Flowfex before acting.',
          rules: this._buildConnectionRules(),
          sdkSnippet: this._buildSdkSnippet(sessionResponse, transport),
        },
      }
    };
  }

  async connectLink(payload, authContext = {}) {
    const requestedTools = this._resolveRequestedTools(payload.requestedTools);
    const allowedToolIds = requestedTools.length > 0
      ? requestedTools.map(tool => tool.id)
      : null;
    const { session, token } = this.sessionManager.createSession({
      id: payload.sessionId,
      mode: CONNECTION_MODES.LINK,
      agent: payload.agent,
      metadata: payload.metadata,
      prompt: payload.prompt || null,
      capabilities: payload.capabilities,
      allowedToolIds,
      recommendedToolIds: allowedToolIds,
      ttlSeconds: payload.ttlSeconds || this.linkSessionTtlSeconds
    });
    const linkId = `lnk_${randomToken(12)}`;
    const expiresAt = session.expiresAt;
    const signedLink = jwt.sign(
      {
        typ: 'flowfex-link',
        sid: session.id,
        tok: token,
        jti: linkId,
        singleUse: payload.singleUse !== false,
      },
      this.linkSecret,
      {
        expiresIn: payload.ttlSeconds || this.linkSessionTtlSeconds,
      }
    );

    this.linkSessions.set(linkId, {
      id: linkId,
      sessionId: session.id,
      token,
      singleUse: payload.singleUse !== false,
      expiresAt,
      usedAt: null,
    });
    const sessionResponse = this._buildSessionResponse(session, token, { baseUrl: authContext.baseUrl });
    const transport = this._buildTransport(authContext.baseUrl, session.id, LIVE_CHANNEL_PROTOCOLS.SOCKET_IO);
    const linkUrl = this._buildConnectUrl(authContext.baseUrl, signedLink);

    return {
      success: true,
      mode: CONNECTION_MODES.LINK,
      connection: {
        session: sessionResponse,
        link: {
          url: linkUrl,
          resolverPath: `/connect/live/${signedLink}`,
          singleUse: payload.singleUse !== false,
          expiresAt,
        },
        transport,
        instructions: {
          summary: 'The link resolves into the same Flowfex-first contract: stay attached, ask Flowfex first, use only directly relevant Flowfex resources, and invent nothing.',
          rules: this._buildConnectionRules(),
          attachBrief: this._buildLinkInstruction(linkUrl),
        },
      },
    };
  }

  async connectLive(payload, authContext = {}) {
    this._authorizeApiConnection(payload, authContext);

    const requestedTools = this._resolveRequestedTools(payload.requestedTools);
    const allowedToolIds = requestedTools.length > 0
      ? requestedTools.map(tool => tool.id)
      : null;
    const protocol = payload.protocol || LIVE_CHANNEL_PROTOCOLS.SOCKET_IO;
    const { session, token } = this.sessionManager.createSession({
      id: payload.sessionId,
      mode: CONNECTION_MODES.LIVE,
      agent: payload.agent,
      metadata: {
        ...(payload.metadata || {}),
        liveProtocol: protocol,
      },
      capabilities: payload.capabilities,
      allowedToolIds,
      recommendedToolIds: allowedToolIds,
      ttlSeconds: payload.ttlSeconds || this.apiSessionTtlSeconds,
    });
    const sessionResponse = this._buildSessionResponse(session, token, { baseUrl: authContext.baseUrl });
    const transport = this._buildTransport(authContext.baseUrl, session.id, protocol);

    return {
      success: true,
      mode: CONNECTION_MODES.LIVE,
      connection: {
        session: sessionResponse,
        transport,
        live: {
          connectUrl: this._buildConnectUrl(authContext.baseUrl, session.id, token),
          protocol,
        },
        instructions: {
          summary: 'The live channel keeps the agent bound to Flowfex for the full conversation and requires Flowfex-first resource selection on every request.',
          rules: this._buildConnectionRules(),
          endpointPayload: this._buildLiveInstruction(transport, protocol),
        },
      },
    };
  }

  async execute(payload, options = {}) {
    if (!payload || typeof payload !== 'object') {
      throw createConnectionError('Execution payload must be a JSON object', 400);
    }

    const session = this.sessionManager.authenticate(payload.sessionId, payload.token);
    const executionOptions = {
      allowedToolIds: session.allowedToolIds,
      sessionId: session.id,
      eventSink: options.eventSink,
      agent: session.agent || null,
      sessionContext: {
        mode: session.mode || null,
        metadata: session.metadata || {},
        capabilities: Array.isArray(session.capabilities) ? session.capabilities : [],
        prompt: session.prompt || null,
      },
    };

    if (payload.toolId) {
      this._assertToolAllowed(session, payload.toolId);
      const result = await this.orchestrator.executeTool(payload.toolId, payload.input, executionOptions);
      await this.orchestrator.flushStateStore?.();
      return result;
    }

    const executionInput = Object.prototype.hasOwnProperty.call(payload, 'workflow')
      ? payload.workflow
      : payload.input;

    if (typeof executionInput === 'undefined') {
      throw createConnectionError('Execution requires either input or workflow', 400);
    }

    const result = await this.orchestrator.orchestrate(executionInput, {
      ...executionOptions,
      topK: payload.topK,
      minScore: payload.minScore
    });
    await this.orchestrator.flushStateStore?.();
    return result;
  }

  getSession(sessionId, token) {
    const session = this.sessionManager.authenticate(sessionId, token);
    return {
      session: this._buildSessionResponse(session)
    };
  }

  resolveLiveConnection(identifier, options = {}) {
    this._cleanupLinkSessions();

    const baseUrl = options.baseUrl || this.publicBaseUrl;
    const signedLink = this._verifySignedLink(identifier);
    if (signedLink) {
      const linkState = this.linkSessions.get(signedLink.jti);
      if (signedLink.singleUse && linkState?.usedAt) {
        throw createConnectionError('Connection link has already been used', 410);
      }

      const session = this.sessionManager.getSession(signedLink.sid);
      if (!session) {
        throw createConnectionError('Linked session is no longer active', 404);
      }

      if (linkState) {
        linkState.usedAt = new Date().toISOString();
      }

      return {
        success: true,
        mode: CONNECTION_MODES.LINK,
        connection: {
          session: this._buildSessionResponse(session, signedLink.tok, { baseUrl }),
          transport: this._buildTransport(baseUrl, session.id, LIVE_CHANNEL_PROTOCOLS.SOCKET_IO),
        },
      };
    }

    const linkedSession = this.linkSessions.get(identifier);
    if (linkedSession) {
      if (Date.parse(linkedSession.expiresAt) <= Date.now()) {
        this.linkSessions.delete(identifier);
        throw createConnectionError('Connection link has expired', 410);
      }

      if (linkedSession.singleUse && linkedSession.usedAt) {
        throw createConnectionError('Connection link has already been used', 410);
      }

      const session = this.sessionManager.getSession(linkedSession.sessionId);
      if (!session) {
        throw createConnectionError('Linked session is no longer active', 404);
      }

      linkedSession.usedAt = new Date().toISOString();
      return {
        success: true,
        mode: CONNECTION_MODES.LINK,
        connection: {
          session: this._buildSessionResponse(session, linkedSession.token, { baseUrl }),
          transport: this._buildTransport(baseUrl, session.id, LIVE_CHANNEL_PROTOCOLS.SOCKET_IO),
        },
      };
    }

    const session = this.sessionManager.getSession(identifier);
    if (!session) {
      throw createConnectionError('Session not found', 404);
    }

    if (!options.token) {
      throw createConnectionError('Session token is required to resolve a direct live session', 401);
    }

    this.sessionManager.authenticate(identifier, options.token);
    const protocol = this._resolveSessionProtocol(session);

    return {
      success: true,
      mode: session.mode || CONNECTION_MODES.PROMPT,
      connection: {
        session: this._buildSessionResponse(session, options.token || null, { baseUrl }),
        transport: this._buildTransport(baseUrl, session.id, protocol),
      },
    };
  }

  disconnect(sessionId, token) {
    this.sessionManager.authenticate(sessionId, token);
    const revoked = this.sessionManager.revokeSession(sessionId);
    if (!revoked) {
      throw createConnectionError('Session not found', 404);
    }

    return {
      success: true,
      session: this._buildSessionResponse(revoked)
    };
  }

  _buildSessionResponse(session, token = null, options = {}) {
    const baseUrl = normalizeBaseUrl(options.baseUrl || this.publicBaseUrl);
    const visibleToolIds = Array.isArray(session.allowedToolIds)
      ? session.allowedToolIds
      : Array.isArray(session.recommendedToolIds)
        ? session.recommendedToolIds
        : [];
    return {
      ...publicSessionView(session),
      allowedToolIds: visibleToolIds,
      recommendedToolIds: Array.isArray(session.recommendedToolIds) ? session.recommendedToolIds : [],
      ...(token ? { token } : {}),
      allowedTools: visibleToolIds.length > 0
        ? this.orchestrator.getAvailableTools({
            toolIds: visibleToolIds
          })
        : [],
      recommendedTools: Array.isArray(session.recommendedToolIds) && session.recommendedToolIds.length > 0
        ? this.orchestrator.getAvailableTools({
            toolIds: session.recommendedToolIds
          })
        : [],
      endpoints: {
        connect: `${baseUrl}/connect`,
        inspect: `${baseUrl}/sessions/${session.id}`,
        execute: `${baseUrl}/sessions/${session.id}/execute`,
        executeStream: `${baseUrl}/sessions/${session.id}/execute?stream=1`,
        ingest: `${baseUrl}/ingest`,
        revoke: `${baseUrl}/sessions/${session.id}`,
        state: `${baseUrl}/session/${session.id}/state`,
        stream: `${baseUrl}/session/${session.id}/stream`,
        control: {
          pause: `${baseUrl}/session/${session.id}/pause`,
          resume: `${baseUrl}/session/${session.id}/resume`,
          constrain: `${baseUrl}/session/${session.id}/constrain`,
        },
      }
    };
  }

  _serializeRetrieval(retrieval) {
    return {
      strategy: retrieval.strategy,
      query: retrieval.query,
      fallbackUsed: retrieval.fallbackUsed,
      fallbackReason: retrieval.fallbackReason,
      matches: retrieval.matches.map(match => ({
        tool: {
          id: match.tool.id,
          name: match.tool.name,
          description: match.tool.description
        },
        score: match.score
      }))
    };
  }

  _resolveRequestedTools(requestedTools) {
    if (!Array.isArray(requestedTools) || requestedTools.length === 0) {
      return [];
    }

    return requestedTools.map(toolReference => {
      const resolved = this.registry.resolveTool(toolReference);
      if (!resolved) {
        throw createConnectionError(`Requested tool '${toolReference}' was not found`, 400);
      }

      return resolved;
    });
  }

  _authorizeApiConnection(payload, authContext) {
    if (authContext?.validatedApiKey?.authId) {
      return;
    }

    if (authContext?.authUserId) {
      return;
    }

    if (!this.connectionApiKey) {
      return;
    }

    const presentedKey = payload.apiKey || authContext.apiKey || null;
    if (presentedKey !== this.connectionApiKey) {
      throw createConnectionError('Invalid Flowfex connection API key', 401);
    }
  }

  _assertToolAllowed(session, toolId) {
    if (!Array.isArray(session.allowedToolIds) || session.allowedToolIds.includes(toolId)) {
      return;
    }

    throw createConnectionError(`Tool '${toolId}' is not allowed for this session`, 403);
  }

  _buildTransport(baseUrl, sessionId, protocol) {
    const normalizedBaseUrl = normalizeBaseUrl(baseUrl || this.publicBaseUrl);
    return {
      restBaseUrl: normalizedBaseUrl,
      orchestrationNamespace: `${normalizedBaseUrl}/orchestration`,
      sessionNamespace: `${normalizedBaseUrl}/session`,
      controlNamespace: `${normalizedBaseUrl}/control`,
      sseUrl: `${normalizedBaseUrl}/session/${sessionId}/stream`,
      protocol,
    };
  }

  _buildConnectUrl(baseUrl, identifier, token = null) {
    const normalizedBaseUrl = normalizeBaseUrl(baseUrl || this.publicBaseUrl);
    const query = token ? `?token=${encodeURIComponent(token)}` : '';
    return `${normalizedBaseUrl}/connect/live/${identifier}${query}`;
  }

  _buildPromptInstruction(prompt, sessionId, token, baseUrl) {
    const prefixLine = this._buildPromptTaskPrefix(token);
    return [
      'Attach this agent to Flowfex for the full conversation.',
      '',
      `Session ID: ${sessionId}`,
      `Session URL: ${this._buildConnectUrl(baseUrl, sessionId, token)}`,
      `Ingest URL: ${normalizeBaseUrl(baseUrl || this.publicBaseUrl)}/ingest`,
      '',
      'Contract:',
      '1. Prefix every task you send to Flowfex with the exact first line below.',
      `   ${prefixLine}`,
      '2. Put the actual task content on the following lines after the prefix.',
      '3. For every user request, ask Flowfex first for agent.md files, skills, tools, memory, and workflows.',
      '4. Use all directly relevant Flowfex resources returned for that request.',
      '5. If Flowfex has no directly relevant resource for the request, use none and say the capability is unavailable in Flowfex.',
      '6. Do not invent substitute tools, workflows, or skills outside Flowfex.',
      '7. Emit step updates, approval waits, and the final result back through the same Flowfex session.',
      '',
      `Agent context: ${prompt}`,
    ].join('\n');
  }

  _buildPromptTaskPrefix(token) {
    return `FLOWFEX_SESSION_TOKEN: ${token}`;
  }

  _buildConnectionRules() {
    return [...FLOWFEX_AGENT_RULES];
  }

  _buildSdkSnippet(session, transport) {
    return [
      "import { io } from 'socket.io-client';",
      '',
      `const session = { id: '${session.id}', token: '${session.token || ''}' };`,
      '',
      '// Flowfex contract:',
      '// - Stay attached to this session for the full conversation.',
      '// - Send every user request to Flowfex first.',
      '// - Use all directly relevant Flowfex resources for that request.',
      '// - If Flowfex has no relevant resource, do not invent one.',
      '',
      `const orchestrationSocket = io('${transport.orchestrationNamespace}', {`,
      "  query: { sessionId: session.id },",
      "  transports: ['websocket'],",
      '});',
      '',
      `const response = await fetch('${session.endpoints.execute}', {`,
      "  method: 'POST',",
      '  headers: {',
      "    'Content-Type': 'application/json',",
      "    Authorization: `Bearer ${session.token}`,",
      '  },',
      '  body: JSON.stringify({ input: userRequest }),',
      '});',
      '',
      'const result = await response.json();',
    ].join('\n');
  }

  _buildLinkInstruction(linkUrl) {
    return [
      `Attach URL: ${linkUrl}`,
      'After attach, keep the agent in the same Flowfex session for the full conversation.',
      'For every user request, ask Flowfex first and use only directly relevant Flowfex resources.',
      'If Flowfex has no relevant resource, use none and do not invent a substitute.',
    ].join('\n');
  }

  _buildLiveInstruction(transport, protocol) {
    return [
      transport.orchestrationNamespace,
      `channel: ${protocol}`,
      `sse: ${transport.sseUrl}`,
      `control: ${transport.controlNamespace}`,
      'session_scope: full_conversation',
      'routing_mode: flowfex_first',
      'resource_policy: use_all_directly_relevant',
      'no_match_policy: use_none',
    ].join('\n');
  }

  _resolveSessionProtocol(session) {
    const metadataProtocol = session?.metadata?.liveProtocol;
    if (metadataProtocol === LIVE_CHANNEL_PROTOCOLS.SSE) {
      return LIVE_CHANNEL_PROTOCOLS.SSE;
    }

    return LIVE_CHANNEL_PROTOCOLS.SOCKET_IO;
  }

  _cleanupLinkSessions() {
    const now = Date.now();
    for (const [linkId, link] of this.linkSessions.entries()) {
      if (Date.parse(link.expiresAt) <= now) {
        this.linkSessions.delete(linkId);
      }
    }
  }

  _verifySignedLink(identifier) {
    try {
      const payload = jwt.verify(identifier, this.linkSecret);
      if (!payload || payload.typ !== 'flowfex-link') {
        return null;
      }

      return payload;
    } catch {
      return null;
    }
  }
}

export const defaultConnectionService = new ConnectionService({
  registry: defaultRegistry,
  orchestrator: defaultOrchestrator,
  sessionManager: defaultSessionManager
});

function createConnectionError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeBaseUrl(baseUrl) {
  return String(baseUrl || '').trim().replace(/\/+$/, '') || 'http://127.0.0.1:4000';
}

function randomToken(size) {
  return randomBytes(size).toString('hex');
}
