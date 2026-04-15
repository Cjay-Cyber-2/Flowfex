import type {
  BranchChoice,
  ExecutionErrorInfo,
  ExecutionGraph,
  ExecutionStatus,
  ExecutionTraceEntry,
  PlanSelectionResult,
  SessionExecutionState,
  TaskIntent,
} from './contracts.js';
import { ExecutionGraphSchema } from './schemas.js';
import { toSerializable } from './utils.js';

export class SessionStateStore {
  private readonly sessions = new Map<string, SessionExecutionState>();

  initialize(config: {
    sessionId: string;
    executionId: string;
    task: string;
    graph: ExecutionGraph;
    intent: TaskIntent;
    selection: PlanSelectionResult;
    status?: ExecutionStatus;
  }): SessionExecutionState {
    ExecutionGraphSchema.parse(config.graph);

    const now = new Date().toISOString();
    const state: SessionExecutionState = {
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
    return this.getSnapshot(config.sessionId) as SessionExecutionState;
  }

  getSnapshot(sessionId: string): SessionExecutionState | null {
    const state = this.sessions.get(sessionId);
    return state ? toSerializable(state) : null;
  }

  setStatus(sessionId: string, status: ExecutionStatus): void {
    this.mutate(sessionId, state => {
      state.status = status;
    });
  }

  setCurrentNode(sessionId: string, nodeId: string | null): void {
    this.mutate(sessionId, state => {
      state.currentNodeId = nodeId;
      state.pendingNodeId = nodeId;
    });
  }

  markPendingNode(sessionId: string, nodeId: string | null): void {
    this.mutate(sessionId, state => {
      state.pendingNodeId = nodeId;
    });
  }

  updateNodeState(sessionId: string, nodeId: string, nextState: SessionExecutionState['graph']['nodes'][number]['state']): void {
    this.mutate(sessionId, state => {
      state.graph.nodes = state.graph.nodes.map(node =>
        node.id === nodeId ? { ...node, state: nextState } : node
      );

      if (nextState === 'completed' && !state.completedNodeIds.includes(nodeId)) {
        state.completedNodeIds.push(nodeId);
      }
    });
  }

  updateEdgeState(sessionId: string, edgeId: string, nextState: SessionExecutionState['graph']['edges'][number]['state']): void {
    this.mutate(sessionId, state => {
      state.graph.edges = state.graph.edges.map(edge =>
        edge.id === edgeId ? { ...edge, state: nextState } : edge
      );
    });
  }

  recordOutput(sessionId: string, nodeId: string, output: unknown): void {
    this.mutate(sessionId, state => {
      state.outputs[nodeId] = toSerializable(output);
    });
  }

  recordError(sessionId: string, nodeId: string, error: ExecutionErrorInfo): void {
    this.mutate(sessionId, state => {
      state.errors[nodeId] = error;
    });
  }

  recordBranchChoice(sessionId: string, choice: BranchChoice): void {
    this.mutate(sessionId, state => {
      state.branchChoices[choice.nodeId] = choice;
    });
  }

  appendTrace(sessionId: string, entry: ExecutionTraceEntry): void {
    this.mutate(sessionId, state => {
      state.trace.push(toSerializable(entry));
    });
  }

  setFinalOutput(sessionId: string, output: unknown): void {
    this.mutate(sessionId, state => {
      state.finalOutput = toSerializable(output);
    });
  }

  private mutate(sessionId: string, updater: (state: SessionExecutionState) => void): void {
    const state = this.sessions.get(sessionId);
    if (!state) {
      return;
    }

    updater(state);
    state.updatedAt = new Date().toISOString();
  }
}
