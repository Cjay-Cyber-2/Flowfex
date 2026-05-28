/**
 * Onboarding: where the agent runs (surface) → how to connect (method).
 * Methods align with ConnectAgentModal tabs: Prompt, MCP, Link, SDK, Live Channel.
 */

export const CONNECTION_METHODS = ['Prompt', 'MCP', 'Link', 'SDK', 'Live Channel'];

const METHOD_COPY = {
  Prompt: {
    title: 'Instruction attach',
    tagline: 'Paste Syniq into your agent’s rules or system prompt',
    setup: 'Easy',
    expect: 'One contract paste, then a single attach ping.',
  },
  MCP: {
    title: 'MCP server',
    tagline: 'Native Model Context Protocol for supported assistants',
    setup: 'Easy',
    expect: 'Add @syniq/syniq-mcp to your host config and restart.',
  },
  Link: {
    title: 'One-time link',
    tagline: 'Open a secure handoff URL where the agent runs',
    setup: 'Easy',
    expect: 'Best when the agent lives in a browser tab or shared flow.',
  },
  SDK: {
    title: 'SDK / code',
    tagline: 'Programmatic attach from your app, script, or CLI',
    setup: 'Moderate',
    expect: 'Every turn syncs through Syniq before the model acts.',
  },
  'Live Channel': {
    title: 'Live channel',
    tagline: 'Persistent socket for always-on runners',
    setup: 'Advanced',
    expect: 'Keep a streaming client open for the full session.',
  },
};

/** Where the user’s agent actually runs — comprehensive surface list. */
export const AGENT_SURFACE_OPTIONS = [
  {
    id: 'cli',
    label: 'Terminal / CLI',
    description: 'Shell agents, coding CLIs, and headless scripts',
  },
  {
    id: 'ide-panel',
    label: 'IDE side panel',
    description: 'Cursor, Windsurf, Copilot Chat, Kiro, and similar panels',
  },
  {
    id: 'ide-inline',
    label: 'IDE inline / editor',
    description: 'Inline completions or editor-embedded assistants',
  },
  {
    id: 'web-chat',
    label: 'Web chat',
    description: 'ChatGPT, Claude.ai, Gemini, or any browser-based assistant',
  },
  {
    id: 'desktop-app',
    label: 'Desktop app',
    description: 'Claude Desktop, ChatGPT desktop, or other native apps',
  },
  {
    id: 'browser-extension',
    label: 'Browser extension',
    description: 'Extensions that inject AI into pages you browse',
  },
  {
    id: 'mcp-host',
    label: 'MCP-capable host',
    description: 'Apps that already load MCP servers (Cursor, VS Code, Claude Desktop)',
  },
  {
    id: 'backend-api',
    label: 'Backend / API service',
    description: 'Your server calls models and should gate every request',
  },
  {
    id: 'workflow',
    label: 'Workflow automation',
    description: 'n8n, Zapier, Make, or internal orchestration tools',
  },
  {
    id: 'live-runner',
    label: 'Always-on runner',
    description: 'Daemons, sidecars, or embedded agents that stay connected',
  },
  {
    id: 'mobile',
    label: 'Mobile app',
    description: 'iOS, Android, or cross-platform mobile assistants',
  },
  {
    id: 'multi-agent',
    label: 'Multi-agent system',
    description: 'Several agents coordinating through one control plane',
  },
  {
    id: 'custom-embedded',
    label: 'Custom / embedded product',
    description: 'Your own UI with an AI layer you control',
  },
  {
    id: 'unsure',
    label: 'Not sure yet',
    description: 'We’ll suggest the simplest path for your setup',
  },
];

/**
 * Per-surface connection profile.
 * soleMethod: skip method picker — only show that setup (we’re confident it works).
 * methods: ordered list; first recommended entry is the primary pick when multiple show.
 */
const SURFACE_PROFILES = {
  cli: {
    soleMethod: 'SDK',
    methods: [
      {
        method: 'SDK',
        recommended: true,
        reason: 'Terminal and shell agents attach reliably through code — no MCP host required.',
      },
    ],
  },
  'ide-panel': {
    methods: [
      {
        method: 'MCP',
        recommended: true,
        reason: 'Side panels in Cursor, Windsurf, and Kiro expose MCP — the most reliable native attach.',
      },
      {
        method: 'Prompt',
        recommended: false,
        reason: 'Works when your IDE accepts project rules instead of MCP.',
      },
    ],
  },
  'ide-inline': {
    methods: [
      {
        method: 'Prompt',
        recommended: true,
        reason: 'Inline editor agents usually attach through workspace or project instructions.',
      },
      {
        method: 'SDK',
        recommended: false,
        reason: 'Use when your extension or plugin can call Syniq from code.',
      },
    ],
  },
  'web-chat': {
    methods: [
      {
        method: 'Prompt',
        recommended: true,
        reason: 'Browser chat surfaces accept custom instructions — fastest verified attach.',
      },
      {
        method: 'Link',
        recommended: false,
        reason: 'Handoff link when you can open a URL in the same browser session.',
      },
    ],
  },
  'desktop-app': {
    methods: [
      {
        method: 'MCP',
        recommended: true,
        reason: 'Claude Desktop and similar apps support MCP servers natively.',
      },
      {
        method: 'Prompt',
        recommended: false,
        reason: 'For desktop apps that use custom instructions instead of MCP.',
      },
    ],
  },
  'browser-extension': {
    methods: [
      {
        method: 'Link',
        recommended: true,
        reason: 'Extensions often attach best by opening Syniq’s one-time URL in the active tab.',
      },
      {
        method: 'Prompt',
        recommended: false,
        reason: 'When the extension can inject a persistent instruction block.',
      },
    ],
  },
  'mcp-host': {
    soleMethod: 'MCP',
    methods: [
      {
        method: 'MCP',
        recommended: true,
        reason: 'Your host already speaks MCP — add @syniq/syniq-mcp and you’re done.',
      },
    ],
  },
  'backend-api': {
    soleMethod: 'SDK',
    methods: [
      {
        method: 'SDK',
        recommended: true,
        reason: 'Server-side agents should attach in code so every request is verified on Syniq.',
      },
    ],
  },
  workflow: {
    methods: [
      {
        method: 'Link',
        recommended: true,
        reason: 'Automation tools usually complete attach through a browser handoff step.',
      },
      {
        method: 'SDK',
        recommended: false,
        reason: 'When your workflow node can run a short HTTP or SDK snippet.',
      },
    ],
  },
  'live-runner': {
    soleMethod: 'Live Channel',
    methods: [
      {
        method: 'Live Channel',
        recommended: true,
        reason: 'Always-on runners stay in sync with a persistent live channel to Syniq.',
      },
    ],
  },
  mobile: {
    methods: [
      {
        method: 'Link',
        recommended: true,
        reason: 'Mobile assistants typically attach by opening a secure link on device.',
      },
      {
        method: 'SDK',
        recommended: false,
        reason: 'When your mobile app embeds the Syniq SDK directly.',
      },
    ],
  },
  'multi-agent': {
    methods: [
      {
        method: 'Live Channel',
        recommended: true,
        reason: 'Multiple agents share one live control plane without dropping events.',
      },
      {
        method: 'SDK',
        recommended: false,
        reason: 'When each agent process can call Syniq before acting.',
      },
    ],
  },
  'custom-embedded': {
    methods: [
      {
        method: 'SDK',
        recommended: true,
        reason: 'Embedded products attach cleanly from your application code.',
      },
      {
        method: 'Live Channel',
        recommended: false,
        reason: 'For products that keep a long-lived streaming client open.',
      },
    ],
  },
  unsure: {
    methods: [
      {
        method: 'Prompt',
        recommended: true,
        reason: 'Instruction attach is the fastest way to verify any assistant.',
      },
      {
        method: 'MCP',
        recommended: false,
        reason: 'If your tool supports MCP servers (Cursor, Claude Desktop, VS Code).',
      },
      {
        method: 'Link',
        recommended: false,
        reason: 'If attach happens in a browser step.',
      },
    ],
  },
};

export function getAgentSurfaceById(surfaceId) {
  return AGENT_SURFACE_OPTIONS.find((s) => s.id === surfaceId) || null;
}

/**
 * @returns {{
 *   surface: { id, label, description } | null,
 *   soleMethod: string | null,
 *   methods: Array<{ method, title, tagline, setup, expect, recommended, reason }>,
 *   skipMethodStep: boolean,
 * }}
 */
export function getConnectionProfileForSurface(surfaceId) {
  const surface = getAgentSurfaceById(surfaceId);
  const profile = SURFACE_PROFILES[surfaceId] || SURFACE_PROFILES.unsure;
  const soleMethod = profile.soleMethod || null;
  const rawMethods = profile.methods || SURFACE_PROFILES.unsure.methods;

  const methods = rawMethods.map((entry) => {
    const copy = METHOD_COPY[entry.method] || METHOD_COPY.Prompt;
    return {
      method: entry.method,
      recommended: Boolean(entry.recommended),
      reason: entry.reason,
      title: copy.title,
      tagline: copy.tagline,
      setup: copy.setup,
      expect: copy.expect,
    };
  });

  const skipMethodStep = Boolean(soleMethod) || methods.length === 1;

  return {
    surface,
    soleMethod,
    methods,
    skipMethodStep,
    defaultMethod: soleMethod || methods.find((m) => m.recommended)?.method || methods[0]?.method,
  };
}

/** @deprecated Use getConnectionProfileForSurface — kept for any stale imports */
export const AGENT_INTENT_OPTIONS = AGENT_SURFACE_OPTIONS;

export function recommendConnectionMethod(surfaceId) {
  const profile = getConnectionProfileForSurface(surfaceId);
  const pick = profile.methods.find((m) => m.method === profile.defaultMethod) || profile.methods[0];
  return {
    method: pick?.method || 'Prompt',
    reason: pick?.reason || '',
    difficulty: pick?.setup || 'Easy',
    expect: pick?.expect || '',
  };
}

const ONBOARDING_STORAGE_KEY = 'syniq-onboarding-progress';

export function loadOnboardingProgress() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(ONBOARDING_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveOnboardingProgress(patch) {
  if (typeof window === 'undefined') return;
  try {
    const prev = loadOnboardingProgress() || {};
    window.sessionStorage.setItem(
      ONBOARDING_STORAGE_KEY,
      JSON.stringify({ ...prev, ...patch, updatedAt: Date.now() }),
    );
  } catch {
    /* ignore */
  }
}

export function clearOnboardingProgress() {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(ONBOARDING_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
