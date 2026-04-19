import { z } from '../backend/node_modules/zod/index.js';

export const CONNECTION_MODES = {
  PROMPT: 'prompt',
  SDK: 'sdk',
  LINK: 'link',
  LIVE: 'live',
};

export const LIVE_CHANNEL_PROTOCOLS = {
  SOCKET_IO: 'socket.io',
  SSE: 'sse',
};

const agentSchema = z.object({
  id: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1).optional(),
  type: z.string().trim().min(1).optional(),
  version: z.string().trim().min(1).optional(),
});

const baseConnectRequestSchema = z.object({
  mode: z.enum([
    CONNECTION_MODES.PROMPT,
    CONNECTION_MODES.SDK,
    CONNECTION_MODES.LINK,
    CONNECTION_MODES.LIVE,
  ]),
  agent: agentSchema.optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  capabilities: z.array(z.string().trim().min(1)).optional(),
  ttlSeconds: z.number().int().positive().max(86400).optional(),
});

export const promptConnectRequestSchema = baseConnectRequestSchema.extend({
  mode: z.literal(CONNECTION_MODES.PROMPT),
  prompt: z.string().trim().min(1),
  topK: z.number().int().positive().max(20).optional(),
  minScore: z.number().min(0).max(1).optional(),
});

export const sdkConnectRequestSchema = baseConnectRequestSchema.extend({
  mode: z.literal(CONNECTION_MODES.SDK),
  requestedTools: z.array(z.string().trim().min(1)).max(200).optional(),
  apiKey: z.string().trim().min(1).optional(),
});

export const linkConnectRequestSchema = baseConnectRequestSchema.extend({
  mode: z.literal(CONNECTION_MODES.LINK),
  prompt: z.string().trim().min(1).optional(),
  requestedTools: z.array(z.string().trim().min(1)).max(200).optional(),
  singleUse: z.boolean().default(true).optional(),
});

export const liveConnectRequestSchema = baseConnectRequestSchema.extend({
  mode: z.literal(CONNECTION_MODES.LIVE),
  requestedTools: z.array(z.string().trim().min(1)).max(200).optional(),
  protocol: z.enum([
    LIVE_CHANNEL_PROTOCOLS.SOCKET_IO,
    LIVE_CHANNEL_PROTOCOLS.SSE,
  ]).optional(),
  apiKey: z.string().trim().min(1).optional(),
});

export const connectRequestSchema = z.discriminatedUnion('mode', [
  promptConnectRequestSchema,
  sdkConnectRequestSchema,
  linkConnectRequestSchema,
  liveConnectRequestSchema,
]);

export const sessionBootstrapSchema = z.object({
  id: z.string().trim().min(1),
  token: z.string().trim().min(1).optional(),
  mode: z.string().trim().min(1),
  agent: agentSchema.nullable().optional(),
  metadata: z.record(z.string(), z.unknown()),
  capabilities: z.array(z.string()),
  allowedToolIds: z.array(z.string()).nullable().optional(),
  recommendedToolIds: z.array(z.string()).nullable().optional(),
  createdAt: z.string().trim().min(1),
  expiresAt: z.string().trim().min(1),
  endpoints: z.object({
    connect: z.string().trim().min(1),
    inspect: z.string().trim().min(1),
    execute: z.string().trim().min(1),
    executeStream: z.string().trim().min(1),
    ingest: z.string().trim().min(1).optional(),
    revoke: z.string().trim().min(1),
    state: z.string().trim().min(1),
    stream: z.string().trim().min(1).optional(),
    control: z.object({
      pause: z.string().trim().min(1),
      resume: z.string().trim().min(1),
      constrain: z.string().trim().min(1),
    }),
  }),
});

export const connectionTransportSchema = z.object({
  restBaseUrl: z.string().trim().min(1),
  orchestrationNamespace: z.string().trim().min(1),
  sessionNamespace: z.string().trim().min(1),
  controlNamespace: z.string().trim().min(1),
  sseUrl: z.string().trim().min(1),
  protocol: z.enum([
    LIVE_CHANNEL_PROTOCOLS.SOCKET_IO,
    LIVE_CHANNEL_PROTOCOLS.SSE,
  ]).optional(),
});

export const retrievalSummarySchema = z.object({
  strategy: z.string().trim().min(1),
  query: z.string(),
  fallbackUsed: z.boolean(),
  fallbackReason: z.string().nullable().optional(),
  matches: z.array(z.object({
    tool: z.object({
      id: z.string().trim().min(1),
      name: z.string().trim().min(1),
      description: z.string(),
    }),
    score: z.number(),
  })),
});

export const promptConnectionResponseSchema = z.object({
  success: z.literal(true),
  mode: z.literal(CONNECTION_MODES.PROMPT),
  connection: z.object({
    session: sessionBootstrapSchema,
    retrieval: retrievalSummarySchema,
    instructions: z.object({
      sessionUrl: z.string().trim().min(1),
      taskPrefix: z.string().trim().min(1).optional(),
      prompt: z.string().trim().min(1),
    }),
  }),
});

export const sdkConnectionResponseSchema = z.object({
  success: z.literal(true),
  mode: z.literal(CONNECTION_MODES.SDK),
  connection: z.object({
    session: sessionBootstrapSchema,
    transport: connectionTransportSchema,
  }),
});

export const linkConnectionResponseSchema = z.object({
  success: z.literal(true),
  mode: z.literal(CONNECTION_MODES.LINK),
  connection: z.object({
    session: sessionBootstrapSchema,
    link: z.object({
      url: z.string().trim().min(1),
      resolverPath: z.string().trim().min(1),
      singleUse: z.boolean(),
      expiresAt: z.string().trim().min(1),
    }),
    transport: connectionTransportSchema,
  }),
});

export const liveConnectionResponseSchema = z.object({
  success: z.literal(true),
  mode: z.literal(CONNECTION_MODES.LIVE),
  connection: z.object({
    session: sessionBootstrapSchema,
    transport: connectionTransportSchema,
    live: z.object({
      connectUrl: z.string().trim().min(1),
      protocol: z.enum([
        LIVE_CHANNEL_PROTOCOLS.SOCKET_IO,
        LIVE_CHANNEL_PROTOCOLS.SSE,
      ]),
    }),
  }),
});

export const connectResponseSchema = z.discriminatedUnion('mode', [
  promptConnectionResponseSchema,
  sdkConnectionResponseSchema,
  linkConnectionResponseSchema,
  liveConnectionResponseSchema,
]);

export const linkResolveResponseSchema = z.object({
  success: z.literal(true),
  mode: z.literal(CONNECTION_MODES.LINK),
  connection: z.object({
    session: sessionBootstrapSchema,
    transport: connectionTransportSchema,
  }),
});
