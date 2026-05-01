import { resetSocketServer } from '../ws/server.js';
resetSocketServer();

import http from 'node:http';
import { io as ioClient } from 'socket.io-client';
import { FlowfexServer, ToolRegistry, Tool, LLMWrapper, Orchestrator } from '../index.js';
import { SessionManager, ConnectionService } from '../connection/index.js';

resetSocketServer();

const registry = new ToolRegistry();
registry.registerTool(new Tool({ id: 'test', name: 'T', description: 'T', prompt: 'T', run: async () => 'ok' }));
const orch = new Orchestrator({ registry, llm: new LLMWrapper() });
const sm = new SessionManager();
const cs = new ConnectionService({ registry, orchestrator: orch, sessionManager: sm });

const server = new FlowfexServer({ host: '127.0.0.1', port: 0, connectionService: cs });
const addr = await server.start();
console.log('Port:', addr.port, 'SocketServer:', !!server.socketServer);

const client = ioClient(`http://127.0.0.1:${addr.port}/session`, {
  query: { sessionId: 'dbg-test' },
  transports: ['websocket'],
  reconnection: false,
});

await new Promise(r => client.on('room:joined', r));
console.log('Room joined on client');

const ns = server.socketServer.session;
const sockets = await ns.fetchSockets();
console.log('Server sockets in namespace:', sockets.length);
for (const s of sockets) {
  console.log('  Socket', s.id, 'rooms:', [...s.rooms]);
}

const eventP = new Promise((resolve, reject) => {
  const t = setTimeout(() => reject('Timeout'), 2000);
  client.on('session:paused', (data) => { clearTimeout(t); resolve(data); });
});

const req = http.request({ hostname: '127.0.0.1', port: addr.port, path: '/session/dbg-test/pause', method: 'POST' }, (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => console.log('HTTP response:', data));
});
req.end();

try {
  const data = await eventP;
  console.log('WS SUCCESS:', JSON.stringify(data));
} catch (e) {
  console.log('WS FAILED:', e);
}

client.disconnect();
server.server.close();
process.exit(0);
