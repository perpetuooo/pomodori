import { Settings, Phase, AlarmSettings } from "../types";
import { db } from "./db";
import defaultAlarm1Url from "../assets/audio/clock.mp3";
import defaultAlarm2Url from "../assets/audio/box.mp3";
import defaultAlarm3Url from "../assets/audio/eletronic.mp3";

const DEFAULT_ALARM_URLS: Record<string, string> = {
  "default-1": defaultAlarm1Url,
  "default-2": defaultAlarm2Url,
  "default-3": defaultAlarm3Url,
};

export const DEFAULT_ALARMS = [
  { id: "default-1", name: "Clock" },
  { id: "default-2", name: "Box" },
  { id: "default-3", name: "Eletronic" },
];

let currentBlobUrl: string | null = null;
let currentPreview: HTMLAudioElement | null = null;

function getDefaultAlarmUrl(alarms: AlarmSettings): string {
  return DEFAULT_ALARM_URLS[alarms.activeDefaultAlarmId] ?? DEFAULT_ALARM_URLS["default-1"];
}

async function getAudioElement(volume: number, alarms: AlarmSettings): Promise<HTMLAudioElement | null> {
  let url: string;

  try {
    if (alarms.activeCustomAlarmId) {
      const customAudio = await db.audioFiles.get(alarms.activeCustomAlarmId);
      if (customAudio && customAudio.blob) {
        if (currentBlobUrl) {
          URL.revokeObjectURL(currentBlobUrl);
        }
        currentBlobUrl = URL.createObjectURL(customAudio.blob);
        url = currentBlobUrl;
      } else {
        url = getDefaultAlarmUrl(alarms);
      }
    } else {
      url = getDefaultAlarmUrl(alarms);
    }
  } catch (err) {
    console.error("Failed to load audio", err);
    url = getDefaultAlarmUrl(alarms);
  }

  const audio = new Audio(url);
  audio.volume = Math.max(0, Math.min(1, volume));
  return audio;
}

export async function playAlarm(settings: Settings) {
  if (!settings.alarms.soundEnabled) return;

  try {
    const audio = await getAudioElement(settings.alarms.volume, settings.alarms);
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

  let url: string;

  try {
    if (alarmId && DEFAULT_ALARM_URLS[alarmId]) {
      url = DEFAULT_ALARM_URLS[alarmId];
    } else if (alarmId) {
      const customAudio = await db.audioFiles.get(alarmId);
      if (customAudio && customAudio.blob) {
        url = URL.createObjectURL(customAudio.blob);
      } else {
        url = DEFAULT_ALARM_URLS["default-1"];
      }
    } else {
      url = DEFAULT_ALARM_URLS["default-1"];
    }
  } catch (err) {
    console.error("Failed to load audio for preview", err);
    url = DEFAULT_ALARM_URLS["default-1"];
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
  const shouldNotify = isOvertimeAlert
    ? (settings.notificationsEnabled && alarms.overtimeNotificationEnabled)
    : settings.notificationsEnabled;

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
