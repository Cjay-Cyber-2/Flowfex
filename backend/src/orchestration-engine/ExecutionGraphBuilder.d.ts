import type { ExecutionGraphBuildResult, PlanSelectionResult } from './contracts.js';
export declare class ExecutionGraphBuilder {
    buildGraph(selection: PlanSelectionResult, options: {
        sessionId: string;
        executionId: string;
    }): ExecutionGraphBuildResult;
}
