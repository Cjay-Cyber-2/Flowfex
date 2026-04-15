import { CapabilityRetriever } from './CapabilityRetriever.js';
import { ExecutionGraphBuilder } from './ExecutionGraphBuilder.js';
import { ExecutionPlanSelector } from './ExecutionPlanSelector.js';
import { ExecutionRunner } from './ExecutionRunner.js';
import { OrchestrationEventBridge } from './OrchestrationEventBridge.js';
import { SessionStateStore } from './SessionStateStore.js';
import { TaskIntentPlanner } from './TaskIntentPlanner.js';
import { buildExecutionId } from './utils.js';
export class OrchestrationEngine {
    registry;
    llm;
    logger;
    planner;
    retriever;
    selector;
    graphBuilder;
    stateStore;
    runner;
    constructor(config) {
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
    async orchestrateTask(context) {
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
        return {
            executionId,
            sessionId: context.sessionId,
            status: execution.status,
            input: context.task,
            intent: planning.intent,
            graph: buildResult.graph,
            snapshot: snapshot,
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
    getSessionState(sessionId) {
        return this.stateStore.getSnapshot(sessionId);
    }
    hydrateSessionState(snapshot) {
        return this.stateStore.hydrate(snapshot);
    }
    rebuildExecutionGraph(config) {
        return this.graphBuilder.buildGraph(config.selection, {
            sessionId: config.sessionId,
            executionId: config.executionId,
        });
    }
    async continueSession(context) {
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
        return {
            executionId: snapshot.executionId,
            sessionId: snapshot.sessionId,
            status: execution.status,
            input: snapshot.task,
            intent: snapshot.intent,
            graph: nextSnapshot?.graph || snapshot.graph,
            snapshot: nextSnapshot,
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
    getStateStore() {
        return this.stateStore;
    }
}
