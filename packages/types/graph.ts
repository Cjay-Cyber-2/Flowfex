export type SyniqCanvasMode = 'map' | 'flow' | 'live';

export type SyniqSessionStatus =
  | 'planning'
  | 'ready'
  | 'running'
  | 'awaiting_approval'
  | 'paused'
  | 'completed'
  | 'failed';

export type SyniqPersistedSessionStatus =
  | 'active'
  | 'paused'
  | 'completed'
  | 'error';

export type SyniqNodeShape = 'rect' | 'diamond';

export type SyniqNodeState =
  | 'idle'
  | 'queued'
  | 'active'
  | 'approval'
  | 'completed'
  | 'skipped'
  | 'error'
  | 'paused';

export type SyniqEdgeState =
  | 'inactive'
  | 'queued'
  | 'active'
  | 'completed'
  | 'rerouted';

export type SyniqEdgeType = 'sequential' | 'conditional';

export interface SyniqGraphAlternative {
  readonly toolId?: string;
  readonly name: string;
  readonly score?: number;
  readonly confidence: number;
  readonly reason: string;
}

export interface SyniqGraphNodeExecutionMetadata {
  readonly category?: string;
  readonly objective?: string;
  readonly selectionScore?: number;
  readonly requiresApproval?: boolean;
  readonly branchCondition?: string;
  readonly [key: string]: unknown;
}

export interface SyniqGraphNode {
  readonly id: string;
  readonly type: string;
  readonly shape: SyniqNodeShape;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly title: string;
  readonly subtitle: string;
  readonly state: SyniqNodeState;
  readonly icon: string;
  readonly confidence: number;
  readonly reasoning: string;
  readonly alternatives: readonly SyniqGraphAlternative[];
  readonly inputs: Readonly<Record<string, unknown>>;
  readonly config: Readonly<Record<string, unknown>>;
  readonly owner: string;
  readonly skill?: string | null;
  readonly executionMetadata?: SyniqGraphNodeExecutionMetadata;
}

export interface SyniqGraphEdge {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly state: SyniqEdgeState;
  readonly label?: string | null;
  readonly type?: SyniqEdgeType;
}

export interface SyniqConnectedAgent {
  readonly connectionId?: string | null;
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly status: string;
  readonly lastSeen?: string;
}

export interface SyniqGraphState {
  readonly sessionId?: string | null;
  readonly executionId?: string | null;
  readonly status?: SyniqSessionStatus;
  readonly nodes: readonly SyniqGraphNode[];
  readonly edges: readonly SyniqGraphEdge[];
  readonly currentNodeId?: string | null;
  readonly pendingNodeId?: string | null;
  readonly executionPointer?: string | null;
  readonly connectedAgents: readonly SyniqConnectedAgent[];
  readonly constraints: readonly string[];
  readonly mode: SyniqCanvasMode;
  readonly outputs?: Readonly<Record<string, unknown>>;
  readonly errors?: Readonly<Record<string, unknown>>;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export const EMPTY_GRAPH_STATE: SyniqGraphState = {
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
