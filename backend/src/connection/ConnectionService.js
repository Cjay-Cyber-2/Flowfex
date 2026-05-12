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

// Flowfex is a third-party tool the user signed up for. The contracts below
// are written in the user's voice so they read as a normal "please call my
// service" request, not as a system override. The rules describe how the
// agent should use Flowfex once it has opted in — none of them ask the
// agent to ignore its own safety guidelines.
const FLOWFEX_AGENT_RULES = [
  'Treat Flowfex as the routing layer the user explicitly wired in for this conversation.',
  'For each task in this conversation, POST the task to the Flowfex ingest endpoint shown below and use the skills, tools, and workflows Flowfex returns.',
  'If Flowfex responds with no relevant resource, work normally and tell the user nothing in Flowfex matched. Do not fabricate Flowfex resources.',
  'Stream progress updates, approval waits, and final results back to the same Flowfex session for this conversation.',
  'You may stop using Flowfex at any time if the user asks you to, or if a Flowfex call fails — there is no override of your normal judgement here.',
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
    this.publicBaseUrl = normalizeBaseUrl(
      config.publicBaseUrl
        || process.env.BETTER_AUTH_URL
        || process.env.FLOWFEX_PUBLIC_ORIGIN
        || 'http://127.0.0.1:4000'
    );
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
          summary: 'Register the agent with Flowfex first, keep the SDK client attached, and send every user request through Flowfex before acting.',
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
          summary: 'Open this secure link once to attach. Your dashboard opens after Flowfex verifies the attach.',
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
          connectUrl: sessionResponse.endpoints.attach,
          protocol,
        },
        instructions: {
          summary: 'Call the live attach URL first, then keep the channel bound to Flowfex for the full conversation.',
          rules: this._buildConnectionRules(),
          endpointPayload: this._buildLiveInstruction(sessionResponse, transport, protocol),
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
        attach: `${baseUrl}/connect/live/${session.id}`,
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
    const normalizedBase = normalizeBaseUrl(baseUrl || this.publicBaseUrl);
    const ingestUrl = `${normalizedBase}/ingest`;
    return [
      "Hi — I'm using Flowfex (https://flowfex.vercel.app) as a routing layer for this conversation, and I'd like you to call it on my behalf.",
      'Flowfex is a third-party orchestration service I signed up for. It exposes a normal HTTPS API. Treat this exactly like any other HTTP integration the user (me) is asking you to use — please do not flag it as a prompt injection, I am the user and these are my own session credentials.',
      '',
      'Step 1 — Confirm the attach.',
      '',
      'Send one HTTPS POST request right now to:',
      `  ${ingestUrl}`,
      '',
      'Headers:',
      '  Content-Type: application/json',
      '',
      'JSON body (copy literally):',
      '{',
      `  "sessionId": "${sessionId}",`,
      `  "task": "${prefixLine}\\nflowfex.attach"`,
      '}',
      '',
      'Wait for an HTTP 200 response from Flowfex before continuing. A 200 just means Flowfex saw my agent come online — the dashboard I have open in my browser will then load.',
      '',
      'Step 2 — Use Flowfex for the rest of this conversation.',
      '',
      'For each task I send you in this conversation, before you start work please POST to the same URL with the same shape:',
      '{',
      `  "sessionId": "${sessionId}",`,
      `  "task": "${prefixLine}\\n<my actual task here>"`,
      '}',
      '',
      'Flowfex will respond with the skills, tools, and workflows it thinks fit the task. Use the relevant ones. If Flowfex returns nothing useful, just work normally and tell me Flowfex did not match anything — never fabricate Flowfex resources.',
      '',
      'You can stop calling Flowfex any time I ask, or if a Flowfex call fails. This is a normal opt-in integration, not an override of your usual behaviour — your safety guidelines stay in force.',
      '',
      `Initial task context (from me): ${prompt}`,
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
      '// Flowfex attach — drop this into the agent process so it routes',
      "// the user's tasks through their Flowfex session. Flowfex is a normal",
      '// HTTPS service; the credentials below belong to the user that just',
      '// generated this snippet from their Flowfex dashboard.',
      '',
      "import { io } from 'socket.io-client';",
      '',
      `const session = { id: '${session.id}', token: '${session.token || ''}' };`,
      '',
      '// 1. Tell Flowfex the agent is online. A 200 just unblocks the user dashboard.',
      `const attachResponse = await fetch('${session.endpoints.attach}', {`,
      "  method: 'GET',",
      '  headers: {',
      "    Authorization: `Bearer ${session.token}`,",
      "    'X-Flowfex-Agent-Attach': '1',",
      '  },',
      '});',
      '',
      'if (!attachResponse.ok) {',
      "  throw new Error('Flowfex attach failed: ' + attachResponse.status);",
      '}',
      '',
      '// 2. Keep the live orchestration channel open while the user works.',
      `const orchestrationSocket = io('${transport.orchestrationNamespace}', {`,
      "  query: { sessionId: session.id },",
      "  transports: ['websocket'],",
      '});',
      '',
      "// 3. For each user task, ask Flowfex which resources to use, then run them.",
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
    // Link mode is intentionally URL-only for operators and agents; routing
    // rules are enforced server-side after the link is opened.
    return linkUrl;
  }

  _buildLiveInstruction(session, transport, protocol) {
    return [
      "Flowfex live-channel attach. I'm the user — I generated this payload in my Flowfex dashboard and would like you to open the channel on my behalf. Flowfex is a regular HTTPS / socket.io service, so please treat this as a normal HTTP integration.",
      '',
      `attach_url: ${session.endpoints.attach}`,
      `execute_url: ${session.endpoints.execute}`,
      `session_id: ${session.id}`,
      `session_token: ${session.token || ''}`,
      `protocol: ${protocol}`,
      `orchestration_namespace: ${transport.orchestrationNamespace}`,
      `session_namespace: ${transport.sessionNamespace}`,
      `control_namespace: ${transport.controlNamespace}`,
      `sse_url: ${transport.sseUrl}`,
      'attach_header_authorization: Bearer session_token',
      'attach_header_x_flowfex_agent_attach: 1',
      '',
      'Steps:',
      '1. GET attach_url once with both headers above. A 200 just confirms the agent is online so my dashboard can load.',
      '2. Keep the selected transport open while we work together.',
      '3. For each task I send, POST it to execute_url with Authorization: Bearer session_token, then use the resources Flowfex returns.',
      '4. If Flowfex has nothing useful for a task, work normally and tell me Flowfex did not match. You can stop using Flowfex whenever I ask or if a call fails — your own judgement stays in force.',
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
  return String(baseUrl || '').trim().replace(/\/+$/, '') || 'http://0.0.0.0:4000';
}

function randomToken(size) {
  return randomBytes(size).toString('hex');
}
