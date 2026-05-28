# Syniq SDK

Official SDKs for connecting AI agents to the Syniq orchestration platform.

## Packages

| Language | Package | Path |
|----------|---------|------|
| JavaScript/TypeScript | `syniq` | [js/](./js/) |
| Python | `syniq` | [python/](./python/) |

## Quick Start

### JavaScript

```bash
cd sdk/js
npm install
npm run build
```

```javascript
import { SyniqClient } from 'syniq';

const client = new SyniqClient('http://localhost:4000');
const session = await client.connect({ name: 'my-agent' }, { mode: 'sdk' });
const result = await client.send('Analyze data');
```

### Python

```bash
cd sdk/python
pip install -e .
```

```python
from syniq import SyniqClient

client = SyniqClient('http://localhost:4000')
session = client.connect({'name': 'my-agent'}, mode='sdk')
result = client.send('Analyze data')
```

## MCP (IDE agents that block HTTP)

For Kiro, strict Cursor policies, and other agents that refuse prompt-based `fetch` instructions, use the Syniq MCP server:

```bash
cd mcp/syniq-mcp && npm install
```

Copy the **MCP** tab config from the Syniq dashboard, or install [`@syniq/syniq-mcp`](https://www.npmjs.com/package/@syniq/syniq-mcp) — see [mcp/syniq-mcp/README.md](../mcp/syniq-mcp/README.md).

## Features

- **Multiple Connection Modes**: prompt, sdk, link, live, mcp
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
