import { defaultRegistry } from '../registry/ToolRegistry.js';
import { defaultLLM } from '../llm/LLMWrapper.js';
import { ExecutionEventPublisher } from '../execution/ExecutionEventPublisher.js';

/**
 * Orchestrator
 *
 * The core execution engine for Flowfex.
 * Handles semantic tool selection, execution coordination, and result formatting.
 */
export class Orchestrator {
  /**
   * Creates a new Orchestrator instance
   * @param {Object} config - Configuration
   * @param {ToolRegistry} [config.registry] - The tool registry to use
   * @param {LLMWrapper} [config.llm] - The LLM wrapper to use
   */
  constructor(config = {}) {
    this.registry = config.registry || defaultRegistry;
    this.llm = config.llm || defaultLLM;
    this.executionHistory = [];
    this.executionCount = 0;
  }

  /**
   * Orchestrates execution based on user input
   * Selects appropriate tools and executes them
   * @param {string|Object} input - User input or config object
   * @param {Object} [options] - Execution constraints
   * @returns {Promise<Object>} Execution result
   */
  async orchestrate(input, options = {}) {
    this.executionCount++;
    const executionId = `exec-${this.executionCount}-${Date.now()}`;
    const startTime = Date.now();
    const publisher = this._createEventPublisher({
      executionId,
      sessionId: options.sessionId,
      eventSink: options.eventSink
    });
    const result = {
      executionId,
      sessionId: options.sessionId || null,
      status: 'pending',
      input,
      selectedTool: null,
      toolSelection: null,
      selectionTrace: [],
      trace: [],
      finalResult: null,
      output: null,
      error: null,
      duration: 0,
      timestamp: new Date().toISOString()
    };
    let workflow = null;

    try {
      workflow = this._normalizeWorkflow(input);
      const executionOptions = this._normalizeExecutionOptions(options, workflow.constraints);
      let previousOutput;
      let firstResolvedTool = null;
      let firstSelection = null;
      let previousResolvedTool = null;

      result.status = 'running';
      publisher.emit('execution.started', {
        workflow: {
          totalSteps: workflow.steps.length
        },
        data: {
          input: workflow.originalInput
        }
      });

      for (let index = 0; index < workflow.steps.length; index++) {
        const stepNumber = index + 1;
        const stepConfig = workflow.steps[index];
        const stepInput = this._resolveStepInput(stepConfig.input, {
          originalInput: workflow.originalInput,
          previous: previousOutput,
          trace: result.trace
        });
        const resolved = this._resolveToolForStep(stepConfig.tool, stepInput, stepNumber, executionOptions);
        const stepStartTime = Date.now();
        const stepContext = this._buildStepContext(resolved.tool, stepNumber, workflow.steps.length);

        if (stepNumber === 1) {
          firstResolvedTool = resolved.tool;
          firstSelection = resolved.selection;
        }

        this._emitRerouteEvents({
          publisher,
          stepContext,
          selection: resolved.selection,
          previousTool: previousResolvedTool,
          currentTool: resolved.tool,
          isExplicitTool: Boolean(stepConfig.tool)
        });

        publisher.emit('step.started', {
          workflow: {
            totalSteps: workflow.steps.length
          },
          step: stepContext,
          selection: resolved.selection,
          data: {
            input: stepInput
          }
        });

        try {
          const stepRuntime = this._createToolRuntime({
            publisher,
            workflow,
            step: stepContext,
            selection: resolved.selection
          });
          const stepOutput = await this._executeResolvedTool(resolved.tool, stepInput, stepRuntime);
          const completedAt = new Date().toISOString();
          const duration = Date.now() - stepStartTime;

          result.selectionTrace.push({
            step: stepNumber,
            ...resolved.selection
          });
          result.trace.push({
            step: stepNumber,
            tool: resolved.tool.id,
            status: 'completed',
            input: stepInput,
            selection: resolved.selection,
            output: stepOutput,
            startedAt: new Date(stepStartTime).toISOString(),
            completedAt,
            duration
          });

          publisher.emit('step.completed', {
            workflow: {
              totalSteps: workflow.steps.length
            },
            step: stepContext,
            selection: resolved.selection,
            data: {
              input: stepInput,
              output: stepOutput,
              duration
            }
          });

          previousOutput = stepOutput;
          previousResolvedTool = resolved.tool;
        } catch (error) {
          const completedAt = new Date().toISOString();
          const duration = Date.now() - stepStartTime;

          result.selectionTrace.push({
            step: stepNumber,
            ...resolved.selection
          });
          result.trace.push({
            step: stepNumber,
            tool: resolved.tool.id,
            status: 'failed',
            input: stepInput,
            selection: resolved.selection,
            output: {
              error: {
                message: error.message,
                type: error.constructor.name
              }
            },
            startedAt: new Date(stepStartTime).toISOString(),
            completedAt,
            duration
          });

          publisher.emit('step.failed', {
            workflow: {
              totalSteps: workflow.steps.length
            },
            step: stepContext,
            selection: resolved.selection,
            data: {
              input: stepInput,
              duration
            },
            error
          });

          throw error;
        }
      }

      if (result.trace.length === 1) {
        result.selectedTool = firstResolvedTool ? this._toolToSummary(firstResolvedTool) : null;
        result.toolSelection = firstSelection;
      }

      result.status = 'success';
      result.finalResult = previousOutput;
      result.output = previousOutput;
      result.duration = Date.now() - startTime;
      publisher.emit('execution.completed', {
        workflow: {
          totalSteps: workflow.steps.length
        },
        data: {
          output: previousOutput,
          trace: result.trace,
          duration: result.duration
        },
        final: true
      });
    } catch (error) {
      result.status = 'error';
      result.error = {
        message: error.message,
        type: error.constructor.name
      };
      result.duration = Date.now() - startTime;
      publisher.emit('execution.failed', {
        workflow: {
          totalSteps: workflow?.steps?.length || result.trace.length || 1
        },
        data: {
          trace: result.trace,
          duration: result.duration
        },
        error,
        final: true
      });
    } finally {
      if (!result.duration) {
        result.duration = Date.now() - startTime;
      }
      this.executionHistory.push(result);
    }

    return result;
  }

  /**
   * Executes a specific tool by ID
   * @param {string} toolId - The tool ID to execute
   * @param {*} input - Input for the tool
   * @param {Object} [options] - Execution constraints
   * @returns {Promise<Object>} Execution result
   */
  async executeTool(toolId, input, options = {}) {
    let tool = null;
    const executionOptions = this._normalizeExecutionOptions(options);
    const executionId = `tool-${Date.now()}`;
    const startTime = Date.now();
    const publisher = this._createEventPublisher({
      executionId,
      sessionId: options.sessionId,
      eventSink: options.eventSink
    });
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
      timestamp: new Date().toISOString()
    };

    try {
      tool = this.registry.getTool(toolId);
      if (!tool) {
        throw new Error(`Tool '${toolId}' not found`);
      }

      this._assertToolAllowed(tool, executionOptions);

      result.status = 'running';
      result.selectedTool = this._toolToSummary(tool);
      result.toolSelection = this._buildExplicitSelection(tool);
      result.selectionTrace.push({
        step: 1,
        ...result.toolSelection
      });
      const stepContext = this._buildStepContext(tool, 1, 1);
      publisher.emit('execution.started', {
        workflow: {
          totalSteps: 1
        },
        data: {
          input
        }
      });
      publisher.emit('step.started', {
        workflow: {
          totalSteps: 1
        },
        step: stepContext,
        selection: result.toolSelection,
        data: {
          input
        }
      });

      const stepStartTime = Date.now();
      const runtime = this._createToolRuntime({
        publisher,
        workflow: {
          steps: [{}]
        },
        step: stepContext,
        selection: result.toolSelection
      });
      result.output = await this.registry.executeTool(toolId, input, this.llm, runtime);
      result.finalResult = result.output;
      const completedAt = new Date().toISOString();
      const duration = Date.now() - stepStartTime;
      result.trace.push({
        step: 1,
        tool: tool.id,
        status: 'completed',
        input,
        selection: result.toolSelection,
        output: result.output,
        startedAt: new Date(stepStartTime).toISOString(),
        completedAt,
        duration
      });
      result.status = 'success';
      result.duration = Date.now() - startTime;

      publisher.emit('step.completed', {
        workflow: {
          totalSteps: 1
        },
        step: stepContext,
        selection: result.toolSelection,
        data: {
          input,
          output: result.output,
          duration
        }
      });
      publisher.emit('execution.completed', {
        workflow: {
          totalSteps: 1
        },
        data: {
          output: result.output,
          trace: result.trace,
          duration: result.duration
        },
        final: true
      });
    } catch (error) {
      if (tool) {
        const completedAt = new Date().toISOString();
        const duration = Date.now() - startTime;
        result.trace.push({
          step: 1,
          tool: tool.id,
          status: 'failed',
          input,
          selection: result.toolSelection || this._buildExplicitSelection(tool),
          output: {
            error: {
              message: error.message,
              type: error.constructor.name
            }
          },
          startedAt: result.timestamp,
          completedAt,
          duration
        });

        publisher.emit('step.failed', {
          workflow: {
            totalSteps: 1
          },
          step: this._buildStepContext(tool, 1, 1),
          selection: result.toolSelection || this._buildExplicitSelection(tool),
          data: {
            input,
            duration
          },
          error
        });
      }

      result.status = 'error';
      result.error = {
        message: error.message,
        type: error.constructor.name
      };
      result.duration = Date.now() - startTime;
      publisher.emit('execution.failed', {
        workflow: {
          totalSteps: 1
        },
        data: {
          trace: result.trace,
          duration: result.duration
        },
        error,
        final: true
      });
    } finally {
      if (!result.duration) {
        result.duration = Date.now() - startTime;
      }
      this.executionHistory.push(result);
    }

    return result;
  }

  /**
   * Gets available tools
   * @param {Object} [options] - Filter options
   * @param {string} [options.category] - Filter by category
   * @param {string[]} [options.toolIds] - Restrict to a set of tool IDs
   * @returns {Object[]} Array of tool summaries
   */
  getAvailableTools(options = {}) {
    const tools = this.registry.filterTools(options);
    return tools.map(tool => this._toolToSummary(tool));
  }

  /**
   * Searches for tools
   * @param {string} query - Search query
   * @param {Object} [filters] - Search filters
   * @returns {Object[]} Array of matching tool summaries
   */
  searchTools(query, filters = {}) {
    const tools = this.registry.searchTools(query, filters);
    return tools.map(tool => this._toolToSummary(tool));
  }

  /**
   * Gets execution history
   * @param {Object} [options] - Query options
   * @param {number} [options.limit] - Limit number of results
   * @param {string} [options.status] - Filter by status (success, error, pending)
   * @returns {Object[]} Execution history entries
   */
  getExecutionHistory(options = {}) {
    let history = this.executionHistory;

    if (options.status) {
      history = history.filter(entry => entry.status === options.status);
    }

    if (options.limit) {
      history = history.slice(-options.limit);
    }

    return history;
  }

  /**
   * Gets statistics
   * @returns {Object} Statistics about orchestrator and tools
   */
  getStats() {
    const executionHistory = this.executionHistory;
    const successful = executionHistory.filter(entry => entry.status === 'success').length;
    const failed = executionHistory.filter(entry => entry.status === 'error').length;
    const averageDuration = executionHistory.length > 0
      ? Math.round(executionHistory.reduce((sum, entry) => sum + entry.duration, 0) / executionHistory.length)
      : 0;

    return {
      totalExecutions: this.executionCount,
      successfulExecutions: successful,
      failedExecutions: failed,
      successRate: executionHistory.length > 0
        ? `${((successful / executionHistory.length) * 100).toFixed(2)}%`
        : 'N/A',
      averageDuration: `${averageDuration}ms`,
      registryStats: this.registry.getStats()
    };
  }

  /**
   * Clears execution history
   */
  clearHistory() {
    this.executionHistory = [];
  }

  /**
   * Converts a tool to a summary object
   * @private
   */
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
      validationStatus: tool.metadata?.validationStatus || null
    };
  }

  /**
   * Converts any supported input into a step-based workflow
   * @private
   * @param {*} input
   * @returns {{ originalInput: *, steps: Array<{tool?: string, input?: *}>, constraints?: Object }}
   */
  _normalizeWorkflow(input) {
    if (this._isWorkflowInput(input)) {
      if (input.steps.length === 0) {
        throw new Error('Workflow must include at least one step');
      }

      const hasExplicitInput = Object.prototype.hasOwnProperty.call(input, 'input');

      return {
        originalInput: hasExplicitInput ? input.input : input,
        constraints: input.constraints || {},
        steps: input.steps.map(step => this._normalizeStep(step))
      };
    }

    return {
      originalInput: input,
      constraints: {},
      steps: [{ input }]
    };
  }

  /**
   * Normalizes a workflow step into a consistent shape
   * @private
   * @param {*} step
   * @returns {{tool?: string, input?: *}}
   */
  _normalizeStep(step) {
    if (typeof step === 'undefined') {
      throw new Error('Workflow steps cannot be undefined');
    }

    if (step === null || typeof step !== 'object' || Array.isArray(step)) {
      return { input: step };
    }

    return step;
  }

  /**
   * Resolves a tool for a step using explicit config or semantic retrieval
   * @private
   * @param {string|Object|undefined} toolReference
   * @param {*} stepInput
   * @param {number} stepNumber
   * @param {Object} executionOptions
   * @returns {{ tool: Tool, selection: Object }}
   */
  _resolveToolForStep(toolReference, stepInput, stepNumber, executionOptions) {
    if (toolReference) {
      const explicitTool = this.registry.resolveTool(toolReference);
      if (!explicitTool) {
        throw new Error(`Tool '${toolReference}' not found for step ${stepNumber}`);
      }

      this._assertToolAllowed(explicitTool, executionOptions, stepNumber);

      return {
        tool: explicitTool,
        selection: this._buildExplicitSelection(explicitTool)
      };
    }

    const retrieval = this.registry.retrieveTools(this._inputToSearchString(stepInput), {
      topK: executionOptions.topK,
      minScore: executionOptions.minScore,
      filters: this._buildRetrievalFilters(executionOptions),
      allowKeywordFallback: true
    });

    if (retrieval.matches.length === 0) {
      throw new Error(`No suitable tools found for step ${stepNumber}`);
    }

    return {
      tool: retrieval.matches[0].tool,
      selection: this._buildRetrievedSelection(retrieval)
    };
  }

  /**
   * Executes a resolved tool, using registry tracking when available
   * @private
   * @param {Tool} tool
   * @param {*} input
   * @returns {Promise<*>}
   */
  async _executeResolvedTool(tool, input, runtime = null) {
    const registeredTool = this.registry.getTool(tool.id);
    if (registeredTool) {
      return this.registry.executeTool(registeredTool.id, input, this.llm, runtime);
    }

    return tool.execute(input, this.llm, runtime);
  }

  _createEventPublisher({ executionId, sessionId, eventSink }) {
    return new ExecutionEventPublisher({
      executionId,
      sessionId: sessionId || null,
      onEvent: eventSink
    });
  }

  _buildStepContext(tool, stepNumber, totalSteps) {
    return {
      index: stepNumber,
      total: totalSteps,
      tool: this._toolToSummary(tool)
    };
  }

  _createToolRuntime({ publisher, workflow, step, selection }) {
    const totalSteps = workflow?.steps?.length || step.total || 1;

    return {
      executionId: publisher.executionId,
      sessionId: publisher.sessionId,
      step,
      selection,
      reportProgress: (progress, data = null) => publisher.emit('step.progress', {
        workflow: {
          totalSteps
        },
        step,
        selection,
        progress,
        ...(data ? { data } : {})
      }),
      reroute: (reroute, data = null) => publisher.emit('step.rerouted', {
        workflow: {
          totalSteps
        },
        step,
        selection,
        reroute,
        ...(data ? { data } : {})
      })
    };
  }

  _emitRerouteEvents({ publisher, stepContext, selection, previousTool, currentTool, isExplicitTool }) {
    if (selection?.fallbackUsed) {
      publisher.emit('step.rerouted', {
        workflow: {
          totalSteps: stepContext.total
        },
        step: stepContext,
        selection,
        reroute: {
          reason: selection.fallbackReason || 'selection_fallback',
          from: {
            strategy: 'semantic'
          },
          to: {
            strategy: selection.strategy,
            tool: stepContext.tool
          }
        }
      });
    }

    if (!isExplicitTool && previousTool && previousTool.id !== currentTool.id) {
      publisher.emit('step.rerouted', {
        workflow: {
          totalSteps: stepContext.total
        },
        step: stepContext,
        selection,
        reroute: {
          reason: 'step_auto_route',
          from: {
            tool: this._toolToSummary(previousTool)
          },
          to: {
            tool: stepContext.tool
          }
        }
      });
    }
  }

  /**
   * Resolves step input, including references to prior step output
   * @private
   * @param {*} rawInput
   * @param {{ originalInput: *, previous: *, trace: Array }} context
   * @returns {*}
   */
  _resolveStepInput(rawInput, context) {
    if (typeof rawInput === 'undefined') {
      return typeof context.previous === 'undefined' ? context.originalInput : context.previous;
    }

    if (Array.isArray(rawInput)) {
      return rawInput.map(value => this._resolveStepInput(value, context));
    }

    if (!rawInput || typeof rawInput !== 'object') {
      return rawInput;
    }

    if (this._isReference(rawInput)) {
      return this._resolveReference(rawInput.$from, context);
    }

    return Object.fromEntries(
      Object.entries(rawInput).map(([key, value]) => [key, this._resolveStepInput(value, context)])
    );
  }

  /**
   * Resolves a reference path from the execution context
   * @private
   * @param {string} path
   * @param {{ originalInput: *, previous: *, trace: Array }} context
   * @returns {*}
   */
  _resolveReference(path, context) {
    if (typeof path !== 'string' || !path.trim()) {
      throw new Error('Step reference paths must be non-empty strings');
    }

    const value = path.split('.').reduce((current, segment) => {
      if (current === null || typeof current === 'undefined') {
        return undefined;
      }

      if (/^\d+$/.test(segment)) {
        return current[Number(segment)];
      }

      return current[segment];
    }, context);

    if (typeof value === 'undefined') {
      throw new Error(`Unable to resolve step reference '${path}'`);
    }

    return value;
  }

  /**
   * Checks whether the top-level input is a workflow definition
   * @private
   * @param {*} input
   * @returns {boolean}
   */
  _isWorkflowInput(input) {
    return Boolean(input && typeof input === 'object' && !Array.isArray(input) && Array.isArray(input.steps));
  }

  /**
   * Checks if a value is a reference object
   * @private
   * @param {*} value
   * @returns {boolean}
   */
  _isReference(value) {
    return Boolean(
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      Object.keys(value).length === 1 &&
      Object.prototype.hasOwnProperty.call(value, '$from')
    );
  }

  /**
   * Converts input into a searchable string for tool discovery
   * @private
   * @param {*} input
   * @returns {string}
   */
  _inputToSearchString(input) {
    if (typeof input === 'string') {
      return input;
    }

    try {
      return JSON.stringify(input);
    } catch {
      return String(input);
    }
  }

  _normalizeExecutionOptions(options = {}, workflowConstraints = {}) {
    const toolFilters = {
      ...(workflowConstraints.toolFilters || {}),
      ...(options.toolFilters || {})
    };
    const allowedToolIds = Array.isArray(options.allowedToolIds)
      ? options.allowedToolIds
      : Array.isArray(workflowConstraints.allowedToolIds)
        ? workflowConstraints.allowedToolIds
        : undefined;

    return {
      topK: options.topK || workflowConstraints.topK || 5,
      minScore: options.minScore ?? workflowConstraints.minScore ?? 0.08,
      toolFilters,
      allowedToolIds
    };
  }

  _buildRetrievalFilters(executionOptions) {
    return {
      ...executionOptions.toolFilters,
      ...(executionOptions.allowedToolIds ? { toolIds: executionOptions.allowedToolIds } : {})
    };
  }

  _assertToolAllowed(tool, executionOptions, stepNumber = null) {
    if (!Array.isArray(executionOptions.allowedToolIds) || executionOptions.allowedToolIds.includes(tool.id)) {
      return;
    }

    const suffix = stepNumber ? ` for step ${stepNumber}` : '';
    throw new Error(`Tool '${tool.id}' is not allowed${suffix}`);
  }

  _buildExplicitSelection(tool) {
    return {
      strategy: 'explicit',
      query: null,
      fallbackUsed: false,
      fallbackReason: null,
      candidates: [
        {
          tool: this._toolToSummary(tool),
          score: 1
        }
      ]
    };
  }

  _buildRetrievedSelection(retrieval) {
    return {
      strategy: retrieval.strategy,
      query: retrieval.query,
      fallbackUsed: retrieval.fallbackUsed,
      fallbackReason: retrieval.fallbackReason || null,
      candidates: retrieval.matches.map(match => ({
        tool: this._toolToSummary(match.tool),
        score: match.score
      }))
    };
  }
}

/**
 * Default singleton orchestrator instance
 */
export const defaultOrchestrator = new Orchestrator({
  registry: defaultRegistry,
  llm: defaultLLM
});
