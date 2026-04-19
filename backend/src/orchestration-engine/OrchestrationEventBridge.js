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
    emitNodeApproved(nodeId, data = {}) {
        this.socketServer?.emitNodeApproved?.(this.sessionId, nodeId, data);
        this.emit('node:approved', { nodeId, ...data });
    }
    emitNodeRejected(nodeId, data = {}) {
        this.socketServer?.emitNodeRejected(this.sessionId, nodeId, data);
        this.emit('node:rejected', { nodeId, ...data });
    }
    emitNodeError(nodeId, error) {
        this.socketServer?.emitNodeError(this.sessionId, nodeId, error);
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
    emitSessionPaused(data = {}) {
        this.socketServer?.emitSessionPaused?.(this.sessionId, data);
        this.emit('session:paused', data);
    }
    emitSessionResumed(data = {}) {
        this.socketServer?.emitSessionResumed?.(this.sessionId, data);
        this.emit('session:resumed', data);
    }
    emitSessionConstrained(data = {}) {
        this.socketServer?.emitSessionConstrained?.(this.sessionId, data);
        this.emit('session:constrained', data);
    }
    emitSessionState(data = {}) {
        this.socketServer?.emitSessionState?.(this.sessionId, data);
        this.emit('session:state', data);
    }
    emitControlError(error) {
        this.socketServer?.emitControlError?.(this.sessionId, error);
        this.emit('control:error', error);
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
    attachTopLevelFields(event, payload) {
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
function assignRecordField(event, key, value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return;
    }
    event[key] = value;
}
