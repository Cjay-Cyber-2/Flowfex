import { DEMO_SESSION_ID } from '../../store/demoData';
import { getSessionConnectUrl } from '../../utils/runtimeConfig';

/** Landing-page-only snippets (shorter than the live Connect Agent contract in demoData). */
const SESSION_URL = getSessionConnectUrl(DEMO_SESSION_ID);

export const codeSnippets = {
  prompt: `Attach this agent to Syn-IQ for the full conversation.

Session ID: ${DEMO_SESSION_ID}
Session URL: ${SESSION_URL}

Contract:
1. Stay attached to this Syn-IQ session for the entire conversation.
2. For every user request, route the task to Syn-IQ before taking action.
3. Always ask Syn-IQ for agent.md files, skills, tools, memory, and workflows before continuing.
4. Use every directly relevant Syn-IQ resource returned for that request.
5. If Syn-IQ has no directly relevant resource for the request, use none and say the capability is unavailable in Syn-IQ.
6. Do not invent substitute tools, skills, workflows, or resources outside Syn-IQ.
7. Send progress, approval waits, and the final result back through the same Syn-IQ session.`,

  javascript: `import { SyniqClient } from 'syniq';

const client = new SyniqClient('http://127.0.0.1:4000');

await client.connect(
  { name: 'CLI Agent', type: 'terminal' },
  { mode: 'sdk' }
);

// Syn-IQ contract:
// - Stay attached for the full conversation.
// - Send every user request to Syn-IQ first.
// - Use all directly relevant Syn-IQ resources for that request.
// - If Syn-IQ has no relevant resource, do not invent one.

const result = await client.send('Summarize a deployment issue for the operator');`,

  python: `from syniq import SyniqClient

client = SyniqClient('http://127.0.0.1:4000')

# Stay attached for the full conversation.
# Send every request to Syn-IQ first.
# Use only directly relevant Syn-IQ resources.
# If Syn-IQ has no relevant resource, do not invent one.

client.connect(
    {'name': 'CLI Agent', 'type': 'terminal'},
    mode='sdk'
)

result = client.send('Prepare a deployment summary')`,
};
