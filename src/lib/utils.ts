export function todayString(): string {
  return new Date().toISOString().split('T')[0];
}

export function toESPNDate(dateStr: string): string {
  return dateStr.replace(/-/g, '');
}

export function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

export function getWeekNumber(date: Date = new Date()): number {
  const start = new Date(date.getFullYear(), 0, 1);
  const diff = date.getTime() - start.getTime();
  const oneWeek = 604800000;
  return Math.floor(diff / oneWeek) + 1;
}

export function parseRecord(record: string): { wins: number; losses: number } {
  const parts = record.split('-');
  return {
    wins: parseInt(parts[0]) || 0,
    losses: parseInt(parts[1]) || 0,
  };
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr + 'T12:00:00');
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

export function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
