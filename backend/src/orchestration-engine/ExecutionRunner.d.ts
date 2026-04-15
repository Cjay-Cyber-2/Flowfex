import type { EngineLogger, ExecutionErrorInfo, ExecutionGraphBuildResult, OrchestrationAgentContext, OrchestrationSessionContext, SessionExecutionState, TaskIntent } from './contracts.js';
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
    }, options?: {
        startNodeId?: string | null;
        snapshot?: SessionExecutionState | null;
        emitGraphCreated?: boolean;
    }): Promise<{
        status: "paused";
        finalOutput: unknown;
        error: null;
    } | {
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
    private shouldPauseAtBoundary;
    private executeSkillNode;
    private createToolRuntime;
    private buildSkillInput;
    private markSkippedNodes;
    private evaluateDecision;
}
