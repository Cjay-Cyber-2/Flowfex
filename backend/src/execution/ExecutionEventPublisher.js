const DEFAULT_STATUS_BY_TYPE = {
  'execution.started': 'running',
  'execution.completed': 'completed',
  'execution.failed': 'failed',
  'step.started': 'running',
  'step.progress': 'running',
  'step.completed': 'completed',
  'step.failed': 'failed',
  'step.rerouted': 'rerouted'
};

/**
 * Creates normalized execution events that can be streamed to clients.
 * The payload shape is intentionally flat and stable so UI renderers can
 * consume it incrementally without knowing every future event subtype.
 */
export class ExecutionEventPublisher {
  constructor(config = {}) {
    this.executionId = config.executionId || null;
    this.sessionId = config.sessionId || null;
    this.sequence = 0;
    this.onEvent = typeof config.onEvent === 'function' ? config.onEvent : null;
    this.socketServer = config.socketServer || null;
  }

  setContext(context = {}) {
    if (context.executionId) {
      this.executionId = context.executionId;
    }

    if (Object.prototype.hasOwnProperty.call(context, 'sessionId')) {
      this.sessionId = context.sessionId;
    }

    if (context.socketServer) {
      this.socketServer = context.socketServer;
    }
  }

  emit(type, payload = {}) {
    const event = {
      id: buildEventId(this.executionId || payload.executionId || 'pending', this.sequence + 1),
      sequence: ++this.sequence,
      executionId: payload.executionId || this.executionId || null,
      sessionId: Object.prototype.hasOwnProperty.call(payload, 'sessionId')
        ? payload.sessionId
        : this.sessionId,
      type,
      status: payload.status || DEFAULT_STATUS_BY_TYPE[type] || 'running',
      timestamp: new Date().toISOString()
    };

    if (payload.workflow) {
      event.workflow = normalizeObject(payload.workflow);
    }

    if (payload.step) {
      event.step = normalizeObject(payload.step);
    }

    if (payload.selection) {
      event.selection = normalizeObject(payload.selection);
    }

    if (payload.progress) {
      event.progress = normalizeProgress(payload.progress);
    }

    if (payload.reroute) {
      event.reroute = normalizeObject(payload.reroute);
    }

    if (payload.data) {
      event.data = normalizeObject(payload.data);
    }

    if (payload.error) {
      event.error = serializeError(payload.error);
    }

    if (payload.final) {
      event.final = true;
    }

    // Callback sink
    if (this.onEvent) {
      try {
        this.onEvent(event);
      } catch {
        // Event streaming is best-effort and should not interrupt execution.
      }
    }

    // Socket.io bridge — forward events to WebSocket namespaces
    if (this.socketServer && event.sessionId) {
      this._bridgeToSocket(event);
    }

    return event;
  }

  /**
   * Bridge orchestrator events to WebSocket namespace events.
   * Maps internal event types to canvas-compatible socket events.
   */
  _bridgeToSocket(event) {
    const ws = this.socketServer;
    const sid = event.sessionId;
    const step = event.step || {};
    const nodeId = step.tool || step.toolId || step.nodeId || null;

    try {
      switch (event.type) {
        case 'execution.started':
          // Graph data is emitted separately via GraphBuilder
          break;

        case 'step.started':
          if (nodeId) {
            ws.emitNodeExecuting(sid, nodeId, {
              selection: event.selection,
            });
          }
          break;

        case 'step.completed':
          if (nodeId) {
            ws.emitNodeCompleted(sid, nodeId, {
              output: step.output,
            });
          }
          break;

        case 'step.progress':
          // Progress updates are emitted as node:executing updates
          if (nodeId) {
            ws.emitNodeExecuting(sid, nodeId, {
              progress: event.progress,
            });
          }
          break;

        case 'step.rerouted':
          if (nodeId) {
            ws.emitNodeRejected(sid, nodeId);
          }
          if (event.reroute) {
            const edgeId = `edge-reroute-${nodeId}`;
            ws.emitPathRerouted(sid, edgeId, event.reroute);
          }
          break;

        case 'step.failed':
          if (nodeId) {
            ws.emitNodeError(sid, nodeId, event.error?.message || 'Unknown error');
          }
          break;

        case 'execution.completed':
          // Final completion — no specific node event needed
          break;

        case 'execution.failed':
          // Failure event — no specific node event needed
          break;

        default:
          break;
      }
    } catch {
      // Socket bridging is best-effort
    }
  }
}

function buildEventId(executionId, sequence) {
  return `evt_${executionId}_${String(sequence).padStart(4, '0')}`;
}

function normalizeProgress(progress) {
  if (typeof progress === 'number') {
    return {
      percent: clampPercent(progress)
    };
  }

  if (!progress || typeof progress !== 'object') {
    return {};
  }

  const normalized = {
    ...(progress.phase ? { phase: progress.phase } : {}),
    ...(progress.message ? { message: progress.message } : {}),
    ...(typeof progress.current === 'number' ? { current: progress.current } : {}),
    ...(typeof progress.total === 'number' ? { total: progress.total } : {})
  };

  const percent = resolvePercent(progress);
  if (percent !== null) {
    normalized.percent = percent;
  }

  return normalized;
}

function resolvePercent(progress) {
  if (typeof progress.percent === 'number') {
    return clampPercent(progress.percent);
  }

  if (typeof progress.current === 'number' && typeof progress.total === 'number' && progress.total > 0) {
    return clampPercent((progress.current / progress.total) * 100);
  }

  return null;
}

function clampPercent(value) {
  return Math.max(0, Math.min(100, Number(value.toFixed(2))));
}

function serializeError(error) {
  if (!error || typeof error !== 'object') {
    return {
      message: String(error),
      type: 'Error'
    };
  }

  return {
    message: error.message || 'Unknown error',
    type: error.constructor?.name || error.name || 'Error'
  };
}

function normalizeObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return value;
  }

  return { ...value };
}
