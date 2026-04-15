import type {
  EngineLogger,
  OrchestrationExecutionContext,
  OrchestrationRunResult,
  ToolRegistryLike,
} from './contracts.js';
import type { LLMProviderLike } from './contracts.js';
import { CapabilityRetriever } from './CapabilityRetriever.js';
import { ExecutionGraphBuilder } from './ExecutionGraphBuilder.js';
import { ExecutionPlanSelector } from './ExecutionPlanSelector.js';
import { ExecutionRunner } from './ExecutionRunner.js';
import { OrchestrationEventBridge } from './OrchestrationEventBridge.js';
import { SessionStateStore } from './SessionStateStore.js';
import { TaskIntentPlanner } from './TaskIntentPlanner.js';
import { buildExecutionId } from './utils.js';

export class OrchestrationEngine {
  private readonly registry: ToolRegistryLike;
  private readonly llm: LLMProviderLike;
  private readonly logger: EngineLogger;
  private readonly planner: TaskIntentPlanner;
  private readonly retriever: CapabilityRetriever;
  private readonly selector: ExecutionPlanSelector;
  private readonly graphBuilder: ExecutionGraphBuilder;
  private readonly stateStore: SessionStateStore;
  private readonly runner: ExecutionRunner;

  constructor(config: {
    registry: ToolRegistryLike;
    llm: LLMProviderLike;
    logger: EngineLogger;
    stateStore?: SessionStateStore;
  }) {
    this.registry = config.registry;
    this.llm = config.llm;
    this.logger = config.logger;
    this.stateStore = config.stateStore || new SessionStateStore();
    this.planner = new TaskIntentPlanner({
      llm: this.llm,
      logger: this.logger,
    });
    this.retriever = new CapabilityRetriever({
      registry: this.registry,
      logger: this.logger,
    });
    this.selector = new ExecutionPlanSelector({
      logger: this.logger,
    });
    this.graphBuilder = new ExecutionGraphBuilder();
    this.runner = new ExecutionRunner({
      registry: this.registry,
      llm: this.llm,
      stateStore: this.stateStore,
      logger: this.logger,
    });
  }

  async orchestrateTask(context: OrchestrationExecutionContext): Promise<OrchestrationRunResult> {
    const startedAt = Date.now();
    const executionId = buildExecutionId();
    const bridge = new OrchestrationEventBridge({
      executionId,
      sessionId: context.sessionId,
      eventSink: context.eventSink,
      socketServer: context.socketServer,
      logger: this.logger,
    });

    this.logger.info({
      event: 'orchestration.started',
      message: 'Starting orchestration run',
      sessionId: context.sessionId,
      executionId,
      agent: context.agent || null,
    });

    const planning = await this.planner.planTask(context.task, {
      sessionId: context.sessionId,
      executionId,
      agent: context.agent,
      sessionContext: context.sessionContext,
      availableCategories: this.registry.getCategories?.() || [],
    });

    if (planning.fallbackUsed && planning.issues.length > 0) {
      bridge.emitDiagnostic('planning:error', {
        issues: planning.issues,
      });
    }

    const retrieval = this.retriever.retrieve(planning.intent, {
      sessionId: context.sessionId,
      executionId,
      allowedToolIds: context.allowedToolIds,
      topKPerCategory: context.topK,
      minScore: context.minScore,
    });

    const selection = this.selector.selectPlan(planning.intent, retrieval, {
      sessionId: context.sessionId,
      executionId,
    });

    const buildResult = this.graphBuilder.buildGraph(selection, {
      sessionId: context.sessionId,
      executionId,
    });

    this.stateStore.initialize({
      sessionId: context.sessionId,
      executionId,
      task: context.task,
      graph: buildResult.graph,
      intent: planning.intent,
      selection,
      status: 'ready',
    });

    const execution = await this.runner.run(buildResult, {
      sessionId: context.sessionId,
      executionId,
      task: context.task,
      intent: planning.intent,
      agent: context.agent,
      sessionContext: context.sessionContext,
      bridge,
    });
    const snapshot = this.stateStore.getSnapshot(context.sessionId);

    return {
      executionId,
      sessionId: context.sessionId,
      status: execution.status,
      input: context.task,
      intent: planning.intent,
      graph: buildResult.graph,
      snapshot: snapshot as NonNullable<typeof snapshot>,
      selectedTool: selection.selectedSteps[0]
        ? {
            id: selection.selectedSteps[0].toolId,
            name: selection.selectedSteps[0].tool.name,
            description: selection.selectedSteps[0].tool.description,
            category: selection.selectedSteps[0].capabilityCategory,
            tags: Array.isArray(selection.selectedSteps[0].tool.metadata?.tags)
              ? selection.selectedSteps[0].tool.metadata?.tags
              : [],
          }
        : null,
      toolSelection: selection.rankings[0] || null,
      selectionTrace: selection.rankings,
      trace: snapshot?.trace || [],
      finalResult: execution.finalOutput,
      output: execution.finalOutput,
      error: execution.error,
      duration: Date.now() - startedAt,
      timestamp: new Date(startedAt).toISOString(),
    };
  }

  getSessionState(sessionId: string) {
    return this.stateStore.getSnapshot(sessionId);
  }
}
