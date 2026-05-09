export type Phase = "work" | "shortBreak" | "longBreak";

export interface TimerState {
  phase: Phase;
  durationSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
  endEpochMs: number | null;
  completedSessions: number;
  hasAlerted: boolean;
}

export interface AlarmSettings {
  workEnabled: boolean;
  shortBreakEnabled: boolean;
  longBreakEnabled: boolean;
  overtimeEnabled: boolean;
  volume: number;
  soundEnabled: boolean;
}

export interface Settings {
  id: string;
  workDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  sessionsUntilLongBreak: number;
  blocklist: string[];
  overtimeEnabled: boolean;
  alarms: AlarmSettings;
}
