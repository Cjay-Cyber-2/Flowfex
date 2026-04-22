/**
 * Example: Using Flowfex SDK with an AI agent
 * 
 * Run: node example.mjs
 */

import { FlowfexClient } from './dist/index.js';

async function main() {
  const client = new FlowfexClient('http://127.0.0.1:4000');

  // 1. Connect your agent
  console.log('Connecting to Flowfex...');
  const session = await client.connect(
    { name: 'example-agent', type: 'assistant' },
    { mode: 'sdk' }
  );
  console.log('Connected! Session:', session.id);

  // 2. Subscribe to real-time events
  const unsub = client.subscribe('node:completed', (data) => {
    console.log('✓ Node completed:', data.nodeId);
  });

  client.subscribe('node:awaiting_approval', async (data) => {
    console.log('⏳ Node awaiting approval:', data.nodeId);
    // Auto-approve for demo
    await client.approve(data.nodeId, 'Auto-approved by example');
  });

  // 3. Send a task
  console.log('\nSending task...');
  const result = await client.send('Summarize the key features of TypeScript');
  console.log('Result:', result.output);

  // 4. Get session state
  const state = await client.getState();
  console.log('Session status:', state.status);

  // 5. Cleanup
  unsub();
  client.disconnect();
  console.log('\nDisconnected.');
}

main().catch(console.error);
