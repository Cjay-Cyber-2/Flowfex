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

  if (useLocalPackage && localPackageEntry) {
    return {
      mcpServers: {
        syniq: {
          command: 'node',
          args: [localPackageEntry],
          env,
        },
      },
    };
  }

  return {
    mcpServers: {
      syniq: {
        command: 'npx',
        args: ['-y', '@syniq/syniq-mcp'],
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
  const sessionId = conn?.metadata?.workspaceSessionId || workspaceSessionId || null;
  const sessionToken = conn?.token || null;
  return {
    sessionId,
    sessionToken,
    ready: Boolean(sessionId && sessionToken),
  };
}
