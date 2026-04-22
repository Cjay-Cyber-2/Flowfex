export type FlowfexCanvasMode = 'map' | 'flow' | 'live';

export type FlowfexSessionStatus =
  | 'planning'
  | 'ready'
  | 'running'
  | 'awaiting_approval'
  | 'paused'
  | 'completed'
  | 'failed';

export type FlowfexPersistedSessionStatus =
  | 'active'
  | 'paused'
  | 'completed'
  | 'error';

export type FlowfexNodeShape = 'rect' | 'diamond';

export type FlowfexNodeState =
  | 'idle'
  | 'queued'
  | 'active'
  | 'approval'
  | 'completed'
  | 'skipped'
  | 'error'
  | 'paused';

export type FlowfexEdgeState =
  | 'inactive'
  | 'queued'
  | 'active'
  | 'completed'
  | 'rerouted';

export type FlowfexEdgeType = 'sequential' | 'conditional';

export interface FlowfexGraphAlternative {
  readonly toolId?: string;
  readonly name: string;
  readonly score?: number;
  readonly confidence: number;
  readonly reason: string;
}

export interface FlowfexGraphNodeExecutionMetadata {
  readonly category?: string;
  readonly objective?: string;
  readonly selectionScore?: number;
  readonly requiresApproval?: boolean;
  readonly branchCondition?: string;
  readonly [key: string]: unknown;
}

export interface FlowfexGraphNode {
  readonly id: string;
  readonly type: string;
  readonly shape: FlowfexNodeShape;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly title: string;
  readonly subtitle: string;
  readonly state: FlowfexNodeState;
  readonly icon: string;
  readonly confidence: number;
  readonly reasoning: string;
  readonly alternatives: readonly FlowfexGraphAlternative[];
  readonly inputs: Readonly<Record<string, unknown>>;
  readonly config: Readonly<Record<string, unknown>>;
  readonly owner: string;
  readonly skill?: string | null;
  readonly executionMetadata?: FlowfexGraphNodeExecutionMetadata;
}

export interface FlowfexGraphEdge {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly state: FlowfexEdgeState;
  readonly label?: string | null;
  readonly type?: FlowfexEdgeType;
}

export interface FlowfexConnectedAgent {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly status: string;
  readonly lastSeen?: string;
}

export interface FlowfexGraphState {
  readonly sessionId?: string | null;
  readonly executionId?: string | null;
  readonly status?: FlowfexSessionStatus;
  readonly nodes: readonly FlowfexGraphNode[];
  readonly edges: readonly FlowfexGraphEdge[];
  readonly currentNodeId?: string | null;
  readonly pendingNodeId?: string | null;
  readonly executionPointer?: string | null;
  readonly connectedAgents: readonly FlowfexConnectedAgent[];
  readonly constraints: readonly string[];
  readonly mode: FlowfexCanvasMode;
  readonly outputs?: Readonly<Record<string, unknown>>;
  readonly errors?: Readonly<Record<string, unknown>>;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export const EMPTY_GRAPH_STATE: FlowfexGraphState = {
  sessionId: null,
  executionId: null,
  status: 'ready',
  nodes: [],
  edges: [],
  currentNodeId: null,
  pendingNodeId: null,
  executionPointer: null,
  connectedAgents: [],
  constraints: [],
  mode: 'flow',
  outputs: {},
  errors: {},
  metadata: {},
};
