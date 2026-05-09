import Dexie, { type Table } from 'dexie';
import type { Settings } from '../types';

export interface DailyStat {
  date: string;
  pomodorosCompleted: number;
  shortBreaksCompleted: number;
  longBreaksCompleted: number;
  pauseCount: number;
  totalFocusSeconds: number;
  overtimeFocusSeconds: number;
  overtimeShortBreakSeconds: number;
  overtimeLongBreakSeconds: number;
}

export interface AudioFile {
  id: string;
  blob: Blob;
}

export class PomodoriDB extends Dexie {
  dailyStats!: Table<DailyStat>;
  settings!: Table<Settings>;
  audioFiles!: Table<AudioFile>;

  constructor() {
    super('PomodoriDB');
    this.version(4).stores({
      dailyStats: 'date',
      settings: 'id',
      audioFiles: 'id'
    }).upgrade(tx => {
      tx.table('settings').toCollection().modify(setting => {
        if (setting.overtimeEnabled === undefined) {
          setting.overtimeEnabled = false;
        }
        if (setting.alarms === undefined) {
          setting.alarms = {
            workEnabled: true,
            shortBreakEnabled: true,
            longBreakEnabled: true,
            overtimeEnabled: true,
            volume: 0.5,
            soundEnabled: true
          };
        }
      });
      tx.table('dailyStats').toCollection().modify(stat => {
        stat.overtimeFocusSeconds = stat.overtimeFocusSeconds || 0;
        stat.overtimeShortBreakSeconds = stat.overtimeShortBreakSeconds || 0;
        stat.overtimeLongBreakSeconds = stat.overtimeLongBreakSeconds || 0;
      });
    });
  }
}

export const db = new PomodoriDB();

export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function logSessionCompletion(phase: 'work' | 'shortBreak' | 'longBreak', durationSeconds: number, overtimeSeconds: number = 0) {
  const today = getTodayDateString();

  await db.transaction('rw', db.dailyStats, async () => {
    const stat = await db.dailyStats.get(today);

    if (stat) {
      if (phase === 'work') {
        stat.pomodorosCompleted += 1;
        stat.totalFocusSeconds += durationSeconds;
        stat.overtimeFocusSeconds += overtimeSeconds;
      } else if (phase === 'shortBreak') {
        stat.shortBreaksCompleted += 1;
        stat.overtimeShortBreakSeconds += overtimeSeconds;
      } else if (phase === 'longBreak') {
        stat.longBreaksCompleted += 1;
        stat.overtimeLongBreakSeconds += overtimeSeconds;
      }
      await db.dailyStats.put(stat);
    } else {
      await db.dailyStats.add({
        date: today,
        pomodorosCompleted: phase === 'work' ? 1 : 0,
        shortBreaksCompleted: phase === 'shortBreak' ? 1 : 0,
        longBreaksCompleted: phase === 'longBreak' ? 1 : 0,
        pauseCount: 0,
        totalFocusSeconds: phase === 'work' ? durationSeconds : 0,
        overtimeFocusSeconds: phase === 'work' ? overtimeSeconds : 0,
        overtimeShortBreakSeconds: phase === 'shortBreak' ? overtimeSeconds : 0,
        overtimeLongBreakSeconds: phase === 'longBreak' ? overtimeSeconds : 0
      });
    }
  });
}

export async function logPauseEvent() {
  const today = getTodayDateString();

  await db.transaction('rw', db.dailyStats, async () => {
    const stat = await db.dailyStats.get(today);
    if (stat) {
      stat.pauseCount += 1;
      await db.dailyStats.put(stat);
    } else {
      await db.dailyStats.add({
        date: today,
        pomodorosCompleted: 0,
        shortBreaksCompleted: 0,
        longBreaksCompleted: 0,
        pauseCount: 1,
        totalFocusSeconds: 0,
        overtimeFocusSeconds: 0,
        overtimeShortBreakSeconds: 0,
        overtimeLongBreakSeconds: 0
      });
    }
  });
}

export const DEFAULT_SETTINGS: Settings = {
  id: 'settings',
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  sessionsUntilLongBreak: 4,
  blocklist: [],
  overtimeEnabled: false,
  alarms: {
    workEnabled: true,
    shortBreakEnabled: true,
    longBreakEnabled: true,
    overtimeEnabled: true,
    volume: 0.5,
    soundEnabled: true
  }
};

export async function loadSettings(): Promise<Settings> {
  const settings = await db.settings.get('settings');
  return settings || DEFAULT_SETTINGS;
}

export async function saveSettings(settings: Settings): Promise<void> {
  await db.settings.put(settings);

  const isExtension = typeof chrome !== "undefined" && !!chrome.storage && !!chrome.storage.local;
  if (isExtension) {
    await chrome.storage.local.set({ settings });
  }
}
