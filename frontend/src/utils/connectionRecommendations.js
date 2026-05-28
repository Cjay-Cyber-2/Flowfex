/** Intent-based agent categories for onboarding (not wire protocols). */
export const AGENT_INTENT_OPTIONS = [
  { id: 'claude', label: 'Claude', description: 'Anthropic assistant in chat, Cowork, or API-style setups' },
  { id: 'openai', label: 'ChatGPT / OpenAI', description: 'ChatGPT, custom GPTs, or OpenAI-compatible agents' },
  { id: 'gemini', label: 'Gemini', description: 'Google Gemini in chat, Workspace, or API flows' },
  { id: 'local', label: 'Local agent', description: 'Ollama, LM Studio, or other on-device models' },
  { id: 'ide', label: 'IDE coding agent', description: 'Cursor, Windsurf, Copilot, or similar editor agents' },
  { id: 'framework', label: 'Autonomous agent framework', description: 'LangGraph, CrewAI, AutoGen, or custom runners' },
  { id: 'mcp', label: 'MCP-compatible agent', description: 'Hosts that load MCP servers (Cursor, Claude Desktop, VS Code)' },
  { id: 'backend', label: 'Backend API agent', description: 'Your service calls models and posts work to Syniq' },
  { id: 'workflow', label: 'Custom workflow system', description: 'n8n, Zapier-style flows, or internal orchestrators' },
  { id: 'multi', label: 'Multi-agent system', description: 'Several agents coordinating through one control plane' },
  { id: 'unsure', label: 'Not sure / help me choose', description: 'Syniq will suggest the simplest path for your setup' },
];

const METHOD_META = {
  Prompt: { difficulty: 'Easy', expect: 'Paste one contract into your assistant, then send a single attach ping.' },
  Link: { difficulty: 'Easy', expect: 'Open a one-time URL where your agent runs to register this session.' },
  SDK: { difficulty: 'Moderate', expect: 'Run a short snippet in your app or CLI so every turn syncs with Syniq.' },
  'Live Channel': { difficulty: 'Advanced', expect: 'Keep a socket or SSE client open for always-on orchestration.' },
};

export function recommendConnectionMethod(agentTypeId) {
  const map = {
    claude: { method: 'Prompt', reason: 'Claude-style assistants accept project or system instructions — the fastest verified attach.' },
    openai: { method: 'Prompt', reason: 'ChatGPT and OpenAI-compatible hosts work well with a pasted Syniq contract.' },
    gemini: { method: 'Prompt', reason: 'Gemini chat and Workspace surfaces typically accept instruction-based setup first.' },
    local: { method: 'SDK', reason: 'Local runtimes are easiest to wire with a small SDK or script in your process.' },
    ide: { method: 'Prompt', reason: 'IDE agents (Cursor, Copilot, etc.) usually attach through rules or project prompts.' },
    framework: { method: 'SDK', reason: 'Framework runners benefit from programmatic ingest before each agent step.' },
    mcp: { method: 'Prompt', reason: 'MCP hosts still need the Syniq attach contract; many teams pair MCP with prompt setup.' },
    backend: { method: 'SDK', reason: 'Backend services should call Syniq from code so every request is tracked server-side.' },
    workflow: { method: 'Link', reason: 'Workflow tools often attach best through a shareable handoff link in the browser step.' },
    multi: { method: 'Live Channel', reason: 'Multi-agent setups stay in sync with a persistent live channel to Syniq.' },
    unsure: { method: 'Prompt', reason: 'Prompt attach is the quickest way to verify your agent without extra infrastructure.' },
  };
  const picked = map[agentTypeId] || map.unsure;
  const meta = METHOD_META[picked.method] || METHOD_META.Prompt;
  return { method: picked.method, reason: picked.reason, difficulty: meta.difficulty, expect: meta.expect };
}

const ONBOARDING_STORAGE_KEY = 'syniq-onboarding-progress';

export function loadOnboardingProgress() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(ONBOARDING_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function saveOnboardingProgress(patch) {
  if (typeof window === 'undefined') return;
  try {
    const prev = loadOnboardingProgress() || {};
    window.sessionStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify({ ...prev, ...patch, updatedAt: Date.now() }));
  } catch { /* ignore */ }
}

export function clearOnboardingProgress() {
  if (typeof window === 'undefined') return;
  try { window.sessionStorage.removeItem(ONBOARDING_STORAGE_KEY); } catch { /* ignore */ }
}
