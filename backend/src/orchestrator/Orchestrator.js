import { defaultRegistry } from '../registry/ToolRegistry.js';
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
    const startedAt = Date.now();
    const result = {
      executionId,
      sessionId: options.sessionId || null,
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

    if (!tool) {
      result.status = 'error';
      result.error = {
        message: `Tool '${toolId}' not found`,
        type: 'Error',
      };
      result.duration = Date.now() - startedAt;
      return result;
    }

    if (Array.isArray(options.allowedToolIds) && !options.allowedToolIds.includes(toolId)) {
      result.status = 'error';
      result.error = {
        message: `Tool '${toolId}' is not allowed for this session`,
        type: 'Error',
      };
      result.duration = Date.now() - startedAt;
      return result;
    }

    try {
      result.status = 'running';
      result.selectedTool = this._toolToSummary(tool);
      result.toolSelection = {
        stepId: 'explicit-tool',
        stepTitle: tool.name,
        candidates: [{
          toolId: tool.id,
          name: tool.name,
          score: 1,
          confidence: 100,
          category: tool.metadata?.category || 'uncategorized',
          reason: 'Explicit tool execution',
        }],
        selectedToolId: tool.id,
      };
      result.selectionTrace.push(result.toolSelection);

      result.output = await this.registry.executeTool(toolId, input, this.llm, null);
      result.finalResult = result.output;
      result.status = 'success';
      result.trace.push({
        nodeId: tool.id,
        nodeType: 'skill',
        toolId: tool.id,
        status: 'completed',
        input,
        output: result.output,
        startedAt: new Date(startedAt).toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startedAt,
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
        toolId: tool.id,
        status: 'failed',
        input,
        error: result.error,
        startedAt: new Date(startedAt).toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startedAt,
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
