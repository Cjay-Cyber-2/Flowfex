/**
 * GraphBuilder
 *
 * Converts an orchestrator execution plan into canvas-compatible
 * node/edge data structures with auto-layout positions.
 */

const NODE_WIDTH = 196;
const NODE_HEIGHT = 96;
const NODE_SPACING_X = 280;
const NODE_SPACING_Y = 200;
const GRAPH_PADDING_X = 180;
const GRAPH_PADDING_Y = 280;

const STEP_ICONS = [
  'sparkles', 'brain', 'git-branch', 'globe', 'shield',
  'layers', 'shield-check', 'file-text', 'send', 'database',
  'search', 'message-square', 'shuffle',
];

const STEP_TYPES = [
  'input', 'analysis', 'decision', 'tool', 'approval', 'output', 'completion',
];

/**
 * Build a canvas-compatible graph from an array of execution steps.
 *
 * @param {Object} options
 * @param {string} options.sessionId
 * @param {string} options.executionId
 * @param {Array<{id: string, title: string, subtitle?: string, type?: string, icon?: string, approvalRequired?: boolean}>} options.steps
 * @param {Array<{nodeId: string, condition?: string, targetIndex?: number}>} [options.branches]
 * @returns {{ nodes: Array, edges: Array }}
 */
export function buildExecutionGraph(options) {
  const { sessionId, executionId, steps, branches = [] } = options;
  const nodes = [];
  const edges = [];

  // Layout: horizontal flow with decision branches going vertical
  const branchMap = new Map();
  for (const branch of branches) {
    branchMap.set(branch.nodeId, branch);
  }

  let col = 0;
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const nodeId = step.id || `node-${executionId}-${i}`;
    const hasBranch = branchMap.has(nodeId);
    const isDecision = step.type === 'decision' || hasBranch;

    const node = {
      id: nodeId,
      type: step.type || STEP_TYPES[Math.min(i, STEP_TYPES.length - 1)],
      shape: isDecision ? 'diamond' : 'rect',
      x: GRAPH_PADDING_X + col * NODE_SPACING_X,
      y: GRAPH_PADDING_Y,
      width: isDecision ? 118 : NODE_WIDTH,
      height: isDecision ? 118 : NODE_HEIGHT,
      title: step.title || `Step ${i + 1}`,
      subtitle: step.subtitle || '',
      state: 'queued',
      icon: step.icon || STEP_ICONS[i % STEP_ICONS.length],
      confidence: 0,
      reasoning: step.reasoning || '',
      alternatives: step.alternatives || [],
      inputs: step.inputs || {},
      config: step.config || {},
      owner: step.owner || 'Orchestrator',
    };

    nodes.push(node);

    // Create edge from previous node
    if (i > 0) {
      const prevNode = nodes[i - 1];
      edges.push({
        id: `edge-${executionId}-${i - 1}-${i}`,
        from: prevNode.id,
        to: nodeId,
        state: 'queued',
        label: null,
      });
    }

    // If this is a decision branch, add branch nodes
    if (hasBranch) {
      const branch = branchMap.get(nodeId);
      const branchNodeId = `${nodeId}-branch`;
      const branchNode = {
        id: branchNodeId,
        type: 'tool',
        shape: 'rect',
        x: GRAPH_PADDING_X + col * NODE_SPACING_X,
        y: GRAPH_PADDING_Y + NODE_SPACING_Y,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        title: branch.label || 'Alternative Path',
        subtitle: branch.condition || 'fallback',
        state: 'idle',
        icon: 'shuffle',
        confidence: 0,
        reasoning: '',
        alternatives: [],
        inputs: {},
        config: {},
        owner: 'Flow Router',
      };
      nodes.push(branchNode);

      // Edge from decision to branch
      edges.push({
        id: `edge-${executionId}-branch-${nodeId}`,
        from: nodeId,
        to: branchNodeId,
        state: 'inactive',
        label: branch.condition || 'fallback',
      });

      // If there's a target, edge from branch to target
      if (branch.targetIndex !== undefined && branch.targetIndex < steps.length) {
        const targetStep = steps[branch.targetIndex];
        const targetNodeId = targetStep.id || `node-${executionId}-${branch.targetIndex}`;
        edges.push({
          id: `edge-${executionId}-branch-rejoin-${nodeId}`,
          from: branchNodeId,
          to: targetNodeId,
          state: 'inactive',
          label: null,
        });
      }
    }

    col++;
  }

  return { sessionId, executionId, nodes, edges };
}

/**
 * Convert orchestrator trace data into a canvas graph.
 *
 * @param {Object} options
 * @param {string} options.sessionId
 * @param {string} options.executionId
 * @param {string} options.task - The user's task description
 * @param {Array<{tool: Object, selection: Object}>} options.traceSteps
 * @returns {{ nodes: Array, edges: Array }}
 */
export function buildGraphFromTrace(options) {
  const { sessionId, executionId, task, traceSteps } = options;

  const steps = [
    {
      id: `${executionId}-intake`,
      title: 'Agent Attach',
      subtitle: 'session opened',
      type: 'input',
      icon: 'sparkles',
      reasoning: `Task received: ${task}`,
    },
    {
      id: `${executionId}-parse`,
      title: 'Task Read',
      subtitle: 'goal + limits',
      type: 'analysis',
      icon: 'brain',
    },
  ];

  // Add a node for each traced step
  for (let i = 0; i < traceSteps.length; i++) {
    const ts = traceSteps[i];
    const tool = ts.tool || {};
    steps.push({
      id: `${executionId}-step-${i}`,
      title: tool.name || `Step ${i + 1}`,
      subtitle: tool.description ? tool.description.slice(0, 40) : '',
      type: tool.category || 'tool',
      icon: STEP_ICONS[(i + 2) % STEP_ICONS.length],
      reasoning: ts.selection?.candidates
        ? `Selected from ${ts.selection.candidates.length} candidates`
        : '',
      alternatives: ts.selection?.candidates?.slice(1, 3).map(c => ({
        name: c.tool?.name || 'Unknown',
        reason: `Score: ${c.score}`,
        confidence: Math.round((c.score || 0) * 100),
      })) || [],
    });
  }

  // Add approval gate and completion
  steps.push({
    id: `${executionId}-approval`,
    title: 'Operator Check',
    subtitle: 'approval requested',
    type: 'approval',
    icon: 'shield-check',
    approvalRequired: true,
  });

  steps.push({
    id: `${executionId}-complete`,
    title: 'Return to Agent',
    subtitle: 'pending handoff',
    type: 'completion',
    icon: 'send',
  });

  return buildExecutionGraph({
    sessionId,
    executionId,
    steps,
    branches: [{
      nodeId: `${executionId}-approval`,
      condition: 'reroute',
      label: 'Manual Review',
    }],
  });
}

export default { buildExecutionGraph, buildGraphFromTrace };
