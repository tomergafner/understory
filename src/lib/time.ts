// Event-time timestamp for handlers; also placates react-hooks/purity, which
// cannot tell submit handlers from render.
export function nowMs(): number {
  return Date.now();
}

export function timeAgo(now: number, then: number): string {
  const seconds = Math.max(0, Math.floor((now - then) / 1000));
  if (seconds < 90) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 36) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
