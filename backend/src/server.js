// Load env vars + register all tools before starting the server
import './init.js';

import { defaultSyniqServer } from './server/SyniqServer.js';
import { defaultLLM } from './llm/LLMWrapper.js';

console.log(`[Syniq] LLM provider: ${defaultLLM.provider} (model: ${defaultLLM.model})`);

const address = await defaultSyniqServer.start();

if (address && typeof address === 'object') {
  console.log(`[Syniq] Server listening on http://${address.host}:${address.port}`);
}

