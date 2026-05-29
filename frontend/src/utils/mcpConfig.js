import { isWorkspaceUuidSessionId } from '../../../shared/sessionIds.js';

const SYNIQ_MCP_PACKAGE = '@syniq/syniq-mcp';

/**
 * Cursor and other IDE hosts often spawn MCP with a minimal PATH (no nvm/npx).
 * Use a login shell on Unix so npx resolves from the user's normal Node install.
 */
export function resolveMcpLaunchSpec({
  useLocalPackage = false,
  localPackageEntry = null,
  platform = typeof navigator !== 'undefined' ? navigator.userAgent : '',
} = {}) {
  if (useLocalPackage && localPackageEntry) {
    return {
      command: 'node',
      args: [localPackageEntry],
    };
  }

  if (/Win/i.test(platform)) {
    return {
      command: 'cmd',
      args: ['/d', '/s', '/c', `npx -y ${SYNIQ_MCP_PACKAGE}`],
    };
  }

  return {
    command: 'bash',
    args: ['-lc', `exec npx -y ${SYNIQ_MCP_PACKAGE}`],
  };
}

/**
 * Build MCP client config for Cursor, Claude Desktop, Kiro, etc.
 */
export function buildSyniqMcpServerConfig({
  publicUrl,
  sessionId,
  sessionToken,
  ingestUrl,
  useLocalPackage = false,
  localPackageEntry = null,
  platform,
}) {
  const normalizedPublic = String(publicUrl || '').replace(/\/+$/, '');
  const normalizedIngest = String(ingestUrl || `${normalizedPublic}/ingest`).replace(/\/+$/, '');

  if (!sessionId || !sessionToken) {
    return null;
  }

  const env = {
    SYNIQ_PUBLIC_URL: normalizedPublic,
    SYNIQ_SESSION_ID: sessionId,
    SYNIQ_SESSION_TOKEN: sessionToken,
    SESSION_ID: sessionId,
    SESSION_TOKEN: sessionToken,
    SYNIQ_INGEST_URL: normalizedIngest,
  };

  const launch = resolveMcpLaunchSpec({ useLocalPackage, localPackageEntry, platform });

  return {
    mcpServers: {
      syniq: {
        ...launch,
        env,
      },
    },
  };
}

export function stringifyMcpConfig(config) {
  if (!config) {
    return '';
  }
  return JSON.stringify(config, null, 2);
}

/** Workspace UUID + handshake token from the connect API (not the ephemeral connection id). */
export function resolveMcpCredentialsFromConnection(connection, workspaceSessionId) {
  const conn = connection?.connection?.session;
  const metadataWorkspaceId = conn?.metadata?.workspaceSessionId || null;
  const sessionToken = typeof conn?.token === 'string' ? conn.token.trim() : '';

  const resolvedWorkspaceId = [metadataWorkspaceId, workspaceSessionId]
    .find((id) => isWorkspaceUuidSessionId(id)) || null;

  return {
    sessionId: resolvedWorkspaceId,
    sessionToken: sessionToken || null,
    ready: Boolean(resolvedWorkspaceId && sessionToken),
  };
}
