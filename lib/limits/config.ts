export interface FlowfexAnonymousLimits {
  readonly maxConnectionsPerDay: 5;
  readonly maxExecutionsPerSession: 3;
  readonly maxNodesPerSession: 15;
  readonly maxSessionDurationMinutes: 30;
  readonly maxConcurrentAgents: 1;
}

export interface FlowfexAuthenticatedLimits {
  readonly maxConnectionsPerDay: 5;
  readonly maxExecutionsPerDay: 50;
  readonly maxNodesPerDay: 500;
  readonly maxSessionDurationMinutes: 480;
  readonly maxConcurrentAgents: 5;
}

export const FLOWFEX_LIMITS = {
  anonymous: {
    maxConnectionsPerDay: 5,
    maxExecutionsPerSession: 3,
    maxNodesPerSession: 15,
    maxSessionDurationMinutes: 30,
    maxConcurrentAgents: 1,
  },
  authenticated: {
    maxConnectionsPerDay: 5,
    maxExecutionsPerDay: 50,
    maxNodesPerDay: 500,
    maxSessionDurationMinutes: 480,
    maxConcurrentAgents: 5,
  },
} as const satisfies {
  readonly anonymous: FlowfexAnonymousLimits;
  readonly authenticated: FlowfexAuthenticatedLimits;
};
