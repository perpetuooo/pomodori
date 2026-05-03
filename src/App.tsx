import { useEffect, useMemo, useState } from "react";
import { createInitialTimerState, DEFAULT_WORK_MINUTES, formatClock, getRemainingFromEnd } from "./lib/timer";
import { TimerState } from "./types/timer";

function App() {
  const [state, setState] = useState<TimerState>(createInitialTimerState());
  const [workMinutesInput, setWorkMinutesInput] = useState<string>(DEFAULT_WORK_MINUTES.toString());

  useEffect(() => {
    if (!state.isRunning || !state.endEpochMs) {
      return;
    }

    const id = window.setInterval(() => {
      setState((current) => {
        if (!current.isRunning || !current.endEpochMs) {
          return current;
        }

        const remaining = getRemainingFromEnd(current.endEpochMs);
        if (remaining === 0) {
          return {
            ...current,
            isRunning: false,
            endEpochMs: null,
            remainingSeconds: current.durationSeconds,
            completedSessions: current.completedSessions + 1
          };
        }

        return {
          ...current,
          remainingSeconds: remaining
        };
      });
    }, 1000);

    return () => window.clearInterval(id);
  }, [state.isRunning, state.endEpochMs]);

  const startOrPauseLabel = useMemo(() => (state.isRunning ? "Pause" : "Start"), [state.isRunning]);

  const handleStartPause = () => {
    setState((current) => {
      if (current.isRunning) {
        return {
          ...current,
          isRunning: false,
          endEpochMs: null
        };
      }

      const endEpochMs = Date.now() + current.remainingSeconds * 1000;
      return {
        ...current,
        isRunning: true,
        endEpochMs
      };
    });
  };

  const handleReset = () => {
    setState((current) => ({
      ...current,
      remainingSeconds: current.durationSeconds,
      isRunning: false,
      endEpochMs: null
    }));
  };

  const handleApplyMinutes = () => {
    const parsed = Number.parseInt(workMinutesInput, 10);
    const safeMinutes = Number.isNaN(parsed) ? DEFAULT_WORK_MINUTES : Math.max(1, parsed);
    const nextDuration = safeMinutes * 60;

    setWorkMinutesInput(safeMinutes.toString());
    setState((current) => ({
      ...current,
      durationSeconds: nextDuration,
      remainingSeconds: nextDuration,
      isRunning: false,
      endEpochMs: null
    }));
  };

  return (
    <main className="popup">
      <h1>Pomodori</h1>
      <p className="clock">{formatClock(state.remainingSeconds)}</p>
      <p className="meta">Completed sessios: {state.completedSessions}</p>

      <div className="row">
        <button type="button" onClick={handleStartPause}>
          {startOrPauseLabel}
        </button>
        <button type="button" onClick={handleReset}>
          Reset
        </button>
      </div>

      <div className="row">
        <input
          type="number"
          min={1}
          value={workMinutesInput}
          onChange={(event) => setWorkMinutesInput(event.target.value)}
          aria-label="Work minutes"
        />
        <button type="button" onClick={handleApplyMinutes}>
          Apply
        </button>
      </div>
    </main>
  );
}

export default App;
