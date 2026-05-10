import { useCallback, useEffect, useRef, useState } from "react";
import { createInitialTimerState, getRemainingFromEnd } from "../lib/timer";
import { loadTimerState, saveTimerState } from "../lib/storage";
import { TimerState, Phase, Settings } from "../types";
import { logPauseEvent, logSessionCompletion, loadSettings, saveSettings, DEFAULT_SETTINGS } from "../lib/db";
import { triggerPhaseAlert } from "../lib/alerts";

export function useTimer() {
  const [state, setState] = useState<TimerState>(createInitialTimerState());
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [workMinutesInput, setWorkMinutesInput] = useState<string>(DEFAULT_SETTINGS.workDuration.toString());
  const [hydrated, setHydrated] = useState(false);
  const lastSaveRef = useRef<number>(0);
  const settingsRef = useRef<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    const isExtension = typeof chrome !== "undefined" && !!chrome.storage && !!chrome.storage.local;

    const load = () => {
      Promise.all([loadTimerState(), loadSettings()]).then(([savedTimer, loadedSettings]) => {
        setSettings(loadedSettings);
        settingsRef.current = loadedSettings;
        
        if (savedTimer) {
          const rehydrated: TimerState =
            savedTimer.isRunning && savedTimer.endEpochMs
              ? { ...savedTimer, remainingSeconds: getRemainingFromEnd(savedTimer.endEpochMs) }
              : savedTimer;

          const expired = rehydrated.isRunning && rehydrated.remainingSeconds <= 0;
          if (expired && !loadedSettings.overtimeEnabled) {
            logSessionCompletion(rehydrated.phase, rehydrated.durationSeconds);
          }

          const finalState: TimerState = expired && !loadedSettings.overtimeEnabled
            ? autoAdvanceCycle(rehydrated, loadedSettings)
            : rehydrated;

          setState(finalState);
          setWorkMinutesInput(String(Math.round(finalState.durationSeconds / 60)));
        } else {
          setWorkMinutesInput(loadedSettings.workDuration.toString());
          setState(current => ({...current, durationSeconds: loadedSettings.workDuration * 60, remainingSeconds: loadedSettings.workDuration * 60}));
        }
        setHydrated(true);
      });
    };

    load();

    if (isExtension) {
      const listener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
        if (changes.settings) {
          const newSettings = changes.settings.newValue as Settings;
          setSettings(newSettings);
          settingsRef.current = newSettings;
        }
      };
      chrome.storage.onChanged.addListener(listener);
      return () => chrome.storage.onChanged.removeListener(listener);
    }
  }, []);

  const updateState = useCallback(
    (updater: (current: TimerState) => TimerState) => {
      setState((current) => {
        const next = updater(current);

        const isImportantChange =
          current.isRunning !== next.isRunning ||
          current.phase !== next.phase ||
          current.endEpochMs !== next.endEpochMs ||
          current.durationSeconds !== next.durationSeconds;

        const now = Date.now();
        if (isImportantChange || now - lastSaveRef.current >= 1000) {
          saveTimerState(next);
          lastSaveRef.current = now;
        }

        return next;
      });
    },
    []
  );

  const autoAdvanceCycle = (current: TimerState, currentSettings: Settings): TimerState => {
    let nextPhase: Phase = "work";
    let nextDuration = currentSettings.workDuration * 60;
    const completed = current.phase === "work" ? current.completedSessions + 1 : current.completedSessions;

    if (current.phase === "work") {
      if (completed % currentSettings.sessionsUntilLongBreak === 0) {
        nextPhase = "longBreak";
        nextDuration = currentSettings.longBreakDuration * 60;
      } else {
        nextPhase = "shortBreak";
        nextDuration = currentSettings.shortBreakDuration * 60;
      }
    } else {
      nextPhase = "work";
      nextDuration = currentSettings.workDuration * 60;
    }

    const shouldAutoStart = currentSettings.autoStartNextSession;

    return {
      ...current,
      phase: nextPhase,
      durationSeconds: nextDuration,
      remainingSeconds: nextDuration,
      isRunning: shouldAutoStart,
      endEpochMs: shouldAutoStart ? Date.now() + nextDuration * 1000 : null,
      completedSessions: completed,
      hasAlerted: false,
    };
  };

  useEffect(() => {
    if (!state.isRunning || !state.endEpochMs) return;

    const id = window.setInterval(() => {
      updateState((current) => {
        if (!current.isRunning || !current.endEpochMs) return current;

        const remaining = getRemainingFromEnd(current.endEpochMs);

        let willAlert = current.hasAlerted;
        if (remaining <= 0 && !current.hasAlerted) {
          triggerPhaseAlert(current.phase, settingsRef.current, settingsRef.current.overtimeEnabled);
          willAlert = true;
        }

        if (remaining <= 0 && !settingsRef.current.overtimeEnabled) {
          logSessionCompletion(current.phase, current.durationSeconds);
          return autoAdvanceCycle(current, settingsRef.current);
        }

        return { ...current, remainingSeconds: remaining, hasAlerted: willAlert };
      });
    }, 200);

    return () => window.clearInterval(id);
  }, [state.isRunning, state.endEpochMs, updateState]);

  const handleStartPause = useCallback(() => {
    updateState((current) => {
      if (current.isRunning) {
        logPauseEvent();
        return { ...current, isRunning: false, endEpochMs: null };
      }
      const endEpochMs = Date.now() + current.remainingSeconds * 1000;
      return { ...current, isRunning: true, endEpochMs };
    });
  }, [updateState]);

  const handleReset = useCallback(() => {
    updateState((current) => ({
      ...current,
      remainingSeconds: current.durationSeconds,
      isRunning: false,
      endEpochMs: null,
      hasAlerted: false,
    }));
  }, [updateState]);

  const handleApplyMinutes = useCallback(() => {
    const parsed = Number.parseInt(workMinutesInput, 10);
    const safeMinutes = Number.isNaN(parsed) ? settingsRef.current.workDuration : Math.max(1, parsed);
    const nextDuration = safeMinutes * 60;
    setWorkMinutesInput(safeMinutes.toString());
    updateState((current) => ({
      ...current,
      durationSeconds: nextDuration,
      remainingSeconds: nextDuration,
      isRunning: false,
      endEpochMs: null,
      hasAlerted: false,
    }));
  }, [workMinutesInput, updateState]);

  const handleSetPhase = useCallback((phase: Phase, minutes: number) => {
    const nextDuration = minutes * 60;
    setWorkMinutesInput(minutes.toString());
    updateState((current) => ({
      ...current,
      phase,
      durationSeconds: nextDuration,
      remainingSeconds: nextDuration,
      isRunning: false,
      endEpochMs: null,
      hasAlerted: false,
    }));
  }, [updateState]);

  const handleAdvance = useCallback(() => {
    updateState((current) => {
      const isSkipped = current.remainingSeconds > 0;
      const overtime = current.remainingSeconds < 0 ? Math.abs(current.remainingSeconds) : 0;
      
      if (!isSkipped) {
        logSessionCompletion(current.phase, current.durationSeconds, overtime);
      }
      
      return autoAdvanceCycle(current, settingsRef.current);
    });
  }, [updateState]);

  const toggleMute = useCallback(async () => {
    const currentSettings = settingsRef.current;
    const newSettings = {
      ...currentSettings,
      alarms: {
        ...currentSettings.alarms,
        soundEnabled: !currentSettings.alarms.soundEnabled
      }
    };
    await saveSettings(newSettings);
    setSettings(newSettings);
    settingsRef.current = newSettings;
  }, []);

  const toggleOvertime = useCallback(async () => {
    const currentSettings = settingsRef.current;
    const newSettings = {
      ...currentSettings,
      overtimeEnabled: !currentSettings.overtimeEnabled
    };
    await saveSettings(newSettings);
    setSettings(newSettings);
    settingsRef.current = newSettings;
  }, []);

  return {
    state,
    settings,
    hydrated,
    workMinutesInput,
    setWorkMinutesInput,
    handleStartPause,
    handleReset,
    handleApplyMinutes,
    handleSetPhase,
    handleAdvance,
    toggleMute,
    toggleOvertime,
  };
}
