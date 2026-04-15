import type {
  BranchChoice,
  EngineLogger,
  ExecutionErrorInfo,
  ExecutionGraphBuildResult,
  ExecutionTraceEntry,
  OrchestrationAgentContext,
  OrchestrationSessionContext,
  RuntimeDecisionNode,
  RuntimePlanNode,
  RuntimeSkillNode,
  RuntimeStepContext,
  TaskIntent,
  ToolRuntimeLike,
} from './contracts.js';
import type { LLMProviderLike, ToolRegistryLike } from './contracts.js';
import { OrchestrationEventBridge } from './OrchestrationEventBridge.js';
import { SessionStateStore } from './SessionStateStore.js';
import { safeRecord, stringifyForSearch, toSerializable } from './utils.js';

export class ExecutionRunner {
  private readonly registry: ToolRegistryLike;
  private readonly llm: LLMProviderLike;
  private readonly stateStore: SessionStateStore;
  private readonly logger: EngineLogger;

  constructor(config: {
    registry: ToolRegistryLike;
    llm: LLMProviderLike;
    stateStore: SessionStateStore;
    logger: EngineLogger;
  }) {
    this.registry = config.registry;
    this.llm = config.llm;
    this.stateStore = config.stateStore;
    this.logger = config.logger;
  }

  async run(
    buildResult: ExecutionGraphBuildResult,
    context: {
      sessionId: string;
      executionId: string;
      task: string;
      intent: TaskIntent;
      agent?: OrchestrationAgentContext | null;
      sessionContext?: OrchestrationSessionContext | null;
      bridge: OrchestrationEventBridge;
    }
  ) {
    this.stateStore.setStatus(context.sessionId, 'running');
    context.bridge.emitGraphCreated(buildResult.graph);

    let currentNodeId = buildResult.entryNodeId;
    let previousNodeId: string | null = null;
    let previousError: ExecutionErrorInfo | null = null;
    let finalOutput: unknown = null;
    const skippedNodeIds = new Set<string>();

    while (currentNodeId) {
      const runtimeNode = buildResult.runtimeNodes[currentNodeId];
      if (!runtimeNode) {
        break;
      }

      const incomingEdgeId = findEdgeBetween(buildResult, previousNodeId, currentNodeId);
      if (incomingEdgeId) {
        this.stateStore.updateEdgeState(context.sessionId, incomingEdgeId, 'active');
        context.bridge.emitEdgeActive(incomingEdgeId, {
          from: previousNodeId,
          to: currentNodeId,
        });
      }

      this.stateStore.setCurrentNode(context.sessionId, currentNodeId);
      this.stateStore.updateNodeState(context.sessionId, currentNodeId, 'active');
      context.bridge.emitNodeExecuting(currentNodeId, {
        title: runtimeNode.title,
        type: runtimeNode.kind,
      });

      if (runtimeNode.kind === 'decision') {
        const branchChoice = this.evaluateDecision(runtimeNode, {
          previousOutput: previousNodeId ? this.stateStore.getSnapshot(context.sessionId)?.outputs[previousNodeId] : null,
          previousError,
        });
        const skippedForBranch = branchChoice.selectedNodeId === runtimeNode.alternateTargetNodeId
          ? runtimeNode.skippedNodeIdsOnAlternate
          : runtimeNode.skippedNodeIdsOnSequential;

        if (branchChoice.reroutedEdgeId) {
          this.stateStore.updateEdgeState(context.sessionId, branchChoice.reroutedEdgeId, 'rerouted');
          context.bridge.emitPathRerouted(branchChoice.reroutedEdgeId, {
            from: runtimeNode.graphNodeId,
            to: branchChoice.selectedNodeId,
            reason: branchChoice.reason,
          });
        }

        this.markSkippedNodes(buildResult, context.sessionId, skippedForBranch, skippedNodeIds, context.bridge);
        this.stateStore.recordBranchChoice(context.sessionId, branchChoice);
        this.stateStore.updateNodeState(context.sessionId, currentNodeId, 'completed');
        if (incomingEdgeId) {
          this.stateStore.updateEdgeState(context.sessionId, incomingEdgeId, 'completed');
        }
        this.stateStore.appendTrace(context.sessionId, {
          nodeId: currentNodeId,
          nodeType: 'decision',
          toolId: null,
          status: 'completed',
          input: {
            condition: runtimeNode.condition,
          },
          output: branchChoice,
          branchChoice,
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          durationMs: 0,
        });
        context.bridge.emitNodeCompleted(currentNodeId, {
          branchChoice,
        });

        previousNodeId = currentNodeId;
        previousError = null;
        currentNodeId = branchChoice.selectedNodeId;
        this.stateStore.markPendingNode(context.sessionId, currentNodeId);
        continue;
      }

      const skillTrace = await this.executeSkillNode(runtimeNode, {
        sessionId: context.sessionId,
        executionId: context.executionId,
        task: context.task,
        intent: context.intent,
        previousNodeId,
        agent: context.agent,
        sessionContext: context.sessionContext,
        bridge: context.bridge,
        runtimeNodeCount: buildResult.orderedNodeIds.length,
        runtimeIndex: buildResult.orderedNodeIds.indexOf(currentNodeId),
      });

      this.stateStore.appendTrace(context.sessionId, skillTrace);

      if (skillTrace.error) {
        previousError = skillTrace.error;
        this.stateStore.recordError(context.sessionId, currentNodeId, skillTrace.error);
        this.stateStore.updateNodeState(context.sessionId, currentNodeId, 'error');
        if (incomingEdgeId) {
          this.stateStore.updateEdgeState(context.sessionId, incomingEdgeId, 'completed');
        }
        this.stateStore.setStatus(context.sessionId, 'failed');
        context.bridge.emitNodeError(currentNodeId, skillTrace.error);
        this.stateStore.markPendingNode(context.sessionId, null);
        return {
          status: 'error' as const,
          finalOutput: finalOutput,
          error: skillTrace.error,
        };
      }

      finalOutput = skillTrace.output;
      this.stateStore.recordOutput(context.sessionId, currentNodeId, skillTrace.output);

      if (runtimeNode.requiresApproval) {
        this.stateStore.updateNodeState(context.sessionId, currentNodeId, 'approval');
        if (incomingEdgeId) {
          this.stateStore.updateEdgeState(context.sessionId, incomingEdgeId, 'completed');
        }
        this.stateStore.setStatus(context.sessionId, 'awaiting_approval');
        this.stateStore.markPendingNode(
          context.sessionId,
          getNextSequentialNodeId(buildResult, currentNodeId, skippedNodeIds)
        );
        context.bridge.emitNodeAwaitingApproval(currentNodeId, {
          output: skillTrace.output,
          title: runtimeNode.title,
        });
        return {
          status: 'awaiting_approval' as const,
          finalOutput,
          error: null,
        };
      }

      this.stateStore.updateNodeState(context.sessionId, currentNodeId, 'completed');
      context.bridge.emitNodeCompleted(currentNodeId, {
        output: skillTrace.output,
      });

      if (incomingEdgeId) {
        this.stateStore.updateEdgeState(context.sessionId, incomingEdgeId, 'completed');
      }

      previousNodeId = currentNodeId;
      previousError = null;
      currentNodeId = getNextSequentialNodeId(buildResult, currentNodeId, skippedNodeIds);
      this.stateStore.markPendingNode(context.sessionId, currentNodeId);
    }

    this.stateStore.setStatus(context.sessionId, 'completed');
    this.stateStore.setCurrentNode(context.sessionId, null);
    this.stateStore.markPendingNode(context.sessionId, null);
    this.stateStore.setFinalOutput(context.sessionId, finalOutput);

    return {
      status: 'success' as const,
      finalOutput,
      error: null,
    };
  }

  private async executeSkillNode(
    runtimeNode: RuntimeSkillNode,
    context: {
      sessionId: string;
      executionId: string;
      task: string;
      intent: TaskIntent;
      previousNodeId: string | null;
      agent?: OrchestrationAgentContext | null;
      sessionContext?: OrchestrationSessionContext | null;
      bridge: OrchestrationEventBridge;
      runtimeNodeCount: number;
      runtimeIndex: number;
    }
  ): Promise<ExecutionTraceEntry> {
    const startedAt = new Date().toISOString();
    const startTime = Date.now();
    const input = this.buildSkillInput(runtimeNode, {
      sessionId: context.sessionId,
      executionId: context.executionId,
      task: context.task,
      intent: context.intent,
      previousNodeId: context.previousNodeId,
      agent: context.agent,
      sessionContext: context.sessionContext,
    });

    try {
      const runtime = this.createToolRuntime(runtimeNode, {
        sessionId: context.sessionId,
        executionId: context.executionId,
        runtimeNodeCount: context.runtimeNodeCount,
        runtimeIndex: context.runtimeIndex,
        bridge: context.bridge,
      });
      const output = await this.registry.executeTool(runtimeNode.toolId, input, this.llm, runtime);
      const completedAt = new Date().toISOString();
      const durationMs = Date.now() - startTime;

      this.logger.info({
        event: 'orchestration.node.completed',
        message: 'Skill node executed successfully',
        sessionId: context.sessionId,
        executionId: context.executionId,
        nodeId: runtimeNode.graphNodeId,
        toolId: runtimeNode.toolId,
        durationMs,
      });

      return {
        nodeId: runtimeNode.graphNodeId,
        nodeType: 'skill',
        toolId: runtimeNode.toolId,
        status: runtimeNode.requiresApproval ? 'awaiting_approval' : 'completed',
        input,
        output: toSerializable(output),
        startedAt,
        completedAt,
        durationMs,
      };
    } catch (error) {
      const completedAt = new Date().toISOString();
      const durationMs = Date.now() - startTime;
      const executionError = toExecutionError(error, runtimeNode.graphNodeId);

      this.logger.error({
        event: 'orchestration.node.failed',
        message: 'Skill node execution failed',
        sessionId: context.sessionId,
        executionId: context.executionId,
        nodeId: runtimeNode.graphNodeId,
        toolId: runtimeNode.toolId,
        error: executionError.message,
        durationMs,
      });

      return {
        nodeId: runtimeNode.graphNodeId,
        nodeType: 'skill',
        toolId: runtimeNode.toolId,
        status: 'failed',
        input,
        error: executionError,
        startedAt,
        completedAt,
        durationMs,
      };
    }
  }

  private createToolRuntime(
    runtimeNode: RuntimeSkillNode,
    context: {
      sessionId: string;
      executionId: string;
      runtimeNodeCount: number;
      runtimeIndex: number;
      bridge: OrchestrationEventBridge;
    }
  ): ToolRuntimeLike {
    const step: RuntimeStepContext = {
      index: context.runtimeIndex + 1,
      total: context.runtimeNodeCount,
      nodeId: runtimeNode.graphNodeId,
      toolId: runtimeNode.toolId,
      title: runtimeNode.title,
    };

    return {
      executionId: context.executionId,
      sessionId: context.sessionId,
      step,
      selection: {
        toolId: runtimeNode.toolId,
        title: runtimeNode.title,
        score: runtimeNode.score,
      },
      reportProgress: (progress, data) => {
        context.bridge.emitNodeExecuting(runtimeNode.graphNodeId, {
          progress: safeRecord(progress),
          data: data || {},
        });
      },
      reroute: (reroute, data) => {
        context.bridge.emitDiagnostic('step:reroute', {
          nodeId: runtimeNode.graphNodeId,
          reroute,
          data: data || {},
        });
      },
    };
  }

  private buildSkillInput(
    runtimeNode: RuntimeSkillNode,
    context: {
      sessionId: string;
      executionId: string;
      task: string;
      intent: TaskIntent;
      previousNodeId: string | null;
      agent?: OrchestrationAgentContext | null;
      sessionContext?: OrchestrationSessionContext | null;
    }
  ): Record<string, unknown> {
    const snapshot = this.stateStore.getSnapshot(context.sessionId);
    const previousOutput = context.previousNodeId && snapshot
      ? snapshot.outputs[context.previousNodeId] || null
      : null;

    return {
      task: context.task,
      text: context.task,
      goal: context.intent.goal,
      objective: runtimeNode.objective,
      capabilityCategory: runtimeNode.capabilityCategory,
      constraints: context.intent.constraints,
      previousOutput,
      priorOutputs: snapshot?.outputs || {},
      requirements: `${runtimeNode.objective}\n\nOriginal task:\n${context.task}`,
      specification: `${runtimeNode.objective}\n\nContext:\n${stringifyForSearch(previousOutput || context.task)}`,
      session: {
        sessionId: context.sessionId,
        executionId: context.executionId,
        mode: context.sessionContext?.mode || null,
        metadata: context.sessionContext?.metadata || {},
        capabilities: context.sessionContext?.capabilities || [],
        prompt: context.sessionContext?.prompt || null,
      },
      agent: context.agent || null,
    };
  }

  private markSkippedNodes(
    buildResult: ExecutionGraphBuildResult,
    sessionId: string,
    nodeIds: string[],
    skippedNodeIds: Set<string>,
    bridge: OrchestrationEventBridge
  ): void {
    for (const nodeId of nodeIds) {
      if (skippedNodeIds.has(nodeId)) {
        continue;
      }

      skippedNodeIds.add(nodeId);
      this.stateStore.updateNodeState(sessionId, nodeId, 'skipped');

      const runtimeNode = buildResult.runtimeNodes[nodeId];
      if (runtimeNode?.kind === 'skill') {
        bridge.emitNodeRejected(nodeId, {
          reason: 'branch_not_taken',
        });
      }
    }
  }

  private evaluateDecision(
    runtimeNode: RuntimeDecisionNode,
    context: {
      previousOutput: unknown;
      previousError: ExecutionErrorInfo | null;
    }
  ): BranchChoice {
    const matched = evaluateCondition(runtimeNode.condition, context.previousOutput, context.previousError);
    const takeAlternate = runtimeNode.takeAlternateWhen === 'if_true' ? matched : !matched;
    const selectedNodeId = takeAlternate
      ? runtimeNode.alternateTargetNodeId
      : runtimeNode.sequentialTargetNodeId;
    const reroutedEdgeId = takeAlternate
      ? runtimeNode.sequentialEdgeId
      : runtimeNode.alternateEdgeId;
    const activeEdgeId = takeAlternate
      ? runtimeNode.alternateEdgeId
      : runtimeNode.sequentialEdgeId;

    return {
      nodeId: runtimeNode.graphNodeId,
      condition: runtimeNode.condition,
      matched,
      selectedNodeId,
      reroutedEdgeId,
      activeEdgeId,
      reason: matched
        ? 'Branch condition evaluated true'
        : 'Branch condition evaluated false',
    };
  }
}

function getNextSequentialNodeId(
  buildResult: ExecutionGraphBuildResult,
  currentNodeId: string,
  skippedNodeIds: ReadonlySet<string>
): string | null {
  const currentIndex = buildResult.orderedNodeIds.indexOf(currentNodeId);
  if (currentIndex < 0) {
    return null;
  }

  for (let index = currentIndex + 1; index < buildResult.orderedNodeIds.length; index += 1) {
    const nextNodeId = buildResult.orderedNodeIds[index];
    if (nextNodeId && !skippedNodeIds.has(nextNodeId)) {
      return nextNodeId;
    }
  }

  return null;
}

function findEdgeBetween(
  buildResult: ExecutionGraphBuildResult,
  fromNodeId: string | null,
  toNodeId: string
): string | null {
  if (!fromNodeId) {
    return null;
  }

  const edge = (buildResult.outgoingEdges[fromNodeId] || []).find(candidate => candidate.to === toNodeId);
  return edge?.id || null;
}

function toExecutionError(error: unknown, nodeId: string): ExecutionErrorInfo {
  if (error instanceof Error) {
    return {
      message: error.message,
      type: error.name,
      nodeId,
    };
  }

  return {
    message: String(error),
    type: 'Error',
    nodeId,
  };
}

function evaluateCondition(
  condition: string,
  previousOutput: unknown,
  previousError: ExecutionErrorInfo | null
): boolean {
  const normalizedCondition = condition.toLowerCase();
  const haystack = stringifyForSearch(previousOutput).toLowerCase();

  if (/error|fail|invalid/.test(normalizedCondition)) {
    return Boolean(previousError)
      || /\berror\b|\bfail\b|\binvalid\b/.test(haystack);
  }

  if (/manual|approval|review|human/.test(normalizedCondition)) {
    return /\bmanual\b|\breview\b|\bapproval\b|\bhuman\b/.test(haystack)
      || safeRecord(previousOutput).needsManualReview === true
      || safeRecord(previousOutput).requiresApproval === true;
  }

  if (/empty|missing|no data/.test(normalizedCondition)) {
    return !previousOutput || haystack === '{}' || haystack === 'null' || haystack === '""';
  }

  return /\btrue\b|\byes\b|\brequired\b/.test(haystack);
}
