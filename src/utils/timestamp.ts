/**
 * Convert a timestamp string (HH:MM:SS or HH:MM:SS.mmm) to seconds
 */
export function timestampToSeconds(timestamp: string): number {
  const parts = timestamp.split(':');
  if (parts.length !== 3) return 0;
  const [hours, minutes, seconds] = parts.map(p => parseFloat(p));
  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Convert seconds to a timestamp string (HH:MM:SS)
 */
export function secondsToTimestamp(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}