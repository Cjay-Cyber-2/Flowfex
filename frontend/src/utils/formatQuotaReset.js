export function formatResetCountdown(resetAt) {
  if (!resetAt) {
    return 'Your free Syniq requests renew on the next quota window (about every 5 hours).';
  }
  const target = Date.parse(resetAt);
  if (Number.isNaN(target)) {
    return 'Your free Syniq requests renew on the next quota window.';
  }
  const deltaMs = target - Date.now();
  if (deltaMs <= 0) {
    return 'Your quota is renewing now — refresh the page in a moment.';
  }
  const minutes = Math.floor(deltaMs / 60000);
  if (minutes < 60) {
    return `Quota renews in ${Math.max(1, minutes)} minute${minutes === 1 ? '' : 's'}.`;
  }
  const hours = Math.floor(minutes / 60);
  const remMin = minutes % 60;
  return `Quota renews in ${hours} hour${hours === 1 ? '' : 's'}${remMin ? ` ${remMin} min` : ''}.`;
}
