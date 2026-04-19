import { randomUUID } from 'node:crypto';
import { defaultRegistry } from '../registry/ToolRegistry.js';
import { ExecutionEventPublisher } from '../execution/ExecutionEventPublisher.js';
import { defaultLLM } from '../llm/LLMWrapper.js';
import { getSocketServer } from '../ws/server.js';
import { OrchestrationEngine, SessionStateStore, createEngineLogger } from '../orchestration-engine/index.js';
import { defaultSessionStateRepository } from '../persistence/FileSessionStateRepository.js';

export class Orchestrator {
  constructor(config = {}) {
    this.registry = config.registry || defaultRegistry;
    this.llm = config.llm || defaultLLM;
    this.socketServer = config.socketServer || null;
    this.executionHistory = [];
    this.logger = config.logger || createEngineLogger();
    this.engine = config.engine || new OrchestrationEngine({
      registry: this.registry,
      llm: this.llm,
      logger: this.logger,
      stateStore: config.stateStore,
    });
  }

  setSocketServer(socketServer) {
    this.socketServer = socketServer;
  }

  async orchestrate(input, options = {}) {
    if (isWorkflowInput(input)) {
      const result = await this._executeWorkflow(input, options);
      this.executionHistory.push(result);
      return result;
    }

    const normalizedTask = normalizeTaskInput(input);
    const result = await this.engine.orchestrateTask({
      sessionId: options.sessionId || 'default',
      task: normalizedTask,
      agent: options.agent || null,
      sessionContext: options.sessionContext || null,
      allowedToolIds: options.allowedToolIds,
      eventSink: options.eventSink,
      socketServer: options.socketServer || this.socketServer || getSocketServer(),
      topK: options.topK,
      minScore: options.minScore,
    });

    this.executionHistory.push(result);
    return result;
  }

  async executeTool(toolId, input, options = {}) {
    const tool = this.registry.getTool(toolId);
    const executionId = `tool_${Date.now()}`;
    const sessionId = options.sessionId || null;
    const startedAt = Date.now();
    const publisher = options.eventSink
      ? new ExecutionEventPublisher({
          executionId,
          sessionId,
          onEvent: options.eventSink,
          socketServer: options.socketServer || this.socketServer || getSocketServer(),
        })
      : null;
    const result = {
      executionId,
      sessionId,
      status: 'pending',
      toolId,
      input,
      selectedTool: null,
      toolSelection: null,
      selectionTrace: [],
      trace: [],
      finalResult: null,
      output: null,
      error: null,
      duration: 0,
      timestamp: new Date().toISOString(),
    };
    const selection = {
      stepId: 'explicit-tool',
      stepTitle: tool?.name || toolId,
      strategy: 'explicit',
      candidates: tool
        ? [{
            toolId: tool.id,
            name: tool.name,
            score: 1,
            confidence: 100,
            category: tool.metadata?.category || 'uncategorized',
            reason: 'Explicit tool execution',
          }]
        : [],
      selectedToolId: tool?.id || toolId,
    };

    if (!tool) {
      result.status = 'error';
      result.error = {
        message: `Tool '${toolId}' not found`,
        type: 'Error',
      };
      publisher?.emit('execution.started', {
        workflow: {
          mode: 'tool',
          toolId,
        },
      });
      publisher?.emit('step.failed', {
        step: {
          index: 1,
          total: 1,
          tool: toolId,
          toolId,
          input,
        },
        selection,
        error: result.error,
      });
      publisher?.emit('execution.failed', {
        step: {
          index: 1,
          total: 1,
          tool: toolId,
          toolId,
        },
        selection,
        error: result.error,
        final: true,
      });
      result.duration = Date.now() - startedAt;
      return result;
    }

    if (Array.isArray(options.allowedToolIds) && !options.allowedToolIds.includes(toolId)) {
      result.status = 'error';
      result.error = {
        message: `Tool '${toolId}' is not allowed for this session`,
        type: 'Error',
      };
      publisher?.emit('execution.started', {
        workflow: {
          mode: 'tool',
          toolId,
        },
      });
      publisher?.emit('step.failed', {
        step: {
          index: 1,
          total: 1,
          tool: toolId,
          toolId,
          input,
        },
        selection,
        error: result.error,
      });
      publisher?.emit('execution.failed', {
        step: {
          index: 1,
          total: 1,
          tool: toolId,
          toolId,
        },
        selection,
        error: result.error,
        final: true,
      });
      result.duration = Date.now() - startedAt;
      return result;
    }

    publisher?.emit('execution.started', {
      workflow: {
        mode: 'tool',
        toolId,
      },
    });

    try {
      result.status = 'running';
      result.selectedTool = this._toolToSummary(tool);
      result.toolSelection = selection;
      result.selectionTrace.push(result.toolSelection);
      const runtime = createExecutionRuntime({
        publisher,
        step: {
          index: 1,
          total: 1,
          tool: tool.id,
          toolId: tool.id,
          title: tool.name,
        },
        selection,
      });
      publisher?.emit('step.started', {
        step: {
          index: 1,
          total: 1,
          tool: tool.id,
          toolId: tool.id,
          title: tool.name,
          input,
        },
        selection,
      });

      result.output = await this.registry.executeTool(toolId, input, this.llm, runtime);
      result.finalResult = result.output;
      result.status = 'success';
      result.trace.push({
        nodeId: tool.id,
        nodeType: 'skill',
        tool: tool.id,
        toolId: tool.id,
        status: 'completed',
        input,
        output: result.output,
        selection,
        startedAt: new Date(startedAt).toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startedAt,
      });
      publisher?.emit('step.completed', {
        step: {
          index: 1,
          total: 1,
          tool: tool.id,
          toolId: tool.id,
          title: tool.name,
          input,
          output: result.output,
        },
        selection,
        data: result.output,
      });
      publisher?.emit('execution.completed', {
        step: {
          index: 1,
          total: 1,
          tool: tool.id,
          toolId: tool.id,
        },
        selection,
        data: result.output,
        final: true,
      });
    } catch (error) {
      result.status = 'error';
      result.error = {
        message: error instanceof Error ? error.message : String(error),
        type: error instanceof Error ? error.name : 'Error',
      };
      result.trace.push({
        nodeId: tool.id,
        nodeType: 'skill',
        tool: tool.id,
        toolId: tool.id,
        status: 'failed',
        input,
        error: result.error,
        selection,
        startedAt: new Date(startedAt).toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startedAt,
      });
      publisher?.emit('step.failed', {
        step: {
          index: 1,
          total: 1,
          tool: tool.id,
          toolId: tool.id,
          title: tool.name,
          input,
        },
        selection,
        error: result.error,
      });
      publisher?.emit('execution.failed', {
        step: {
          index: 1,
          total: 1,
          tool: tool.id,
          toolId: tool.id,
        },
        selection,
        error: result.error,
        final: true,
      });
    } finally {
      result.duration = Date.now() - startedAt;
      this.executionHistory.push(result);
    }

    return result;
  }

  getAvailableTools(options = {}) {
    const tools = typeof this.registry.filterTools === 'function'
      ? this.registry.filterTools(options)
      : this.registry.getAllTools();
    return tools.map(tool => this._toolToSummary(tool));
  }

  searchTools(query, filters = {}) {
    const tools = typeof this.registry.searchTools === 'function'
      ? this.registry.searchTools(query, filters)
      : this.registry.getAllTools().filter(tool => {
          const haystack = `${tool.name} ${tool.description} ${(tool.metadata?.tags || []).join(' ')}`.toLowerCase();
          return haystack.includes(String(query).toLowerCase());
        });
    return tools.map(tool => this._toolToSummary(tool));
  }

  getExecutionHistory(options = {}) {
    let history = [...this.executionHistory];

    if (options.status) {
      history = history.filter(entry => entry.status === options.status);
    }

    if (options.limit) {
      history = history.slice(-options.limit);
    }

    return history;
  }

  getSessionState(sessionId) {
    return this.engine.getSessionState(sessionId);
  }

  hydrateSessionState(snapshot) {
    return this.engine.hydrateSessionState(snapshot);
  }

  rebuildExecutionGraph(config) {
    return this.engine.rebuildExecutionGraph(config);
  }

  continueSession(sessionId, options = {}) {
    return this.engine.continueSession({
      sessionId,
      eventSink: options.eventSink,
      socketServer: options.socketServer || this.socketServer || getSocketServer(),
      agent: options.agent || null,
      sessionContext: options.sessionContext || null,
    });
  }

  getStateStore() {
    return this.engine.getStateStore();
  }

  async flushStateStore() {
    await this.engine.getStateStore().flushPersistence?.();
  }

  getStats() {
    const successful = this.executionHistory.filter(entry => entry.status === 'success').length;
    const failed = this.executionHistory.filter(entry => entry.status === 'error').length;
    const awaitingApproval = this.executionHistory.filter(entry => entry.status === 'awaiting_approval').length;
    const averageDuration = this.executionHistory.length > 0
      ? Math.round(this.executionHistory.reduce((sum, entry) => sum + entry.duration, 0) / this.executionHistory.length)
      : 0;

    return {
      totalExecutions: this.executionHistory.length,
      successfulExecutions: successful,
      failedExecutions: failed,
      awaitingApprovalExecutions: awaitingApproval,
      successRate: this.executionHistory.length > 0
        ? `${((successful / this.executionHistory.length) * 100).toFixed(2)}%`
        : 'N/A',
      averageDuration: `${averageDuration}ms`,
      registryStats: typeof this.registry.getStats === 'function'
        ? this.registry.getStats()
        : null,
    };
  }

  clearHistory() {
    this.executionHistory = [];
  }

  _toolToSummary(tool) {
    return {
      id: tool.id,
      name: tool.name,
      description: tool.description,
      category: tool.metadata?.category || 'uncategorized',
      tags: tool.metadata?.tags || [],
      version: tool.metadata?.version || '1.0.0',
      source: tool.metadata?.source || null,
      sourcePath: tool.metadata?.sourcePath || null,
      sourceType: tool.metadata?.sourceType || null,
      trustLevel: tool.metadata?.trustLevel || null,
      validationStatus: tool.metadata?.validationStatus || null,
    };
  }

  async _executeWorkflow(workflow, options = {}) {
    const executionId = `workflow_${Date.now()}_${randomUUID().slice(0, 8)}`;
    const sessionId = options.sessionId || null;
    const startedAt = Date.now();
    const publisher = options.eventSink
      ? new ExecutionEventPublisher({
          executionId,
          sessionId,
          onEvent: options.eventSink,
          socketServer: options.socketServer || this.socketServer || getSocketServer(),
        })
      : null;
    const result = {
      executionId,
      sessionId,
      status: 'pending',
      toolId: null,
      input: workflow.input,
      selectedTool: null,
      toolSelection: null,
      selectionTrace: [],
      trace: [],
      finalResult: null,
      output: null,
      error: null,
      duration: 0,
      timestamp: new Date(startedAt).toISOString(),
    };
    const steps = Array.isArray(workflow.steps) ? workflow.steps : [];
    const context = {
      originalInput: workflow.input,
      previousOutput: workflow.input,
      stepOutputs: [],
    };

    publisher?.emit('execution.started', {
      workflow: {
        mode: 'workflow',
        stepCount: steps.length,
      },
    });

    try {
      result.status = 'running';

      for (let index = 0; index < steps.length; index += 1) {
        const stepConfig = steps[index] || {};
        const tool = resolveWorkflowTool(this.registry, stepConfig.tool);
        if (!tool) {
          throw new Error(`Workflow step ${index + 1} references an unknown tool`);
        }

        const selection = {
          stepId: `workflow-step-${index + 1}`,
          stepTitle: stepConfig.title || tool.name,
          strategy: stepConfig.tool ? 'explicit' : 'auto',
          candidates: [{
            toolId: tool.id,
            name: tool.name,
            score: 1,
            confidence: 100,
            category: tool.metadata?.category || 'uncategorized',
            reason: stepConfig.tool ? 'Explicit workflow step tool' : 'Selected for workflow execution',
          }],
          selectedToolId: tool.id,
        };
        const resolvedInput = Object.prototype.hasOwnProperty.call(stepConfig, 'input')
          ? resolveWorkflowValue(stepConfig.input, context)
          : context.previousOutput;
        const stepMeta = {
          index: index + 1,
          total: steps.length,
          tool: tool.id,
          toolId: tool.id,
          title: tool.name,
          input: resolvedInput,
        };
        const runtime = createExecutionRuntime({
          publisher,
          step: stepMeta,
          selection,
        });

        if (!result.selectedTool) {
          result.selectedTool = this._toolToSummary(tool);
        }
        if (!result.toolSelection) {
          result.toolSelection = selection;
        }
        result.selectionTrace.push(selection);
        publisher?.emit('step.started', {
          step: stepMeta,
          selection,
        });

        const output = await this.registry.executeTool(tool.id, resolvedInput, this.llm, runtime);
        const traceEntry = {
          nodeId: tool.id,
          nodeType: 'skill',
          tool: tool.id,
          toolId: tool.id,
          status: 'completed',
          input: resolvedInput,
          output,
          selection,
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          durationMs: 0,
        };

        result.trace.push(traceEntry);
        context.previousOutput = output;
        context.stepOutputs.push({
          tool: tool.id,
          output,
        });

        publisher?.emit('step.completed', {
          step: {
            ...stepMeta,
            output,
          },
          selection,
          data: output,
        });
      }

      result.status = 'success';
      result.finalResult = context.previousOutput;
      result.output = context.previousOutput;
      publisher?.emit('execution.completed', {
        workflow: {
          mode: 'workflow',
          stepCount: steps.length,
        },
        data: context.previousOutput,
        final: true,
      });
    } catch (error) {
      result.status = 'error';
      result.error = {
        message: error instanceof Error ? error.message : String(error),
        type: error instanceof Error ? error.name : 'Error',
      };
      publisher?.emit('execution.failed', {
        workflow: {
          mode: 'workflow',
          stepCount: steps.length,
        },
        error: result.error,
        final: true,
      });
    }

    result.duration = Date.now() - startedAt;
    return result;
  }
}

export const defaultOrchestrator = new Orchestrator({
  registry: defaultRegistry,
  llm: defaultLLM,
  stateStore: new SessionStateStore({
    persistence: defaultSessionStateRepository,
  }),
});

function normalizeTaskInput(input) {
  if (typeof input === 'string') {
    return input;
  }

  if (input && typeof input === 'object') {
    if (typeof input.task === 'string') {
      return input.task;
    }

    if (typeof input.input === 'string') {
      return input.input;
    }

    if (Array.isArray(input.steps)) {
      const describedSteps = input.steps
        .map(step => {
          if (typeof step === 'string') {
            return step;
          }

          if (step && typeof step === 'object') {
            return [step.tool, step.input].filter(Boolean).join(': ');
          }

          return String(step);
        })
        .join(' -> ');
      return `${input.input || 'Workflow task'}\n${describedSteps}`;
    }
  }

  return JSON.stringify(input);
}

function isWorkflowInput(input) {
  return Boolean(input)
    && typeof input === 'object'
    && Array.isArray(input.steps);
}

function resolveWorkflowTool(registry, reference) {
  if (typeof reference === 'string' && reference.trim()) {
    return registry.resolveTool(reference.trim());
  }

  return null;
}

function resolveWorkflowValue(value, context) {
  if (Array.isArray(value)) {
    return value.map(entry => resolveWorkflowValue(entry, context));
  }

  if (value && typeof value === 'object') {
    if (typeof value.$from === 'string') {
      return resolveWorkflowPath(value.$from, context);
    }

    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, resolveWorkflowValue(entry, context)])
    );
  }

  return value;
}

function resolveWorkflowPath(reference, context) {
  const normalized = String(reference).trim();
  if (!normalized) {
    return null;
  }

  if (normalized === 'previous') {
    return context.previousOutput;
  }

  if (normalized === 'originalInput') {
    return context.originalInput;
  }

  const pathSegments = normalized
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .filter(Boolean);
  const [root, ...rest] = pathSegments;

  if (root === 'previous') {
    return drillValue(context.previousOutput, rest);
  }

  if (root === 'originalInput') {
    return drillValue(context.originalInput, rest);
  }

  if (root === 'steps' || root === 'stepOutputs') {
    return drillValue(context.stepOutputs, rest);
  }

  return null;
}

function drillValue(source, pathSegments) {
  return pathSegments.reduce((current, segment) => {
    if (current == null) {
      return null;
    }

    if (Array.isArray(current) && /^\d+$/.test(segment)) {
      return current[Number(segment)] ?? null;
    }

    if (typeof current === 'object') {
      return current[segment] ?? null;
    }

    return null;
  }, source);
}

function createExecutionRuntime({ publisher, step, selection }) {
  return {
    executionId: publisher?.executionId || null,
    sessionId: publisher?.sessionId || null,
    step,
    selection,
    reportProgress(progress, data = null) {
      publisher?.emit('step.progress', {
        step,
        selection,
        progress,
        data: data || undefined,
      });
    },
    reroute(reroute, data = null) {
      publisher?.emit('step.rerouted', {
        step,
        selection,
        reroute,
        data: data || undefined,
      });
    },
  };
}
