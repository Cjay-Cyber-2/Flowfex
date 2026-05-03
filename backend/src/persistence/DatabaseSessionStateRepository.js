import { createSessionDataClient } from '../session/sessionDataAccess.js';
import { logSessionError } from '../session/sessionLogger.js';
import { flowfexSessions } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import {
  mapExecutionStatusToPersistedStatus,
  serializeConnectedAgentsFromSnapshot,
  serializeGraphStateFromSnapshot,
} from '../session/sessionSerializers.js';

export class DatabaseSessionStateRepository {
  constructor(config = {}) {
    this.client = config.client || createSessionDataClient();
  }

  async read(sessionId) {
    try {
      const rows = await this.client
        .select({
          graph_state: flowfexSessions.graph_state,
          execution_pointer: flowfexSessions.execution_pointer,
          connected_agents: flowfexSessions.connected_agents,
          constraints: flowfexSessions.constraints,
          status: flowfexSessions.status,
          mode: flowfexSessions.mode,
        })
        .from(flowfexSessions)
        .where(eq(flowfexSessions.id, sessionId))
        .limit(1);

      const row = Array.isArray(rows) ? rows[0] : rows;
      if (!row || !row.graph_state) {
        return null;
      }

      return row.graph_state;
    } catch (error) {
      logSessionError({
        operation: 'database_session_repository.read',
        sessionId,
        error,
      });
      throw error;
    }
  }

  async write(snapshot) {
    const sessionId = snapshot?.sessionId || null;
    if (!sessionId) {
      return;
    }

    try {
      const graphState = serializeGraphStateFromSnapshot(snapshot);
      const connectedAgents = serializeConnectedAgentsFromSnapshot(snapshot);
      const constraints = Array.isArray(snapshot?.blockedSkillIds) ? snapshot.blockedSkillIds : [];

      await this.client
        .update(flowfexSessions)
        .set({
          graph_state: graphState,
          execution_pointer: snapshot?.pendingNodeId || snapshot?.currentNodeId || null,
          connected_agents: connectedAgents,
          constraints,
          mode: snapshot?.sessionContext?.mode || 'live',
          status: mapExecutionStatusToPersistedStatus(snapshot?.status),
          last_active_at: new Date(),
          updated_at: new Date(),
        })
        .where(eq(flowfexSessions.id, sessionId));
    } catch (error) {
      logSessionError({
        operation: 'database_session_repository.write',
        sessionId,
        error,
      });
      throw error;
    }
  }

  async delete(sessionId) {
    try {
      await this.client
        .delete(flowfexSessions)
        .where(eq(flowfexSessions.id, sessionId));

      return true;
    } catch (error) {
      logSessionError({
        operation: 'database_session_repository.delete',
        sessionId,
        error,
      });
      throw error;
    }
  }
}
