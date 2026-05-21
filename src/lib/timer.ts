import { TimerState } from "../types";

export const DEFAULT_WORK_MINUTES = 25;

export function createInitialTimerState(minutes = DEFAULT_WORK_MINUTES): TimerState {
  const durationSeconds = Math.max(1, Math.floor(minutes * 60));

  return {
    phase: "work",
    durationSeconds,
    remainingSeconds: durationSeconds,
    isRunning: false,
    endEpochMs: null,
    completedSessions: 0,
    hasAlerted: false
  };
}

export function getRemainingFromEnd(endEpochMs: number): number {
  return Math.ceil((endEpochMs - Date.now()) / 1000);
}

export function formatClock(totalSeconds: number): string {
  const isNegative = totalSeconds < 0;
  const absSeconds = Math.abs(totalSeconds);
  const minutes = Math.floor(absSeconds / 60).toString().padStart(2, "0");
  const seconds = (absSeconds % 60).toString().padStart(2, "0");
  
  return isNegative ? `+${minutes}:${seconds}` : `${minutes}:${seconds}`;
}

export function formatStatsDuration(totalSeconds: number): string {
  if (totalSeconds < 60) return "< 1m";
  const d = Math.floor(totalSeconds / (3600 * 24));
  const h = Math.floor((totalSeconds % (3600 * 24)) / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);

  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);

  return parts.length > 0 ? parts.join(" ") : "0m";
}

export function formatDateDDMMYY(dateString: string | Date): string {
  const date = new Date(dateString);
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yy = String(date.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
}
