import { resolveApiFetchBase } from '../utils/runtimeConfig';
import { buildWorkspaceAuthRequestInit } from './sessionRequestAuth';

export async function touchAgentPresence(sessionId) {
  if (!sessionId) {
    return false;
  }

  try {
    const init = await buildWorkspaceAuthRequestInit();
    const response = await fetch(`${resolveApiFetchBase()}/api/session/touch-agent-presence`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        ...init.headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sessionId }),
    });

    return response.ok;
  } catch {
    return false;
  }
}
