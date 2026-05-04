import Dexie, { type Table } from 'dexie';

export interface DailyStat {
  date: string;
  pomodorosCompleted: number;
  shortBreaksCompleted: number;
  longBreaksCompleted: number;
  pauseCount: number;
  totalFocusSeconds: number;
}

export class PomodoriDB extends Dexie {
  dailyStats!: Table<DailyStat>;

  constructor() {
    super('PomodoriDB');
    this.version(1).stores({
      dailyStats: 'date' // Primary key
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

export async function logSessionCompletion(phase: 'work' | 'shortBreak' | 'longBreak', durationSeconds: number) {
  const today = getTodayDateString();

  await db.transaction('rw', db.dailyStats, async () => {
    const stat = await db.dailyStats.get(today);

    if (stat) {
      if (phase === 'work') {
        stat.pomodorosCompleted += 1;
        stat.totalFocusSeconds += durationSeconds;
      } else if (phase === 'shortBreak') {
        stat.shortBreaksCompleted += 1;
      } else if (phase === 'longBreak') {
        stat.longBreaksCompleted += 1;
      }
      await db.dailyStats.put(stat);
    } else {
      await db.dailyStats.add({
        date: today,
        pomodorosCompleted: phase === 'work' ? 1 : 0,
        shortBreaksCompleted: phase === 'shortBreak' ? 1 : 0,
        longBreaksCompleted: phase === 'longBreak' ? 1 : 0,
        pauseCount: 0,
        totalFocusSeconds: phase === 'work' ? durationSeconds : 0
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
        totalFocusSeconds: 0
      });
    }
  });
}
