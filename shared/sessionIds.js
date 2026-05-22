/** Workspace rows use UUID; in-memory connection sessions use `sess_<24 hex>`. */
export const SYNIQ_SESSION_ID_PATTERN =
  /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|sess_[a-f0-9]{24})$/i;

export function isSyniqSessionId(value) {
  return typeof value === 'string' && SYNIQ_SESSION_ID_PATTERN.test(value.trim());
}

export function isWorkspaceUuidSessionId(value) {
  if (typeof value !== 'string') {
    return false;
  }
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim());
}
