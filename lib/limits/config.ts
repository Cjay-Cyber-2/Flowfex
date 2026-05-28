export interface SyniqAnonymousLimits {
  readonly maxConnectionsPerDay: 20;
  readonly maxExecutionsPerSession: 15;
  readonly maxNodesPerSession: 50;
  readonly maxSessionDurationMinutes: 60;
  readonly maxConcurrentAgents: 1;
}

export interface SyniqAuthenticatedLimits {
  readonly maxConnectionsPerDay: 20;
  readonly maxExecutionsPerDay: 15;
  readonly maxNodesPerDay: 100;
  readonly maxSessionDurationMinutes: 480;
  readonly maxConcurrentAgents: 5;
}

export const SYNIQ_LIMITS = {
  anonymous: {
    maxConnectionsPerDay: 20,
    maxExecutionsPerSession: 15,
    maxNodesPerSession: 50,
    maxSessionDurationMinutes: 60,
    maxConcurrentAgents: 1,
  },
  authenticated: {
    maxConnectionsPerDay: 20,
    maxExecutionsPerDay: 15,
    maxNodesPerDay: 100,
    maxSessionDurationMinutes: 480,
    maxConcurrentAgents: 5,
  },
} as const satisfies {
  readonly anonymous: SyniqAnonymousLimits;
  readonly authenticated: SyniqAuthenticatedLimits;
};
