import { Settings, Phase } from "../types";
import { db } from "./db";
import defaultAlarmUrl from "../assets/audio/alarm.mp3";

let currentBlobUrl: string | null = null;
let currentPreview: HTMLAudioElement | null = null;

async function getAudioElement(volume: number, activeAlarmId: string | null): Promise<HTMLAudioElement | null> {
  let url = defaultAlarmUrl;

  try {
    if (activeAlarmId) {
      const customAudio = await db.audioFiles.get(activeAlarmId);
      if (customAudio && customAudio.blob) {
        if (currentBlobUrl) {
          URL.revokeObjectURL(currentBlobUrl);
        }
        currentBlobUrl = URL.createObjectURL(customAudio.blob);
        url = currentBlobUrl;
      }
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
    const audio = await getAudioElement(settings.alarms.volume, settings.alarms.activeCustomAlarmId);
    if (audio) {
      await audio.play();
    }
  } catch (err) {
    console.error("Failed to play alarm", err);
  }
}

export function stopPreview() {
  if (currentPreview) {
    currentPreview.pause();
    currentPreview.currentTime = 0;
    currentPreview = null;
  }
}

export async function previewAlarm(volume: number, alarmId: string | null, onEnd?: () => void): Promise<void> {
  stopPreview();

  let url = defaultAlarmUrl;

  try {
    if (alarmId) {
      const customAudio = await db.audioFiles.get(alarmId);
      if (customAudio && customAudio.blob) {
        url = URL.createObjectURL(customAudio.blob);
      }
    }
  } catch (err) {
    console.error("Failed to load custom audio for preview", err);
  }

  const audio = new Audio(url);
  audio.volume = Math.max(0, Math.min(1, volume));

  audio.onended = () => {
    currentPreview = null;
    onEnd?.();
  };

  audio.onerror = () => {
    currentPreview = null;
    onEnd?.();
  };

  currentPreview = audio;

  try {
    await audio.play();
  } catch (err) {
    console.error("Failed to play alarm preview", err);
    currentPreview = null;
    onEnd?.();
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

export function triggerPhaseAlert(phase: Phase, settings: Settings, isOvertimeAlert: boolean = false) {
  const alarms = settings.alarms;
  const shouldRing = alarms.ringOnComplete && (isOvertimeAlert ? alarms.overtimeRingEnabled : true);
  const shouldNotify = settings.notificationsEnabled;

  let title = "Pomodori";
  let message = "";

  if (phase === "work") {
    title = "Focus Time Complete!";
    message = "Time for a break.";
  } else if (phase === "shortBreak") {
    title = "Short Break Complete!";
    message = "Ready to focus?";
  } else if (phase === "longBreak") {
    title = "Long Break Complete!";
    message = "Ready to focus?";
  }

  if (shouldRing) {
    playAlarm(settings);
  }
  
  if (shouldNotify) {
    showNotification(title, message);
  }
}
