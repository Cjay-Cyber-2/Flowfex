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
  private readonly persistence: {
    write(snapshot: SessionExecutionState): Promise<void>;
  } | null;
  private persistenceQueue: Promise<void> = Promise.resolve();

  constructor(config: {
    persistence?: {
      write(snapshot: SessionExecutionState): Promise<void>;
    } | null;
  } = {}) {
    this.persistence = config.persistence || null;
  }

  initialize(config: {
    sessionId: string;
    executionId: string;
    task: string;
    graph: ExecutionGraph;
    intent: TaskIntent;
    selection: PlanSelectionResult;
    agent?: SessionExecutionState['agent'];
    sessionContext?: SessionExecutionState['sessionContext'];
    status?: ExecutionStatus;
  }): SessionExecutionState {
    ExecutionGraphSchema.parse(config.graph);

    const now = new Date().toISOString();
    const state: SessionExecutionState = {
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

  hydrate(snapshot: SessionExecutionState): SessionExecutionState {
    const rehydrated = toSerializable(snapshot);
    this.sessions.set(snapshot.sessionId, rehydrated);
    return this.getSnapshot(snapshot.sessionId) as SessionExecutionState;
  }

  replaceGraph(sessionId: string, graph: ExecutionGraph): void {
    ExecutionGraphSchema.parse(graph);

    this.mutate(sessionId, state => {
      state.graph = toSerializable(graph);
    });
  }

  replaceSelection(sessionId: string, selection: PlanSelectionResult): void {
    this.mutate(sessionId, state => {
      state.selection = toSerializable(selection);
    });
  }

  setBlockedSkillIds(sessionId: string, blockedSkillIds: string[]): void {
    this.mutate(sessionId, state => {
      state.blockedSkillIds = [...new Set(blockedSkillIds)];
    });
  }

  setControl(sessionId: string, updates: Partial<SessionExecutionState['control']>): void {
    this.mutate(sessionId, state => {
      state.control = {
        ...state.control,
        ...toSerializable(updates),
      };
    });
  }

  appendGraphUpdate(
    sessionId: string,
    update: SessionExecutionState['graphUpdates'][number]
  ): void {
    this.mutate(sessionId, state => {
      state.graphUpdates.push(toSerializable(update));
    });
  }

  async flushPersistence(): Promise<void> {
    await this.persistenceQueue;
  }

  private mutate(sessionId: string, updater: (state: SessionExecutionState) => void): void {
    const state = this.sessions.get(sessionId);
    if (!state) {
      return;
    }

    updater(state);
    state.revision += 1;
    state.updatedAt = new Date().toISOString();
    this.persist(state);
  }

  private persist(state: SessionExecutionState): void {
    if (!this.persistence) {
      return;
    }

    const snapshot = toSerializable(state);
    this.persistenceQueue = this.persistenceQueue
      .then(() => this.persistence?.write(snapshot) || Promise.resolve())
      .catch(() => {});
  }
}
