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
  ringOnComplete: boolean;
  overtimeRingEnabled: boolean;
  volume: number;
  soundEnabled: boolean;
  activeCustomAlarmId: string | null;
}

export interface Settings {
  id: string;
  workDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  sessionsUntilLongBreak: number;
  blocklist: string[];
  overtimeEnabled: boolean;
  autoStartNextSession: boolean;
  notificationsEnabled: boolean;
  alarms: AlarmSettings;
}
