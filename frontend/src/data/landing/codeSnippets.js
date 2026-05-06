import { DEMO_SESSION_ID, buildConnectPrompt, buildConnectSdkSnippet } from '../../store/demoData';

export const codeSnippets = {
  prompt: buildConnectPrompt(DEMO_SESSION_ID).replace('Attach this agent to Flowfex for the full conversation.', 'Attach this session to Flowfex for the full conversation.'),
  
  javascript: buildConnectSdkSnippet(DEMO_SESSION_ID).replace(
    'Summarize a deployment issue for the operator',
    'Prepare a deployment summary'
  ),
  
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

result = client.send('Prepare a deployment summary')`
};
