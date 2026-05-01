import { getSessionConnectUrl, getSessionSocketUrl } from '../utils/runtimeConfig';

export const DEMO_SESSION_ID = 'session-resource-bridge';

export const DEMO_SKILL_LIBRARY = [
  {
    id: 'reasoning',
    label: 'Reasoning',
    items: [
      { id: 'task-reader', label: 'Task Reader', icon: 'brain' },
      { id: 'resource-router', label: 'Resource Router', icon: 'git-branch' },
      { id: 'match-scorer', label: 'Match Scorer', icon: 'radar' },
      { id: 'risk-check', label: 'Risk Check', icon: 'shield' },
    ],
  },
  {
    id: 'resources',
    label: 'Resources',
    items: [
      { id: 'skill-pull', label: 'Skill Pull', icon: 'sparkles' },
      { id: 'tool-pull', label: 'Tool Pull', icon: 'database' },
      { id: 'memory-pull', label: 'Memory Pull', icon: 'search' },
      { id: 'flow-build', label: 'Flow Build', icon: 'file-text' },
    ],
  },
  {
    id: 'control',
    label: 'Control',
    items: [
      { id: 'approval-gate', label: 'Operator Check', icon: 'shield-check' },
      { id: 'reroute', label: 'Reroute', icon: 'shuffle' },
      { id: 'session-memory', label: 'Session Memory', icon: 'database' },
      { id: 'handoff', label: 'Return Bridge', icon: 'send' },
    ],
  },
];

export const DEMO_HISTORY = [
  {
    id: 'history-evals',
    name: 'CLI Resource Attach',
    task: 'Connected a terminal agent and streamed the first live path',
    elapsed: '18m ago',
    status: 'completed',
  },
  {
    id: 'history-bridge',
    name: 'SDK Bridge Sync',
    task: 'Linked a web app agent to the shared Flowfex session',
    elapsed: '2h ago',
    status: 'completed',
  },
  {
    id: 'history-pipeline',
    name: 'Skill Store Trial',
    task: 'Tested prompt attach with a shared tool and skill catalog',
    elapsed: 'Yesterday',
    status: 'completed',
  },
];

export const CONNECT_METHOD_TABS = [
  { id: 'prompt', label: 'Prompt' },
  { id: 'link', label: 'Link' },
  { id: 'sdk', label: 'SDK' },
  { id: 'live', label: 'Live Channel' },
];

const FLOWFEX_AGENT_RULE_LINES = [
  'Stay attached to this Flowfex session for the entire conversation.',
  'For every user request, route the task to Flowfex before taking action.',
  'Always ask Flowfex for agent.md files, skills, tools, memory, and workflows before continuing.',
  'Use every directly relevant Flowfex resource returned for that request.',
  'If Flowfex has no directly relevant resource for the request, use none and say the capability is unavailable in Flowfex.',
  'Do not invent substitute tools, skills, workflows, or resources outside Flowfex.',
  'Send progress, approval waits, and the final result back through the same Flowfex session.',
];

export function buildConnectPrompt(sessionId = DEMO_SESSION_ID) {
  const rules = FLOWFEX_AGENT_RULE_LINES.map((rule, index) => `${index + 1}. ${rule}`).join('\n');
  return `Attach this agent to Flowfex for the full conversation.

Session ID: ${sessionId}
Session URL: ${getSessionConnectUrl(sessionId)}

Contract:
${rules}`;
}

export function buildConnectLink(sessionId = DEMO_SESSION_ID) {
  return getSessionConnectUrl(sessionId);
}

export function buildConnectSdkSnippet(sessionId = DEMO_SESSION_ID) {
  return `import { FlowfexClient } from 'flowfex';

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

const result = await client.send('Summarize a deployment issue for the operator');`;
}

export function buildConnectLiveSnippet(sessionId = DEMO_SESSION_ID) {
  return `${getSessionSocketUrl(sessionId)}
channel: live
session_scope: full_conversation
routing_mode: flowfex_first
resource_policy: use_all_directly_relevant
no_match_policy: use_none
approval_mode: supervised`;
}

export const CONNECT_PROMPT = buildConnectPrompt();

export const CONNECT_LINK = buildConnectLink();

export const CONNECT_SDK_SNIPPET = buildConnectSdkSnippet();

export const CONNECT_LIVE_SNIPPET = buildConnectLiveSnippet();

const FALLBACK_AGENT_POOL = [
  {
    id: 'agent-ide',
    name: 'VS Code Bridge',
    type: 'IDE',
    status: 'connected',
    lastSeen: 'Live now',
  },
  {
    id: 'agent-research',
    name: 'Research Relay',
    type: 'Live',
    status: 'connected',
    lastSeen: '3s ago',
  },
];

function normalizeAgent(agent, index) {
  return {
    id: agent.id || `agent-${index + 1}`,
    name: agent.name || `Connected Agent ${index + 1}`,
    type: String(agent.type || 'Prompt').toUpperCase(),
    status: agent.status || 'connected',
    lastSeen: agent.lastSeen || 'Live now',
  };
}

function buildAlternatives(primary, secondary) {
  return [
    {
      name: primary,
      reason: 'Lower match for the current task.',
      confidence: 71,
    },
    {
      name: secondary,
      reason: 'Adds more overhead without improving visibility.',
      confidence: 64,
    },
  ];
}

function buildNodes() {
  return [
    {
      id: 'agent-intake',
      type: 'input',
      shape: 'rect',
      x: 180,
      y: 280,
      width: 176,
      height: 92,
      title: 'Agent Attach',
      subtitle: 'session opened',
      state: 'completed',
      icon: 'sparkles',
      confidence: 98,
      reasoning: 'Flowfex registered the connected agent, the incoming task, and the session mode before building the flow.',
      alternatives: buildAlternatives('Passive Logging', 'Direct agent execution'),
      inputs: {
        task: 'Connect an agent, pull the right resources, and stream the run live.',
        source: 'CLI Bridge',
        mode: 'Prompt attach',
      },
      config: {
        policy: 'Supervised execution',
        timeout: '45s',
        transport: 'Session bridge',
      },
      owner: 'Bridge Runtime',
    },
    {
      id: 'intent-planner',
      type: 'analysis',
      shape: 'rect',
      x: 450,
      y: 280,
      width: 196,
      height: 96,
      title: 'Task Read',
      subtitle: 'goal + limits',
      state: 'completed',
      icon: 'brain',
      confidence: 94,
      reasoning: 'Flowfex broke the request into resource discovery, flow building, operator check, and return steps.',
      alternatives: buildAlternatives('Loose prompt parse', 'Static workflow'),
      inputs: {
        taskType: 'Agent bridge session',
        approvalGate: 'Enabled',
        output: 'Structured return payload',
      },
      config: {
        planner: 'Layered reasoning',
        retries: '2',
        visibility: 'Full trace',
      },
      owner: 'Reasoning Core',
    },
    {
      id: 'route-decision',
      type: 'decision',
      shape: 'diamond',
      x: 770,
      y: 300,
      width: 118,
      height: 118,
      title: 'Resource Match',
      subtitle: 'pick best lane',
      state: 'completed',
      icon: 'git-branch',
      confidence: 88,
      reasoning: 'Flowfex chose the strongest resource lane for this task before execution moved forward.',
      alternatives: [
        {
          name: 'Broad tool dump',
          reason: 'Would overwhelm the agent with too many options.',
          confidence: 69,
        },
        {
          name: 'Agent-only execution',
          reason: 'Skips the shared Flowfex resource layer.',
          confidence: 42,
        },
      ],
      inputs: {
        freshness: 'Medium',
        risk: 'Moderate',
        branchCount: '2',
      },
      config: {
        branchLabels: 'Skill pull / fallback lane',
        routingBias: 'Best match first',
        manualOverride: 'Enabled',
      },
      owner: 'Flow Router',
    },
    {
      id: 'web-research',
      type: 'tool',
      shape: 'rect',
      x: 1010,
      y: 110,
      width: 198,
      height: 96,
      title: 'Skill Pull',
      subtitle: 'best skills loaded',
      state: 'completed',
      icon: 'globe',
      confidence: 91,
      reasoning: 'Flowfex pulled the most relevant skills for the current task and ranked them before execution.',
      alternatives: buildAlternatives('Full catalog dump', 'Manual skill pick'),
      inputs: {
        sources: 'Shared skill catalog',
        freshnessWindow: 'Current session',
        ranking: 'Match score + constraints',
      },
      config: {
        sourceCap: '6',
        fallback: 'manual override',
        citationMode: 'off',
      },
      owner: 'Resource Layer',
    },
    {
      id: 'policy-scan',
      type: 'tool',
      shape: 'rect',
      x: 1010,
      y: 440,
      width: 210,
      height: 96,
      title: 'Fallback Tool Lane',
      subtitle: 'ready if needed',
      state: 'idle',
      icon: 'shield',
      confidence: 76,
      reasoning: 'This lane stays dim until Flowfex decides the agent needs extra tools beyond the primary skill pull.',
      alternatives: buildAlternatives('Broad fallback lane', 'No fallback lane'),
      inputs: {
        trigger: 'Low confidence on primary pull',
        reviewer: 'Operator aware',
        notes: 'Open only when the match score drops',
      },
      config: {
        escalation: 'Visible reroute',
        maxDelay: '5 min',
        traceRetention: 'On',
      },
      owner: 'Tool Router',
    },
    {
      id: 'evidence-merge',
      type: 'analysis',
      shape: 'rect',
      x: 1300,
      y: 280,
      width: 220,
      height: 100,
      title: 'Flow Build',
      subtitle: 'steps chained live',
      state: 'completed',
      icon: 'layers',
      confidence: 89,
      reasoning: 'Flowfex chained the selected resources into an execution path and kept the state readable for the operator.',
      alternatives: buildAlternatives('Single-step run', 'Static path'),
      inputs: {
        sourceCount: '4 resources selected',
        conflicts: 'No route conflict',
        citations: 'Not required',
      },
      config: {
        synthesis: 'Structured flow',
        citationGuard: 'Off',
        style: 'Operator readable',
      },
      owner: 'Merge Engine',
    },
    {
      id: 'approval-gate',
      type: 'approval',
      shape: 'rect',
      x: 1600,
      y: 280,
      width: 220,
      height: 104,
      title: 'Operator Check',
      subtitle: 'approval requested',
      state: 'approval',
      icon: 'shield-check',
      confidence: 84,
      reasoning: 'Flowfex paused here because the next step uses pulled resources in a high-impact action and the user can guide the path before it continues.',
      alternatives: [
        {
          name: 'Continue automatically',
          reason: 'Faster, but removes a useful supervision point.',
          confidence: 58,
        },
        {
          name: 'Widen the search',
          reason: 'Adds more resources when the current plan is already strong.',
          confidence: 46,
        },
      ],
      inputs: {
        policy: 'Supervised execution',
        risk: 'Medium',
        pendingAction: 'Approve the next step or reroute the flow',
      },
      config: {
        approver: 'Session owner',
        retryWindow: '90s',
        notification: 'Inline + pulse strip',
      },
      owner: 'Governance Layer',
      risks: ['The next step uses external resources.', 'The connected agent will follow this decision immediately.'],
    },
    {
      id: 'response-compose',
      type: 'output',
      shape: 'rect',
      x: 1910,
      y: 160,
      width: 210,
      height: 96,
      title: 'Response Bridge',
      subtitle: 'queued for return',
      state: 'queued',
      icon: 'file-text',
      confidence: 87,
      reasoning: 'Once approved, Flowfex will package the result and send the next structured step back through the session bridge.',
      alternatives: buildAlternatives('Plain text only', 'Silent return'),
      inputs: {
        target: 'Connected agent',
        format: 'Structured payload',
        citations: 'Not used',
      },
      config: {
        tone: 'Clear',
        includeSummary: 'Yes',
        includeActions: 'Yes',
      },
      owner: 'Output Surface',
    },
    {
      id: 'manual-review',
      type: 'tool',
      shape: 'rect',
      x: 1910,
      y: 400,
      width: 220,
      height: 96,
      title: 'Reroute',
      subtitle: 'change path with notes',
      state: 'idle',
      icon: 'message-square',
      confidence: 82,
      reasoning: 'This node activates when the operator wants Flowfex to try a different path without restarting the session.',
      alternatives: buildAlternatives('Hard stop', 'Full restart'),
      inputs: {
        lane: 'Manual reroute',
        expectedOutput: 'Operator notes + revised resource path',
      },
      config: {
        owner: 'Session operator',
        waitMode: 'Interactive',
        preserveTrace: 'Yes',
      },
      owner: 'Operator Surface',
    },
    {
      id: 'publish-brief',
      type: 'completion',
      shape: 'rect',
      x: 2210,
      y: 280,
      width: 176,
      height: 88,
      title: 'Return to Agent',
      subtitle: 'pending final handoff',
      state: 'idle',
      icon: 'send',
      confidence: 0,
      reasoning: 'The final handoff stays cold until the response bridge resolves.',
      alternatives: buildAlternatives('Save draft only', 'Return to sandbox'),
      inputs: {
        channel: 'Session bridge',
        delivery: 'Live feed',
      },
      config: {
        mode: 'Manual confirm',
        auditTrail: 'Enabled',
      },
      owner: 'Bridge Runtime',
    },
  ];
}

function buildEdges() {
  return [
    { id: 'edge-intake-plan', from: 'agent-intake', to: 'intent-planner', state: 'completed' },
    { id: 'edge-plan-route', from: 'intent-planner', to: 'route-decision', state: 'completed' },
    { id: 'edge-route-web', from: 'route-decision', to: 'web-research', state: 'completed', label: 'skill pull' },
    { id: 'edge-route-policy', from: 'route-decision', to: 'policy-scan', state: 'inactive', label: 'fallback lane' },
    { id: 'edge-web-merge', from: 'web-research', to: 'evidence-merge', state: 'completed' },
    { id: 'edge-policy-merge', from: 'policy-scan', to: 'evidence-merge', state: 'inactive' },
    { id: 'edge-merge-approval', from: 'evidence-merge', to: 'approval-gate', state: 'active' },
    { id: 'edge-approval-compose', from: 'approval-gate', to: 'response-compose', state: 'queued', label: 'approved' },
    { id: 'edge-approval-reroute', from: 'approval-gate', to: 'manual-review', state: 'rerouted', label: 'reroute' },
    { id: 'edge-compose-publish', from: 'response-compose', to: 'publish-brief', state: 'inactive' },
    { id: 'edge-review-publish', from: 'manual-review', to: 'publish-brief', state: 'inactive' },
  ];
}

function buildSessions(connectedAgents) {
  return [
    {
      id: DEMO_SESSION_ID,
      name: 'Universal Agent Bridge',
      task: 'Connect an agent, pull the right resources, and supervise the flow live',
      heartbeat: connectedAgents.length
        ? 'Waiting on operator check'
        : 'Waiting for agent connection',
      status: connectedAgents.length ? 'live' : 'waiting',
      elapsed: 'Just now',
    },
    ...DEMO_HISTORY,
  ];
}

function buildActiveSession(connectedAgents) {
  const [activeSession] = buildSessions(connectedAgents);
  return activeSession;
}

function deriveApprovalQueue(nodes) {
  return nodes
    .filter((node) => node.state === 'approval')
    .map((node) => ({
      id: node.id,
      title: node.title,
      type: node.type,
      timestamp: Date.now() - 22000,
      confidence: (node.confidence || 0) / 100,
      reasoning: node.reasoning,
      alternatives: node.alternatives?.map((item) => item.name) || [],
      risks: node.risks || [],
    }));
}

export function buildDemoWorkspace(existingAgents = []) {
  const connectedAgents = (existingAgents.length ? existingAgents : FALLBACK_AGENT_POOL).map(normalizeAgent);
  const nodes = buildNodes();
  const edges = buildEdges();

  return {
    connectedAgents,
    sessions: buildSessions(connectedAgents),
    activeSession: buildActiveSession(connectedAgents),
    nodes,
    edges,
    approvalQueue: deriveApprovalQueue(nodes),
    selectedNodeId: 'approval-gate',
  };
}

export function buildApprovalQueue(nodes) {
  return deriveApprovalQueue(nodes);
}
