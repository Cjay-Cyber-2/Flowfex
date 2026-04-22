# Flowfex SDK

Official SDKs for connecting AI agents to the Flowfex orchestration platform.

## Packages

| Language | Package | Path |
|----------|---------|------|
| JavaScript/TypeScript | `flowfex` | [js/](./js/) |
| Python | `flowfex` | [python/](./python/) |

## Quick Start

### JavaScript

```bash
cd sdk/js
npm install
npm run build
```

```javascript
import { FlowfexClient } from 'flowfex';

const client = new FlowfexClient('http://localhost:4000');
const session = await client.connect({ name: 'my-agent' }, { mode: 'sdk' });
const result = await client.send('Analyze data');
```

### Python

```bash
cd sdk/python
pip install -e .
```

```python
from flowfex import FlowfexClient

client = FlowfexClient('http://localhost:4000')
session = client.connect({'name': 'my-agent'}, mode='sdk')
result = client.send('Analyze data')
```

## Features

- **Multiple Connection Modes**: prompt, sdk, link, live
- **Real-time Events**: WebSocket subscriptions for live updates
- **Execution Control**: pause, resume, approve, reject
- **Tool Execution**: Direct tool invocation or orchestration
- **Session Management**: Token-based auth with auto-refresh

## API Reference

Both SDKs expose the same core API:

| Method | Description |
|--------|-------------|
| `connect(agent, options)` | Create session and connect |
| `send(task)` | Send task for orchestration |
| `executeTool(toolId, input)` | Execute specific tool |
| `subscribe(event, handler)` | Subscribe to WebSocket events |
| `getState()` | Get session snapshot |
| `pause()` / `resume()` | Control execution |
| `approve(nodeId)` / `reject(nodeId)` | Node approval control |
| `disconnect()` | Cleanup and close |

## Events

| Event | Description |
|-------|-------------|
| `graph:created` | Execution graph initialized |
| `node:executing` | Node started execution |
| `node:completed` | Node finished successfully |
| `node:awaiting_approval` | Node needs approval |
| `node:error` | Node execution failed |
| `path:rerouted` | Execution path changed |

## License

MIT
