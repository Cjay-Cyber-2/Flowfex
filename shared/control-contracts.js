import { z } from '../backend/node_modules/zod/index.js';

export const CONTROL_ACTIONS = {
  PAUSE: 'pause',
  RESUME: 'resume',
  APPROVE: 'approve',
  REJECT: 'reject',
  REROUTE: 'reroute',
  CONSTRAIN: 'constrain',
  ERROR: 'error',
};

export const CONTROL_EVENTS = {
  SESSION_PAUSED: 'session:paused',
  SESSION_RESUMED: 'session:resumed',
  NODE_APPROVED: 'node:approved',
  NODE_REJECTED: 'node:rejected',
  PATH_REROUTED: 'path:rerouted',
  SESSION_CONSTRAINED: 'session:constrained',
  CONTROL_ERROR: 'control:error',
  SESSION_STATE: 'session:state',
};

export const SESSION_STATUS_VALUES = [
  'planning',
  'ready',
  'running',
  'awaiting_approval',
  'paused',
  'completed',
  'failed',
];

export const GRAPH_NODE_STATE_VALUES = [
  'idle',
  'queued',
  'active',
  'approval',
  'completed',
  'skipped',
  'error',
  'paused',
];

export const GRAPH_EDGE_STATE_VALUES = [
  'inactive',
  'queued',
  'active',
  'completed',
  'rerouted',
];

export const jsonValueSchema = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ])
);

export const executionGraphNodeSchema = z.object({
  id: z.string().trim().min(1),
  type: z.string().trim().min(1),
  shape: z.enum(['rect', 'diamond']),
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  title: z.string().trim().min(1),
  subtitle: z.string(),
  state: z.enum(GRAPH_NODE_STATE_VALUES),
  icon: z.string().trim().min(1),
  confidence: z.number(),
  reasoning: z.string(),
  alternatives: z.array(z.object({
    toolId: z.string().trim().min(1),
    name: z.string().trim().min(1),
    score: z.number(),
    confidence: z.number(),
    reason: z.string(),
  })),
  inputs: z.record(z.string(), jsonValueSchema),
  config: z.record(z.string(), jsonValueSchema),
  owner: z.string().trim().min(1),
  skill: z.string().trim().min(1).nullable(),
  executionMetadata: z.record(z.string(), jsonValueSchema),
});

export const executionGraphEdgeSchema = z.object({
  id: z.string().trim().min(1),
  from: z.string().trim().min(1),
  to: z.string().trim().min(1),
  state: z.enum(GRAPH_EDGE_STATE_VALUES),
  label: z.string().nullable(),
  type: z.enum(['sequential', 'conditional']),
});

export const executionGraphSchema = z.object({
  sessionId: z.string().trim().min(1),
  executionId: z.string().trim().min(1),
  nodes: z.array(executionGraphNodeSchema),
  edges: z.array(executionGraphEdgeSchema),
});

export const branchChoiceSchema = z.object({
  nodeId: z.string().trim().min(1),
  condition: z.string().trim().min(1),
  matched: z.boolean(),
  selectedNodeId: z.string().trim().min(1).nullable(),
  reroutedEdgeId: z.string().trim().min(1).nullable(),
  activeEdgeId: z.string().trim().min(1).nullable(),
  reason: z.string().trim().min(1),
});

export const executionTraceEntrySchema = z.object({
  nodeId: z.string().trim().min(1),
  nodeType: z.enum(['skill', 'decision']),
  toolId: z.string().trim().min(1).nullable(),
  status: z.enum(['completed', 'failed', 'awaiting_approval']),
  input: jsonValueSchema,
  output: jsonValueSchema.optional(),
  error: z.object({
    message: z.string().trim().min(1),
    type: z.string().trim().min(1),
    nodeId: z.string().trim().min(1).optional(),
  }).optional(),
  branchChoice: branchChoiceSchema.optional(),
  startedAt: z.string().trim().min(1),
  completedAt: z.string().trim().min(1),
  durationMs: z.number().int().nonnegative(),
});

export const graphUpdateSchema = z.object({
  id: z.string().trim().min(1),
  type: z.enum(['reroute_edge_added', 'selection_constrained', 'selection_rebuilt', 'state_rehydrated']),
  nodeId: z.string().trim().min(1).nullable().optional(),
  edgeId: z.string().trim().min(1).nullable().optional(),
  payload: z.record(z.string(), jsonValueSchema),
  createdAt: z.string().trim().min(1),
});

export const controlMetadataSchema = z.object({
  pauseRequestedAt: z.string().trim().min(1).nullable().optional(),
  pauseReason: z.string().trim().min(1).nullable().optional(),
  pausedAt: z.string().trim().min(1).nullable().optional(),
  resumedAt: z.string().trim().min(1).nullable().optional(),
  lastAction: z.enum([
    CONTROL_ACTIONS.PAUSE,
    CONTROL_ACTIONS.RESUME,
    CONTROL_ACTIONS.APPROVE,
    CONTROL_ACTIONS.REJECT,
    CONTROL_ACTIONS.REROUTE,
    CONTROL_ACTIONS.CONSTRAIN,
  ]).nullable().optional(),
  lastActionAt: z.string().trim().min(1).nullable().optional(),
});

export const sessionSnapshotSchema = z.object({
  sessionId: z.string().trim().min(1),
  executionId: z.string().trim().min(1),
  task: z.string(),
  status: z.enum(SESSION_STATUS_VALUES),
  revision: z.number().int().nonnegative(),
  createdAt: z.string().trim().min(1),
  updatedAt: z.string().trim().min(1),
  currentNodeId: z.string().trim().min(1).nullable(),
  pendingNodeId: z.string().trim().min(1).nullable(),
  completedNodeIds: z.array(z.string().trim().min(1)),
  blockedSkillIds: z.array(z.string().trim().min(1)).default([]),
  graph: executionGraphSchema,
  outputs: z.record(z.string(), jsonValueSchema),
  errors: z.record(z.string(), z.object({
    message: z.string().trim().min(1),
    type: z.string().trim().min(1),
    nodeId: z.string().trim().min(1).optional(),
  })),
  branchChoices: z.record(z.string(), branchChoiceSchema),
  trace: z.array(executionTraceEntrySchema),
  intent: z.record(z.string(), jsonValueSchema),
  selection: z.record(z.string(), jsonValueSchema),
  finalOutput: jsonValueSchema.optional(),
  graphUpdates: z.array(graphUpdateSchema).default([]),
  control: controlMetadataSchema.default({}),
});

export const actionEventEnvelopeSchema = z.object({
  name: z.string().trim().min(1),
  payload: z.record(z.string(), jsonValueSchema),
});

export const baseControlRequestSchema = z.object({
  requestId: z.string().trim().min(1).optional(),
  expectedRevision: z.number().int().nonnegative().optional(),
  actor: z.string().trim().min(1).optional(),
  reason: z.string().trim().min(1).optional(),
  metadata: z.record(z.string(), jsonValueSchema).optional(),
});

export const pauseSessionRequestSchema = baseControlRequestSchema.extend({});
export const resumeSessionRequestSchema = baseControlRequestSchema.extend({});

export const approveNodeRequestSchema = baseControlRequestSchema.extend({
  sessionId: z.string().trim().min(1),
  note: z.string().trim().min(1).optional(),
});

export const rejectNodeRequestSchema = baseControlRequestSchema.extend({
  sessionId: z.string().trim().min(1),
  fallbackNodeId: z.string().trim().min(1).optional(),
});

export const rerouteNodeRequestSchema = baseControlRequestSchema.extend({
  sessionId: z.string().trim().min(1),
  targetNodeId: z.string().trim().min(1),
});

export const constrainSessionRequestSchema = baseControlRequestSchema.extend({
  blockedSkillIds: z.array(z.string().trim().min(1)).max(100),
});

export const pauseSessionEventSchema = z.object({
  action: z.literal(CONTROL_ACTIONS.PAUSE),
  sessionId: z.string().trim().min(1),
  revision: z.number().int().nonnegative(),
  status: z.literal('paused'),
  pausedAt: z.string().trim().min(1),
  reason: z.string().nullable().optional(),
  pendingNodeId: z.string().trim().min(1).nullable(),
});

export const resumeSessionEventSchema = z.object({
  action: z.literal(CONTROL_ACTIONS.RESUME),
  sessionId: z.string().trim().min(1),
  revision: z.number().int().nonnegative(),
  status: z.literal('running'),
  resumedAt: z.string().trim().min(1),
  pendingNodeId: z.string().trim().min(1).nullable(),
});

export const approveNodeEventSchema = z.object({
  action: z.literal(CONTROL_ACTIONS.APPROVE),
  sessionId: z.string().trim().min(1),
  nodeId: z.string().trim().min(1),
  revision: z.number().int().nonnegative(),
  approvedAt: z.string().trim().min(1),
  nextNodeId: z.string().trim().min(1).nullable(),
  note: z.string().nullable().optional(),
});

export const rejectNodeEventSchema = z.object({
  action: z.literal(CONTROL_ACTIONS.REJECT),
  sessionId: z.string().trim().min(1),
  nodeId: z.string().trim().min(1),
  revision: z.number().int().nonnegative(),
  rejectedAt: z.string().trim().min(1),
  reason: z.string().nullable().optional(),
  targetNodeId: z.string().trim().min(1).nullable(),
});

export const rerouteNodeEventSchema = z.object({
  action: z.literal(CONTROL_ACTIONS.REROUTE),
  sessionId: z.string().trim().min(1),
  nodeId: z.string().trim().min(1),
  targetNodeId: z.string().trim().min(1),
  edgeId: z.string().trim().min(1),
  revision: z.number().int().nonnegative(),
  reroutedAt: z.string().trim().min(1),
  reason: z.string().nullable().optional(),
});

export const constrainSessionEventSchema = z.object({
  action: z.literal(CONTROL_ACTIONS.CONSTRAIN),
  sessionId: z.string().trim().min(1),
  revision: z.number().int().nonnegative(),
  blockedSkillIds: z.array(z.string().trim().min(1)),
  updatedNodeIds: z.array(z.string().trim().min(1)),
  constrainedAt: z.string().trim().min(1),
  reason: z.string().nullable().optional(),
});

export const controlErrorEventSchema = z.object({
  action: z.literal(CONTROL_ACTIONS.ERROR),
  actionType: z.enum([
    CONTROL_ACTIONS.PAUSE,
    CONTROL_ACTIONS.RESUME,
    CONTROL_ACTIONS.APPROVE,
    CONTROL_ACTIONS.REJECT,
    CONTROL_ACTIONS.REROUTE,
    CONTROL_ACTIONS.CONSTRAIN,
  ]),
  sessionId: z.string().trim().min(1).nullable().optional(),
  nodeId: z.string().trim().min(1).nullable().optional(),
  statusCode: z.number().int().positive(),
  code: z.string().trim().min(1),
  message: z.string().trim().min(1),
  retryable: z.boolean().default(false),
  occurredAt: z.string().trim().min(1),
});

export const sessionStateEventSchema = z.object({
  sessionId: z.string().trim().min(1),
  revision: z.number().int().nonnegative(),
  snapshot: sessionSnapshotSchema,
});

export const controlActionResponseSchema = z.object({
  ok: z.literal(true),
  action: z.enum([
    CONTROL_ACTIONS.PAUSE,
    CONTROL_ACTIONS.RESUME,
    CONTROL_ACTIONS.APPROVE,
    CONTROL_ACTIONS.REJECT,
    CONTROL_ACTIONS.REROUTE,
    CONTROL_ACTIONS.CONSTRAIN,
  ]),
  sessionId: z.string().trim().min(1),
  snapshot: sessionSnapshotSchema,
  event: actionEventEnvelopeSchema,
});

export const controlErrorResponseSchema = z.object({
  ok: z.literal(false),
  error: z.object({
    code: z.string().trim().min(1),
    message: z.string().trim().min(1),
    statusCode: z.number().int().positive(),
    retryable: z.boolean().default(false),
    details: z.record(z.string(), jsonValueSchema).optional(),
  }),
});
