import { useCallback, useEffect, useRef, useState } from "react";
import { createInitialTimerState, DEFAULT_WORK_MINUTES, getRemainingFromEnd } from "../lib/timer";
import { loadTimerState, saveTimerState } from "../lib/storage";
import { TimerState, Phase } from "../types/timer";
import { logPauseEvent, logSessionCompletion } from "../lib/db";

export function useTimer() {
  const [state, setState] = useState<TimerState>(createInitialTimerState());
  const [workMinutesInput, setWorkMinutesInput] = useState<string>(DEFAULT_WORK_MINUTES.toString());
  const [hydrated, setHydrated] = useState(false);
  const lastSaveRef = useRef<number>(0);

  useEffect(() => {
    loadTimerState().then((saved) => {
      if (saved) {
        // If the timer was running when the popup closed, recalculate remaining time
        const rehydrated: TimerState =
          saved.isRunning && saved.endEpochMs
            ? { ...saved, remainingSeconds: getRemainingFromEnd(saved.endEpochMs) }
            : saved;

        // If the timer already expired while popup was closed, mark it as completed
        const expired = rehydrated.isRunning && rehydrated.remainingSeconds === 0;
        if (expired) {
          logSessionCompletion(rehydrated.phase, rehydrated.durationSeconds);
        }

        const finalState: TimerState = expired
          ? autoAdvanceCycle(rehydrated)
          : rehydrated;

        setState(finalState);
        setWorkMinutesInput(String(Math.round(finalState.durationSeconds / 60)));
      }
      setHydrated(true);
    });
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

  const autoAdvanceCycle = (current: TimerState): TimerState => {
    let nextPhase: Phase = "work";
    let nextDuration = DEFAULT_WORK_MINUTES * 60;
    const completed = current.completedSessions + 1;

    if (current.phase === "work") {
      // After a work session, take a break. Every 4th is a long break.
      if (completed % 4 === 0) {
        nextPhase = "longBreak";
        nextDuration = 15 * 60;
      } else {
        nextPhase = "shortBreak";
        nextDuration = 5 * 60;
      }
    } else {
      // After any break, go back to work
      nextPhase = "work";
      nextDuration = DEFAULT_WORK_MINUTES * 60;
    }

    return {
      ...current,
      phase: nextPhase,
      durationSeconds: nextDuration,
      remainingSeconds: nextDuration,
      isRunning: false,
      endEpochMs: null,
      completedSessions: completed,
    };
  };

  useEffect(() => {
    if (!state.isRunning || !state.endEpochMs) return;

    const id = window.setInterval(() => {
      updateState((current) => {
        if (!current.isRunning || !current.endEpochMs) return current;

        const remaining = getRemainingFromEnd(current.endEpochMs);

        if (remaining === 0) {
          logSessionCompletion(current.phase, current.durationSeconds);
          return autoAdvanceCycle(current);
        }

        return { ...current, remainingSeconds: remaining };
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
    }));
  }, [updateState]);

  const handleApplyMinutes = useCallback(() => {
    const parsed = Number.parseInt(workMinutesInput, 10);
    const safeMinutes = Number.isNaN(parsed) ? DEFAULT_WORK_MINUTES : Math.max(1, parsed);
    const nextDuration = safeMinutes * 60;
    setWorkMinutesInput(safeMinutes.toString());
    updateState((current) => ({
      ...current,
      durationSeconds: nextDuration,
      remainingSeconds: nextDuration,
      isRunning: false,
      endEpochMs: null,
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
    }));
  }, [updateState]);

  return {
    state,
    hydrated,
    workMinutesInput,
    setWorkMinutesInput,
    handleStartPause,
    handleReset,
    handleApplyMinutes,
    handleSetPhase,
  };
}
