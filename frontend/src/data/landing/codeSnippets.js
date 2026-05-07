import { DEMO_SESSION_ID } from '../../store/demoData';
import { getSessionConnectUrl } from '../../utils/runtimeConfig';

/** Landing-page-only snippets (shorter than the live Connect Agent contract in demoData). */
const SESSION_URL = getSessionConnectUrl(DEMO_SESSION_ID);

export const codeSnippets = {
  prompt: `Attach this agent to Flowfex for the full conversation.

Session ID: ${DEMO_SESSION_ID}
Session URL: ${SESSION_URL}

Contract:
1. Stay attached to this Flowfex session for the entire conversation.
2. For every user request, route the task to Flowfex before taking action.
3. Always ask Flowfex for agent.md files, skills, tools, memory, and workflows before continuing.
4. Use every directly relevant Flowfex resource returned for that request.
5. If Flowfex has no directly relevant resource for the request, use none and say the capability is unavailable in Flowfex.
6. Do not invent substitute tools, skills, workflows, or resources outside Flowfex.
7. Send progress, approval waits, and the final result back through the same Flowfex session.`,

  javascript: `import { FlowfexClient } from 'flowfex';

const client = new FlowfexClient('http://127.0.0.1:4000');

await client.connect(
  { name: 'CLI Agent', type: 'terminal' },
  { mode: 'sdk' }
);

// Flowfex contract:
// - Stay attached for the full conversation.
// - Send every user request to Flowfex first.
// - Use all directly relevant Flowfex resources for that request.
// - If Flowfex has no relevant resource, do not invent one.

const result = await client.send('Summarize a deployment issue for the operator');`,

  python: `from flowfex import FlowfexClient

client = FlowfexClient('http://127.0.0.1:4000')

# Stay attached for the full conversation.
# Send every request to Flowfex first.
# Use only directly relevant Flowfex resources.
# If Flowfex has no relevant resource, do not invent one.

client.connect(
    {'name': 'CLI Agent', 'type': 'terminal'},
    mode='sdk'
)

result = client.send('Prepare a deployment summary')`,
};
