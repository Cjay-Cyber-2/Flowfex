import {
  EMPTY_GRAPH_STATE,
  type FlowfexConnectedAgent,
  type FlowfexGraphEdge,
  type FlowfexGraphNode,
  type FlowfexGraphState,
} from '../../packages/types/graph';

export interface FlowfexSnapshotEvent {
  readonly payload?: unknown;
  readonly createdAt?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

function isConnectedAgents(value: unknown): value is readonly FlowfexConnectedAgent[] {
  return Array.isArray(value) && value.every((entry) => {
    if (!isRecord(entry)) {
      return false;
    }

    return (
      typeof entry.id === 'string'
      && typeof entry.name === 'string'
      && typeof entry.type === 'string'
      && typeof entry.status === 'string'
      && (typeof entry.lastSeen === 'string' || typeof entry.lastSeen === 'undefined')
    );
  });
}

function isGraphNodes(value: unknown): value is readonly FlowfexGraphNode[] {
  return Array.isArray(value) && value.every((entry) => {
    if (!isRecord(entry)) {
      return false;
    }

    return (
      typeof entry.id === 'string'
      && typeof entry.type === 'string'
      && typeof entry.shape === 'string'
      && typeof entry.x === 'number'
      && typeof entry.y === 'number'
      && typeof entry.width === 'number'
      && typeof entry.height === 'number'
      && typeof entry.title === 'string'
      && typeof entry.subtitle === 'string'
      && typeof entry.state === 'string'
      && typeof entry.icon === 'string'
      && typeof entry.confidence === 'number'
      && typeof entry.reasoning === 'string'
      && Array.isArray(entry.alternatives)
      && isRecord(entry.inputs)
      && isRecord(entry.config)
      && typeof entry.owner === 'string'
    );
  });
}

function isGraphEdges(value: unknown): value is readonly FlowfexGraphEdge[] {
  return Array.isArray(value) && value.every((entry) => {
    if (!isRecord(entry)) {
      return false;
    }

    return (
      typeof entry.id === 'string'
      && typeof entry.from === 'string'
      && typeof entry.to === 'string'
      && typeof entry.state === 'string'
      && (typeof entry.label === 'string' || typeof entry.label === 'undefined' || entry.label === null)
      && (typeof entry.type === 'string' || typeof entry.type === 'undefined')
    );
  });
}

export function parseRehydratedGraphState(input: unknown): FlowfexGraphState | null {
  if (!isRecord(input)) {
    return null;
  }

  if (!isGraphNodes(input.nodes) || !isGraphEdges(input.edges)) {
    return null;
  }

  if (!isConnectedAgents(input.connectedAgents)) {
    return null;
  }

  if (!isStringArray(input.constraints)) {
    return null;
  }

  if (typeof input.mode !== 'string') {
    return null;
  }

  return {
    ...EMPTY_GRAPH_STATE,
    ...input,
    nodes: input.nodes,
    edges: input.edges,
    connectedAgents: input.connectedAgents,
    constraints: input.constraints,
    mode: input.mode,
  } as FlowfexGraphState;
}

export function resolveRehydratedGraphState(
  primaryGraphState: unknown,
  snapshots: readonly FlowfexSnapshotEvent[] = []
): FlowfexGraphState {
  const parsedPrimary = parseRehydratedGraphState(primaryGraphState);
  if (parsedPrimary) {
    return parsedPrimary;
  }

  for (const snapshot of snapshots) {
    const parsedSnapshot = parseRehydratedGraphState(snapshot.payload);
    if (parsedSnapshot) {
      return parsedSnapshot;
    }
  }

  return EMPTY_GRAPH_STATE;
}
