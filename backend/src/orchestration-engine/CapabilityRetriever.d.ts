import type { CapabilityRetrievalResult, EngineLogger, TaskIntent, ToolRegistryLike } from './contracts.js';
export declare class CapabilityRetriever {
    private readonly registry;
    private readonly logger;
    constructor(config: {
        registry: ToolRegistryLike;
        logger: EngineLogger;
    });
    retrieve(intent: TaskIntent, options: {
        sessionId: string;
        executionId: string;
        allowedToolIds?: string[];
        topKPerCategory?: number;
        minScore?: number;
        fallbackMinScore?: number;
    }): CapabilityRetrievalResult;
    private safeSemanticRetrieval;
    private runDeterministicFallback;
    private buildCategoryQuery;
}
