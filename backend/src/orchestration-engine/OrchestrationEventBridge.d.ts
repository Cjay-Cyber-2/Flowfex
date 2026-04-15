import type { EngineLogger, ExecutionGraph, OrchestrationEventRecord, SocketServerLike } from './contracts.js';
import type { ExecutionErrorInfo } from './contracts.js';
export declare class OrchestrationEventBridge {
    private sequence;
    private readonly executionId;
    private readonly sessionId;
    private readonly eventSink?;
    private readonly socketServer?;
    private readonly logger;
    constructor(config: {
        executionId: string;
        sessionId: string;
        eventSink?: (event: OrchestrationEventRecord) => void;
        socketServer?: SocketServerLike | null;
        logger: EngineLogger;
    });
    emitGraphCreated(graph: ExecutionGraph): void;
    emitNodeExecuting(nodeId: string, data?: Record<string, unknown>): void;
    emitNodeCompleted(nodeId: string, data?: Record<string, unknown>): void;
    emitNodeAwaitingApproval(nodeId: string, data?: Record<string, unknown>): void;
    emitNodeRejected(nodeId: string, data?: Record<string, unknown>): void;
    emitNodeError(nodeId: string, error: ExecutionErrorInfo): void;
    emitEdgeActive(edgeId: string, data?: Record<string, unknown>): void;
    emitPathRerouted(edgeId: string, data?: Record<string, unknown>): void;
    emitDiagnostic(type: string, payload: Record<string, unknown>): void;
    private emit;
}
