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
    completedSessions: 0
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
