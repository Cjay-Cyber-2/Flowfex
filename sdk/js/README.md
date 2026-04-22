# Flowfex JavaScript SDK

Connect AI agents to the Flowfex orchestration platform.

## Installation

```bash
npm install flowfex
```

## Quick Start

```javascript
import { FlowfexClient } from 'flowfex';

const client = new FlowfexClient('http://localhost:4000');

// Connect your agent
const session = await client.connect(
  { name: 'my-agent', type: 'assistant' },
  { mode: 'sdk' }
);

// Send a task
const result = await client.send('Analyze the sales data and create a report');
console.log(result.output);

// Subscribe to real-time events
const unsubscribe = client.subscribe('node:completed', (data) => {
  console.log('Node completed:', data);
});

// Control execution
await client.pause();
await client.resume();
await client.approve('node-123', 'Looks good');

// Cleanup
client.disconnect();
```

## API

### `connect(agent, options)`

Create a session and connect to Flowfex.

| Option | Type | Description |
|--------|------|-------------|
| `mode` | `'prompt' \| 'sdk' \| 'link' \| 'live'` | Connection mode |
| `prompt` | `string` | Initial prompt (for prompt mode) |
| `capabilities` | `string[]` | Agent capabilities |
| `requestedTools` | `string[]` | Specific tools to use |
| `apiKey` | `string` | API key for authenticated connections |
| `ttlSeconds` | `number` | Session TTL |

### `send(task)`

Send a task for orchestration.

### `executeTool(toolId, input)`

Execute a specific tool directly.

### `subscribe(event, handler)`

Subscribe to real-time WebSocket events.

### `getState()`

Get current session snapshot.

### `pause()` / `resume()`

Control execution flow.

### `approve(nodeId, note?)` / `reject(nodeId, reason?)`

Approve or reject nodes awaiting approval.

## Events

| Event | Description |
|-------|-------------|
| `graph:created` | Execution graph created |
| `node:executing` | Node started |
| `node:completed` | Node finished |
| `node:awaiting_approval` | Node needs approval |
| `node:error` | Node failed |
| `path:rerouted` | Execution path changed |

## License

MIT
