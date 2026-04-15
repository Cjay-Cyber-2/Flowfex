import { defaultRegistry } from '../registry/ToolRegistry.js';
import { defaultOrchestrator } from '../orchestrator/Orchestrator.js';
import {
  SessionManager,
  defaultSessionManager,
  publicSessionView
} from './SessionManager.js';

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
    this.promptToolLimit = config.promptToolLimit || 5;
  }

  async connect(payload, authContext = {}) {
    if (!payload || typeof payload !== 'object') {
      throw createConnectionError('Connection payload must be a JSON object', 400);
    }

    if (payload.mode === 'prompt') {
      return this.connectPrompt(payload);
    }

    if (payload.mode === 'api') {
      return this.connectApi(payload, authContext);
    }

    throw createConnectionError("Connection mode must be 'prompt' or 'api'", 400);
  }

  async connectPrompt(payload) {
    if (typeof payload.prompt !== 'string' || payload.prompt.trim().length === 0) {
      throw createConnectionError('Prompt connections require a non-empty prompt', 400);
    }

    const retrieval = this.registry.retrieveTools(payload.prompt, {
      topK: payload.topK || this.promptToolLimit,
      minScore: payload.minScore ?? 0.05,
      allowKeywordFallback: true
    });
    const recommendedToolIds = retrieval.matches.map(match => match.tool.id);
    const { session, token } = this.sessionManager.createSession({
      mode: 'prompt',
      agent: payload.agent,
      metadata: payload.metadata,
      prompt: payload.prompt,
      capabilities: payload.capabilities,
      allowedToolIds: recommendedToolIds,
      recommendedToolIds,
      ttlSeconds: payload.ttlSeconds || this.promptSessionTtlSeconds
    });

    return {
      success: true,
      mode: 'prompt',
      connection: {
        session: this._buildSessionResponse(session, token),
        retrieval: this._serializeRetrieval(retrieval)
      }
    };
  }

  async connectApi(payload, authContext = {}) {
    this._authorizeApiConnection(payload, authContext);

    const requestedTools = this._resolveRequestedTools(payload.requestedTools);
    const allowedToolIds = requestedTools.length > 0
      ? requestedTools.map(tool => tool.id)
      : this.registry.getAllTools().map(tool => tool.id);
    const { session, token } = this.sessionManager.createSession({
      mode: 'api',
      agent: payload.agent,
      metadata: payload.metadata,
      capabilities: payload.capabilities,
      allowedToolIds,
      recommendedToolIds: allowedToolIds,
      ttlSeconds: payload.ttlSeconds || this.apiSessionTtlSeconds
    });

    return {
      success: true,
      mode: 'api',
      connection: {
        session: this._buildSessionResponse(session, token)
      }
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
      return this.orchestrator.executeTool(payload.toolId, payload.input, executionOptions);
    }

    const executionInput = Object.prototype.hasOwnProperty.call(payload, 'workflow')
      ? payload.workflow
      : payload.input;

    if (typeof executionInput === 'undefined') {
      throw createConnectionError('Execution requires either input or workflow', 400);
    }

    return this.orchestrator.orchestrate(executionInput, {
      ...executionOptions,
      topK: payload.topK,
      minScore: payload.minScore
    });
  }

  getSession(sessionId, token) {
    const session = this.sessionManager.authenticate(sessionId, token);
    return {
      session: this._buildSessionResponse(session)
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

  _buildSessionResponse(session, token = null) {
    return {
      ...publicSessionView(session),
      ...(token ? { token } : {}),
      allowedTools: this.orchestrator.getAvailableTools({
        toolIds: session.allowedToolIds || undefined
      }),
      recommendedTools: this.orchestrator.getAvailableTools({
        toolIds: session.recommendedToolIds || undefined
      }),
      endpoints: {
        connect: '/connect',
        inspect: `/sessions/${session.id}`,
        execute: `/sessions/${session.id}/execute`,
        executeStream: `/sessions/${session.id}/execute?stream=1`,
        revoke: `/sessions/${session.id}`
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
