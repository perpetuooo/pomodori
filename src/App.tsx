import { formatClock } from "./lib/timer";
import { useTimer } from "./hooks/useTimer";

function App() {
  const {
    state,
    hydrated,
    workMinutesInput,
    setWorkMinutesInput,
    handleStartPause,
    handleReset,
    handleApplyMinutes,
  } = useTimer();

  // Avoid rendering stale initial state before storage rehydration
  if (!hydrated) return null;

  const startOrPauseLabel = state.isRunning ? "Pause" : "Start";

  return (
    <main className="popup">
      <h1>Pomodori</h1>
      <p className="clock">{formatClock(state.remainingSeconds)}</p>
      <p className="meta">Completed sessions: {state.completedSessions}</p>

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
          disabled={state.isRunning}
        />
        <button type="button" onClick={handleApplyMinutes} disabled={state.isRunning}>
          Apply
        </button>
      </div>
    </main>
  );
}

export default App;
