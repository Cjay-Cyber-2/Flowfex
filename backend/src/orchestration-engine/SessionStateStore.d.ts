import type { BranchChoice, ExecutionErrorInfo, ExecutionGraph, ExecutionStatus, ExecutionTraceEntry, PlanSelectionResult, SessionExecutionState, TaskIntent } from './contracts.js';
export declare class SessionStateStore {
    private readonly sessions;
    initialize(config: {
        sessionId: string;
        executionId: string;
        task: string;
        graph: ExecutionGraph;
        intent: TaskIntent;
        selection: PlanSelectionResult;
        status?: ExecutionStatus;
    }): SessionExecutionState;
    getSnapshot(sessionId: string): SessionExecutionState | null;
    setStatus(sessionId: string, status: ExecutionStatus): void;
    setCurrentNode(sessionId: string, nodeId: string | null): void;
    markPendingNode(sessionId: string, nodeId: string | null): void;
    updateNodeState(sessionId: string, nodeId: string, nextState: SessionExecutionState['graph']['nodes'][number]['state']): void;
    updateEdgeState(sessionId: string, edgeId: string, nextState: SessionExecutionState['graph']['edges'][number]['state']): void;
    recordOutput(sessionId: string, nodeId: string, output: unknown): void;
    recordError(sessionId: string, nodeId: string, error: ExecutionErrorInfo): void;
    recordBranchChoice(sessionId: string, choice: BranchChoice): void;
    appendTrace(sessionId: string, entry: ExecutionTraceEntry): void;
    setFinalOutput(sessionId: string, output: unknown): void;
    private mutate;
}
