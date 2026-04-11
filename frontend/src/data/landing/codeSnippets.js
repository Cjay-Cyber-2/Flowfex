export const codeSnippets = {
  prompt: `You are connected to Flowfex orchestration.

When you need approval for a decision:
1. Explain your reasoning
2. List alternatives you considered
3. Wait for operator approval

All your actions will be visible in the live graph.`,
  
  javascript: `import { Flowfex } from '@flowfex/sdk';

const flowfex = new Flowfex({
  apiKey: process.env.FLOWFEX_API_KEY
});

// Connect your agent
await flowfex.connect({
  name: 'My Agent',
  mode: 'live'
});

// Start orchestration
await flowfex.orchestrate(async (ctx) => {
  const result = await ctx.execute('analyze', data);
  return result;
});`,
  
  python: `from flowfex import Flowfex

flowfex = Flowfex(
    api_key=os.getenv('FLOWFEX_API_KEY')
)

# Connect your agent
await flowfex.connect(
    name='My Agent',
    mode='live'
)

# Start orchestration
async def orchestrate(ctx):
    result = await ctx.execute('analyze', data)
    return result

await flowfex.orchestrate(orchestrate)`
};
