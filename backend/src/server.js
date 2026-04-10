import { defaultFlowfexServer } from './server/FlowfexServer.js';

const address = await defaultFlowfexServer.start();

if (address && typeof address === 'object') {
  console.log(`Flowfex server listening on http://${address.host}:${address.port}`);
}
