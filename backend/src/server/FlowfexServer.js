import http from 'node:http';
import { URL } from 'node:url';
import { defaultConnectionService } from '../connection/index.js';

/**
 * Minimal HTTP surface for external agent connections.
 */
export class FlowfexServer {
  constructor(config = {}) {
    this.connectionService = config.connectionService || defaultConnectionService;
    this.host = config.host || process.env.FLOWFEX_HOST || '127.0.0.1';
    this.port = Number(config.port ?? process.env.PORT ?? process.env.FLOWFEX_PORT ?? 3000);
    this.maxBodySize = config.maxBodySize || 1024 * 1024;
    this.server = null;
  }

  async start(overrides = {}) {
    if (this.server) {
      return this.getAddress();
    }

    const host = overrides.host || this.host;
    const port = Number(overrides.port ?? this.port);
    this.server = http.createServer((request, response) => {
      this._handleRequest(request, response).catch(error => {
        this._writeError(response, error);
      });
    });

    await new Promise((resolve, reject) => {
      this.server.once('error', reject);
      this.server.listen(port, host, () => {
        this.server.off('error', reject);
        resolve();
      });
    });

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

    if (request.method === 'GET' && url.pathname === '/health') {
      return this._writeJson(response, 200, {
        status: 'ok',
        timestamp: new Date().toISOString()
      });
    }

    if (request.method === 'POST' && url.pathname === '/connect') {
      const body = await this._readJsonBody(request);
      const payload = await this.connectionService.connect(body, {
        apiKey: this._extractApiKey(request)
      });
      return this._writeJson(response, 200, payload);
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
    this._writeJson(response, error.statusCode || 500, {
      error: {
        message: error.message,
        type: error.constructor.name
      }
    });
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
}

export const defaultFlowfexServer = new FlowfexServer();

function createHttpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}
