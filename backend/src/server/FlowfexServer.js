import http from 'node:http';
import { URL } from 'node:url';
import { defaultConnectionService } from '../connection/index.js';
import { FlowfexSocketServer, initSocketServer, getSocketServer } from '../ws/server.js';
import { ControlController } from '../control/ControlController.js';

/**
 * Minimal HTTP surface for external agent connections.
 */
export class FlowfexServer {
  constructor(config = {}) {
    this.connectionService = config.connectionService || defaultConnectionService;
    this.controlController = config.controlController || new ControlController({
      orchestrator: this.connectionService.orchestrator,
      sessionStateRepository: config.sessionStateRepository,
      lockManager: config.lockManager,
      socketServer: config.socketServer || null,
    });
    this.host = config.host || process.env.FLOWFEX_HOST || '127.0.0.1';
    this.port = Number(config.port ?? process.env.PORT ?? process.env.FLOWFEX_PORT ?? 4000);
    this.maxBodySize = config.maxBodySize || 1024 * 1024;
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
      this._setCorsHeaders(response);
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
      corsOrigin: '*',
    });
    if (this.connectionService?.orchestrator?.setSocketServer) {
      this.connectionService.orchestrator.setSocketServer(this.socketServer);
    }
    if (this.controlController?.setSocketServer) {
      this.controlController.setSocketServer(this.socketServer);
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
    this.server = null;

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
    const skillsSearchMatch = url.pathname === '/skills/search';
    const ingestMatch = url.pathname === '/ingest';
    const sseStreamMatch = url.pathname.match(/^\/session\/([^/]+)\/stream$/);

    if (request.method === 'GET' && url.pathname === '/health') {
      return this._writeJson(response, 200, {
        status: 'ok',
        timestamp: new Date().toISOString(),
        websocket: this.socketServer ? this.socketServer.getStats() : null,
      });
    }

    if (request.method === 'POST' && url.pathname === '/connect') {
      const body = await this._readJsonBody(request);
      const payload = await this.connectionService.connect(body, {
        apiKey: this._extractApiKey(request),
        baseUrl: this._buildBaseUrl(request),
      });

      // Emit agent:connected via WebSocket
      if (this.socketServer && payload.connection?.session?.id) {
        const sid = payload.connection.session.id;
        this.socketServer.emitAgentConnected(sid, {
          agentId: body.agent?.name || 'agent-' + Date.now(),
          agentName: body.agent?.name || 'Connected Agent',
          connectionType: body.mode || 'prompt',
          status: 'connected',
        });
      }

      return this._writeJson(response, 200, payload);
    }

    if (request.method === 'GET' && connectLiveMatch) {
      const payload = this.connectionService.resolveLiveConnection(connectLiveMatch[1], {
        baseUrl: this._buildBaseUrl(request),
        token: url.searchParams.get('token') || null,
      });
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
      const body = await this._readJsonBody(request);
      const payload = await this.controlController.pauseSession({
        sessionId: pauseMatch[1],
      }, body);
      return this._writeJson(response, 200, payload);
    }

    if (request.method === 'POST' && resumeMatch) {
      const body = await this._readJsonBody(request);
      const payload = await this.controlController.resumeSession({
        sessionId: resumeMatch[1],
      }, body);
      return this._writeJson(response, 200, payload);
    }

    if (request.method === 'POST' && approveMatch) {
      const body = await this._readJsonBody(request);
      const payload = await this.controlController.approveNode({
        nodeId: approveMatch[1],
      }, body);
      return this._writeJson(response, 200, payload);
    }

    if (request.method === 'POST' && rejectMatch) {
      const body = await this._readJsonBody(request);
      const payload = await this.controlController.rejectNode({
        nodeId: rejectMatch[1],
      }, body);
      return this._writeJson(response, 200, payload);
    }

    if (request.method === 'POST' && rerouteMatch) {
      const body = await this._readJsonBody(request);
      const payload = await this.controlController.rerouteNode({
        nodeId: rerouteMatch[1],
      }, body);
      return this._writeJson(response, 200, payload);
    }

    if (request.method === 'POST' && constrainMatch) {
      const body = await this._readJsonBody(request);
      const payload = await this.controlController.constrainSession({
        sessionId: constrainMatch[1],
      }, {
        ...body,
        blockedSkillIds: body.blockedSkillIds || body.skillIds || [],
      });
      return this._writeJson(response, 200, payload);
    }

    // ─── Skills Search ────────────────────────────────────────────────
    if (request.method === 'POST' && skillsSearchMatch) {
      const body = await this._readJsonBody(request);
      const query = body.query || '';
      const registry = this.connectionService?.orchestrator?.registry
        || this.connectionService?.registry;

      if (!registry) {
        return this._writeJson(response, 200, { results: [], query });
      }

      const retrieval = registry.retrieveTools(query, { topK: 10 });
      const results = retrieval.matches.map(m => ({
        id: m.tool.id,
        name: m.tool.name,
        description: m.tool.description,
        category: m.tool.metadata?.category || 'uncategorized',
        score: m.score,
        strategy: m.strategy,
      }));

      return this._writeJson(response, 200, { results, query, strategy: retrieval.strategy });
    }

    // ─── Agent Ingest (prompt-based connection) ────────────────────────
    if (request.method === 'POST' && ingestMatch) {
      const body = await this._readJsonBody(request);
      const { token, task } = body;

      try {
        const payload = await this.connectionService.execute({
          sessionId: token,
          input: task,
          token: this._extractBearerToken(request),
        });
        return this._writeJson(response, 200, payload);
      } catch (error) {
        return this._writeJson(response, 400, { error: { message: error.message } });
      }
    }

    // ─── SSE Stream ───────────────────────────────────────────────────
    if (request.method === 'GET' && sseStreamMatch) {
      const sessionId = sseStreamMatch[1];
      return this._writeSSEStream(response, sessionId);
    }

    if (request.method === 'POST' && executionMatch) {
      const body = await this._readJsonBody(request);
      const executionPayload = {
        ...body,
        sessionId: executionMatch[1],
        token: this._extractBearerToken(request)
      };

      if (this._wantsEventStream(request, url, body)) {
        return this._writeEventStream(response, executionPayload);
      }

      const payload = await this.connectionService.execute(executionPayload);
      return this._writeJson(response, 200, payload);
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

  _extractApiKey(request) {
    return request.headers['x-flowfex-api-key'] || null;
  }

  _extractBearerToken(request) {
    const header = request.headers.authorization || '';
    if (!header.toLowerCase().startsWith('bearer ')) {
      return null;
    }

    return header.slice(7).trim();
  }

  _writeJson(response, statusCode, payload) {
    response.writeHead(statusCode, {
      'content-type': 'application/json; charset=utf-8'
    });
    response.end(JSON.stringify(payload, null, 2));
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
      await this.connectionService.execute(executionPayload, {
        eventSink: sendEvent
      });
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

  _writeError(response, error) {
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

  _setCorsHeaders(response) {
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Flowfex-Api-Key');
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
    const forwardedProto = request.headers['x-forwarded-proto'];
    const proto = typeof forwardedProto === 'string' && forwardedProto.trim().length > 0
      ? forwardedProto
      : 'http';
    const host = request.headers.host || `${this.host}:${this.port}`;
    return `${proto}://${host}`;
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
