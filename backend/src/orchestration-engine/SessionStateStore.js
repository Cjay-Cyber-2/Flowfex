import { ExecutionGraphSchema } from './schemas.js';
import { toSerializable } from './utils.js';
export class SessionStateStore {
    sessions = new Map();
    persistence;
    persistenceQueue = Promise.resolve();
    constructor(config = {}) {
        this.persistence = config.persistence || null;
    }
    initialize(config) {
        ExecutionGraphSchema.parse(config.graph);
        const now = new Date().toISOString();
        const state = {
            sessionId: config.sessionId,
            executionId: config.executionId,
            task: config.task,
            status: config.status || 'ready',
            revision: 1,
            agent: toSerializable(config.agent || null),
            sessionContext: toSerializable(config.sessionContext || null),
            createdAt: now,
            updatedAt: now,
            currentNodeId: null,
            pendingNodeId: config.graph.nodes[0]?.id || null,
            completedNodeIds: [],
            blockedSkillIds: [],
            graph: toSerializable(config.graph),
            outputs: {},
            errors: {},
            branchChoices: {},
            trace: [],
            intent: toSerializable(config.intent),
            selection: toSerializable(config.selection),
            graphUpdates: [],
            control: {},
        };
        this.sessions.set(config.sessionId, state);
        this.persist(state);
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
    hydrate(snapshot) {
        const rehydrated = toSerializable(snapshot);
        this.sessions.set(snapshot.sessionId, rehydrated);
        return this.getSnapshot(snapshot.sessionId);
    }
    replaceGraph(sessionId, graph) {
        ExecutionGraphSchema.parse(graph);
        this.mutate(sessionId, state => {
            state.graph = toSerializable(graph);
        });
    }
    replaceSelection(sessionId, selection) {
        this.mutate(sessionId, state => {
            state.selection = toSerializable(selection);
        });
    }
    setBlockedSkillIds(sessionId, blockedSkillIds) {
        this.mutate(sessionId, state => {
            state.blockedSkillIds = [...new Set(blockedSkillIds)];
        });
    }
    setControl(sessionId, updates) {
        this.mutate(sessionId, state => {
            state.control = {
                ...state.control,
                ...toSerializable(updates),
            };
        });
    }
    appendGraphUpdate(sessionId, update) {
        this.mutate(sessionId, state => {
            state.graphUpdates.push(toSerializable(update));
        });
    }
    mutate(sessionId, updater) {
        const state = this.sessions.get(sessionId);
        if (!state) {
            return;
        }
        updater(state);
        state.revision += 1;
        state.updatedAt = new Date().toISOString();
        this.persist(state);
    }
    persist(state) {
        if (!this.persistence) {
            return;
        }
        const snapshot = toSerializable(state);
        this.persistenceQueue = this.persistenceQueue
            .then(() => this.persistence?.write(snapshot) || Promise.resolve())
            .catch(() => { });
    }
}
