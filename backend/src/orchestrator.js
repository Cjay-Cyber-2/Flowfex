import './init.js';
import { defaultRegistry, ToolRegistry } from './registry/ToolRegistry.js';
import { Orchestrator, defaultOrchestrator } from './orchestrator/Orchestrator.js';

/**
 * Legacy-compatible orchestration wrapper.
 *
 * Keeps the simple Phase 2 contract while delegating execution to the modern
 * orchestrator and registry stack used everywhere else.
 *
 * @param {*} input
 * @param {Object} [options]
 * @returns {Promise<{tool_used: string|null, input: *, output: *, trace: Array, executionId: string|null, status: string}>}
 */
export async function orchestrate(input, options = {}) {
  try {
    if (typeof input === 'string') {
      const selectedTool = defaultRegistry.findToolsByKeywords(input)[0] || defaultRegistry.selectTool(input);

      if (selectedTool) {
        const result = await defaultOrchestrator.executeTool(selectedTool.id, input, options);
        return {
          tool_used: selectedTool.id,
          input,
          output: result.output,
          trace: result.trace,
          executionId: result.executionId,
          status: result.status
        };
      }
    }

    const result = await defaultOrchestrator.orchestrate(input, options);
    return {
      tool_used: result.selectedTool?.id || result.trace[0]?.tool || null,
      input,
      output: result.output,
      trace: result.trace,
      executionId: result.executionId,
      status: result.status
    };
  } catch (error) {
    return {
      tool_used: null,
      input,
      output: {
        error: {
          message: error.message,
          type: error.constructor.name
        }
      },
      trace: [],
      executionId: null,
      status: 'error'
    };
  }
}

export { Orchestrator, ToolRegistry, defaultOrchestrator, defaultRegistry };
