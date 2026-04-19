import assert from 'node:assert/strict';
import http from 'node:http';

import { io as ioClient } from 'socket.io-client';

import {
  CapabilityRetriever,
  ConnectionService,
  FlowfexServer,
  Orchestrator,
  SessionManager,
  TaskIntentPlanner,
  Tool,
  ToolRegistry,
} from '../index.js';

const logger = {
  info() {},
  warn() {},
  error() {},
};

let passed = 0;
let failed = 0;

function section(title) {
  console.log(`\n${title}`);
  console.log('='.repeat(title.length));
}

async function test(name, fn) {
  try {
    await fn();
    console.log(`✓ ${name}`);
    passed += 1;
  } catch (error) {
    console.log(`✗ ${name}`);
    console.log(`  ${error instanceof Error ? error.message : String(error)}`);
    failed += 1;
  }
}

class ScenarioLLM {
  constructor(planFactory) {
    this.planFactory = planFactory;
  }

  async generate(systemPrompt, userPrompt) {
    if (systemPrompt.includes('Flowfex orchestration planner')) {
      return JSON.stringify(this.planFactory(userPrompt));
    }

    return `LLM:${userPrompt}`;
  }
}

function createTool(config) {
  return new Tool({
    id: config.id,
    name: config.name,
    description: config.description,
    prompt: config.prompt || `Execute ${config.name}`,
    keywords: config.keywords || [],
    metadata: {
      category: config.category,
      tags: config.tags || [config.category],
      ...(config.metadata || {}),
    },
    run: config.run,
  });
}

function createRegistry(tools) {
  const registry = new ToolRegistry();
  for (const tool of tools) {
    registry.registerTool(tool);
  }
  return registry;
}

async function makeJsonRequest({ port, path, method = 'POST', body = null, token = null }) {
  return new Promise((resolve, reject) => {
    const request = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method,
        headers: {
          'content-type': 'application/json',
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
      },
      response => {
        let data = '';
        response.on('data', chunk => {
          data += chunk;
        });
        response.on('end', () => {
          try {
            resolve({
              status: response.statusCode,
              body: JSON.parse(data),
            });
          } catch {
            resolve({
              status: response.statusCode,
              body: data,
            });
          }
        });
      }
    );

    request.on('error', reject);

    if (body) {
      request.write(JSON.stringify(body));
    }

    request.end();
  });
}

async function waitForSocketEvents(socket, eventNames, timeoutMs = 5000) {
  const captured = [];

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for socket events: ${eventNames.join(', ')}`));
    }, timeoutMs);

    const listeners = eventNames.map(eventName => {
      const handler = payload => {
        captured.push({ eventName, payload });
        if (captured.length === eventNames.length) {
          cleanup();
          resolve(undefined);
        }
      };
      socket.on(eventName, handler);
      return { eventName, handler };
    });

    function cleanup() {
      clearTimeout(timeout);
      for (const listener of listeners) {
        socket.off(listener.eventName, listener.handler);
      }
    }
  });

  return captured;
}

section('Planner');

await test('task planner validates structured task intent JSON', async () => {
  const planner = new TaskIntentPlanner({
    llm: new ScenarioLLM(() => ({
      goal: 'Design a typed REST endpoint',
      capabilityCategories: ['api', 'code'],
      suggestedExecutionSteps: [
        {
          title: 'Design endpoint',
          objective: 'Create the endpoint contract',
          capabilityCategory: 'api',
          requiresApproval: false,
        },
        {
          title: 'Implement handler',
          objective: 'Implement the server handler',
          capabilityCategory: 'code',
          requiresApproval: false,
        },
      ],
      branchPoints: [],
      confidence: 0.91,
      constraints: ['Keep the plan compact'],
    })),
    logger,
  });

  const result = await planner.planTask('Build a typed endpoint', {
    sessionId: 'sess-planner',
    executionId: 'exec-planner',
    availableCategories: ['api', 'code', 'text'],
  });

  assert.equal(result.fallbackUsed, false);
  assert.equal(result.intent.goal, 'Design a typed REST endpoint');
  assert.deepEqual(result.intent.capabilityCategories, ['api', 'code']);
  assert.equal(result.intent.suggestedExecutionSteps.length, 2);
});

section('Retrieval');

await test('capability retrieval returns relevant real tools by category', async () => {
  const registry = createRegistry([
    createTool({
      id: 'tool.api',
      name: 'API Architect',
      description: 'Designs REST endpoints and schemas',
      category: 'api',
      keywords: ['api', 'endpoint', 'schema', 'rest'],
      run: async input => ({ ok: true, input }),
    }),
    createTool({
      id: 'tool.code',
      name: 'Code Fixer',
      description: 'Implements backend handlers and typed code paths',
      category: 'code',
      keywords: ['code', 'typescript', 'handler'],
      run: async input => ({ ok: true, input }),
    }),
  ]);

  const retriever = new CapabilityRetriever({ registry, logger });
  const result = retriever.retrieve(
    {
      goal: 'Design a REST API endpoint and implement the handler',
      capabilityCategories: ['api', 'code'],
      suggestedExecutionSteps: [
        {
          id: 'step-api',
          title: 'Design endpoint',
          objective: 'Design the REST API endpoint',
          capabilityCategory: 'api',
          requiresApproval: false,
        },
        {
          id: 'step-code',
          title: 'Implement handler',
          objective: 'Implement the typed backend handler',
          capabilityCategory: 'code',
          requiresApproval: false,
        },
      ],
      branchPoints: [],
      confidence: 0.84,
      constraints: [],
    },
    {
      sessionId: 'sess-retrieval',
      executionId: 'exec-retrieval',
    }
  );

  assert.ok(result.byCategory.api.length > 0);
  assert.ok(result.byCategory.code.length > 0);
  assert.equal(result.byCategory.api[0].toolId, 'tool.api');
  assert.equal(result.byCategory.code[0].toolId, 'tool.code');
});

section('Execution');

await test('orchestrator executes selected skills sequentially and emits live events', async () => {
  const registry = createRegistry([
    createTool({
      id: 'tool.text-summary',
      name: 'Summary Builder',
      description: 'Summarizes incoming tasks into concise briefs',
      category: 'text',
      keywords: ['summarize', 'summary', 'brief'],
      run: async input => ({
        success: true,
        summary: String(input.task || input.text || input.requirements),
      }),
    }),
    createTool({
      id: 'tool.api-draft',
      name: 'API Drafter',
      description: 'Drafts API contracts from a summarized brief',
      category: 'api',
      keywords: ['api', 'contract', 'endpoint'],
      run: async input => ({
        success: true,
        contract: `contract:${String(input.previousOutput?.summary || input.task)}`,
      }),
    }),
  ]);

  const llm = new ScenarioLLM(() => ({
    goal: 'Summarize the request and draft an API contract',
    capabilityCategories: ['text', 'api'],
    suggestedExecutionSteps: [
      {
        title: 'Summarize request',
        objective: 'Summarize the request into a brief',
        capabilityCategory: 'text',
        requiresApproval: false,
      },
      {
        title: 'Draft API contract',
        objective: 'Draft the API contract from the brief',
        capabilityCategory: 'api',
        requiresApproval: false,
      },
    ],
    branchPoints: [],
    confidence: 0.95,
    constraints: [],
  }));
  const orchestrator = new Orchestrator({ registry, llm, logger });
  const events = [];

  const result = await orchestrator.orchestrate('Need a summary and an API contract', {
    sessionId: 'sess-execution',
    eventSink: event => events.push(event),
  });

  assert.equal(result.status, 'success');
  assert.equal(result.trace.length, 2);
  assert.equal(result.snapshot.status, 'completed');
  assert.ok(events.some(event => event.type === 'graph:created'));
  assert.ok(events.filter(event => event.type === 'node:executing').length >= 2);
  assert.ok(events.filter(event => event.type === 'node:completed').length >= 2);
  assert.ok(events.some(event => event.type === 'edge:active'));
  assert.equal(result.output.contract.startsWith('contract:'), true);
});

await test('branch rerouting executes the alternate path when the decision condition matches', async () => {
  const registry = createRegistry([
    createTool({
      id: 'tool.analysis',
      name: 'Request Analyzer',
      description: 'Detects whether manual review is required',
      category: 'analysis',
      keywords: ['analyze', 'review', 'manual'],
      run: async () => ({
        success: true,
        needsManualReview: true,
        note: 'manual review required',
      }),
    }),
    createTool({
      id: 'tool.ship',
      name: 'Ship Response',
      description: 'Publishes the direct response path',
      category: 'api',
      keywords: ['ship', 'publish', 'response'],
      run: async () => ({
        success: true,
        shipped: true,
      }),
    }),
    createTool({
      id: 'tool.manual',
      name: 'Manual Review',
      description: 'Handles manual review fallback paths',
      category: 'security',
      keywords: ['manual', 'review', 'fallback'],
      run: async input => ({
        success: true,
        reviewed: true,
        source: input.previousOutput?.note || 'manual',
      }),
    }),
  ]);

  const llm = new ScenarioLLM(() => ({
    goal: 'Analyze the request and route to manual review when required',
    capabilityCategories: ['analysis', 'api', 'security'],
    suggestedExecutionSteps: [
      {
        id: 'step-analyze',
        title: 'Analyze request',
        objective: 'Assess whether manual review is required',
        capabilityCategory: 'analysis',
        requiresApproval: false,
      },
      {
        id: 'step-ship',
        title: 'Ship response',
        objective: 'Publish the default response path',
        capabilityCategory: 'api',
        requiresApproval: false,
      },
      {
        id: 'step-manual',
        title: 'Manual review',
        objective: 'Handle manual review fallback',
        capabilityCategory: 'security',
        requiresApproval: false,
      },
    ],
    branchPoints: [
      {
        id: 'branch-review',
        sourceStepId: 'step-analyze',
        condition: 'Route to manual review when manual review is required',
        onTrue: 'Manual review',
        onFalse: 'Ship response',
        rationale: 'Manual review should override the default response path',
      },
    ],
    confidence: 0.92,
    constraints: [],
  }));
  const orchestrator = new Orchestrator({ registry, llm, logger });
  const events = [];

  const result = await orchestrator.orchestrate('Analyze and route conditionally', {
    sessionId: 'sess-branch',
    eventSink: event => events.push(event),
  });

  assert.equal(result.status, 'success');
  if (!result.trace.some(entry => entry.nodeType === 'decision')) console.log('!!! MISSING DECISION IN TRACE:', result.trace);
  console.log('--- ACTUAL TRACE:', result.trace.map(t => t.nodeType));
  console.log('--- SELECTION DECISION NODES:', require('util').inspect(orchestrator.getSessionState(result.sessionId).selection.decisionNodes, { depth: null }));
  console.log('--- GRAPH NODES:', result.graph.nodes.map(n => n.type));
  assert.ok(result.trace.some(entry => entry.nodeType === 'decision'));
  assert.ok(result.trace.some(entry => entry.toolId === 'tool.manual'));
  assert.ok(!result.trace.some(entry => entry.toolId === 'tool.ship'));
  assert.ok(events.some(event => event.type === 'path:rerouted'));
  assert.ok(Object.keys(result.snapshot.branchChoices).length === 1);
});

await test('default branch does not execute an exclusive alternate-only fallback node', async () => {
  const registry = createRegistry([
    createTool({
      id: 'tool.analysis',
      name: 'Request Analyzer',
      description: 'Detects whether manual review is required',
      category: 'analysis',
      keywords: ['analyze', 'review', 'manual'],
      run: async () => ({
        success: true,
        needsManualReview: false,
        note: 'safe to ship',
      }),
    }),
    createTool({
      id: 'tool.ship',
      name: 'Ship Response',
      description: 'Publishes the direct response path',
      category: 'api',
      keywords: ['ship', 'publish', 'response'],
      run: async () => ({
        success: true,
        shipped: true,
      }),
    }),
    createTool({
      id: 'tool.manual',
      name: 'Manual Review',
      description: 'Handles manual review fallback paths',
      category: 'security',
      keywords: ['manual', 'review', 'fallback'],
      run: async () => ({
        success: true,
        reviewed: true,
      }),
    }),
  ]);

  const llm = new ScenarioLLM(() => ({
    goal: 'Analyze the request and route to manual review when required',
    capabilityCategories: ['analysis', 'api', 'security'],
    suggestedExecutionSteps: [
      {
        id: 'step-analyze',
        title: 'Analyze request',
        objective: 'Assess whether manual review is required',
        capabilityCategory: 'analysis',
        requiresApproval: false,
      },
      {
        id: 'step-ship',
        title: 'Ship response',
        objective: 'Publish the default response path',
        capabilityCategory: 'api',
        requiresApproval: false,
      },
      {
        id: 'step-manual',
        title: 'Manual review',
        objective: 'Handle manual review fallback',
        capabilityCategory: 'security',
        requiresApproval: false,
      },
    ],
    branchPoints: [
      {
        id: 'branch-review',
        sourceStepId: 'step-analyze',
        condition: 'Route to manual review when manual review is required',
        onTrue: 'Manual review',
        onFalse: 'Ship response',
        rationale: 'Manual review should override the default response path',
      },
    ],
    confidence: 0.92,
    constraints: [],
  }));
  const orchestrator = new Orchestrator({ registry, llm, logger });
  const events = [];

  const result = await orchestrator.orchestrate('Analyze and route conditionally', {
    sessionId: 'sess-branch-default',
    eventSink: event => events.push(event),
  });

  const nodeIdBySkill = new Map(
    result.graph.nodes
      .filter(node => node.skill)
      .map(node => [node.skill, node.id])
  );
  const shipNodeId = nodeIdBySkill.get('tool.ship');
  const manualNodeId = nodeIdBySkill.get('tool.manual');

  assert.equal(result.status, 'success');
  assert.ok(result.trace.some(entry => entry.toolId === 'tool.ship'));
  assert.ok(!result.trace.some(entry => entry.toolId === 'tool.manual'));
  assert.ok(events.some(event => event.type === 'path:rerouted'));
  assert.ok(events.some(event => event.type === 'node:rejected' && event.payload.nodeId === manualNodeId));
  assert.equal(
    result.snapshot.graph.nodes.find(node => node.skill === 'tool.manual')?.state,
    'skipped'
  );
  assert.equal(
    result.graph.edges.some(edge => edge.from === shipNodeId && edge.to === manualNodeId),
    false
  );
});

await test('failure handling emits node:error and preserves partial state', async () => {
  const registry = createRegistry([
    createTool({
      id: 'tool.failure',
      name: 'Exploding Tool',
      description: 'Fails during execution for testing',
      category: 'code',
      keywords: ['fail', 'error'],
      run: async () => {
        throw new Error('Synthetic failure');
      },
    }),
  ]);

  const llm = new ScenarioLLM(() => ({
    goal: 'Execute a failing step',
    capabilityCategories: ['code'],
    suggestedExecutionSteps: [
      {
        title: 'Run failing step',
        objective: 'Trigger the failing tool',
        capabilityCategory: 'code',
        requiresApproval: false,
      },
    ],
    branchPoints: [],
    confidence: 0.88,
    constraints: [],
  }));
  const orchestrator = new Orchestrator({ registry, llm, logger });
  const events = [];

  const result = await orchestrator.orchestrate('Run the failing step', {
    sessionId: 'sess-failure',
    eventSink: event => events.push(event),
  });

  assert.equal(result.status, 'error');
  assert.equal(result.snapshot.status, 'failed');
  assert.equal(result.snapshot.graph.nodes[0].state, 'error');
  assert.ok(events.some(event => event.type === 'node:error'));
  assert.equal(result.error.message, 'Synthetic failure');
});

await test('connection-scoped agent and session context reach the selected tool input', async () => {
  const registry = createRegistry([
    createTool({
      id: 'tool.context',
      name: 'Context Echo',
      description: 'Echoes session and agent context',
      category: 'api',
      keywords: ['context', 'session', 'agent'],
      run: async input => ({
        session: input.session,
        agent: input.agent,
      }),
    }),
  ]);

  const llm = new ScenarioLLM(() => ({
    goal: 'Echo the session context',
    capabilityCategories: ['api'],
    suggestedExecutionSteps: [
      {
        title: 'Echo context',
        objective: 'Return the connected session and agent context',
        capabilityCategory: 'api',
        requiresApproval: false,
      },
    ],
    branchPoints: [],
    confidence: 0.94,
    constraints: [],
  }));
  const sessionManager = new SessionManager();
  const orchestrator = new Orchestrator({ registry, llm, logger });
  const connectionService = new ConnectionService({
    registry,
    orchestrator,
    sessionManager,
  });

  const { session, token } = sessionManager.createSession({
    mode: 'prompt',
    agent: {
      id: 'agent-cli',
      name: 'CLI Agent',
      type: 'terminal',
      version: '1.2.3',
    },
    metadata: {
      tenant: 'acme',
      region: 'us-east-1',
    },
    capabilities: ['api'],
    prompt: 'Ask Flowfex for resources before acting.',
    allowedToolIds: registry.getAllTools().map(tool => tool.id),
    recommendedToolIds: registry.getAllTools().map(tool => tool.id),
  });

  const result = await connectionService.execute({
    sessionId: session.id,
    token,
    input: 'Echo the active session context',
  });

  assert.equal(result.status, 'success');
  assert.equal(result.output.agent.name, 'CLI Agent');
  assert.equal(result.output.agent.type, 'terminal');
  assert.equal(result.output.session.mode, 'prompt');
  assert.equal(result.output.session.metadata.tenant, 'acme');
  assert.deepEqual(result.output.session.capabilities, ['api']);
  assert.equal(result.output.session.prompt, 'Ask Flowfex for resources before acting.');
});

section('Live Server');

await test('frontend socket path receives live orchestration events from the execute endpoint', async () => {
  const registry = createRegistry([
    createTool({
      id: 'tool.live-summary',
      name: 'Live Summary',
      description: 'Creates a short live summary',
      category: 'text',
      keywords: ['summary', 'live'],
      run: async input => ({
        success: true,
        summary: String(input.task || input.text),
      }),
    }),
  ]);
  const llm = new ScenarioLLM(() => ({
    goal: 'Create a live summary',
    capabilityCategories: ['text'],
    suggestedExecutionSteps: [
      {
        title: 'Create summary',
        objective: 'Create a short summary',
        capabilityCategory: 'text',
        requiresApproval: false,
      },
    ],
    branchPoints: [],
    confidence: 0.9,
    constraints: [],
  }));
  const orchestrator = new Orchestrator({ registry, llm, logger });
  const sessionManager = new SessionManager();
  const connectionService = new ConnectionService({
    registry,
    orchestrator,
    sessionManager,
  });
  const { session, token } = sessionManager.createSession({
    mode: 'api',
    allowedToolIds: registry.getAllTools().map(tool => tool.id),
    recommendedToolIds: registry.getAllTools().map(tool => tool.id),
  });

  const server = new FlowfexServer({
    host: '127.0.0.1',
    port: 0,
    connectionService,
  });
  const address = await server.start();
  const port = address.port;

  const socket = ioClient(`http://127.0.0.1:${port}/orchestration`, {
    query: { sessionId: session.id },
    transports: ['websocket'],
    reconnection: false,
  });

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('socket connect timeout')), 4000);
    socket.once('connect', () => {
      clearTimeout(timeout);
      resolve();
    });
    socket.once('connect_error', error => {
      clearTimeout(timeout);
      reject(error);
    });
  });

  const eventPromise = waitForSocketEvents(socket, [
    'graph:created',
    'node:executing',
    'node:completed',
  ]);

  const response = await makeJsonRequest({
    port,
    path: `/sessions/${session.id}/execute`,
    token,
    body: {
      input: 'Create a live summary',
    },
  });

  const events = await eventPromise;

  assert.equal(response.status, 200);
  assert.equal(response.body.status, 'success');
  assert.equal(events[0].eventName, 'graph:created');
  assert.equal(events[1].eventName, 'node:executing');
  assert.equal(events[2].eventName, 'node:completed');

  socket.disconnect();
  await server.stop();
});

if (failed > 0) {
  console.error(`\n${failed} tests failed, ${passed} passed`);
  process.exitCode = 1;
} else {
  console.log(`\n${passed} tests passed`);
}
