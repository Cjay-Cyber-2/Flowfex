/** Human-readable presence time for connected-agent rows. */
export function formatAgentLastSeen(value) {
  if (!value) {
    return 'Live now';
  }

  const text = String(value).trim();
  if (!text) {
    return 'Live now';
  }

  if (/^(live now|just now|\d+s ago|\d+m ago)$/i.test(text)) {
    return text;
  }

  const parsed = Date.parse(text);
  if (Number.isNaN(parsed)) {
    return text;
  }

  const deltaMs = Date.now() - parsed;
  if (deltaMs < 15_000) {
    return 'Just now';
  }
  if (deltaMs < 60_000) {
    return `${Math.max(1, Math.round(deltaMs / 1000))}s ago`;
  }
  if (deltaMs < 3_600_000) {
    return `${Math.max(1, Math.round(deltaMs / 60_000))}m ago`;
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(parsed));
}
