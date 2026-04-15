import type { EngineLogger, OrchestrationAgentContext, OrchestrationSessionContext, TaskPlanningResult } from './contracts.js';
import type { LLMProviderLike } from './contracts.js';
export declare class TaskIntentPlanner {
    private readonly llm;
    private readonly logger;
    constructor(config: {
        llm: LLMProviderLike;
        logger: EngineLogger;
    });
    planTask(task: string, context: {
        sessionId: string;
        executionId: string;
        agent?: OrchestrationAgentContext | null;
        sessionContext?: OrchestrationSessionContext | null;
        availableCategories: string[];
    }): Promise<TaskPlanningResult>;
    private buildFallbackIntent;
}
