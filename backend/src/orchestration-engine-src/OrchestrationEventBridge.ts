import type {
  EngineLogger,
  ExecutionGraph,
  OrchestrationEventRecord,
  SocketServerLike,
} from './contracts.js';
import type { ExecutionErrorInfo } from './contracts.js';

export class OrchestrationEventBridge {
  private sequence = 0;
  private readonly executionId: string;
  private readonly sessionId: string;
  private readonly eventSink?: (event: OrchestrationEventRecord) => void;
  private readonly socketServer?: SocketServerLike | null;
  private readonly logger: EngineLogger;

  constructor(config: {
    executionId: string;
    sessionId: string;
    eventSink?: (event: OrchestrationEventRecord) => void;
    socketServer?: SocketServerLike | null;
    logger: EngineLogger;
  }) {
    this.executionId = config.executionId;
    this.sessionId = config.sessionId;
    this.eventSink = config.eventSink;
    this.socketServer = config.socketServer;
    this.logger = config.logger;
  }

  emitGraphCreated(graph: ExecutionGraph): void {
    this.socketServer?.emitGraphCreated(this.sessionId, graph);
    this.emit('graph:created', { graph });
  }

  emitNodeExecuting(nodeId: string, data: Record<string, unknown> = {}): void {
    this.socketServer?.emitNodeExecuting(this.sessionId, nodeId, data);
    this.emit('node:executing', { nodeId, ...data });
  }

  emitNodeCompleted(nodeId: string, data: Record<string, unknown> = {}): void {
    this.socketServer?.emitNodeCompleted(this.sessionId, nodeId, data);
    this.emit('node:completed', { nodeId, ...data });
  }

  emitNodeAwaitingApproval(nodeId: string, data: Record<string, unknown> = {}): void {
    this.socketServer?.emitNodeAwaitingApproval(this.sessionId, nodeId, data);
    this.emit('node:awaiting_approval', { nodeId, ...data });
  }

  emitNodeApproved(nodeId: string, data: Record<string, unknown> = {}): void {
    this.socketServer?.emitNodeApproved?.(this.sessionId, nodeId, data);
    this.emit('node:approved', { nodeId, ...data });
  }

  emitNodeRejected(nodeId: string, data: Record<string, unknown> = {}): void {
    this.socketServer?.emitNodeRejected(this.sessionId, nodeId, data);
    this.emit('node:rejected', { nodeId, ...data });
  }

  emitNodeError(nodeId: string, error: ExecutionErrorInfo): void {
    this.socketServer?.emitNodeError(this.sessionId, nodeId, error);
    this.emit('node:error', { nodeId, error });
  }

  emitEdgeActive(edgeId: string, data: Record<string, unknown> = {}): void {
    this.socketServer?.emitEdgeActive(this.sessionId, edgeId);
    this.emit('edge:active', { edgeId, ...data });
  }

  emitPathRerouted(edgeId: string, data: Record<string, unknown> = {}): void {
    this.socketServer?.emitPathRerouted(this.sessionId, edgeId, data);
    this.emit('path:rerouted', { edgeId, ...data });
  }

  emitSessionPaused(data: Record<string, unknown> = {}): void {
    this.socketServer?.emitSessionPaused?.(this.sessionId, data);
    this.emit('session:paused', data);
  }

  emitSessionResumed(data: Record<string, unknown> = {}): void {
    this.socketServer?.emitSessionResumed?.(this.sessionId, data);
    this.emit('session:resumed', data);
  }

  emitSessionConstrained(data: Record<string, unknown> = {}): void {
    this.socketServer?.emitSessionConstrained?.(this.sessionId, data);
    this.emit('session:constrained', data);
  }

  emitSessionState(data: Record<string, unknown> = {}): void {
    this.socketServer?.emitSessionState?.(this.sessionId, data);
    this.emit('session:state', data);
  }

  emitControlError(error: Record<string, unknown>): void {
    this.socketServer?.emitControlError?.(this.sessionId, error);
    this.emit('control:error', error);
  }

  emitDiagnostic(type: string, payload: Record<string, unknown>): void {
    this.emit(type, payload);
  }

  private emit(type: string, payload: Record<string, unknown>): void {
    const event: OrchestrationEventRecord = {
      id: `${this.executionId}:${String(this.sequence + 1).padStart(4, '0')}`,
      sequence: ++this.sequence,
      executionId: this.executionId,
      sessionId: this.sessionId,
      type,
      timestamp: new Date().toISOString(),
      payload,
    };
    this.attachTopLevelFields(event, payload);

    this.eventSink?.(event);
    this.logger.info({
      event: 'orchestration.event.emitted',
      message: `Emitted ${type}`,
      sessionId: this.sessionId,
      executionId: this.executionId,
      channelEvent: type,
    });
  }

  private attachTopLevelFields(event: OrchestrationEventRecord, payload: Record<string, unknown>): void {
    if (typeof payload.status === 'string') {
      event.status = payload.status;
    }

    assignRecordField(event, 'workflow', payload.workflow);
    assignRecordField(event, 'step', payload.step);
    assignRecordField(event, 'selection', payload.selection);
    assignRecordField(event, 'progress', payload.progress);
    assignRecordField(event, 'reroute', payload.reroute);
    assignRecordField(event, 'data', payload.data);
    assignRecordField(event, 'error', payload.error);

    if (payload.final === true) {
      event.final = true;
    }
  }
}

function assignRecordField(
  event: OrchestrationEventRecord,
  key: 'workflow' | 'step' | 'selection' | 'progress' | 'reroute' | 'data' | 'error',
  value: unknown
): void {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return;
  }

  event[key] = value as Record<string, unknown>;
}
