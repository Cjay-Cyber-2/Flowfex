import type { z } from 'zod';

export declare const CONTROL_ACTIONS: {
  readonly PAUSE: 'pause';
  readonly RESUME: 'resume';
  readonly APPROVE: 'approve';
  readonly REJECT: 'reject';
  readonly REROUTE: 'reroute';
  readonly CONSTRAIN: 'constrain';
  readonly ERROR: 'error';
};

export declare const CONTROL_EVENTS: {
  readonly SESSION_PAUSED: 'session:paused';
  readonly SESSION_RESUMED: 'session:resumed';
  readonly NODE_APPROVED: 'node:approved';
  readonly NODE_REJECTED: 'node:rejected';
  readonly PATH_REROUTED: 'path:rerouted';
  readonly SESSION_CONSTRAINED: 'session:constrained';
  readonly CONTROL_ERROR: 'control:error';
  readonly SESSION_STATE: 'session:state';
};

export declare const SESSION_STATUS_VALUES: readonly [
  'planning',
  'ready',
  'running',
  'awaiting_approval',
  'paused',
  'completed',
  'failed',
];

export declare const GRAPH_NODE_STATE_VALUES: readonly [
  'idle',
  'queued',
  'active',
  'approval',
  'completed',
  'skipped',
  'error',
  'paused',
];

export declare const GRAPH_EDGE_STATE_VALUES: readonly [
  'inactive',
  'queued',
  'active',
  'completed',
  'rerouted',
];

export declare const jsonValueSchema: z.ZodType;
export declare const executionGraphNodeSchema: z.ZodObject<any>;
export declare const executionGraphEdgeSchema: z.ZodObject<any>;
export declare const executionGraphSchema: z.ZodObject<any>;
export declare const branchChoiceSchema: z.ZodObject<any>;
export declare const executionTraceEntrySchema: z.ZodObject<any>;
export declare const graphUpdateSchema: z.ZodObject<any>;
export declare const controlMetadataSchema: z.ZodObject<any>;
export declare const sessionSnapshotSchema: z.ZodObject<any>;
export declare const actionEventEnvelopeSchema: z.ZodObject<any>;
export declare const baseControlRequestSchema: z.ZodObject<any>;
export declare const pauseSessionRequestSchema: z.ZodObject<any>;
export declare const resumeSessionRequestSchema: z.ZodObject<any>;
export declare const approveNodeRequestSchema: z.ZodObject<any>;
export declare const rejectNodeRequestSchema: z.ZodObject<any>;
export declare const rerouteNodeRequestSchema: z.ZodObject<any>;
export declare const constrainSessionRequestSchema: z.ZodObject<any>;
export declare const pauseSessionEventSchema: z.ZodObject<any>;
export declare const resumeSessionEventSchema: z.ZodObject<any>;
export declare const approveNodeEventSchema: z.ZodObject<any>;
export declare const rejectNodeEventSchema: z.ZodObject<any>;
export declare const rerouteNodeEventSchema: z.ZodObject<any>;
export declare const constrainSessionEventSchema: z.ZodObject<any>;
export declare const controlErrorEventSchema: z.ZodObject<any>;
export declare const sessionStateEventSchema: z.ZodObject<any>;
export declare const controlActionResponseSchema: z.ZodObject<any>;
export declare const controlErrorResponseSchema: z.ZodObject<any>;

export type ControlAction = typeof CONTROL_ACTIONS[keyof typeof CONTROL_ACTIONS];
export type ControlEventName = typeof CONTROL_EVENTS[keyof typeof CONTROL_EVENTS];
export type SessionStatus = typeof SESSION_STATUS_VALUES[number];
export type GraphNodeState = typeof GRAPH_NODE_STATE_VALUES[number];
export type GraphEdgeState = typeof GRAPH_EDGE_STATE_VALUES[number];

export type SessionSnapshot = z.infer<typeof sessionSnapshotSchema>;
export type PauseSessionRequest = z.infer<typeof pauseSessionRequestSchema>;
export type ResumeSessionRequest = z.infer<typeof resumeSessionRequestSchema>;
export type ApproveNodeRequest = z.infer<typeof approveNodeRequestSchema>;
export type RejectNodeRequest = z.infer<typeof rejectNodeRequestSchema>;
export type RerouteNodeRequest = z.infer<typeof rerouteNodeRequestSchema>;
export type ConstrainSessionRequest = z.infer<typeof constrainSessionRequestSchema>;

export type PauseSessionEvent = z.infer<typeof pauseSessionEventSchema>;
export type ResumeSessionEvent = z.infer<typeof resumeSessionEventSchema>;
export type ApproveNodeEvent = z.infer<typeof approveNodeEventSchema>;
export type RejectNodeEvent = z.infer<typeof rejectNodeEventSchema>;
export type RerouteNodeEvent = z.infer<typeof rerouteNodeEventSchema>;
export type ConstrainSessionEvent = z.infer<typeof constrainSessionEventSchema>;
export type ControlErrorEvent = z.infer<typeof controlErrorEventSchema>;
export type SessionStateEvent = z.infer<typeof sessionStateEventSchema>;

export type ControlActionResponse = z.infer<typeof controlActionResponseSchema>;
export type ControlErrorResponse = z.infer<typeof controlErrorResponseSchema>;
