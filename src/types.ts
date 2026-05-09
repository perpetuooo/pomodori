export type Phase = "work" | "shortBreak" | "longBreak";

export interface TimerState {
  phase: Phase;
  durationSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
  endEpochMs: number | null;
  completedSessions: number;
}

export interface Settings {
  id: string;
  workDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  sessionsUntilLongBreak: number;
  blocklist: string[];
}
