/**
 * Real-Time Integration Tests for Flowfex
 *
 * Tests WebSocket communication, control API endpoints,
 * GraphBuilder, and Socket.io event bridging.
 */

import http from 'node:http';
import { io as ioClient } from 'socket.io-client';
import { resetSocketServer } from '../ws/server.js';

// Reset singleton before imports trigger module initialization
resetSocketServer();

import {
  FlowfexServer,
  FlowfexSocketServer,
  initSocketServer,
  ToolRegistry,
  Tool,
  LLMWrapper,
  Orchestrator,
  buildExecutionGraph,
  buildGraphFromTrace,
  ORCHESTRATION_EVENTS,
  SESSION_EVENTS,
} from '../index.js';
import {
  SessionManager,
  ConnectionService,
} from '../connection/index.js';

// Ensure fresh singleton after all imports
resetSocketServer();

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  blue: '\x1b[36m',
};

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function test(name, fn) {
  try {
    await fn();
    console.log(`${colors.green}✓${colors.reset} ${name}`);
    testsPassed++;
  } catch (error) {
    console.log(`${colors.red}✗${colors.reset} ${name}`);
    console.log(`  ${error.message}`);
    testsFailed++;
  }
}

function section(title) {
  console.log(`\n${colors.blue}${title}${colors.reset}`);
  console.log('='.repeat(60));
}

// ─── Test Helpers ──────────────────────────────────────────────────────────────

function makeRequest(port, method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port,
      path,
      method,
      headers: {
        'content-type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

function waitForEvent(socket, event, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for event: ${event}`));
    }, timeoutMs);

    socket.once(event, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

// ─── Test Suite ────────────────────────────────────────────────────────────────

section('1. GraphBuilder');

await test('buildExecutionGraph creates canvas-compatible graph from steps', async () => {
  const graph = buildExecutionGraph({
    sessionId: 'test-session',
    executionId: 'exec-001',
    steps: [
      { id: 'intake', title: 'Agent Attach', type: 'input', icon: 'sparkles' },
      { id: 'parse', title: 'Task Read', type: 'analysis', icon: 'brain' },
      { id: 'decision', title: 'Route', type: 'decision', icon: 'git-branch' },
      { id: 'execute', title: 'Run Tool', type: 'tool', icon: 'globe' },
      { id: 'approve', title: 'Approve', type: 'approval', icon: 'shield-check' },
    ],
  });

  assert(graph.nodes.length === 5, `Expected 5 nodes, got ${graph.nodes.length}`);
  assert(graph.edges.length === 4, `Expected 4 edges, got ${graph.edges.length}`);
  assert(graph.nodes[0].state === 'queued', 'Initial state should be queued');
  assert(graph.nodes[2].shape === 'diamond', 'Decision nodes should be diamonds');
  assert(graph.nodes[0].x < graph.nodes[1].x, 'Nodes should be laid out left-to-right');
});

await test('buildExecutionGraph adds branch nodes for decision points', async () => {
  const graph = buildExecutionGraph({
    sessionId: 'test-session',
    executionId: 'exec-002',
    steps: [
      { id: 'step1', title: 'Start', type: 'input' },
      { id: 'step2', title: 'Decide', type: 'decision' },
      { id: 'step3', title: 'End', type: 'output' },
    ],
    branches: [{
      nodeId: 'step2',
      condition: 'fallback',
      label: 'Alternative',
      targetIndex: 2,
    }],
  });

  assert(graph.nodes.length === 4, `Expected 4 nodes (3 + 1 branch), got ${graph.nodes.length}`);
  const branchNode = graph.nodes.find(n => n.id === 'step2-branch');
  assert(branchNode, 'Branch node should exist');
  assert(branchNode.y > graph.nodes[1].y, 'Branch node should be below the decision');
  const branchEdge = graph.edges.find(e => e.from === 'step2' && e.to === 'step2-branch');
  assert(branchEdge, 'Edge from decision to branch should exist');
});

await test('buildGraphFromTrace creates graph from orchestrator trace data', async () => {
  const graph = buildGraphFromTrace({
    sessionId: 'test-session',
    executionId: 'exec-003',
    task: 'Summarize a report',
    traceSteps: [
      { tool: { name: 'Summarizer', description: 'Creates summaries' }, selection: { candidates: [{ score: 0.95 }] } },
    ],
  });

  // intake + parse + 1 tool step + approval + completion = 5
  assert(graph.nodes.length >= 5, `Expected at least 5 nodes, got ${graph.nodes.length}`);
  const summarizerNode = graph.nodes.find(n => n.title === 'Summarizer');
  assert(summarizerNode, 'Summarizer node should exist in the graph');
  const approvalNode = graph.nodes.find(n => n.type === 'approval');
  assert(approvalNode, 'Approval node should exist in the graph');
});

section('2. WebSocket Server & Control API');

let testServer;
let testPort;

await test('FlowfexServer starts with Socket.io attached', async () => {
  const registry = new ToolRegistry();
  const summarizer = new Tool({
    id: 'rt.summarizer',
    name: 'RT Summarizer',
    description: 'Summarizes text in real time',
    prompt: 'Condense the text.',
    run: async (input) => ({ summary: String(input) }),
  });
  registry.registerTool(summarizer);

  const orchestrator = new Orchestrator({ registry, llm: new LLMWrapper() });
  const sessionManager = new SessionManager();
  const connectionService = new ConnectionService({ registry, orchestrator, sessionManager });

  testServer = new FlowfexServer({
    host: '127.0.0.1',
    port: 0, // Random port
    connectionService,
  });

  const address = await testServer.start();
  testPort = address.port;

  assert(testServer.socketServer, 'Socket server should be attached');
  assert(testPort > 0, 'Server should be listening on a port');
});

await test('Socket.io client connects to /orchestration namespace', async () => {
  const client = ioClient(`http://127.0.0.1:${testPort}/orchestration`, {
    query: { sessionId: 'rt-test-session' },
    transports: ['websocket'],
    reconnection: false,
  });

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Connect timeout')), 3000);
    client.on('connect', () => {
      clearTimeout(timer);
      resolve();
    });
    client.on('connect_error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });

  assert(client.connected, 'Client should be connected');
  client.disconnect();
});

await test('Socket.io client receives session:paused event via server emit', async () => {
  assert(testServer && testServer.socketServer, 'testServer must be initialized');

  const sessionClient = ioClient(`http://127.0.0.1:${testPort}/session`, {
    query: { sessionId: 'pause-test' },
    transports: ['websocket'],
    reconnection: false,
  });

  // Wait for room:joined, then verify room membership on server
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('room:joined timeout')), 3000);
    sessionClient.on('room:joined', () => {
      clearTimeout(timer);
      resolve();
    });
  });

  // Verify socket is actually in the room
  const sockets = await testServer.socketServer.session.fetchSockets();
  const inRoom = sockets.some(s => [...s.rooms].includes('session:pause-test'));
  assert(inRoom, 'Socket should be in room session:pause-test');

  // Set up listener, then emit
  const eventPromise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timeout waiting for session:paused')), 3000);
    sessionClient.on(SESSION_EVENTS.SESSION_PAUSED, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });

  testServer.socketServer.emitSessionPaused('pause-test', { paused: true });
  const pauseData = await eventPromise;

  assert(pauseData.sessionId === 'pause-test', 'Should receive pause event with correct session ID');
  assert(pauseData.state.paused === true, 'State should show paused');

  sessionClient.disconnect();
});

await test('Socket.io client receives session:resumed event via control API', async () => {
  const sessionClient = ioClient(`http://127.0.0.1:${testPort}/session`, {
    query: { sessionId: 'resume-test' },
    transports: ['websocket'],
    reconnection: false,
  });

  await new Promise((resolve) => sessionClient.on('connect', resolve));

  const eventPromise = waitForEvent(sessionClient, SESSION_EVENTS.SESSION_RESUMED);
  await makeRequest(testPort, 'POST', '/session/resume-test/resume');
  const resumeData = await eventPromise;

  assert(resumeData.sessionId === 'resume-test', 'Should receive resume event');
  assert(resumeData.state.paused === false, 'State should show not paused');

  sessionClient.disconnect();
});

await test('Socket.io client receives node:approved event via control API', async () => {
  const orchClient = ioClient(`http://127.0.0.1:${testPort}/orchestration`, {
    query: { sessionId: 'approve-test' },
    transports: ['websocket'],
    reconnection: false,
  });

  await new Promise((resolve) => orchClient.on('connect', resolve));

  const approvedPromise = waitForEvent(orchClient, ORCHESTRATION_EVENTS.NODE_APPROVED);
  const completedPromise = waitForEvent(orchClient, ORCHESTRATION_EVENTS.NODE_COMPLETED);

  await makeRequest(testPort, 'POST', '/node/approval-gate/approve', {
    sessionId: 'approve-test',
  });

  const approvedData = await approvedPromise;
  const completedData = await completedPromise;

  assert(approvedData.nodeId === 'approval-gate', 'Should receive approved event for correct node');
  assert(completedData.nodeId === 'approval-gate', 'Should also receive completed event');

  orchClient.disconnect();
});

await test('Socket.io client receives node:rejected event via control API', async () => {
  const orchClient = ioClient(`http://127.0.0.1:${testPort}/orchestration`, {
    query: { sessionId: 'reject-test' },
    transports: ['websocket'],
    reconnection: false,
  });

  await new Promise((resolve) => orchClient.on('connect', resolve));

  const rejectedPromise = waitForEvent(orchClient, ORCHESTRATION_EVENTS.NODE_REJECTED);
  await makeRequest(testPort, 'POST', '/node/test-node/reject', {
    sessionId: 'reject-test',
  });

  const rejectedData = await rejectedPromise;
  assert(rejectedData.nodeId === 'test-node', 'Should receive rejected event');

  orchClient.disconnect();
});

await test('Socket.io client receives path:rerouted event via control API', async () => {
  const orchClient = ioClient(`http://127.0.0.1:${testPort}/orchestration`, {
    query: { sessionId: 'reroute-test' },
    transports: ['websocket'],
    reconnection: false,
  });

  await new Promise((resolve) => orchClient.on('connect', resolve));

  const reroutedPromise = waitForEvent(orchClient, ORCHESTRATION_EVENTS.PATH_REROUTED);
  await makeRequest(testPort, 'POST', '/node/approval-gate/reroute', {
    sessionId: 'reroute-test',
    targetNodeId: 'manual-review',
  });

  const reroutedData = await reroutedPromise;
  assert(reroutedData.from === 'approval-gate', 'Should include source node');
  assert(reroutedData.to === 'manual-review', 'Should include target node');

  orchClient.disconnect();
});

section('3. Skills Search API');

await test('POST /skills/search returns semantic search results', async () => {
  const result = await makeRequest(testPort, 'POST', '/skills/search', {
    query: 'summarize text',
  });

  assert(result.status === 200, `Expected 200 status, got ${result.status}`);
  assert(Array.isArray(result.body.results), 'Results should be an array');
  assert(result.body.query === 'summarize text', 'Query should echo back');
});

section('4. SSE Stream Endpoint');

await test('GET /session/:id/stream returns SSE connection event', async () => {
  const data = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('SSE timeout')), 3000);
    const req = http.get(`http://127.0.0.1:${testPort}/session/sse-test/stream`, (res) => {
      let buffer = '';
      res.on('data', (chunk) => {
        buffer += chunk;
        if (buffer.includes('event: connected')) {
          clearTimeout(timer);
          req.destroy();
          resolve(buffer);
        }
      });
      res.on('error', () => {
        clearTimeout(timer);
      });
    });
    req.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });

  assert(data.includes('event: connected'), 'Should receive connected event');
  assert(data.includes('"sessionId":"sse-test"'), 'Should include session ID');
});

section('5. Health Endpoint with WebSocket Stats');

await test('GET /health includes websocket stats', async () => {
  const result = await makeRequest(testPort, 'GET', '/health');
  assert(result.status === 200, 'Health should return 200');
  assert(result.body.websocket !== null, 'Should include websocket stats');
  assert(typeof result.body.websocket.totalConnections === 'number', 'Should have connection count');
});

// ─── Cleanup ───────────────────────────────────────────────────────────────────

if (testServer && testServer.server) {
  await new Promise((resolve) => testServer.server.close(resolve));
}

// ─── Summary ───────────────────────────────────────────────────────────────────

console.log('\nTEST SUMMARY');
console.log('='.repeat(60));
console.log(`\nPassed: ${testsPassed}`);
console.log(`Failed: ${testsFailed}`);
console.log(`Total: ${testsPassed + testsFailed}`);

if (testsFailed > 0) {
  console.log('\nSome tests failed.');
  process.exit(1);
} else {
  console.log('\nAll tests passed!');
  process.exit(0);
}
