import type { EngineLogger, ExecutionErrorInfo, ExecutionGraphBuildResult, OrchestrationAgentContext, OrchestrationSessionContext, TaskIntent } from './contracts.js';
import type { LLMProviderLike, ToolRegistryLike } from './contracts.js';
import { OrchestrationEventBridge } from './OrchestrationEventBridge.js';
import { SessionStateStore } from './SessionStateStore.js';
export declare class ExecutionRunner {
    private readonly registry;
    private readonly llm;
    private readonly stateStore;
    private readonly logger;
    constructor(config: {
        registry: ToolRegistryLike;
        llm: LLMProviderLike;
        stateStore: SessionStateStore;
        logger: EngineLogger;
    });
    run(buildResult: ExecutionGraphBuildResult, context: {
        sessionId: string;
        executionId: string;
        task: string;
        intent: TaskIntent;
        agent?: OrchestrationAgentContext | null;
        sessionContext?: OrchestrationSessionContext | null;
        bridge: OrchestrationEventBridge;
    }): Promise<{
        status: "error";
        finalOutput: unknown;
        error: ExecutionErrorInfo;
    } | {
        status: "awaiting_approval";
        finalOutput: unknown;
        error: null;
    } | {
        status: "success";
        finalOutput: unknown;
        error: null;
    }>;
    private executeSkillNode;
    private createToolRuntime;
    private buildSkillInput;
    private markSkippedNodes;
    private evaluateDecision;
}
