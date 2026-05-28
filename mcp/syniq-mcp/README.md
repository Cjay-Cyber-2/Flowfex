# Syniq MCP Server

Model Context Protocol (MCP) bridge for [Syniq / Flowfex](https://github.com/Cjay-Cyber-2/Flowfex). Agents that refuse raw HTTP (Kiro, strict IDE policies) can call Syniq through **MCP tools** instead of pasting a prompt block.

## Tools

| Tool | Purpose |
|------|---------|
| `syniq_attach` | Register with the Syniq dashboard (`syniq.attach`) |
| `syniq_route_task` | Send the user's task to Syniq before acting |
| `syniq_configure` | Update session credentials at runtime |
| `syniq_connection_status` | Show config, attach state, last usage footer |

## Setup (from Syniq dashboard)

1. Open **Connect Your Agent** → **MCP** tab.
2. Click **Refresh Session** if needed, then **Copy MCP config**.
3. Paste into your agent's MCP settings file.

### Cursor

Merge into `.cursor/mcp.json` (or global MCP config):

```json
{
  "mcpServers": {
    "syniq": {
      "command": "npx",
      "args": ["-y", "@flowfex/syniq-mcp"],
      "env": {
        "SYNIQ_PUBLIC_URL": "https://flowfex.onrender.com",
        "SYNIQ_SESSION_ID": "sess_…",
        "SYNIQ_SESSION_TOKEN": "ffx_…",
        "SYNIQ_INGEST_URL": "https://flowfex.onrender.com/ingest"
      }
    }
  }
}
```

### Claude Desktop

Add the same `mcpServers.syniq` block to `claude_desktop_config.json`.

### Local development (this repo)

```json
{
  "mcpServers": {
    "syniq": {
      "command": "node",
      "args": ["/absolute/path/to/Flowfex/mcp/syniq-mcp/src/index.js"],
      "env": {
        "SYNIQ_PUBLIC_URL": "http://127.0.0.1:4000",
        "SYNIQ_SESSION_ID": "sess_…",
        "SYNIQ_SESSION_TOKEN": "ffx_…"
      }
    }
  }
}
```

## Environment variables

| Variable | Description |
|----------|-------------|
| `SYNIQ_SESSION_TOKEN` | Required. `ffx_…` token from dashboard |
| `SYNIQ_SESSION_ID` | Required. `sess_…` connection id from dashboard |
| `SYNIQ_PUBLIC_URL` | API origin (default `http://127.0.0.1:4000`) |
| `SYNIQ_INGEST_URL` | Optional. Defaults to `{SYNIQ_PUBLIC_URL}/ingest` |
| `SYNIQ_MCP_CONFIG` | Optional path to JSON config file |

Config file format (`~/.config/syniq/mcp.json` or `.syniq/mcp.json`):

```json
{
  "sessionId": "sess_…",
  "sessionToken": "ffx_…",
  "publicUrl": "https://flowfex.onrender.com"
}
```

## Agent instructions

Tell the model:

1. Call `syniq_attach` once when the conversation starts.
2. Call `syniq_route_task` with the **exact** user message before other work.
3. Use only Syniq-returned resources when relevant.
4. Include the `syniqUsage.footer` line from the tool response in your reply.

## Run manually

```bash
cd mcp/syniq-mcp
npm install
SYNIQ_SESSION_ID=sess_xxx SYNIQ_SESSION_TOKEN=ffx_xxx SYNIQ_PUBLIC_URL=http://127.0.0.1:4000 npm start
```

## License

MIT
