import type { SyncConfig } from '../types/artifacts';

/**
 * Convert a timestamp string (HH:MM:SS or HH:MM:SS.mmm) to seconds; 0 when missing
 */
export function timestampToSeconds(timestamp: string | null | undefined): number {
  if (!timestamp) return 0;
  const parts = timestamp.split(':');
  if (parts.length !== 3) return 0;
  const [hours, minutes, seconds] = parts.map(p => parseFloat(p));
  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Convert seconds to a timestamp string (HH:MM:SS, or -HH:MM:SS when negative)
 */
export function secondsToTimestamp(totalSeconds: number): string {
  const sign = totalSeconds < 0 ? '-' : '';
  const absSeconds = Math.abs(totalSeconds);
  const hours = Math.floor(absSeconds / 3600);
  const minutes = Math.floor((absSeconds % 3600) / 60);
  const seconds = Math.floor(absSeconds % 60);
  return `${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Convert seconds to the compact form the TL;DR and key decisions use: unpadded
 * hours and minutes, with zero hours shown as 00 (00:7:05, 1:4:03)
 */
export function secondsToCompactTimestamp(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
  return `${hours === 0 ? '00' : hours}:${minutes}:${seconds}`;
}

/**
 * Drop the milliseconds fraction from a VTT-style timestamp
 */
export const stripMillis = (timestamp: string): string => timestamp.split('.')[0];

/**
 * Convert a transcript timestamp to the corresponding position in the video,
 * applying the call's transcript/video sync offset when one is configured.
 */
export function getAdjustedVideoTime(timestamp: string, sync?: SyncConfig | null): number {
  const transcriptSeconds = timestampToSeconds(stripMillis(timestamp));
  if (sync?.transcriptStartTime && sync?.videoStartTime) {
    const offset = timestampToSeconds(sync.transcriptStartTime) - timestampToSeconds(sync.videoStartTime);
    return transcriptSeconds - offset;
  }
  return transcriptSeconds;
}

/**
 * Shown instead of a video position when a transcript moment falls before the
 * start of the recording, which happens when a call's video misses its opening.
 */
export const PRE_RECORDING_LABEL = 'before recording';

/**
 * Sync-adjusted timestamp formatted for display (HH:MM:SS)
 */
export const getDisplayTimestamp = (timestamp: string, sync?: SyncConfig | null): string => {
  const adjustedSeconds = getAdjustedVideoTime(timestamp, sync);
  if (adjustedSeconds < 0) return PRE_RECORDING_LABEL;
  return secondsToTimestamp(adjustedSeconds);
};