import type { EngineLogger, ExecutionGraphBuildResult, OrchestrationExecutionContext, OrchestrationRunResult, PlanSelectionResult, SessionExecutionState, ToolRegistryLike } from './contracts.js';
import type { LLMProviderLike } from './contracts.js';
import { SessionStateStore } from './SessionStateStore.js';
export declare class OrchestrationEngine {
    private readonly registry;
    private readonly llm;
    private readonly logger;
    private readonly planner;
    private readonly retriever;
    private readonly selector;
    private readonly graphBuilder;
    private readonly stateStore;
    private readonly runner;
    constructor(config: {
        registry: ToolRegistryLike;
        llm: LLMProviderLike;
        logger: EngineLogger;
        stateStore?: SessionStateStore;
    });
    orchestrateTask(context: OrchestrationExecutionContext): Promise<OrchestrationRunResult>;
    getSessionState(sessionId: string): SessionExecutionState | null;
    hydrateSessionState(snapshot: SessionExecutionState): SessionExecutionState;
    rebuildExecutionGraph(config: {
        sessionId: string;
        executionId: string;
        selection: PlanSelectionResult;
    }): ExecutionGraphBuildResult;
    continueSession(context: {
        sessionId: string;
        eventSink?: OrchestrationExecutionContext['eventSink'];
        socketServer?: OrchestrationExecutionContext['socketServer'];
        agent?: OrchestrationExecutionContext['agent'];
        sessionContext?: OrchestrationExecutionContext['sessionContext'];
    }): Promise<OrchestrationRunResult>;
    getStateStore(): SessionStateStore;
    private emitFinalExecutionDiagnostic;
}
