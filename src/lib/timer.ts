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
  return Math.max(0, Math.ceil((endEpochMs - Date.now()) / 1000));
}

export function formatClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  
  return `${minutes}:${seconds}`;
}
