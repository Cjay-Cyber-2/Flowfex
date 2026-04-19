// Load env vars + register all tools before starting the server
import './init.js';

import { defaultFlowfexServer } from './server/FlowfexServer.js';
import { defaultLLM } from './llm/LLMWrapper.js';

console.log(`[Flowfex] LLM provider: ${defaultLLM.provider} (model: ${defaultLLM.model})`);

const address = await defaultFlowfexServer.start();

if (address && typeof address === 'object') {
  console.log(`[Flowfex] Server listening on http://${address.host}:${address.port}`);
}

