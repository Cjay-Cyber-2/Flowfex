import { TOKEN_PATTERN } from './sessionTokens.js';

/**
 * Returns true when an ingest/execute payload is only the Syniq attach handshake
 * (MCP syniq_attach, prompt attach ping, etc.) — not a billed tools request.
 */
export function isSyniqAttachOnlyTask(input) {
  if (typeof input !== 'string') {
    return false;
  }

  let task = input.replace(/\r\n/g, '\n').trim();
  const tokenMatch = task.match(
    new RegExp(`^\\s*SYNIQ_SESSION_TOKEN\\s*:\\s*${TOKEN_PATTERN}\\s*\\n+([\\s\\S]*)$`, 'i')
  );
  if (tokenMatch) {
    task = (tokenMatch[1] || '').trim();
  }

  return /^syniq\.attach$/i.test(task);
}
