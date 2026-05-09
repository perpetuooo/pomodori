import type { TimerState } from "../types";

const STORAGE_KEY = "timer-state";

const isExtension = typeof chrome !== "undefined" && !!chrome.storage && !!chrome.storage.local;

export async function saveTimerState(state: TimerState): Promise<void> {
  if (isExtension) {
    await chrome.storage.local.set({ [STORAGE_KEY]: state });
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
}

export async function loadTimerState(): Promise<TimerState | null> {
  if (isExtension) {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    return (result[STORAGE_KEY] as TimerState | undefined) ?? null;
  }

  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as TimerState) : null;
}

export async function clearTimerState(): Promise<void> {
  if (isExtension) {
    await chrome.storage.local.remove(STORAGE_KEY);
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}
