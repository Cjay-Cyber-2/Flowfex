import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

import { io as ioClient } from 'socket.io-client';

import {
  ConnectionService,
  FileSessionStateRepository,
  FlowfexServer,
  Orchestrator,
  SessionManager,
  SessionStateStore,
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

async function makeJsonRequest({ port, path: requestPath, method = 'POST', body = null, token = null }) {
  return new Promise((resolve, reject) => {
    const request = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: requestPath,
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

async function connectSocket(port, namespace, sessionId) {
  const socket = ioClient(`http://127.0.0.1:${port}${namespace}`, {
    query: { sessionId },
    transports: ['websocket'],
    reconnection: false,
  });

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`socket connect timeout for ${namespace}`)), 4000);
    socket.once('connect', () => {
      clearTimeout(timeout);
      resolve(undefined);
    });
    socket.once('connect_error', error => {
      clearTimeout(timeout);
      reject(error);
    });
  });

  return socket;
}

function waitForEvent(socket, eventName, predicate = () => true, timeoutMs = 6000) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.off(eventName, handler);
      reject(new Error(`Timed out waiting for ${eventName}`));
    }, timeoutMs);

    const handler = payload => {
      if (!predicate(payload)) {
        return;
      }

      clearTimeout(timeout);
      socket.off(eventName, handler);
      resolve(payload);
    };

    socket.on(eventName, handler);
  });
}

async function waitUntil(assertion, timeoutMs = 6000, intervalMs = 50) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const result = await assertion();
    if (result) {
      return result;
    }
    await delay(intervalMs);
  }

  throw new Error('Timed out waiting for condition');
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function stableId(prefix, ...parts) {
  return `${prefix}_${createHash('sha1').update(parts.join('|')).digest('hex').slice(0, 10)}`;
}

async function createHarness(config) {
  const tempRoot = config.repositoryDirectory
    ? path.dirname(config.repositoryDirectory)
    : await fs.mkdtemp(path.join(os.tmpdir(), 'flowfex-control-'));
  const repository = new FileSessionStateRepository({
    directory: config.repositoryDirectory || path.join(tempRoot, 'sessions'),
  });
  const registry = createRegistry(config.tools);
  const llm = new ScenarioLLM(config.planFactory);
  const stateStore = new SessionStateStore({
    persistence: repository,
  });
  const orchestrator = new Orchestrator({
    registry,
    llm,
    logger,
    stateStore,
  });
  const sessionManager = new SessionManager();
  const connectionService = new ConnectionService({
    registry,
    orchestrator,
    sessionManager,
    publicBaseUrl: 'http://127.0.0.1:4000',
  });
  const server = new FlowfexServer({
    host: '127.0.0.1',
    port: 0,
    connectionService,
    sessionStateRepository: repository,
  });

  const address = await server.start();
  const allowedToolIds = registry.getAllTools().map(tool => tool.id);

  return {
    address,
    registry,
    orchestrator,
    repository,
    sessionManager,
    server,
    tempRoot,
    createSession(config = {}) {
      return sessionManager.createSession({
        mode: config.mode || 'sdk',
        allowedToolIds,
        recommendedToolIds: allowedToolIds,
        ...config,
      });
    },
    async stop() {
      await server.stop();
      if (!config.keepDirectory) {
        await fs.rm(tempRoot, { recursive: true, force: true });
      }
    },
  };
}

section('Step 3 Control API');

await test('pause and resume stop at a safe boundary and continue from persisted pending state', async () => {
  const harness = await createHarness({
    tools: [
      createTool({
        id: 'tool.prepare',
        name: 'Prepare Brief',
        description: 'Prepares the initial response draft',
        category: 'analysis',
        keywords: ['prepare', 'draft'],
        run: async () => {
          await delay(150);
          return { prepared: true };
        },
      }),
      createTool({
        id: 'tool.publish',
        name: 'Publish Brief',
        description: 'Publishes the prepared response',
        category: 'api',
        keywords: ['publish', 'brief'],
        run: async () => ({ published: true }),
      }),
    ],
    planFactory: () => ({
      goal: 'Prepare and publish the brief',
      capabilityCategories: ['analysis', 'api'],
      suggestedExecutionSteps: [
        {
          id: 'step-prepare',
          title: 'Prepare brief',
          objective: 'Prepare the response draft',
          capabilityCategory: 'analysis',
          requiresApproval: false,
        },
        {
          id: 'step-publish',
          title: 'Publish brief',
          objective: 'Publish the prepared brief',
          capabilityCategory: 'api',
          requiresApproval: false,
        },
      ],
      branchPoints: [],
      confidence: 0.92,
      constraints: [],
    }),
  });

  try {
    const { session, token } = harness.createSession();
    const orchestrationSocket = await connectSocket(harness.address.port, '/orchestration', session.id);
    const sessionSocket = await connectSocket(harness.address.port, '/session', session.id);
    const firstNodeId = stableId('node', 'step-prepare');
    const secondNodeId = stableId('node', 'step-publish');

    const firstExecuting = waitForEvent(
      orchestrationSocket,
      'node:executing',
      payload => payload.nodeId === firstNodeId
    );
    const executePromise = makeJsonRequest({
      port: harness.address.port,
      path: `/sessions/${session.id}/execute`,
      token,
      body: {
        input: 'Prepare and publish the brief',
      },
    });

    await firstExecuting;

    const pausedEventPromise = waitForEvent(sessionSocket, 'session:paused');
    const pauseRequest = await makeJsonRequest({
      port: harness.address.port,
      path: `/session/${session.id}/pause`,
      body: {},
    });
    const pausedEvent = await pausedEventPromise;
    const executeResponse = await executePromise;

    assert.equal(pauseRequest.status, 200);
    assert.equal(executeResponse.body.status, 'paused');
    assert.equal(pausedEvent.state.status, 'paused');
    assert.equal(pausedEvent.state.pendingNodeId, secondNodeId);

    const pausedState = await makeJsonRequest({
      port: harness.address.port,
      path: `/session/${session.id}/state`,
      method: 'GET',
    });
    assert.equal(pausedState.body.snapshot.status, 'paused');
    assert.equal(pausedState.body.snapshot.pendingNodeId, secondNodeId);

    const publishCompleted = waitForEvent(
      orchestrationSocket,
      'node:completed',
      payload => payload.nodeId === secondNodeId
    );
    const resumeResponse = await makeJsonRequest({
      port: harness.address.port,
      path: `/session/${session.id}/resume`,
      body: {
        expectedRevision: pausedState.body.snapshot.revision,
      },
    });
    assert.equal(resumeResponse.status, 200);
    await publishCompleted;

    const completedState = await waitUntil(async () => {
      const result = await makeJsonRequest({
        port: harness.address.port,
        path: `/session/${session.id}/state`,
        method: 'GET',
      });
      return result.body.snapshot.status === 'completed' ? result : null;
    });

    assert.equal(completedState.body.snapshot.status, 'completed');
    assert.ok(completedState.body.snapshot.completedNodeIds.includes(secondNodeId));

    orchestrationSocket.disconnect();
    sessionSocket.disconnect();
  } finally {
    await harness.stop();
  }
});

await test('approve and reject drive the real waiting-node control flow', async () => {
  const tools = [
    createTool({
      id: 'tool.review',
      name: 'Review Draft',
      description: 'Creates a draft that requires approval',
      category: 'analysis',
      keywords: ['review', 'draft'],
      run: async () => ({ draft: true }),
    }),
    createTool({
      id: 'tool.ship',
      name: 'Ship Response',
      description: 'Publishes the default response path',
      category: 'api',
      keywords: ['publish', 'response', 'ship'],
      run: async () => ({ path: 'ship' }),
    }),
    createTool({
      id: 'tool.manual',
      name: 'Manual Review',
      description: 'Handles manual review fallback work',
      category: 'security',
      keywords: ['manual', 'review', 'fallback'],
      run: async () => ({ path: 'manual-review' }),
    }),
  ];
  const planFactory = () => ({
    goal: 'Review and route the response',
    capabilityCategories: ['analysis', 'api', 'security'],
    suggestedExecutionSteps: [
      {
        id: 'step-review',
        title: 'Review draft',
        objective: 'Create a draft that requires approval',
        capabilityCategory: 'analysis',
        requiresApproval: true,
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
    branchPoints: [],
    confidence: 0.95,
    constraints: [],
  });

  const approveHarness = await createHarness({ tools, planFactory });
  try {
    const { session, token } = approveHarness.createSession();
    const orchestrationSocket = await connectSocket(approveHarness.address.port, '/orchestration', session.id);

    const executeResponse = await makeJsonRequest({
      port: approveHarness.address.port,
      path: `/sessions/${session.id}/execute`,
      token,
      body: { input: 'Review and route the response' },
    });

    assert.equal(executeResponse.body.status, 'awaiting_approval');
    const approvalNodeId = executeResponse.body.snapshot.currentNodeId;
    const shipNodeId = stableId('node', 'step-ship');

    const approvedEventPromise = waitForEvent(
      orchestrationSocket,
      'node:approved',
      payload => payload.nodeId === approvalNodeId
    );
    const shipCompletedPromise = waitForEvent(
      orchestrationSocket,
      'node:completed',
      payload => payload.nodeId === shipNodeId
    );
    const approveResponse = await makeJsonRequest({
      port: approveHarness.address.port,
      path: `/node/${approvalNodeId}/approve`,
      body: {
        sessionId: session.id,
        expectedRevision: executeResponse.body.snapshot.revision,
      },
    });
    assert.equal(approveResponse.status, 200);

    await approvedEventPromise;
    await shipCompletedPromise;

    const completedState = await waitUntil(async () => {
      const result = await makeJsonRequest({
        port: approveHarness.address.port,
        path: `/session/${session.id}/state`,
        method: 'GET',
      });
      return result.body.snapshot.status === 'completed' ? result : null;
    });

    assert.equal(completedState.body.snapshot.graph.nodes.find(node => node.id === shipNodeId)?.state, 'completed');
    orchestrationSocket.disconnect();
  } finally {
    await approveHarness.stop();
  }

  const rejectHarness = await createHarness({ tools, planFactory });
  try {
    const { session, token } = rejectHarness.createSession();
    const orchestrationSocket = await connectSocket(rejectHarness.address.port, '/orchestration', session.id);

    const executeResponse = await makeJsonRequest({
      port: rejectHarness.address.port,
      path: `/sessions/${session.id}/execute`,
      token,
      body: { input: 'Review and route the response' },
    });

    const approvalNodeId = executeResponse.body.snapshot.currentNodeId;
    const manualNodeId = stableId('node', 'step-manual');
    const rejectedEventPromise = waitForEvent(
      orchestrationSocket,
      'node:rejected',
      payload => payload.nodeId === approvalNodeId
    );
    const reroutedEventPromise = waitForEvent(
      orchestrationSocket,
      'path:rerouted',
      payload => payload.to === manualNodeId
    );
    const rejectResponse = await makeJsonRequest({
      port: rejectHarness.address.port,
      path: `/node/${approvalNodeId}/reject`,
      body: {
        sessionId: session.id,
        expectedRevision: executeResponse.body.snapshot.revision,
      },
    });

    assert.equal(rejectResponse.status, 200);
    await rejectedEventPromise;
    await reroutedEventPromise;

    const completedState = await waitUntil(async () => {
      const result = await makeJsonRequest({
        port: rejectHarness.address.port,
        path: `/session/${session.id}/state`,
        method: 'GET',
      });
      return result.body.snapshot.status === 'completed' ? result : null;
    });

    assert.equal(completedState.body.snapshot.graph.nodes.find(node => node.id === manualNodeId)?.state, 'completed');
    orchestrationSocket.disconnect();
  } finally {
    await rejectHarness.stop();
  }
});

await test('reroute updates the active graph path and continues execution from the provided target node', async () => {
  const harness = await createHarness({
    tools: [
      createTool({
        id: 'tool.review',
        name: 'Review Draft',
        description: 'Creates a draft that requires approval',
        category: 'analysis',
        keywords: ['review', 'draft'],
        run: async () => ({ draft: true }),
      }),
      createTool({
        id: 'tool.ship',
        name: 'Ship Response',
        description: 'Publishes the default response path',
        category: 'api',
        keywords: ['publish', 'response', 'ship'],
        run: async () => ({ path: 'ship' }),
      }),
      createTool({
        id: 'tool.manual',
        name: 'Manual Review',
        description: 'Handles manual review fallback work',
        category: 'security',
        keywords: ['manual', 'review', 'fallback'],
        run: async () => ({ path: 'manual-review' }),
      }),
    ],
    planFactory: () => ({
      goal: 'Review and route the response',
      capabilityCategories: ['analysis', 'api', 'security'],
      suggestedExecutionSteps: [
        {
          id: 'step-review',
          title: 'Review draft',
          objective: 'Create a draft that requires approval',
          capabilityCategory: 'analysis',
          requiresApproval: true,
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
      branchPoints: [],
      confidence: 0.95,
      constraints: [],
    }),
  });

  try {
    const { session, token } = harness.createSession();
    const orchestrationSocket = await connectSocket(harness.address.port, '/orchestration', session.id);

    const executeResponse = await makeJsonRequest({
      port: harness.address.port,
      path: `/sessions/${session.id}/execute`,
      token,
      body: { input: 'Review and route the response' },
    });

    const approvalNodeId = executeResponse.body.snapshot.currentNodeId;
    const manualNodeId = stableId('node', 'step-manual');

    const reroutedEventPromise = waitForEvent(
      orchestrationSocket,
      'path:rerouted',
      payload => payload.to === manualNodeId
    );
    const rerouteResponse = await makeJsonRequest({
      port: harness.address.port,
      path: `/node/${approvalNodeId}/reroute`,
      body: {
        sessionId: session.id,
        targetNodeId: manualNodeId,
        expectedRevision: executeResponse.body.snapshot.revision,
      },
    });

    assert.equal(rerouteResponse.status, 200);
    await reroutedEventPromise;

    const completedState = await waitUntil(async () => {
      const result = await makeJsonRequest({
        port: harness.address.port,
        path: `/session/${session.id}/state`,
        method: 'GET',
      });
      return result.body.snapshot.status === 'completed' ? result : null;
    });

    assert.equal(completedState.body.snapshot.graph.nodes.find(node => node.id === manualNodeId)?.state, 'completed');
    orchestrationSocket.disconnect();
  } finally {
    await harness.stop();
  }
});

await test('constraint updates rebuild future steps and remove blocked skills from the active plan', async () => {
  const harness = await createHarness({
    tools: [
      createTool({
        id: 'tool.review',
        name: 'Review Draft',
        description: 'Creates a draft that requires approval',
        category: 'analysis',
        keywords: ['review', 'draft'],
        run: async () => ({ draft: true }),
      }),
      createTool({
        id: 'tool.primary',
        name: 'Primary Publisher',
        description: 'Publishes the default response path',
        category: 'api',
        keywords: ['publish', 'response', 'default'],
        run: async () => ({ publisher: 'primary' }),
      }),
      createTool({
        id: 'tool.secondary',
        name: 'Secondary Publisher',
        description: 'Publishes the response with a fallback path',
        category: 'api',
        keywords: ['publish', 'response', 'fallback'],
        run: async () => ({ publisher: 'secondary' }),
      }),
    ],
    planFactory: () => ({
      goal: 'Review and publish the response',
      capabilityCategories: ['analysis', 'api'],
      suggestedExecutionSteps: [
        {
          id: 'step-review',
          title: 'Review draft',
          objective: 'Create a draft that requires approval',
          capabilityCategory: 'analysis',
          requiresApproval: true,
        },
        {
          id: 'step-publish',
          title: 'Publish response',
          objective: 'Publish the default response path',
          capabilityCategory: 'api',
          requiresApproval: false,
        },
      ],
      branchPoints: [],
      confidence: 0.91,
      constraints: [],
    }),
  });

  try {
    const { session, token } = harness.createSession();
    const executeResponse = await makeJsonRequest({
      port: harness.address.port,
      path: `/sessions/${session.id}/execute`,
      token,
      body: { input: 'Review and publish the response' },
    });

    const publishNodeId = stableId('node', 'step-publish');
    assert.equal(
      executeResponse.body.snapshot.graph.nodes.find(node => node.id === publishNodeId)?.skill,
      'tool.primary'
    );

    const constrainResponse = await makeJsonRequest({
      port: harness.address.port,
      path: `/session/${session.id}/constrain`,
      body: {
        blockedSkillIds: ['tool.primary'],
        expectedRevision: executeResponse.body.snapshot.revision,
      },
    });

    assert.equal(constrainResponse.status, 200);
    assert.equal(
      constrainResponse.body.snapshot.graph.nodes.find(node => node.id === publishNodeId)?.skill,
      'tool.secondary'
    );

    const approvalNodeId = executeResponse.body.snapshot.currentNodeId;
    await makeJsonRequest({
      port: harness.address.port,
      path: `/node/${approvalNodeId}/approve`,
      body: {
        sessionId: session.id,
        expectedRevision: constrainResponse.body.snapshot.revision,
      },
    });

    const completedState = await waitUntil(async () => {
      const result = await makeJsonRequest({
        port: harness.address.port,
        path: `/session/${session.id}/state`,
        method: 'GET',
      });
      return result.body.snapshot.status === 'completed' ? result : null;
    });

    assert.deepEqual(completedState.body.snapshot.blockedSkillIds, ['tool.primary']);
    assert.equal(completedState.body.snapshot.outputs[publishNodeId].publisher, 'secondary');
  } finally {
    await harness.stop();
  }
});

await test('invalid transitions are rejected cleanly and emit structured control errors', async () => {
  const harness = await createHarness({
    tools: [
      createTool({
        id: 'tool.publish',
        name: 'Publisher',
        description: 'Publishes the brief',
        category: 'api',
        keywords: ['publish', 'brief'],
        run: async () => ({ published: true }),
      }),
    ],
    planFactory: () => ({
      goal: 'Publish the brief',
      capabilityCategories: ['api'],
      suggestedExecutionSteps: [
        {
          id: 'step-publish',
          title: 'Publish brief',
          objective: 'Publish the brief',
          capabilityCategory: 'api',
          requiresApproval: false,
        },
      ],
      branchPoints: [],
      confidence: 0.89,
      constraints: [],
    }),
  });

  try {
    const { session, token } = harness.createSession();
    const controlSocket = await connectSocket(harness.address.port, '/control', session.id);
    const executeResponse = await makeJsonRequest({
      port: harness.address.port,
      path: `/sessions/${session.id}/execute`,
      token,
      body: { input: 'Publish the brief' },
    });
    const nodeId = stableId('node', 'step-publish');

    const errorEventPromise = waitForEvent(controlSocket, 'control:error', payload => payload.actionType === 'approve');
    const approveResponse = await makeJsonRequest({
      port: harness.address.port,
      path: `/node/${nodeId}/approve`,
      body: {
        sessionId: session.id,
        expectedRevision: executeResponse.body.snapshot.revision,
      },
    });

    assert.equal(approveResponse.status, 409);
    const errorEvent = await errorEventPromise;
    assert.equal(errorEvent.code, 'invalid_node_state');
    assert.equal(errorEvent.actionType, 'approve');
    controlSocket.disconnect();
  } finally {
    await harness.stop();
  }
});

await test('session state persists to disk and can be rehydrated after a server restart', async () => {
  const tools = [
    createTool({
      id: 'tool.prepare',
      name: 'Prepare Brief',
      description: 'Prepares the initial response draft',
      category: 'analysis',
      keywords: ['prepare', 'draft'],
      run: async () => {
        await delay(150);
        return { prepared: true };
      },
    }),
    createTool({
      id: 'tool.publish',
      name: 'Publisher',
      description: 'Publishes the prepared response',
      category: 'api',
      keywords: ['publish', 'response'],
      run: async () => ({ published: true }),
    }),
  ];
  const planFactory = () => ({
    goal: 'Prepare and publish the brief',
    capabilityCategories: ['analysis', 'api'],
    suggestedExecutionSteps: [
      {
        id: 'step-prepare',
        title: 'Prepare brief',
        objective: 'Prepare the response draft',
        capabilityCategory: 'analysis',
        requiresApproval: false,
      },
      {
        id: 'step-publish',
        title: 'Publish brief',
        objective: 'Publish the prepared brief',
        capabilityCategory: 'api',
        requiresApproval: false,
      },
    ],
    branchPoints: [],
    confidence: 0.91,
    constraints: [],
  });

  const firstHarness = await createHarness({ tools, planFactory, keepDirectory: true });

  try {
    const { session, token } = firstHarness.createSession();
    const executePromise = makeJsonRequest({
      port: firstHarness.address.port,
      path: `/sessions/${session.id}/execute`,
      token,
      body: { input: 'Prepare and publish the brief' },
    });
    await delay(25);

    await makeJsonRequest({
      port: firstHarness.address.port,
      path: `/session/${session.id}/pause`,
      body: {},
    });
    await executePromise;

    const persistedPath = path.join(firstHarness.repository.directory, `${session.id}.json`);
    const persistedState = await waitUntil(async () => {
      try {
        const raw = await fs.readFile(persistedPath, 'utf8');
        return JSON.parse(raw);
      } catch {
        return null;
      }
    });

    assert.equal(persistedState.status, 'paused');
    await firstHarness.stop();

    const secondHarness = await createHarness({
      tools,
      planFactory,
      repositoryDirectory: firstHarness.repository.directory,
      keepDirectory: true,
    });
    try {
      const resumedState = await makeJsonRequest({
        port: secondHarness.address.port,
        path: `/session/${session.id}/state`,
        method: 'GET',
      });

      assert.equal(resumedState.status, 200);
      assert.equal(resumedState.body.snapshot.status, 'paused');
      assert.equal(resumedState.body.snapshot.pendingNodeId, stableId('node', 'step-publish'));
      assert.equal(resumedState.body.snapshot.sessionId, session.id);
    } finally {
      await secondHarness.stop();
      await fs.rm(path.dirname(firstHarness.repository.directory), { recursive: true, force: true });
    }
  } catch (error) {
    await firstHarness.stop();
    throw error;
  }
});

section('Connection Modes');

await test('prompt, sdk, link, and live connection modes all return working bootstrap payloads', async () => {
  const harness = await createHarness({
    tools: [
      createTool({
        id: 'tool.summary',
        name: 'Summary Tool',
        description: 'Summarizes connected work',
        category: 'text',
        keywords: ['summary', 'connected'],
        run: async () => ({ summary: 'ok' }),
      }),
    ],
    planFactory: () => ({
      goal: 'Summarize connected work',
      capabilityCategories: ['text'],
      suggestedExecutionSteps: [
        {
          id: 'step-summary',
          title: 'Summarize',
          objective: 'Summarize connected work',
          capabilityCategory: 'text',
          requiresApproval: false,
        },
      ],
      branchPoints: [],
      confidence: 0.9,
      constraints: [],
    }),
  });

  try {
    const promptConnect = await makeJsonRequest({
      port: harness.address.port,
      path: '/connect',
      body: {
        mode: 'prompt',
        prompt: 'Connect and summarize work',
        agent: { name: 'Prompt Agent', type: 'prompt' },
      },
    });
    assert.equal(promptConnect.status, 200);
    assert.ok(promptConnect.body.connection.instructions.sessionUrl.includes('/connect/live/'));

    const sdkConnect = await makeJsonRequest({
      port: harness.address.port,
      path: '/connect',
      body: {
        mode: 'sdk',
        agent: { name: 'SDK Agent', type: 'sdk' },
      },
    });
    assert.equal(sdkConnect.status, 200);
    assert.ok(sdkConnect.body.connection.transport.orchestrationNamespace.endsWith('/orchestration'));

    const linkConnect = await makeJsonRequest({
      port: harness.address.port,
      path: '/connect',
      body: {
        mode: 'link',
        agent: { name: 'Link Agent', type: 'link' },
      },
    });
    assert.equal(linkConnect.status, 200);
    const linkPath = new URL(linkConnect.body.connection.link.url).pathname;
    const linkResolve = await makeJsonRequest({
      port: harness.address.port,
      path: linkPath,
      method: 'GET',
    });
    assert.equal(linkResolve.status, 200);
    assert.ok(linkResolve.body.connection.session.token);

    const liveConnect = await makeJsonRequest({
      port: harness.address.port,
      path: '/connect',
      body: {
        mode: 'live',
        protocol: 'socket.io',
        agent: { name: 'Live Agent', type: 'live' },
      },
    });
    assert.equal(liveConnect.status, 200);
    const liveSocket = await connectSocket(
      harness.address.port,
      '/orchestration',
      liveConnect.body.connection.session.id
    );
    const liveEvents = waitForEvent(liveSocket, 'graph:created');
    const liveExecute = await makeJsonRequest({
      port: harness.address.port,
      path: `/sessions/${liveConnect.body.connection.session.id}/execute`,
      token: liveConnect.body.connection.session.token,
      body: {
        input: 'Summarize connected work',
      },
    });

    assert.equal(liveExecute.status, 200);
    await liveEvents;
    liveSocket.disconnect();

    const sseLiveConnect = await makeJsonRequest({
      port: harness.address.port,
      path: '/connect',
      body: {
        mode: 'live',
        protocol: 'sse',
        agent: { name: 'SSE Agent', type: 'live' },
      },
    });
    assert.equal(sseLiveConnect.status, 200);
    assert.equal(sseLiveConnect.body.connection.transport.protocol, 'sse');
    assert.ok(
      sseLiveConnect.body.connection.transport.sseUrl.endsWith(
        `/session/${sseLiveConnect.body.connection.session.id}/stream`
      )
    );

    const directResolveUnauthorized = await makeJsonRequest({
      port: harness.address.port,
      path: `/connect/live/${sseLiveConnect.body.connection.session.id}`,
      method: 'GET',
    });
    assert.equal(directResolveUnauthorized.status, 401);

    const directResolveAuthorized = await makeJsonRequest({
      port: harness.address.port,
      path: `/connect/live/${sseLiveConnect.body.connection.session.id}?token=${encodeURIComponent(
        sseLiveConnect.body.connection.session.token
      )}`,
      method: 'GET',
    });
    assert.equal(directResolveAuthorized.status, 200);
    assert.equal(directResolveAuthorized.body.connection.transport.protocol, 'sse');
  } finally {
    await harness.stop();
  }
});

console.log(`\nPassed: ${passed}`);
console.log(`Failed: ${failed}`);

if (failed > 0) {
  process.exitCode = 1;
}
