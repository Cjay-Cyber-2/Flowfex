export class OrchestrationEventBridge {
    sequence = 0;
    executionId;
    sessionId;
    eventSink;
    socketServer;
    logger;
    constructor(config) {
        this.executionId = config.executionId;
        this.sessionId = config.sessionId;
        this.eventSink = config.eventSink;
        this.socketServer = config.socketServer;
        this.logger = config.logger;
    }
    emitGraphCreated(graph) {
        this.socketServer?.emitGraphCreated(this.sessionId, graph);
        this.emit('graph:created', { graph });
    }
    emitNodeExecuting(nodeId, data = {}) {
        this.socketServer?.emitNodeExecuting(this.sessionId, nodeId, data);
        this.emit('node:executing', { nodeId, ...data });
    }
    emitNodeCompleted(nodeId, data = {}) {
        this.socketServer?.emitNodeCompleted(this.sessionId, nodeId, data);
        this.emit('node:completed', { nodeId, ...data });
    }
    emitNodeAwaitingApproval(nodeId, data = {}) {
        this.socketServer?.emitNodeAwaitingApproval(this.sessionId, nodeId, data);
        this.emit('node:awaiting_approval', { nodeId, ...data });
    }
    emitNodeRejected(nodeId, data = {}) {
        this.socketServer?.emitNodeRejected(this.sessionId, nodeId, data);
        this.emit('node:rejected', { nodeId, ...data });
    }
    emitNodeError(nodeId, error) {
        this.socketServer?.emitNodeError(this.sessionId, nodeId, error.message);
        this.emit('node:error', { nodeId, error });
    }
    emitEdgeActive(edgeId, data = {}) {
        this.socketServer?.emitEdgeActive(this.sessionId, edgeId);
        this.emit('edge:active', { edgeId, ...data });
    }
    emitPathRerouted(edgeId, data = {}) {
        this.socketServer?.emitPathRerouted(this.sessionId, edgeId, data);
        this.emit('path:rerouted', { edgeId, ...data });
    }
    emitDiagnostic(type, payload) {
        this.emit(type, payload);
    }
    emit(type, payload) {
        const event = {
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
