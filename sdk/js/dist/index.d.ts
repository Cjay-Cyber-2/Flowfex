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
    error?: {
        message: string;
        type: string;
    };
    trace?: ExecutionTrace[];
}
export interface ExecutionTrace {
    nodeId: string;
    toolId: string | null;
    status: string;
    input: unknown;
    output?: unknown;
    error?: {
        message: string;
    };
    durationMs: number;
}
export interface SessionSnapshot {
    sessionId: string;
    status: string;
    revision: number;
    currentNodeId: string | null;
    graph: {
        nodes: unknown[];
        edges: unknown[];
    };
    outputs: Record<string, unknown>;
    errors: Record<string, unknown>;
}
export type EventHandler = (data: unknown) => void;
export declare class FlowfexClient {
    private baseUrl;
    private session;
    private socket;
    private listeners;
    constructor(baseUrl?: string);
    /**
     * Connect to Flowfex and create a session
     */
    connect(agent: AgentConfig, options?: ConnectOptions): Promise<Session>;
    /**
     * Send a task for execution
     */
    send(task: string | object): Promise<ExecutionResult>;
    /**
     * Execute a specific tool
     */
    executeTool(toolId: string, input: unknown): Promise<ExecutionResult>;
    /**
     * Subscribe to real-time events
     */
    subscribe(event: string, handler: EventHandler): () => void;
    /**
     * Get current session state
     */
    getState(): Promise<SessionSnapshot>;
    /**
     * Pause execution
     */
    pause(): Promise<void>;
    /**
     * Resume execution
     */
    resume(): Promise<void>;
    /**
     * Approve a node
     */
    approve(nodeId: string, note?: string): Promise<void>;
    /**
     * Reject a node
     */
    reject(nodeId: string, reason?: string): Promise<void>;
    /**
     * Disconnect and cleanup
     */
    disconnect(): void;
    private _requireSession;
    private _control;
    private _connectSocket;
}
export declare class FlowfexError extends Error {
    statusCode: number;
    constructor(message: string, statusCode: number);
}
export declare function connect(baseUrl?: string): FlowfexClient;
export default FlowfexClient;
//# sourceMappingURL=index.d.ts.map