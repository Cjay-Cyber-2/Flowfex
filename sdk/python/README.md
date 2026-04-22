# Flowfex Python SDK

Connect AI agents to the Flowfex orchestration platform.

## Installation

```bash
pip install flowfex
```

## Quick Start

```python
from flowfex import FlowfexClient

# Create client
client = FlowfexClient('http://localhost:4000')

# Connect your agent
session = client.connect(
    agent={'name': 'my-agent', 'type': 'assistant'},
    mode='sdk'
)

# Send a task
result = client.send('Analyze the sales data and create a report')
print(result['output'])

# Subscribe to real-time events
def on_node_completed(data):
    print(f"Node completed: {data}")

client.subscribe('node:completed', on_node_completed)

# Control execution
client.pause()
client.resume()
client.approve('node-123', note='Looks good')

# Cleanup
client.disconnect()
```

## API

### `connect(agent, **options)`

Create a session and connect to Flowfex.

| Option | Type | Description |
|--------|------|-------------|
| `mode` | `str` | Connection mode: 'prompt', 'sdk', 'link', 'live' |
| `prompt` | `str` | Initial prompt (for prompt mode) |
| `capabilities` | `list` | Agent capabilities |
| `requested_tools` | `list` | Specific tools to use |
| `api_key` | `str` | API key for authenticated connections |
| `ttl_seconds` | `int` | Session TTL |

### `send(task)`

Send a task for orchestration.

### `execute_tool(tool_id, input)`

Execute a specific tool directly.

### `subscribe(event, handler)`

Subscribe to real-time WebSocket events.

### `get_state()`

Get current session snapshot.

### `pause()` / `resume()`

Control execution flow.

### `approve(node_id, note=None)` / `reject(node_id, reason=None)`

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
