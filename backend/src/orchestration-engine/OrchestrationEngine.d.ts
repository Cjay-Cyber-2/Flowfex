import type { EngineLogger, OrchestrationExecutionContext, OrchestrationRunResult, ToolRegistryLike } from './contracts.js';
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
    getSessionState(sessionId: string): import("./contracts.js").SessionExecutionState | null;
}
