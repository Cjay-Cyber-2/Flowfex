import type {
  EngineLogger,
  ExecutionGraphBuildResult,
  OrchestrationExecutionContext,
  OrchestrationRunResult,
  PlanSelectionResult,
  SessionExecutionState,
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
    bridge.emitDiagnostic('execution.started', {
      status: 'running',
      workflow: {
        mode: 'task',
        task: context.task,
      },
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

    if (selection.selectedSteps.length === 0) {
      const error = {
        message: 'Flowfex could not find any directly relevant skills or resources for this request.',
        type: 'NoRelevantCapabilitiesError',
      } as const;

      this.stateStore.initialize({
        sessionId: context.sessionId,
        executionId,
        task: context.task,
        graph: buildResult.graph,
        intent: planning.intent,
        selection,
        agent: context.agent || null,
        sessionContext: context.sessionContext || null,
        status: 'failed',
      });
      this.stateStore.recordError(context.sessionId, 'flowfex:no_relevant_capabilities', error);
      bridge.emitGraphCreated(buildResult.graph);
      bridge.emitDiagnostic('execution.failed', {
        status: 'failed',
        error,
        selection: {
          strategy: retrieval.strategy,
          fallbackUsed: retrieval.fallbackUsed || selection.fallbackUsed,
          reason: 'no_directly_relevant_capabilities',
        },
        final: true,
      });

      const snapshot = this.stateStore.getSnapshot(context.sessionId) as NonNullable<ReturnType<typeof this.stateStore.getSnapshot>>;

      return {
        executionId,
        sessionId: context.sessionId,
        status: 'error',
        input: context.task,
        intent: planning.intent,
        graph: buildResult.graph,
        snapshot,
        selectedTool: null,
        toolSelection: null,
        selectionTrace: selection.rankings,
        trace: snapshot.trace || [],
        finalResult: null,
        output: null,
        error,
        duration: Date.now() - startedAt,
        timestamp: new Date(startedAt).toISOString(),
      };
    }

    if (retrieval.fallbackUsed || selection.fallbackUsed) {
      bridge.emitDiagnostic('step.rerouted', {
        status: 'rerouted',
        selection: {
          strategy: retrieval.strategy === 'mixed'
            ? 'keyword-fallback'
            : retrieval.strategy,
          fallbackUsed: true,
          fallbackReason: 'semantic retrieval did not fully satisfy the execution plan',
        },
        reroute: {
          reason: 'selection_fallback',
          from: 'semantic',
          to: retrieval.strategy === 'mixed' ? 'keyword-fallback' : retrieval.strategy,
        },
      });
    }

    this.stateStore.initialize({
      sessionId: context.sessionId,
      executionId,
      task: context.task,
      graph: buildResult.graph,
      intent: planning.intent,
      selection,
      agent: context.agent || null,
      sessionContext: context.sessionContext || null,
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
    this.emitFinalExecutionDiagnostic(bridge, {
      task: context.task,
      status: execution.status,
      finalOutput: execution.finalOutput,
      error: execution.error,
      selectionStrategy: selection.rankings[0]?.strategy
        || (retrieval.strategy === 'mixed' ? 'keyword-fallback' : retrieval.strategy),
      fallbackUsed: retrieval.fallbackUsed || selection.fallbackUsed,
    });

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

  hydrateSessionState(snapshot: SessionExecutionState): SessionExecutionState {
    return this.stateStore.hydrate(snapshot);
  }

  rebuildExecutionGraph(config: {
    sessionId: string;
    executionId: string;
    selection: PlanSelectionResult;
  }): ExecutionGraphBuildResult {
    return this.graphBuilder.buildGraph(config.selection, {
      sessionId: config.sessionId,
      executionId: config.executionId,
    });
  }

  async continueSession(context: {
    sessionId: string;
    eventSink?: OrchestrationExecutionContext['eventSink'];
    socketServer?: OrchestrationExecutionContext['socketServer'];
    agent?: OrchestrationExecutionContext['agent'];
    sessionContext?: OrchestrationExecutionContext['sessionContext'];
  }): Promise<OrchestrationRunResult> {
    const snapshot = this.stateStore.getSnapshot(context.sessionId);
    if (!snapshot) {
      throw new Error(`Session '${context.sessionId}' was not found`);
    }

    const bridge = new OrchestrationEventBridge({
      executionId: snapshot.executionId,
      sessionId: snapshot.sessionId,
      eventSink: context.eventSink,
      socketServer: context.socketServer,
      logger: this.logger,
    });
    const buildResult = this.rebuildExecutionGraph({
      sessionId: snapshot.sessionId,
      executionId: snapshot.executionId,
      selection: snapshot.selection,
    });

    buildResult.graph = snapshot.graph;

    const execution = await this.runner.run(buildResult, {
      sessionId: snapshot.sessionId,
      executionId: snapshot.executionId,
      task: snapshot.task,
      intent: snapshot.intent,
      agent: context.agent || snapshot.agent || null,
      sessionContext: context.sessionContext || snapshot.sessionContext || null,
      bridge,
    }, {
      startNodeId: snapshot.pendingNodeId,
      snapshot,
      emitGraphCreated: false,
    });
    const nextSnapshot = this.stateStore.getSnapshot(snapshot.sessionId);

    this.emitFinalExecutionDiagnostic(bridge, {
      task: snapshot.task,
      status: execution.status,
      finalOutput: execution.finalOutput,
      error: execution.error,
      selectionStrategy: snapshot.selection.rankings[0]?.strategy || 'deterministic-fallback',
      fallbackUsed: snapshot.selection.fallbackUsed === true,
    });

    return {
      executionId: snapshot.executionId,
      sessionId: snapshot.sessionId,
      status: execution.status,
      input: snapshot.task,
      intent: snapshot.intent,
      graph: nextSnapshot?.graph || snapshot.graph,
      snapshot: nextSnapshot as NonNullable<typeof nextSnapshot>,
      selectedTool: snapshot.selection.selectedSteps[0]
        ? {
            id: snapshot.selection.selectedSteps[0].toolId,
            name: snapshot.selection.selectedSteps[0].tool.name,
            description: snapshot.selection.selectedSteps[0].tool.description,
            category: snapshot.selection.selectedSteps[0].capabilityCategory,
            tags: Array.isArray(snapshot.selection.selectedSteps[0].tool.metadata?.tags)
              ? snapshot.selection.selectedSteps[0].tool.metadata?.tags
              : [],
          }
        : null,
      toolSelection: snapshot.selection.rankings[0] || null,
      selectionTrace: snapshot.selection.rankings,
      trace: nextSnapshot?.trace || snapshot.trace,
      finalResult: execution.finalOutput,
      output: execution.finalOutput,
      error: execution.error,
      duration: 0,
      timestamp: new Date().toISOString(),
    };
  }

  getStateStore(): SessionStateStore {
    return this.stateStore;
  }

  private emitFinalExecutionDiagnostic(
    bridge: OrchestrationEventBridge,
    details: {
      task: string;
      status: OrchestrationRunResult['status'];
      finalOutput: OrchestrationRunResult['finalResult'];
      error: OrchestrationRunResult['error'];
      selectionStrategy: string;
      fallbackUsed: boolean;
    }
  ): void {
    const finalEventType = details.status === 'error'
      ? 'execution.failed'
      : details.status === 'paused'
        ? 'execution.paused'
        : details.status === 'awaiting_approval'
          ? 'execution.awaiting_approval'
          : 'execution.completed';

    bridge.emitDiagnostic(finalEventType, {
      status: details.status === 'success'
        ? 'completed'
        : details.status === 'error'
          ? 'failed'
          : details.status,
      workflow: {
        mode: 'task',
        task: details.task,
      },
      selection: {
        strategy: details.selectionStrategy,
        fallbackUsed: details.fallbackUsed,
      },
      ...(details.error ? { error: details.error } : {}),
      ...(details.finalOutput && typeof details.finalOutput === 'object' && details.finalOutput !== null
        ? { data: details.finalOutput as Record<string, unknown> }
        : {}),
      final: details.status === 'success' || details.status === 'error',
    });
  }
}
