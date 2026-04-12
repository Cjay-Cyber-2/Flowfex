export const codeSnippets = {
  prompt: `Connect this session to Flowfex.

Session ID: session-resource-bridge
Session URL: https://app.flowfex.io/connect/live/session-resource-bridge

Before you act:
1. Ask Flowfex for the best tools, skills, or workflows for this task.
2. Report each selected resource with a short reason.
3. Pause if Flowfex marks a step as approval_required.
4. Return the final result through the same Flowfex session.`,
  
  javascript: `import { FlowfexBridge } from '@flowfex/sdk';

const bridge = new FlowfexBridge({
  sessionId: 'session-resource-bridge',
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
    session_id='session-resource-bridge',
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
