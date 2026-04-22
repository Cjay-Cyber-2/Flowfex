import { createSupabaseAdminClient } from '../session/supabaseAdmin.js';
import { logSessionError } from '../session/sessionLogger.js';
import {
  mapExecutionStatusToPersistedStatus,
  serializeConnectedAgentsFromSnapshot,
  serializeGraphStateFromSnapshot,
} from '../session/sessionSerializers.js';

export class SupabaseSessionStateRepository {
  constructor(config = {}) {
    this.client = config.client || createSupabaseAdminClient();
  }

  async read(sessionId) {
    try {
      const { data, error } = await this.client
        .from('execution_events')
        .select('payload')
        .eq('session_id', sessionId)
        .eq('event_type', 'state_snapshot')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data?.payload || null;
    } catch (error) {
      logSessionError({
        operation: 'supabase_session_repository.read',
        sessionId,
        error,
      });
      throw error;
    }
  }

  async write(snapshot) {
    const sessionId = snapshot?.sessionId || null;

    try {
      const graphState = serializeGraphStateFromSnapshot(snapshot);
      const connectedAgents = serializeConnectedAgentsFromSnapshot(snapshot);
      const constraints = Array.isArray(snapshot?.blockedSkillIds) ? snapshot.blockedSkillIds : [];
      const { error } = await this.client.rpc('save_session_graph_state', {
        p_session_id: sessionId,
        p_graph_state: graphState,
        p_execution_pointer: snapshot?.pendingNodeId || snapshot?.currentNodeId || null,
        p_connected_agents: connectedAgents,
        p_constraints: constraints,
        p_mode: snapshot?.sessionContext?.mode || 'live',
        p_status: mapExecutionStatusToPersistedStatus(snapshot?.status),
        p_snapshot: snapshot,
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      logSessionError({
        operation: 'supabase_session_repository.write',
        sessionId,
        error,
      });
      throw error;
    }
  }

  async delete(sessionId) {
    try {
      const { error } = await this.client
        .from('sessions')
        .delete()
        .eq('id', sessionId);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      logSessionError({
        operation: 'supabase_session_repository.delete',
        sessionId,
        error,
      });
      throw error;
    }
  }
}
