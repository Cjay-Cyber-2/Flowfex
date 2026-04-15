import { ExecutionGraphSchema } from './schemas.js';
import { toSerializable } from './utils.js';
export class SessionStateStore {
    sessions = new Map();
    initialize(config) {
        ExecutionGraphSchema.parse(config.graph);
        const now = new Date().toISOString();
        const state = {
            sessionId: config.sessionId,
            executionId: config.executionId,
            task: config.task,
            status: config.status || 'ready',
            createdAt: now,
            updatedAt: now,
            currentNodeId: null,
            pendingNodeId: config.graph.nodes[0]?.id || null,
            completedNodeIds: [],
            graph: toSerializable(config.graph),
            outputs: {},
            errors: {},
            branchChoices: {},
            trace: [],
            intent: toSerializable(config.intent),
            selection: toSerializable(config.selection),
        };
        this.sessions.set(config.sessionId, state);
        return this.getSnapshot(config.sessionId);
    }
    getSnapshot(sessionId) {
        const state = this.sessions.get(sessionId);
        return state ? toSerializable(state) : null;
    }
    setStatus(sessionId, status) {
        this.mutate(sessionId, state => {
            state.status = status;
        });
    }
    setCurrentNode(sessionId, nodeId) {
        this.mutate(sessionId, state => {
            state.currentNodeId = nodeId;
            state.pendingNodeId = nodeId;
        });
    }
    markPendingNode(sessionId, nodeId) {
        this.mutate(sessionId, state => {
            state.pendingNodeId = nodeId;
        });
    }
    updateNodeState(sessionId, nodeId, nextState) {
        this.mutate(sessionId, state => {
            state.graph.nodes = state.graph.nodes.map(node => node.id === nodeId ? { ...node, state: nextState } : node);
            if (nextState === 'completed' && !state.completedNodeIds.includes(nodeId)) {
                state.completedNodeIds.push(nodeId);
            }
        });
    }
    updateEdgeState(sessionId, edgeId, nextState) {
        this.mutate(sessionId, state => {
            state.graph.edges = state.graph.edges.map(edge => edge.id === edgeId ? { ...edge, state: nextState } : edge);
        });
    }
    recordOutput(sessionId, nodeId, output) {
        this.mutate(sessionId, state => {
            state.outputs[nodeId] = toSerializable(output);
        });
    }
    recordError(sessionId, nodeId, error) {
        this.mutate(sessionId, state => {
            state.errors[nodeId] = error;
        });
    }
    recordBranchChoice(sessionId, choice) {
        this.mutate(sessionId, state => {
            state.branchChoices[choice.nodeId] = choice;
        });
    }
    appendTrace(sessionId, entry) {
        this.mutate(sessionId, state => {
            state.trace.push(toSerializable(entry));
        });
    }
    setFinalOutput(sessionId, output) {
        this.mutate(sessionId, state => {
            state.finalOutput = toSerializable(output);
        });
    }
    mutate(sessionId, updater) {
        const state = this.sessions.get(sessionId);
        if (!state) {
            return;
        }
        updater(state);
        state.updatedAt = new Date().toISOString();
    }
}
