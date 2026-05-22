import { sql } from 'drizzle-orm';
import { syniqSessions } from '../db/schema.js';
import { publicSessionView } from './SessionManager.js';

function firstResult(data) {
  return Array.isArray(data) ? data[0] || null : data || null;
}

function isHandshakeActive(handshake) {
  if (!handshake || typeof handshake !== 'object') {
    return false;
  }

  const expiresAt = Date.parse(handshake.expiresAt || '');
  if (Number.isNaN(expiresAt) || expiresAt <= Date.now()) {
    return false;
  }

  return typeof handshake.token === 'string' && handshake.token.startsWith('ffx_');
}

/**
 * Persist the latest agent attach handshake on the workspace row so ingest can
 * restore in-memory connection sessions after deploys or on another instance.
 */
export async function persistConnectionHandshake(client, workspaceSessionId, handshake) {
  if (!client || !workspaceSessionId || !handshake?.token) {
    return null;
  }

  const existingRows = await client
    .select({ graph_state: syniqSessions.graph_state })
    .from(syniqSessions)
    .where(sql`${syniqSessions.id} = ${workspaceSessionId}`)
    .limit(1);

  const existingRow = firstResult(existingRows);
  if (!existingRow) {
    return null;
  }

  const graphState = existingRow.graph_state && typeof existingRow.graph_state === 'object'
    ? { ...existingRow.graph_state }
    : {};
  const metadata = graphState.metadata && typeof graphState.metadata === 'object'
    ? { ...graphState.metadata }
    : {};

  metadata.activeConnectionHandshake = {
    workspaceSessionId,
    connectionSessionId: handshake.connectionSessionId,
    connectionId: handshake.connectionId || null,
    token: handshake.token,
    expiresAt: handshake.expiresAt,
    mode: handshake.mode || 'prompt',
    agent: handshake.agent || null,
    metadata: handshake.metadata || {},
    prompt: handshake.prompt || null,
    capabilities: Array.isArray(handshake.capabilities) ? handshake.capabilities : [],
    allowedToolIds: handshake.allowedToolIds || null,
    recommendedToolIds: handshake.recommendedToolIds || null,
    persistedAt: new Date().toISOString(),
  };
  graphState.metadata = metadata;

  const data = await client
    .update(syniqSessions)
    .set({
      graph_state: graphState,
      last_active_at: new Date(),
      updated_at: new Date(),
    })
    .where(sql`${syniqSessions.id} = ${workspaceSessionId}`)
    .returning();

  return firstResult(data);
}

export async function findConnectionHandshakeByToken(client, token) {
  if (!client || typeof token !== 'string' || !token.startsWith('ffx_')) {
    return null;
  }

  const rows = await client
    .select({
      id: syniqSessions.id,
      graph_state: syniqSessions.graph_state,
    })
    .from(syniqSessions)
    .where(sql`graph_state->'metadata'->'activeConnectionHandshake'->>'token' = ${token}`)
    .limit(1);

  const row = firstResult(rows);
  const handshake = row?.graph_state?.metadata?.activeConnectionHandshake;
  if (!isHandshakeActive(handshake)) {
    return null;
  }

  return {
    workspaceSessionId: handshake.workspaceSessionId || row.id,
    handshake,
  };
}

export function restoreConnectionSessionFromHandshake(sessionManager, record, token) {
  if (!sessionManager || !record?.handshake || !token) {
    return null;
  }

  const { handshake } = record;
  const connectionSessionId = handshake.connectionSessionId || record.workspaceSessionId;
  if (!connectionSessionId) {
    return null;
  }

  const restored = sessionManager.restoreSession(
    {
      id: connectionSessionId,
      connectionId: handshake.connectionId,
      mode: handshake.mode,
      agent: handshake.agent,
      metadata: {
        ...(handshake.metadata || {}),
        workspaceSessionId: record.workspaceSessionId,
      },
      prompt: handshake.prompt,
      capabilities: handshake.capabilities,
      allowedToolIds: handshake.allowedToolIds,
      recommendedToolIds: handshake.recommendedToolIds,
      expiresAt: handshake.expiresAt,
      createdAt: handshake.persistedAt || new Date().toISOString(),
      connectedAt: handshake.connectedAt || null,
      lastSeenAt: new Date().toISOString(),
      requestCount: 0,
      revokedAt: null,
    },
    token
  );

  return restored;
}

export function buildHandshakePayload(session, token, workspaceSessionId = null) {
  if (!session || !token) {
    return null;
  }

  const view = publicSessionView(session);
  return {
    workspaceSessionId: workspaceSessionId || session.metadata?.workspaceSessionId || session.id,
    connectionSessionId: session.id,
    connectionId: view.connectionId,
    token,
    expiresAt: view.expiresAt,
    mode: view.mode,
    agent: view.agent,
    metadata: view.metadata,
    prompt: view.prompt,
    capabilities: view.capabilities,
    allowedToolIds: view.allowedToolIds,
    recommendedToolIds: view.recommendedToolIds,
  };
}
