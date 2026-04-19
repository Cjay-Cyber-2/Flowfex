import { TaskIntentPlanner } from './TaskIntentPlanner.js';
import { ExecutionPlanSelector } from './ExecutionPlanSelector.js';
import { ExecutionGraphBuilder } from './ExecutionGraphBuilder.js';

const planner = new TaskIntentPlanner({
  llm: {
    generate: async () => JSON.stringify({
      goal: 'Analyze the request and route to manual review when required',
      capabilityCategories: ['analysis', 'api', 'security'],
      suggestedExecutionSteps: [
        {
          title: 'Analyze request',
          objective: 'Assess whether manual review is required',
          capabilityCategory: 'analysis',
          requiresApproval: false,
        },
        {
          title: 'Ship response',
          objective: 'Publish the default response path',
          capabilityCategory: 'api',
          requiresApproval: false,
        },
        {
          title: 'Manual review',
          objective: 'Handle manual review fallback',
          capabilityCategory: 'security',
          requiresApproval: false,
        },
      ],
      branchPoints: [
        {
          condition: 'Route to manual review when manual review is required',
          sourceStepIndex: 1, // 1-based index, maps to step 0
          onTrue: 'Manual review',
          onFalse: 'Ship response',
          rationale: 'Manual review should override the default response path',
        },
      ],
      confidence: 0.92,
      constraints: [],
    })
  },
  logger: console
});

const intent = (await planner.planTask('dummy', { availableCategories: ['analysis', 'api', 'security'] })).intent;
console.log('Intent Branch SourceStepId:', intent.branchPoints[0].sourceStepId);

const selector = new ExecutionPlanSelector({ logger: console });
const retrieval = {
  byCategory: {
    analysis: [{ toolId: 'tool.analysis', toolName: 'Request Analyzer', description: '', tags: [], score: 1.0, strategy: 'query', tool: {} }],
    api: [{ toolId: 'tool.ship', toolName: 'Ship Response', description: '', tags: [], score: 1.0, strategy: 'query', tool: {} }],
    security: [{ toolId: 'tool.manual', toolName: 'Manual Review', description: '', tags: [], score: 1.0, strategy: 'query', tool: {} }]
  },
  merged: []
};

const selection = selector.selectPlan(intent, retrieval, { sessionId: '1', executionId: '1' });
console.log('Selection Decisions:', selection.decisionNodes);

const builder = new ExecutionGraphBuilder();
const graph = builder.buildGraph(selection, { sessionId: '1', executionId: '1' });
console.log('Graph Decisions:', graph.orderedNodeIds.filter(id => id.startsWith('node_'))); // wait stable ids are hashed
console.log('Runtime Decisions:', Object.values(graph.runtimeNodes).filter(n => n.kind === 'decision'));
