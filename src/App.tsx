import { useState } from "react";
import { formatClock } from "./lib/timer";
import { useTimer } from "./hooks/useTimer";
import { StatsView } from "./components/StatsView";

function App() {
  const {
    state,
    hydrated,
    workMinutesInput,
    setWorkMinutesInput,
    handleStartPause,
    handleReset,
    handleApplyMinutes,
    handleSetPhase,
  } = useTimer();

  const [activeTab, setActiveTab] = useState<'timer' | 'stats'>('timer');

  // Avoid rendering stale initial state before storage rehydration
  if (!hydrated) return null;

  const startOrPauseLabel = state.isRunning ? "Pause" : "Start";

  return (
    <main className="popup" style={{ width: "320px", minHeight: "400px", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h1 style={{ margin: 0 }}>Pomodori</h1>
        <div>
          <button
            type="button"
            onClick={() => setActiveTab('timer')}
            style={{ fontWeight: activeTab === 'timer' ? 'bold' : 'normal', marginRight: "5px" }}
          >
            Timer
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('stats')}
            style={{ fontWeight: activeTab === 'stats' ? 'bold' : 'normal' }}
          >
            Stats
          </button>
        </div>
      </div>

      {activeTab === 'timer' && (
        <>
          <div style={{ display: "flex", gap: "5px", marginBottom: "10px", justifyContent: "center" }}>
            <button
              style={{ background: state.phase === 'work' ? '#e74c3c' : undefined }}
              onClick={() => handleSetPhase('work', 25)} disabled={state.isRunning}>Focus</button>
            <button
              style={{ background: state.phase === 'shortBreak' ? '#3498db' : undefined }}
              onClick={() => handleSetPhase('shortBreak', 5)} disabled={state.isRunning}>Short Break</button>
            <button
              style={{ background: state.phase === 'longBreak' ? '#2ecc71' : undefined }}
              onClick={() => handleSetPhase('longBreak', 15)} disabled={state.isRunning}>Long Break</button>
          </div>

          <p className="clock">{formatClock(state.remainingSeconds)}</p>
          <p className="meta" style={{ textAlign: "center" }}>Completed Sessions: {state.completedSessions}</p>

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
              style={{ width: "60px" }}
            />
            <button type="button" onClick={handleApplyMinutes} disabled={state.isRunning}>
              Apply
            </button>
          </div>
        </>
      )}

      {activeTab === 'stats' && <StatsView />}
    </main>
  );
}

export default App;
