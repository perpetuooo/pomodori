import { useState } from "react";
import { formatClock } from "./lib/timer";
import { useTimer } from "./hooks/useTimer";
import { StatsView } from "./components/StatsView";
import {
  Settings as SettingsIcon,
  Volume2,
  VolumeX,
  Flame,
  BarChart2,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  CheckCircle,
} from "lucide-react";
import { motion } from "framer-motion";

function ProgressRing({ percentage, color, isOvertime }: { percentage: number, color: string, isOvertime: boolean }) {
  const radius = 120;
  const stroke = 8;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const displayPercentage = isOvertime ? 100 : Math.max(0, Math.min(100, percentage));
  const strokeDashoffset = circumference - (displayPercentage / 100) * circumference;

  return (
    <svg height={radius * 2} width={radius * 2} className="progress-ring">
      <circle
        stroke="rgba(255,255,255,0.05)"
        fill="transparent"
        strokeWidth={stroke}
        r={normalizedRadius}
        cx={radius}
        cy={radius}
      />
      <motion.circle
        fill="transparent"
        strokeWidth={stroke}
        strokeLinecap="round"
        r={normalizedRadius}
        cx={radius}
        cy={radius}
        animate={{
          strokeDashoffset,
          stroke: isOvertime ? "var(--overtime-color)" : color,
        }}
        initial={{ strokeDashoffset: circumference, stroke: color }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
        style={{ strokeDasharray: `${circumference} ${circumference}` }}
      />
    </svg>
  );
}

function App() {
  const {
    state,
    settings,
    hydrated,
    handleStartPause,
    handleReset,
    handleSetPhase,
    handleAdvance,
    toggleMute,
    toggleOvertime,
  } = useTimer();

  const [activeTab, setActiveTab] = useState<'timer' | 'stats'>('timer');

  if (!hydrated) return null;

  const isOvertime = state.remainingSeconds < 0;
  const isConclude = state.remainingSeconds <= 0;
  const percentage = (state.remainingSeconds / state.durationSeconds) * 100;

  const phaseColors: Record<string, string> = {
    work: "var(--focus-color)",
    shortBreak: "var(--short-break-color)",
    longBreak: "var(--long-break-color)",
  };

  const currentColor = phaseColors[state.phase] || "var(--focus-color)";
  const displayColor = isOvertime ? "var(--overtime-color)" : currentColor;

  return (
    <main className="popup">
      <div className="top-icons">
        <button
          type="button"
          onClick={toggleMute}
          title={settings.alarms?.soundEnabled ? "Mute Alarms" : "Unmute Alarms"}
        >
          {settings.alarms?.soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>
        <button
          type="button"
          onClick={toggleOvertime}
          disabled={state.isRunning}
          className={`overtime-btn ${settings.overtimeEnabled ? 'active' : ''}`}
          title="Toggle Overtime mode"
        >
          <Flame size={18} />
        </button>
        <button
          type="button"
          onClick={() => setActiveTab(activeTab === 'stats' ? 'timer' : 'stats')}
          title="Stats"
          className={activeTab === 'stats' ? 'active-icon' : ''}
        >
          <BarChart2 size={18} />
        </button>
        <button
          type="button"
          onClick={() => chrome.runtime.openOptionsPage()}
          title="Settings"
        >
          <SettingsIcon size={18} />
        </button>
      </div>

      {activeTab === 'timer' && (
        <div className="timer-content">
          <div className="mode-selectors">
            <button
              type="button"
              className={state.phase === 'work' ? 'active' : ''}
              style={{ backgroundColor: state.phase === 'work' ? currentColor : 'transparent' }}
              onClick={() => { setActiveTab('timer'); handleSetPhase('work', settings.workDuration); }}
              disabled={state.isRunning}
            >
              Focus
            </button>
            <button
              type="button"
              className={state.phase === 'shortBreak' ? 'active' : ''}
              style={{ backgroundColor: state.phase === 'shortBreak' ? currentColor : 'transparent' }}
              onClick={() => { setActiveTab('timer'); handleSetPhase('shortBreak', settings.shortBreakDuration); }}
              disabled={state.isRunning}
            >
              Short Break
            </button>
            <button
              type="button"
              className={state.phase === 'longBreak' ? 'active' : ''}
              style={{ backgroundColor: state.phase === 'longBreak' ? currentColor : 'transparent' }}
              onClick={() => { setActiveTab('timer'); handleSetPhase('longBreak', settings.longBreakDuration); }}
              disabled={state.isRunning}
            >
              Long Break
            </button>
          </div>

          <div className="clock-container">
            <ProgressRing percentage={percentage} color={currentColor} isOvertime={isOvertime} />
            <motion.p
              className="clock-text"
              animate={{ color: displayColor }}
              transition={{ duration: 0.5 }}
            >
              {formatClock(state.remainingSeconds)}
            </motion.p>
          </div>

          <div className="controls">
            <button type="button" onClick={handleReset} title="Reset Timer">
              <RotateCcw size={24} />
            </button>
            <button type="button" onClick={handleStartPause} className="main-action" title={state.isRunning ? "Pause" : "Start"}>
              {state.isRunning ? <Pause size={28} /> : <Play size={28} fill="currentColor" />}
            </button>
            <button type="button" onClick={handleAdvance} title={isConclude ? "Conclude" : "Skip"}>
              {isConclude ? <CheckCircle size={24} /> : <SkipForward size={24} />}
            </button>
          </div>
          
        </div>
      )}

      {activeTab === 'stats' && <StatsView />}
    </main>
  );
}

export default App;
