import { DEMO_SESSION_ID, buildConnectPrompt } from '../../store/demoData';

export const codeSnippets = {
  prompt: buildConnectPrompt(DEMO_SESSION_ID).replace('Connect this agent to Flowfex.', 'Connect this session to Flowfex.'),
  
  javascript: `import { FlowfexBridge } from '@flowfex/sdk';

const bridge = new FlowfexBridge({
  sessionId: '${DEMO_SESSION_ID}',
  transport: 'websocket'
});

await bridge.connect({
  agentName: 'CLI Agent',
  source: 'terminal'
});

const resourcePlan = await bridge.requestResources({
  task: 'Prepare a deployment summary',
});

const result = await bridge.runWithResources(resourcePlan, async (ctx) => {
  const output = await ctx.execute('deployment_summary');
  return output;
});

await bridge.complete({ result });`,
  
  python: `from flowfex import FlowfexBridge

bridge = FlowfexBridge(
    session_id='${DEMO_SESSION_ID}',
    transport='websocket'
)

# Connect the agent to Flowfex
await bridge.connect(
    agent_name='CLI Agent',
    source='terminal'
)

resource_plan = await bridge.request_resources(
    task='Prepare a deployment summary'
)

async def run_task(ctx):
    output = await ctx.execute('deployment_summary')
    return output

result = await bridge.run_with_resources(resource_plan, run_task)

await bridge.complete(result=result)`
};
