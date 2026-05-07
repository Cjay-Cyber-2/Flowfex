export interface FlowfexAnonymousLimits {
  readonly maxConnectionsPerDay: 20;
  readonly maxExecutionsPerSession: 5;
  readonly maxNodesPerSession: 25;
  readonly maxSessionDurationMinutes: 30;
  readonly maxConcurrentAgents: 1;
}

export interface FlowfexAuthenticatedLimits {
  readonly maxConnectionsPerDay: 20;
  readonly maxExecutionsPerDay: 50;
  readonly maxNodesPerDay: 500;
  readonly maxSessionDurationMinutes: 480;
  readonly maxConcurrentAgents: 5;
}

export const FLOWFEX_LIMITS = {
  anonymous: {
    maxConnectionsPerDay: 20,
    maxExecutionsPerSession: 5,
    maxNodesPerSession: 25,
    maxSessionDurationMinutes: 30,
    maxConcurrentAgents: 1,
  },
  authenticated: {
    maxConnectionsPerDay: 20,
    maxExecutionsPerDay: 50,
    maxNodesPerDay: 500,
    maxSessionDurationMinutes: 480,
    maxConcurrentAgents: 5,
  },
} as const satisfies {
  readonly anonymous: FlowfexAnonymousLimits;
  readonly authenticated: FlowfexAuthenticatedLimits;
};
