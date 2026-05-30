/**
 * Shared utility functions used across all pages.
 */

/** Format bytes to human-readable size */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '—';
  const u = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${u[i]}`;
}

/** Map audio codec to file extension */
export function codecToExt(c: string): string {
  const m: Record<string, string> = {
    aac: 'm4a', libmp3lame: 'mp3', flac: 'flac',
    libopus: 'opus', pcm_s16le: 'wav', copy: 'm4a',
  };
  return m[c] || 'm4a';
}

/** Convert "HH:MM:SS" string to total seconds */
export function timeToSec(t: string): number {
  const p = t.split(':').map(Number);
  return (p[0] || 0) * 3600 + (p[1] || 0) * 60 + (p[2] || 0);
}

/** Convert total seconds to "HH:MM:SS" string */
export function secToTime(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

/** Parse a duration string, returning seconds (default 300 = 5min for unknown) */
export function parseDuration(dur: string): number {
  return dur === '—' ? 300 : timeToSec(dur);
}

/** Auto-incrementing counter for file keys */
let _counter = 0;
export function nextFileKey(): string {
  _counter += 1;
  return `file-${_counter}`;
}
