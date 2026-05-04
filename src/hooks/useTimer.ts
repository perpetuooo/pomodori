import { useCallback, useEffect, useRef, useState } from "react";
import { createInitialTimerState, DEFAULT_WORK_MINUTES, getRemainingFromEnd } from "../lib/timer";
import { clearTimerState, loadTimerState, saveTimerState } from "../lib/storage";
import { TimerState } from "../types/timer";

export function useTimer() {
  const [state, setState] = useState<TimerState>(createInitialTimerState());
  const [workMinutesInput, setWorkMinutesInput] = useState<string>(DEFAULT_WORK_MINUTES.toString());
  const [hydrated, setHydrated] = useState(false);
  const saveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        const finalState: TimerState = expired
          ? {
            ...rehydrated,
            isRunning: false,
            endEpochMs: null,
            remainingSeconds: rehydrated.durationSeconds,
            completedSessions: rehydrated.completedSessions + 1,
          }
          : rehydrated;

        setState(finalState);
        setWorkMinutesInput(String(Math.round(finalState.durationSeconds / 60)));
      }
      setHydrated(true);
    });
  }, []);

  const persistState = useCallback((nextState: TimerState) => {
    if (saveRef.current) clearTimeout(saveRef.current);
    saveRef.current = setTimeout(() => {
      saveTimerState(nextState);
    }, 300);
  }, []);

  const updateState = useCallback(
    (updater: (current: TimerState) => TimerState) => {
      setState((current) => {
        const next = updater(current);
        persistState(next);
        return next;
      });
    },
    [persistState]
  );

  useEffect(() => {
    if (!state.isRunning || !state.endEpochMs) return;

    const id = window.setInterval(() => {
      updateState((current) => {
        if (!current.isRunning || !current.endEpochMs) return current;

        const remaining = getRemainingFromEnd(current.endEpochMs);

        if (remaining === 0) {
          const next: TimerState = {
            ...current,
            isRunning: false,
            endEpochMs: null,
            remainingSeconds: current.durationSeconds,
            completedSessions: current.completedSessions + 1,
          };
          clearTimerState();
          return next;
        }

        return { ...current, remainingSeconds: remaining };
      });
    }, 200);

    return () => window.clearInterval(id);
  }, [state.isRunning, state.endEpochMs, updateState]);

  const handleStartPause = useCallback(() => {
    updateState((current) => {
      if (current.isRunning) {
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

  return {
    state,
    hydrated,
    workMinutesInput,
    setWorkMinutesInput,
    handleStartPause,
    handleReset,
    handleApplyMinutes,
  };
}
