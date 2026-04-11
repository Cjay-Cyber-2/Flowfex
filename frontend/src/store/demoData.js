export const DEMO_SESSION_ID = 'session-launch-intelligence-pulse';

export const DEMO_SKILL_LIBRARY = [
  {
    id: 'reasoning',
    label: 'Reasoning',
    items: [
      { id: 'intent-planner', label: 'Intent Planner', icon: 'brain' },
      { id: 'tool-router', label: 'Tool Router', icon: 'git-branch' },
      { id: 'confidence-scorer', label: 'Confidence Scorer', icon: 'radar' },
      { id: 'risk-estimator', label: 'Risk Estimator', icon: 'shield' },
    ],
  },
  {
    id: 'research',
    label: 'Research',
    items: [
      { id: 'web-research', label: 'Web Research', icon: 'globe' },
      { id: 'source-ranker', label: 'Source Ranker', icon: 'search' },
      { id: 'entity-extractor', label: 'Entity Extractor', icon: 'sparkles' },
      { id: 'brief-generator', label: 'Brief Generator', icon: 'file-text' },
    ],
  },
  {
    id: 'control',
    label: 'Control',
    items: [
      { id: 'approval-gate', label: 'Approval Gate', icon: 'shield-check' },
      { id: 'reroute', label: 'Reroute', icon: 'shuffle' },
      { id: 'session-memory', label: 'Session Memory', icon: 'database' },
      { id: 'publish', label: 'Publish', icon: 'send' },
    ],
  },
];

export const DEMO_HISTORY = [
  {
    id: 'history-evals',
    name: 'Risk Triage Sweep',
    task: 'Review flagged agent actions before release',
    elapsed: '18m ago',
    status: 'completed',
  },
  {
    id: 'history-bridge',
    name: 'SDK Agent Handshake',
    task: 'Connected a staging SDK agent to Flowfex',
    elapsed: '2h ago',
    status: 'completed',
  },
  {
    id: 'history-pipeline',
    name: 'Launch Notes Draft',
    task: 'Summarize launch notes and publish internal brief',
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

export const CONNECT_PROMPT = `You are connected to Flowfex, a visual orchestration layer for live AI execution.

For every meaningful step, emit structured progress:

STEP: <short step label>
NODE: <tool or reasoning node>
STATUS: <queued|running|awaiting_approval|completed|skipped>
WHY: <one sentence rationale>

Flowfex will map the execution path, highlight the active edge, and wait for approval on guarded steps.`;

export const CONNECT_LINK = 'https://app.flowfex.io/connect/live/session-launch-intelligence-pulse';

export const CONNECT_SDK_SNIPPET = `import { FlowfexBridge } from 'flowfex-sdk';

const bridge = new FlowfexBridge({
  sessionId: 'session-launch-intelligence-pulse',
  transport: 'websocket',
});

await bridge.connect();`;

export const CONNECT_LIVE_SNIPPET = `wss://app.flowfex.io/ws/session-launch-intelligence-pulse
channel: live
approval_mode: guarded`;

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
      reason: 'Lower confidence on current task shape.',
      confidence: 71,
    },
    {
      name: secondary,
      reason: 'Would add latency without improving traceability.',
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
      title: 'Agent Intake',
      subtitle: 'task received',
      state: 'completed',
      icon: 'sparkles',
      confidence: 98,
      reasoning: 'Flowfex captured the incoming task, source agent, and execution mode before planning the graph.',
      alternatives: buildAlternatives('Passive Logging', 'Unstructured Event Trace'),
      inputs: {
        task: 'Research and summarize the latest AI model launches with approval before publish.',
        source: 'VS Code Bridge',
        mode: 'Live',
      },
      config: {
        policy: 'Guarded publish',
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
      title: 'Intent Planner',
      subtitle: 'scope + success criteria',
      state: 'completed',
      icon: 'brain',
      confidence: 94,
      reasoning: 'The planner decomposed the request into source discovery, synthesis, approval, and publish stages.',
      alternatives: buildAlternatives('Prompt Heuristic', 'Static Workflow'),
      inputs: {
        taskType: 'Research synthesis',
        approvalGate: 'Required',
        output: 'Internal launch brief',
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
      title: 'Route Decision',
      subtitle: 'pick research lane',
      state: 'completed',
      icon: 'git-branch',
      confidence: 88,
      reasoning: 'Flowfex selected the external research lane because freshness mattered more than local-only speed.',
      alternatives: [
        {
          name: 'Cached internal notes',
          reason: 'Fast, but stale for a latest-news task.',
          confidence: 69,
        },
        {
          name: 'Code-only analysis',
          reason: 'No access to live model release context.',
          confidence: 42,
        },
      ],
      inputs: {
        freshness: 'High',
        risk: 'Moderate',
        branchCount: '2',
      },
      config: {
        branchLabels: 'Fresh web / fallback review',
        routingBias: 'Explainability first',
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
      title: 'Web Research',
      subtitle: 'fresh source sweep',
      state: 'completed',
      icon: 'globe',
      confidence: 91,
      reasoning: 'The research lane fetched current launch material and ranked sources before synthesis.',
      alternatives: buildAlternatives('RSS Snapshot', 'Internal Changelog'),
      inputs: {
        sources: 'Vendor blogs, release pages, announcements',
        freshnessWindow: '7 days',
        ranking: 'Authority + recency',
      },
      config: {
        sourceCap: '6',
        fallback: 'manual review',
        citationMode: 'strict',
      },
      owner: 'Research Relay',
    },
    {
      id: 'policy-scan',
      type: 'tool',
      shape: 'rect',
      x: 1010,
      y: 440,
      width: 210,
      height: 96,
      title: 'Policy Scan',
      subtitle: 'inactive governance lane',
      state: 'idle',
      icon: 'shield',
      confidence: 76,
      reasoning: 'This governance branch stays dim until the router chooses a higher-risk handling strategy.',
      alternatives: buildAlternatives('Auto publish', 'Silent retry'),
      inputs: {
        trigger: 'High-risk route from planner',
        reviewer: 'Governance lane',
        notes: 'Escalate only if risk score spikes',
      },
      config: {
        escalation: 'Operator review',
        maxDelay: '5 min',
        traceRetention: 'On',
      },
      owner: 'Governance Layer',
    },
    {
      id: 'evidence-merge',
      type: 'analysis',
      shape: 'rect',
      x: 1300,
      y: 280,
      width: 220,
      height: 100,
      title: 'Evidence Merge',
      subtitle: 'synthesis + conflict check',
      state: 'completed',
      icon: 'layers',
      confidence: 89,
      reasoning: 'Flowfex merged ranked sources, collapsed duplicates, and isolated unsupported claims before publish.',
      alternatives: buildAlternatives('Direct summarizer', 'Raw source dump'),
      inputs: {
        sourceCount: '4',
        conflicts: '1 minor discrepancy resolved',
        citations: 'Attached',
      },
      config: {
        synthesis: 'Balanced',
        citationGuard: 'Required',
        style: 'Executive brief',
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
      title: 'Approval Gate',
      subtitle: 'awaiting operator decision',
      state: 'approval',
      icon: 'shield-check',
      confidence: 84,
      reasoning: 'Publishing is guarded because the final brief includes claims sourced from live research and needs operator confirmation.',
      alternatives: [
        {
          name: 'Auto publish',
          reason: 'Faster, but violates guarded publish policy.',
          confidence: 58,
        },
        {
          name: 'Pause entire session',
          reason: 'Too disruptive for a single release checkpoint.',
          confidence: 46,
        },
      ],
      inputs: {
        policy: 'Guarded publish',
        risk: 'Medium',
        pendingAction: 'Approve publish or reroute to manual review',
      },
      config: {
        approver: 'Session owner',
        retryWindow: '90s',
        notification: 'Inline + pulse strip',
      },
      owner: 'Governance Layer',
      risks: ['One claim depends on a newly published source.', 'Publish action will notify connected agent.'],
    },
    {
      id: 'response-compose',
      type: 'output',
      shape: 'rect',
      x: 1910,
      y: 160,
      width: 210,
      height: 96,
      title: 'Response Compose',
      subtitle: 'queued for publish',
      state: 'queued',
      icon: 'file-text',
      confidence: 87,
      reasoning: 'Once approved, the response composer will format the final brief and preserve citations in the outgoing payload.',
      alternatives: buildAlternatives('Plain text output', 'Minimal changelog'),
      inputs: {
        target: 'Operator brief',
        format: 'Markdown',
        citations: 'Inline',
      },
      config: {
        tone: 'Concise',
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
      title: 'Manual Review',
      subtitle: 'reroute with operator notes',
      state: 'idle',
      icon: 'message-square',
      confidence: 82,
      reasoning: 'This node activates when the publish gate is rejected and the flow needs guided operator input.',
      alternatives: buildAlternatives('Hard stop', 'Full restart'),
      inputs: {
        lane: 'Manual reroute',
        expectedOutput: 'Operator notes + safe publish path',
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
      title: 'Publish Brief',
      subtitle: 'pending final handoff',
      state: 'idle',
      icon: 'send',
      confidence: 0,
      reasoning: 'The final publish step stays cold until the compose node resolves.',
      alternatives: buildAlternatives('Save draft only', 'Send to sandbox'),
      inputs: {
        channel: 'Session brief',
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
    { id: 'edge-route-web', from: 'route-decision', to: 'web-research', state: 'completed', label: 'fresh web' },
    { id: 'edge-route-policy', from: 'route-decision', to: 'policy-scan', state: 'inactive', label: 'policy scan' },
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
      name: 'Launch Intelligence Pulse',
      task: 'Research and summarize the latest AI model launches',
      heartbeat: connectedAgents.length
        ? 'Awaiting approval on publish gate'
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
