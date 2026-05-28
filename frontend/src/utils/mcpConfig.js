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

  const env = {
    SYNIQ_PUBLIC_URL: normalizedPublic,
    SYNIQ_SESSION_ID: sessionId,
    SYNIQ_SESSION_TOKEN: sessionToken,
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
  return JSON.stringify(config, null, 2);
}
