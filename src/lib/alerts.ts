import { Settings, Phase } from "../types";
import { db } from "./db";

const DEFAULT_ALARM_URL = "/audio/alarm.mp3";
let currentBlobUrl: string | null = null;

async function getAudioElement(volume: number): Promise<HTMLAudioElement | null> {
  let url = DEFAULT_ALARM_URL;

  try {
    const customAudio = await db.audioFiles.get("customAlarm");
    if (customAudio && customAudio.blob) {
      if (currentBlobUrl) {
        URL.revokeObjectURL(currentBlobUrl);
      }
      currentBlobUrl = URL.createObjectURL(customAudio.blob);
      url = currentBlobUrl;
    }
  } catch (err) {
    console.error("Failed to load custom audio", err);
  }

  const audio = new Audio(url);
  audio.volume = Math.max(0, Math.min(1, volume)); // clamp between 0 and 1
  return audio;
}

export async function playAlarm(settings: Settings) {
  if (!settings.alarms.soundEnabled) return;

  try {
    const audio = await getAudioElement(settings.alarms.volume);
    if (audio) {
      await audio.play();
    }
  } catch (err) {
    console.error("Failed to play alarm", err);
  }
}

export function showNotification(title: string, message: string) {
  const isExtension = typeof chrome !== "undefined" && !!chrome.notifications;

  if (isExtension) {
    // Try to create notification
    chrome.notifications.create({
      type: "basic",
      iconUrl: "/vite.svg",
      title,
      message,
      priority: 2
    }, () => { });
  } else if ("Notification" in window) {
    if (Notification.permission === "granted") {
      new Notification(title, { body: message });
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then(permission => {
        if (permission === "granted") {
          new Notification(title, { body: message });
        }
      });
    }
  }
}

export function triggerPhaseAlert(phase: Phase, settings: Settings) {
  const alarms = settings.alarms;
  let shouldRing = false; let title = "Pomodori"; let message = "";

  if (phase === "work") {
    shouldRing = alarms.workEnabled;
    title = "Focus Time Complete!";
    message = "Time for a break.";
  } else if (phase === "shortBreak") {
    shouldRing = alarms.shortBreakEnabled;
    title = "Short Break Complete!";
    message = "Ready to focus?";
  } else if (phase === "longBreak") {
    shouldRing = alarms.longBreakEnabled;
    title = "Long Break Complete!";
    message = "Ready to focus?";
  }

  if (shouldRing) {
    playAlarm(settings);
    showNotification(title, message);
  }
}
