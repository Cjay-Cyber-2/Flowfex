import { defaultFlowfexServer } from './src/server/FlowfexServer.js';
import './src/init.js';
import http from 'node:http';

async function test() {
  const address = await defaultFlowfexServer.start({ port: 4010 });
  console.log(`Server started on port ${address.port}`);
  
  const req = http.get(`http://localhost:${address.port}/skills`, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      const parsed = JSON.parse(data);
      console.log(`Received ${parsed.tools?.length || 0} tools from API`);
      process.exit(0);
    });
  });
  
  req.on('error', (err) => {
    console.error('Request failed:', err);
    process.exit(1);
  });
}

test();
