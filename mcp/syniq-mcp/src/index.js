#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { loadSyniqConfig, assertConfigured } from './config.js';
import {
  formatConfigStatus,
  formatSyniqResponse,
  getLastResponse,
  isAttached,
  postIngest,
} from './syniq-client.js';

let runtimeConfig = loadSyniqConfig();

const server = new Server(
  {
    name: 'syniq-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
    instructions: [
      'You are connected to Syniq via MCP. The Syniq server (not you) calls Flowfex HTTP APIs.',
      'Before working on the user task, call syniq_attach once per conversation if not yet attached.',
      'For every user task, call syniq_route_task with the exact user request before taking other actions.',
      'Use only skills, tools, memory, and workflows returned by Syniq when they are relevant.',
      'End each routed reply with the syniqUsage.footer string from the syniq_route_task response when present.',
    ].join(' '),
  }
);

const configureSchema = z.object({
  sessionId: z.string().min(1).optional(),
  sessionToken: z.string().min(1).optional(),
  publicUrl: z.string().url().optional(),
  ingestUrl: z.string().url().optional(),
});

const routeTaskSchema = z.object({
  task: z.string().min(1).describe('Exact user task to send to Syniq orchestration'),
});

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'syniq_configure',
      description:
        'Set or update Syniq connection credentials (session id, token, URLs). '
        + 'Usually configured via MCP env vars from the Syniq dashboard instead.',
      inputSchema: {
        type: 'object',
        properties: {
          sessionId: { type: 'string', description: 'Connection session id (sess_… from dashboard)' },
          sessionToken: { type: 'string', description: 'Syniq session token (ffx_…)' },
          publicUrl: { type: 'string', description: 'Flowfex / Syniq API origin, e.g. https://flowfex.onrender.com' },
          ingestUrl: { type: 'string', description: 'Ingest endpoint URL (defaults to {publicUrl}/ingest)' },
        },
      },
    },
    {
      name: 'syniq_attach',
      description:
        'Register this MCP client with the user Syniq dashboard session. '
        + 'Call once when starting a connected conversation so the dashboard shows the agent as live.',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'syniq_route_task',
      description:
        'Route the user task through Syniq before you act. Returns skills, tools, workflows, memory, '
        + 'orchestration output, and syniqUsage.footer for compulsory baseline counts.',
      inputSchema: {
        type: 'object',
        properties: {
          task: { type: 'string', description: 'Exact user task text' },
        },
        required: ['task'],
      },
    },
    {
      name: 'syniq_connection_status',
      description: 'Show current Syniq MCP configuration, attach state, and last usage footer if any.',
      inputSchema: { type: 'object', properties: {} },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === 'syniq_configure') {
      const parsed = configureSchema.parse(args || {});
      runtimeConfig = loadSyniqConfig(parsed);
      return {
        content: [{
          type: 'text',
          text: `${formatConfigStatus(runtimeConfig)}\n\nConfiguration updated for this MCP server process.`,
        }],
      };
    }

    if (name === 'syniq_connection_status') {
      const footer = getLastResponse()?.syniqUsage?.footer;
      const lines = [formatConfigStatus(runtimeConfig)];
      if (footer) {
        lines.push('', 'Last usage:', footer);
      }
      return { content: [{ type: 'text', text: lines.join('\n') }] };
    }

    assertConfigured(runtimeConfig);

    if (name === 'syniq_attach') {
      const payload = await postIngest(runtimeConfig, 'syniq.attach');
      return {
        content: [{
          type: 'text',
          text: formatSyniqResponse(payload, { heading: 'Syniq attach succeeded. Dashboard should show this agent as connected.' }),
        }],
      };
    }

    if (name === 'syniq_route_task') {
      const { task } = routeTaskSchema.parse(args || {});
      if (!isAttached()) {
        await postIngest(runtimeConfig, 'syniq.attach');
      }
      const payload = await postIngest(runtimeConfig, task);
      return {
        content: [{
          type: 'text',
          text: formatSyniqResponse(payload, { heading: 'Syniq routed task' }),
        }],
      };
    }

    return {
      content: [{ type: 'text', text: `Unknown tool: ${name}` }],
      isError: true,
    };
  } catch (error) {
    const detail = error?.payload
      ? `\n\n${JSON.stringify(error.payload, null, 2)}`
      : '';
    return {
      content: [{
        type: 'text',
        text: `Syniq MCP error: ${error.message || String(error)}${detail}`,
      }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('[syniq-mcp] fatal:', error);
  process.exit(1);
});
