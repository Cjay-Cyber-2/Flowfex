import { io } from 'socket.io-client';
// Main Client
export class FlowfexClient {
    constructor(baseUrl = 'http://127.0.0.1:4000') {
        this.session = null;
        this.socket = null;
        this.listeners = new Map();
        this.baseUrl = baseUrl.replace(/\/+$/, '');
    }
    /**
     * Connect to Flowfex and create a session
     */
    async connect(agent, options = {}) {
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
    async send(task) {
        this._requireSession();
        const response = await fetch(`${this.baseUrl}/ingest`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.session.token}`,
            },
            body: JSON.stringify({
                sessionId: this.session.id,
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
    async executeTool(toolId, input) {
        this._requireSession();
        const response = await fetch(`${this.baseUrl}/sessions/${this.session.id}/execute`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.session.token}`,
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
    subscribe(event, handler) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(handler);
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
    async getState() {
        this._requireSession();
        const response = await fetch(`${this.baseUrl}/session/${this.session.id}/state`, {
            headers: {
                'Authorization': `Bearer ${this.session.token}`,
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
    async pause() {
        this._requireSession();
        await this._control('pause');
    }
    /**
     * Resume execution
     */
    async resume() {
        this._requireSession();
        await this._control('resume');
    }
    /**
     * Approve a node
     */
    async approve(nodeId, note) {
        this._requireSession();
        const response = await fetch(`${this.baseUrl}/node/${nodeId}/approve`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.session.token}`,
            },
            body: JSON.stringify({ sessionId: this.session.id, note }),
        });
        if (!response.ok) {
            throw new FlowfexError('Failed to approve node', response.status);
        }
    }
    /**
     * Reject a node
     */
    async reject(nodeId, reason) {
        this._requireSession();
        const response = await fetch(`${this.baseUrl}/node/${nodeId}/reject`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.session.token}`,
            },
            body: JSON.stringify({ sessionId: this.session.id, reason }),
        });
        if (!response.ok) {
            throw new FlowfexError('Failed to reject node', response.status);
        }
    }
    /**
     * Disconnect and cleanup
     */
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.session = null;
        this.listeners.clear();
    }
    _requireSession() {
        if (!this.session) {
            throw new FlowfexError('Not connected. Call connect() first.', 401);
        }
    }
    async _control(action) {
        const response = await fetch(`${this.baseUrl}/session/${this.session.id}/${action}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.session.token}`,
            },
        });
        if (!response.ok) {
            throw new FlowfexError(`Failed to ${action} session`, response.status);
        }
    }
    _connectSocket() {
        if (this.socket || !this.session)
            return;
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
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.name = 'FlowfexError';
    }
}
// Convenience function
export function connect(baseUrl) {
    return new FlowfexClient(baseUrl);
}
// Default export
export default FlowfexClient;
