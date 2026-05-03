export type TimerState = {
  durationSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
  endEpochMs: number | null;
  completedSessions: number;
};