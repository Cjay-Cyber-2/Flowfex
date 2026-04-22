"""Flowfex Agent SDK - Connect agents to Flowfex orchestration platform."""

import json
import threading
from typing import Any, Callable, Dict, List, Optional
import requests
import websocket


class FlowfexError(Exception):
    """Flowfex SDK error."""
    def __init__(self, message: str, status_code: int = 500):
        super().__init__(message)
        self.status_code = status_code


class Session:
    """Active Flowfex session."""
    def __init__(self, data: Dict[str, Any]):
        self.id: str = data.get('id', '')
        self.token: str = data.get('token', '')
        self.mode: str = data.get('mode', '')
        self.agent: Optional[Dict] = data.get('agent')
        self.expires_at: str = data.get('expiresAt', '')
        self.endpoints: Dict[str, Any] = data.get('endpoints', {})


class FlowfexClient:
    """
    Flowfex orchestration client.
    
    Usage:
        client = FlowfexClient('http://localhost:4000')
        session = client.connect({'name': 'my-agent'}, mode='sdk')
        result = client.send('Analyze data')
        client.disconnect()
    """
    
    def __init__(self, base_url: str = 'http://127.0.0.1:4000'):
        self.base_url = base_url.rstrip('/')
        self.session: Optional[Session] = None
        self._ws: Optional[websocket.WebSocketApp] = None
        self._ws_thread: Optional[threading.Thread] = None
        self._listeners: Dict[str, List[Callable]] = {}
    
    def connect(
        self,
        agent: Dict[str, Any],
        mode: str = 'sdk',
        prompt: Optional[str] = None,
        capabilities: Optional[List[str]] = None,
        requested_tools: Optional[List[str]] = None,
        api_key: Optional[str] = None,
        ttl_seconds: Optional[int] = None,
    ) -> Session:
        """
        Connect to Flowfex and create a session.
        
        Args:
            agent: Agent configuration with 'name' required
            mode: Connection mode ('prompt', 'sdk', 'link', 'live')
            prompt: Initial prompt (for prompt mode)
            capabilities: List of agent capabilities
            requested_tools: List of tool IDs to use
            api_key: API key for authenticated connections
            ttl_seconds: Session TTL in seconds
            
        Returns:
            Session object with id, token, and endpoints
        """
        payload = {
            'mode': mode,
            'agent': agent,
        }
        if prompt:
            payload['prompt'] = prompt
        if capabilities:
            payload['capabilities'] = capabilities
        if requested_tools:
            payload['requestedTools'] = requested_tools
        if ttl_seconds:
            payload['ttlSeconds'] = ttl_seconds
        
        headers = {'Content-Type': 'application/json'}
        if api_key:
            headers['X-Flowfex-Api-Key'] = api_key
        
        response = requests.post(
            f'{self.base_url}/connect',
            json=payload,
            headers=headers,
        )
        
        if not response.ok:
            error = response.json().get('error', {}).get('message', 'Connection failed')
            raise FlowfexError(error, response.status_code)
        
        data = response.json()
        self.session = Session(data['connection']['session'])
        
        # Auto-connect WebSocket for live/sdk mode
        if mode in ('live', 'sdk'):
            self._connect_ws()
        
        return self.session
    
    def send(self, task: str) -> Dict[str, Any]:
        """
        Send a task for execution.
        
        Args:
            task: Task description or instruction
            
        Returns:
            Execution result with status, output, and trace
        """
        self._require_session()
        
        response = requests.post(
            f'{self.base_url}/ingest',
            json={
                'sessionId': self.session.id,
                'task': task,
            },
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {self.session.token}',
            },
        )
        
        if not response.ok:
            error = response.json().get('error', {}).get('message', 'Execution failed')
            raise FlowfexError(error, response.status_code)
        
        return response.json()
    
    def execute_tool(self, tool_id: str, input_data: Any) -> Dict[str, Any]:
        """
        Execute a specific tool directly.
        
        Args:
            tool_id: Tool identifier
            input_data: Tool input payload
            
        Returns:
            Execution result
        """
        self._require_session()
        
        response = requests.post(
            f'{self.base_url}/sessions/{self.session.id}/execute',
            json={'toolId': tool_id, 'input': input_data},
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {self.session.token}',
            },
        )
        
        if not response.ok:
            raise FlowfexError('Tool execution failed', response.status_code)
        
        return response.json()
    
    def subscribe(self, event: str, handler: Callable[[Dict], None]) -> None:
        """
        Subscribe to real-time events via WebSocket.
        
        Args:
            event: Event name (e.g., 'node:completed')
            handler: Callback function receiving event data
        """
        if event not in self._listeners:
            self._listeners[event] = []
        self._listeners[event].append(handler)
    
    def unsubscribe(self, event: str, handler: Optional[Callable] = None) -> None:
        """Remove event subscription(s)."""
        if handler:
            self._listeners.get(event, []).remove(handler)
        else:
            self._listeners.pop(event, None)
    
    def get_state(self) -> Dict[str, Any]:
        """Get current session snapshot."""
        self._require_session()
        
        response = requests.get(
            f'{self.base_url}/session/{self.session.id}/state',
            headers={'Authorization': f'Bearer {self.session.token}'},
        )
        
        if not response.ok:
            raise FlowfexError('Failed to get session state', response.status_code)
        
        return response.json().get('snapshot', {})
    
    def pause(self) -> None:
        """Pause execution."""
        self._require_session()
        self._control_action('pause')
    
    def resume(self) -> None:
        """Resume execution."""
        self._require_session()
        self._control_action('resume')
    
    def approve(self, node_id: str, note: Optional[str] = None) -> None:
        """
        Approve a node awaiting approval.
        
        Args:
            node_id: Node identifier
            note: Optional approval note
        """
        self._require_session()
        
        response = requests.post(
            f'{self.base_url}/node/{node_id}/approve',
            json={'sessionId': self.session.id, 'note': note},
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {self.session.token}',
            },
        )
        
        if not response.ok:
            raise FlowfexError('Failed to approve node', response.status_code)
    
    def reject(self, node_id: str, reason: Optional[str] = None) -> None:
        """
        Reject a node awaiting approval.
        
        Args:
            node_id: Node identifier
            reason: Optional rejection reason
        """
        self._require_session()
        
        response = requests.post(
            f'{self.base_url}/node/{node_id}/reject',
            json={'sessionId': self.session.id, 'reason': reason},
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {self.session.token}',
            },
        )
        
        if not response.ok:
            raise FlowfexError('Failed to reject node', response.status_code)
    
    def disconnect(self) -> None:
        """Disconnect and cleanup resources."""
        if self._ws:
            self._ws.close()
            self._ws = None
        if self._ws_thread:
            self._ws_thread.join(timeout=1)
            self._ws_thread = None
        self.session = None
        self._listeners.clear()
    
    def _require_session(self) -> None:
        if not self.session:
            raise FlowfexError('Not connected. Call connect() first.', 401)
    
    def _control_action(self, action: str) -> None:
        response = requests.post(
            f'{self.base_url}/session/{self.session.id}/{action}',
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {self.session.token}',
            },
        )
        
        if not response.ok:
            raise FlowfexError(f'Failed to {action} session', response.status_code)
    
    def _connect_ws(self) -> None:
        if self._ws or not self.session:
            return
        
        ws_url = self.base_url.replace('http://', 'ws://').replace('https://', 'wss://')
        ws_url = f'{ws_url}/orchestration?sessionId={self.session.id}'
        
        def on_message(ws, message):
            try:
                data = json.loads(message)
                event_type = data.get('type') or data.get('event')
                if event_type and event_type in self._listeners:
                    for handler in self._listeners[event_type]:
                        handler(data)
            except json.JSONDecodeError:
                pass
        
        def on_error(ws, error):
            pass
        
        self._ws = websocket.WebSocketApp(
            ws_url,
            on_message=on_message,
            on_error=on_error,
        )
        
        self._ws_thread = threading.Thread(target=self._ws.run_forever, daemon=True)
        self._ws_thread.start()


def connect(base_url: str = 'http://127.0.0.1:4000') -> FlowfexClient:
    """Create a Flowfex client instance."""
    return FlowfexClient(base_url)


__all__ = ['FlowfexClient', 'FlowfexError', 'Session', 'connect']
