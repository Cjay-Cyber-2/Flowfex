export function logSessionError({ operation, sessionId = null, error }) {
  const message = error instanceof Error ? error.message : String(error);

  console.error('[SyniqSession]', JSON.stringify({
    operation,
    sessionId,
    message,
  }));
}
