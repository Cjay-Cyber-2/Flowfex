/**
 * Rewrites vendor-specific assistant names in skill/tool copy so runtime text
 * targets whatever AI is connected to Syniq — unless the skill is explicitly
 * about integrating with another agent platform.
 */

const INTEGRATION_PATH_PATTERN =
  /(?:^|\/)(?:integrations\/(?:openclaw|cursor|claude|copilot|gemini|windsurf|aider|opencode|antigravity|github-copilot)|agency-agents\/integrations\/|openclaw-persona-forge|using-superpowers\/references\/(?:copilot|gemini|codex)-tools\.md$)/i;

const PHRASE_REPLACEMENTS = [
  [/Claude Code/gi, 'the connected AI assistant'],
  [/Claude\.ai/gi, 'the connected AI assistant'],
  [/Claude Cowork/gi, 'the connected AI assistant'],
  [/\bCowork\b/g, 'the connected workspace'],
  [/GitHub Copilot/gi, 'the connected AI assistant'],
  [/\bCopilot CLI\b/gi, 'the connected AI assistant'],
  [/\bCopilot\b/gi, 'the connected AI assistant'],
  [/OpenClaw/gi, 'Syniq'],
  [/ClawHub/gi, 'the Syniq skill catalog'],
  [/Gemini CLI/gi, 'the connected AI assistant'],
  [/ChatGPT/gi, 'the connected AI assistant'],
  [/Antigravity/gi, 'the connected AI assistant'],
  [/Windsurf/gi, 'the connected AI assistant'],
  [/Codex CLI/gi, 'the connected AI assistant'],
  [/\bCodex\b/gi, 'the connected AI assistant'],
  [/\bAider\b/gi, 'the connected AI assistant'],
  [/\bClaude\b/gi, 'the connected AI assistant'],
];

export function shouldPreserveVendorAgentNames(relativePath = '') {
  if (!relativePath) {
    return false;
  }
  const normalized = String(relativePath).replace(/\\/g, '/').toLowerCase();
  return INTEGRATION_PATH_PATTERN.test(normalized);
}

function shouldKeepCursorToken(text, offset) {
  const slice = text.slice(Math.max(0, offset - 40), Math.min(text.length, offset + 40)).toLowerCase();
  return /overlay|inject|mouse|pointer|navigation|zoom|style|teleport|subtitle|ui\b/.test(slice);
}

export function neutralizeAgentBranding(text, context = {}) {
  if (!text || shouldPreserveVendorAgentNames(context.relativePath)) {
    return text;
  }

  let output = String(text);

  for (const [pattern, replacement] of PHRASE_REPLACEMENTS) {
    output = output.replace(pattern, replacement);
  }

  output = output.replace(/\bCursor\b/g, (match, offset) =>
    shouldKeepCursorToken(output, offset) ? match : 'the editor'
  );

  return output
    .replace(/\bthe connected AI assistant Code\b/gi, 'the connected AI assistant')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
