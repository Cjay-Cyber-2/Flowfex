import type { CapabilityRetrievalResult, EngineLogger, PlanSelectionResult, TaskIntent, ToolRegistryLike } from './contracts.js';
export declare class ExecutionPlanSelector {
    private readonly logger;
    constructor(config: {
        logger: EngineLogger;
    });
    selectPlan(intent: TaskIntent, retrieval: CapabilityRetrievalResult, options: {
        sessionId: string;
        executionId: string;
        maxSkills?: number;
        minimumSelectionScore?: number;
        registry?: ToolRegistryLike;
        supplementFromRetrieval?: boolean;
    }): PlanSelectionResult;
}
