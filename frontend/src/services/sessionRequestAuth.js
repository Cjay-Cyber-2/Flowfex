import { readAnonymousToken } from '../../../lib/session/initialize';
import { getCurrentAuthSession } from './authService';

export async function buildWorkspaceAuthRequestInit(init = {}) {
  const auth = await getCurrentAuthSession().catch(() => ({ user: null, accessToken: null }));
  const anonymousToken = readAnonymousToken();
  const headers = {
    ...(init.headers || {}),
  };

  if (auth?.accessToken) {
    headers.Authorization = `Bearer ${auth.accessToken}`;
  } else if (anonymousToken) {
    headers['X-Syniq-Anonymous-Token'] = anonymousToken;
  }

  return {
    credentials: 'include',
    ...init,
    headers,
  };
}
