export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export interface JsonObject {
    [key: string]: JsonValue;
}
export type ExecutionStatus = 'planning' | 'ready' | 'running' | 'awaiting_approval' | 'completed' | 'failed';
export type GraphNodeState = 'idle' | 'queued' | 'active' | 'approval' | 'completed' | 'skipped' | 'error' | 'paused';
export type GraphEdgeState = 'inactive' | 'queued' | 'active' | 'completed' | 'rerouted';
export interface ToolMetadata {
    category?: string;
    tags?: string[];
    version?: string;
    source?: string | null;
    sourcePath?: string | null;
    sourceType?: string | null;
    trustLevel?: string | null;
    validationStatus?: string | null;
    approvalRequired?: boolean;
    requiresApproval?: boolean;
    [key: string]: unknown;
}
export interface SkillHandler {
    id: string;
    name: string;
    description: string;
    keywords?: string[];
    metadata?: ToolMetadata;
    execute(input: unknown, llm: LLMProviderLike, runtime?: ToolRuntimeLike): Promise<unknown>;
}
export interface RegistryRetrievalMatch {
    tool: SkillHandler;
    score: number;
    strategy: string;
}
export interface RegistryRetrievalResult {
    strategy: string;
    query: string;
    matches: RegistryRetrievalMatch[];
    fallbackUsed: boolean;
    fallbackReason?: string | null;
}
export interface ToolRegistryLike {
    retrieveTools(input: unknown, options?: {
        topK?: number;
        minScore?: number;
        filters?: {
            category?: string;
            toolIds?: string[];
        };
        allowKeywordFallback?: boolean;
    }): RegistryRetrievalResult;
    getAllTools(): SkillHandler[];
    getTool(toolId: string): SkillHandler | null;
    resolveTool(reference: string | SkillHandler): SkillHandler | null;
    executeTool(toolId: string, input: unknown, llm: LLMProviderLike, runtime?: ToolRuntimeLike): Promise<unknown>;
    filterTools?: (filters?: {
        category?: string;
        toolIds?: string[];
    }) => SkillHandler[];
    getCategories?: () => string[];
}
export interface LLMProviderLike {
    generate(systemPrompt: string, userPrompt: string, options?: {
        runtime?: ToolRuntimeLike;
    }): Promise<string>;
}
export interface EngineLogEntry {
    event: string;
    message?: string;
    sessionId?: string | null;
    executionId?: string | null;
    [key: string]: unknown;
}
export interface EngineLogger {
    info(entry: EngineLogEntry): void;
    warn(entry: EngineLogEntry): void;
    error(entry: EngineLogEntry): void;
}
export interface GraphNodeAlternative {
    toolId: string;
    name: string;
    score: number;
    confidence: number;
    reason: string;
}
export interface GraphNodeExecutionMetadata {
    category?: string;
    objective?: string;
    selectionScore?: number;
    requiresApproval?: boolean;
    branchCondition?: string;
    [key: string]: unknown;
}
export interface ExecutionGraphNode {
    id: string;
    type: string;
    shape: 'rect' | 'diamond';
    x: number;
    y: number;
    width: number;
    height: number;
    title: string;
    subtitle: string;
    state: GraphNodeState;
    icon: string;
    confidence: number;
    reasoning: string;
    alternatives: GraphNodeAlternative[];
    inputs: Record<string, unknown>;
    config: Record<string, unknown>;
    owner: string;
    skill: string | null;
    executionMetadata: GraphNodeExecutionMetadata;
}
export interface ExecutionGraphEdge {
    id: string;
    from: string;
    to: string;
    state: GraphEdgeState;
    label: string | null;
    type: 'sequential' | 'conditional';
}
export interface ExecutionGraph {
    sessionId: string;
    executionId: string;
    nodes: ExecutionGraphNode[];
    edges: ExecutionGraphEdge[];
}
export interface SuggestedExecutionStep {
    id: string;
    title: string;
    objective: string;
    capabilityCategory: string;
    requiresApproval: boolean;
}
export interface BranchPoint {
    id: string;
    sourceStepId?: string;
    sourceStepIndex?: number;
    sourceStepTitle?: string;
    condition: string;
    onTrue?: string;
    onFalse?: string;
    rationale?: string;
}
export interface TaskIntent {
    goal: string;
    capabilityCategories: string[];
    suggestedExecutionSteps: SuggestedExecutionStep[];
    branchPoints: BranchPoint[];
    confidence: number;
    constraints: string[];
}
export interface TaskIntentPlanningIssue {
    stage: 'llm' | 'validation' | 'fallback';
    message: string;
    rawResponse?: string;
}
export interface TaskPlanningResult {
    intent: TaskIntent;
    fallbackUsed: boolean;
    issues: TaskIntentPlanningIssue[];
    rawResponse?: string;
}
export interface CapabilityCandidate {
    tool: SkillHandler;
    toolId: string;
    toolName: string;
    description: string;
    category: string;
    tags: string[];
    score: number;
    strategy: string;
    matchedCategory: string;
    query: string;
}
export interface CapabilityRetrievalResult {
    byCategory: Record<string, CapabilityCandidate[]>;
    merged: CapabilityCandidate[];
    strategy: 'semantic' | 'deterministic-fallback' | 'mixed';
    fallbackUsed: boolean;
}
export interface StepSelectionAlternative {
    toolId: string;
    name: string;
    score: number;
    confidence: number;
    category: string;
    reason: string;
}
export interface SelectedExecutionStep {
    id: string;
    stepId: string;
    title: string;
    objective: string;
    capabilityCategory: string;
    requiresApproval: boolean;
    tool: SkillHandler;
    toolId: string;
    score: number;
    reasoning: string;
    alternatives: StepSelectionAlternative[];
}
export interface DecisionPlanNode {
    id: string;
    sourceStepId: string;
    title: string;
    condition: string;
    alternateTargetStepId: string;
    takeAlternateWhen: 'if_true' | 'if_false';
    reasoning: string;
}
export interface StepSelectionRanking {
    stepId: string;
    stepTitle: string;
    candidates: StepSelectionAlternative[];
    selectedToolId?: string;
}
export interface PlanSelectionResult {
    selectedSteps: SelectedExecutionStep[];
    decisionNodes: DecisionPlanNode[];
    rankings: StepSelectionRanking[];
    fallbackUsed: boolean;
}
export interface RuntimeSkillNode {
    graphNodeId: string;
    kind: 'skill';
    title: string;
    objective: string;
    capabilityCategory: string;
    tool: SkillHandler;
    toolId: string;
    requiresApproval: boolean;
    score: number;
    reasoning: string;
    alternatives: StepSelectionAlternative[];
}
export interface RuntimeDecisionNode {
    graphNodeId: string;
    kind: 'decision';
    title: string;
    condition: string;
    alternateTargetNodeId: string;
    sequentialTargetNodeId: string | null;
    takeAlternateWhen: 'if_true' | 'if_false';
    reasoning: string;
    alternateEdgeId: string;
    sequentialEdgeId: string | null;
    skippedNodeIdsOnAlternate: string[];
    skippedNodeIdsOnSequential: string[];
}
export type RuntimePlanNode = RuntimeSkillNode | RuntimeDecisionNode;
export interface ExecutionGraphBuildResult {
    graph: ExecutionGraph;
    runtimeNodes: Record<string, RuntimePlanNode>;
    orderedNodeIds: string[];
    entryNodeId: string | null;
    outgoingEdges: Record<string, ExecutionGraphEdge[]>;
    incomingEdgeIdByNode: Record<string, string | null>;
}
export interface ExecutionErrorInfo {
    message: string;
    type: string;
    nodeId?: string;
}
export interface BranchChoice {
    nodeId: string;
    condition: string;
    matched: boolean;
    selectedNodeId: string | null;
    reroutedEdgeId: string | null;
    activeEdgeId: string | null;
    reason: string;
}
export interface ExecutionTraceEntry {
    nodeId: string;
    nodeType: 'skill' | 'decision';
    toolId: string | null;
    status: 'completed' | 'failed' | 'awaiting_approval';
    input: unknown;
    output?: unknown;
    error?: ExecutionErrorInfo;
    branchChoice?: BranchChoice;
    startedAt: string;
    completedAt: string;
    durationMs: number;
}
export interface SessionExecutionState {
    sessionId: string;
    executionId: string;
    task: string;
    status: ExecutionStatus;
    createdAt: string;
    updatedAt: string;
    currentNodeId: string | null;
    pendingNodeId: string | null;
    completedNodeIds: string[];
    graph: ExecutionGraph;
    outputs: Record<string, unknown>;
    errors: Record<string, ExecutionErrorInfo>;
    branchChoices: Record<string, BranchChoice>;
    trace: ExecutionTraceEntry[];
    intent: TaskIntent;
    selection: PlanSelectionResult;
    finalOutput?: unknown;
}
export interface RuntimeStepContext {
    index: number;
    total: number;
    nodeId: string;
    toolId: string | null;
    title: string;
}
export interface ProgressUpdate {
    phase?: string;
    message?: string;
    current?: number;
    total?: number;
    percent?: number;
}
export interface ReroutePayload {
    reason: string;
    from?: Record<string, unknown>;
    to?: Record<string, unknown>;
}
export interface ToolRuntimeLike {
    executionId: string;
    sessionId: string | null;
    step: RuntimeStepContext;
    selection: Record<string, unknown>;
    reportProgress(progress: ProgressUpdate, data?: Record<string, unknown> | null): void;
    reroute(reroute: ReroutePayload, data?: Record<string, unknown> | null): void;
}
export interface OrchestrationAgentContext {
    id?: string | null;
    name?: string | null;
    type?: string | null;
    version?: string | null;
}
export interface OrchestrationSessionContext {
    mode?: string | null;
    metadata?: Record<string, unknown>;
    capabilities?: string[];
    prompt?: string | null;
}
export interface OrchestrationExecutionContext {
    sessionId: string;
    task: string;
    agent?: OrchestrationAgentContext | null;
    sessionContext?: OrchestrationSessionContext | null;
    allowedToolIds?: string[];
    eventSink?: (event: OrchestrationEventRecord) => void;
    socketServer?: SocketServerLike | null;
    topK?: number;
    minScore?: number;
}
export interface OrchestrationEventRecord {
    id: string;
    sequence: number;
    executionId: string;
    sessionId: string;
    type: string;
    timestamp: string;
    payload: Record<string, unknown>;
}
export interface SocketServerLike {
    emitGraphCreated(sessionId: string, graph: ExecutionGraph): void;
    emitNodeExecuting(sessionId: string, nodeId: string, data?: Record<string, unknown>): void;
    emitNodeCompleted(sessionId: string, nodeId: string, data?: Record<string, unknown>): void;
    emitNodeAwaitingApproval(sessionId: string, nodeId: string, data?: Record<string, unknown>): void;
    emitNodeRejected(sessionId: string, nodeId: string, data?: Record<string, unknown>): void;
    emitNodeError(sessionId: string, nodeId: string, error: string): void;
    emitEdgeActive(sessionId: string, edgeId: string): void;
    emitPathRerouted(sessionId: string, edgeId: string, data?: Record<string, unknown>): void;
}
export interface OrchestrationRunResult {
    executionId: string;
    sessionId: string;
    status: 'success' | 'error' | 'awaiting_approval';
    input: string;
    intent: TaskIntent;
    graph: ExecutionGraph;
    snapshot: SessionExecutionState;
    selectedTool: {
        id: string;
        name: string;
        description: string;
        category: string;
        tags: string[];
    } | null;
    toolSelection: StepSelectionRanking | null;
    selectionTrace: StepSelectionRanking[];
    trace: ExecutionTraceEntry[];
    finalResult: unknown;
    output: unknown;
    error: ExecutionErrorInfo | null;
    duration: number;
    timestamp: string;
}
