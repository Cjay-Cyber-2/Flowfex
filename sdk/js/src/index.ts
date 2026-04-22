import { io, Socket } from 'socket.io-client';

// Types
export interface AgentConfig {
  id?: string;
  name: string;
  type?: string;
  version?: string;
}

export interface ConnectOptions {
  baseUrl?: string;
  mode?: 'prompt' | 'sdk' | 'link' | 'live';
  prompt?: string;
  capabilities?: string[];
  requestedTools?: string[];
  apiKey?: string;
  ttlSeconds?: number;
}

export interface Session {
  id: string;
  token: string;
  mode: string;
  agent: AgentConfig | null;
  expiresAt: string;
  endpoints: {
    execute: string;
    ingest: string;
    state: string;
    stream: string;
    control: {
      pause: string;
      resume: string;
      constrain: string;
    };
  };
}

export interface ExecutionResult {
  executionId: string;
  status: 'success' | 'error' | 'paused' | 'awaiting_approval';
  output?: unknown;
  error?: { message: string; type: string };
  trace?: ExecutionTrace[];
}

export interface ExecutionTrace {
  nodeId: string;
  toolId: string | null;
  status: string;
  input: unknown;
  output?: unknown;
  error?: { message: string };
  durationMs: number;
}

export interface SessionSnapshot {
  sessionId: string;
  status: string;
  revision: number;
  currentNodeId: string | null;
  graph: { nodes: unknown[]; edges: unknown[] };
  outputs: Record<string, unknown>;
  errors: Record<string, unknown>;
}

export type EventHandler = (data: unknown) => void;

// Main Client
export class FlowfexClient {
  private baseUrl: string;
  private session: Session | null = null;
  private socket: Socket | null = null;
  private listeners: Map<string, Set<EventHandler>> = new Map();

  constructor(baseUrl: string = 'http://127.0.0.1:4000') {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  /**
   * Connect to Flowfex and create a session
   */
  async connect(agent: AgentConfig, options: ConnectOptions = {}): Promise<Session> {
    const url = options.baseUrl || this.baseUrl;
    const mode = options.mode || 'sdk';

    const response = await fetch(`${url}/connect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(options.apiKey ? { 'X-Flowfex-Api-Key': options.apiKey } : {}),
      },
      body: JSON.stringify({
        mode,
        agent,
        prompt: options.prompt,
        capabilities: options.capabilities,
        requestedTools: options.requestedTools,
        ttlSeconds: options.ttlSeconds,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Connection failed' }));
      throw new FlowfexError(error.message || 'Connection failed', response.status);
    }

    const data = await response.json();
    this.session = data.connection.session;
    this.baseUrl = url;

    // Auto-connect WebSocket for live mode
    if (mode === 'live' || mode === 'sdk') {
      this._connectSocket();
    }

    return this.session;
  }

  /**
   * Send a task for execution
   */
  async send(task: string | object): Promise<ExecutionResult> {
    this._requireSession();

    const response = await fetch(`${this.baseUrl}/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.session!.token}`,
      },
      body: JSON.stringify({
        sessionId: this.session!.id,
        task: typeof task === 'string' ? task : JSON.stringify(task),
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Execution failed' }));
      throw new FlowfexError(error.message || 'Execution failed', response.status);
    }

    return response.json();
  }

  /**
   * Execute a specific tool
   */
  async executeTool(toolId: string, input: unknown): Promise<ExecutionResult> {
    this._requireSession();

    const response = await fetch(`${this.baseUrl}/sessions/${this.session!.id}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.session!.token}`,
      },
      body: JSON.stringify({ toolId, input }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Tool execution failed' }));
      throw new FlowfexError(error.message || 'Tool execution failed', response.status);
    }

    return response.json();
  }

  /**
   * Subscribe to real-time events
   */
  subscribe(event: string, handler: EventHandler): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);

    if (this.socket) {
      this.socket.on(event, handler);
    }

    return () => {
      this.listeners.get(event)?.delete(handler);
      this.socket?.off(event, handler);
    };
  }

  /**
   * Get current session state
   */
  async getState(): Promise<SessionSnapshot> {
    this._requireSession();

    const response = await fetch(`${this.baseUrl}/session/${this.session!.id}/state`, {
      headers: {
        'Authorization': `Bearer ${this.session!.token}`,
      },
    });

    if (!response.ok) {
      throw new FlowfexError('Failed to get session state', response.status);
    }

    const data = await response.json();
    return data.snapshot;
  }

  /**
   * Pause execution
   */
  async pause(): Promise<void> {
    this._requireSession();
    await this._control('pause');
  }

  /**
   * Resume execution
   */
  async resume(): Promise<void> {
    this._requireSession();
    await this._control('resume');
  }

  /**
   * Approve a node
   */
  async approve(nodeId: string, note?: string): Promise<void> {
    this._requireSession();

    const response = await fetch(`${this.baseUrl}/node/${nodeId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.session!.token}`,
      },
      body: JSON.stringify({ sessionId: this.session!.id, note }),
    });

    if (!response.ok) {
      throw new FlowfexError('Failed to approve node', response.status);
    }
  }

  /**
   * Reject a node
   */
  async reject(nodeId: string, reason?: string): Promise<void> {
    this._requireSession();

    const response = await fetch(`${this.baseUrl}/node/${nodeId}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.session!.token}`,
      },
      body: JSON.stringify({ sessionId: this.session!.id, reason }),
    });

    if (!response.ok) {
      throw new FlowfexError('Failed to reject node', response.status);
    }
  }

  /**
   * Disconnect and cleanup
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.session = null;
    this.listeners.clear();
  }

  private _requireSession(): void {
    if (!this.session) {
      throw new FlowfexError('Not connected. Call connect() first.', 401);
    }
  }

  private async _control(action: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/session/${this.session!.id}/${action}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.session!.token}`,
      },
    });

    if (!response.ok) {
      throw new FlowfexError(`Failed to ${action} session`, response.status);
    }
  }

  private _connectSocket(): void {
    if (this.socket || !this.session) return;

    this.socket = io(`${this.baseUrl}/orchestration`, {
      query: { sessionId: this.session.id },
      transports: ['websocket'],
    });

    // Rebind existing listeners
    for (const [event, handlers] of this.listeners) {
      for (const handler of handlers) {
        this.socket.on(event, handler);
      }
    }
  }
}

// Error class
export class FlowfexError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message);
    this.name = 'FlowfexError';
  }
}

// Convenience function
export function connect(baseUrl?: string): FlowfexClient {
  return new FlowfexClient(baseUrl);
}

// Default export
export default FlowfexClient;
