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

  emitNodeRejected(nodeId: string, data: Record<string, unknown> = {}): void {
    this.socketServer?.emitNodeRejected(this.sessionId, nodeId, data);
    this.emit('node:rejected', { nodeId, ...data });
  }

  emitNodeError(nodeId: string, error: ExecutionErrorInfo): void {
    this.socketServer?.emitNodeError(this.sessionId, nodeId, error.message);
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

    this.eventSink?.(event);
    this.logger.info({
      event: 'orchestration.event.emitted',
      message: `Emitted ${type}`,
      sessionId: this.sessionId,
      executionId: this.executionId,
      channelEvent: type,
    });
  }
}
