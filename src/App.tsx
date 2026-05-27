import { useState, useEffect } from "react";
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
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "./components/ui/tooltip";

const DRAWER_EXPANDED_RADIUS = 155;
const DRAWER_COLLAPSED_RADIUS = 135;

function ProgressRing({ percentage, color, isOvertime, expanded }: { percentage: number, color: string, isOvertime: boolean, expanded?: boolean }) {
  const targetRadius = expanded ? DRAWER_EXPANDED_RADIUS : DRAWER_COLLAPSED_RADIUS;
  const stroke = 8;
  const normalizedRadius = targetRadius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const displayPercentage = isOvertime ? 100 : Math.max(0, Math.min(100, percentage));
  const strokeDashoffset = circumference - (displayPercentage / 100) * circumference;

  return (
    <motion.svg
      animate={{ height: targetRadius * 2, width: targetRadius * 2 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="progress-ring"
    >
      <motion.circle
        stroke="rgba(255,255,255,0.05)"
        fill="transparent"
        strokeWidth={stroke}
        animate={{
          r: normalizedRadius,
          cx: targetRadius,
          cy: targetRadius,
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      />
      <motion.circle
        fill="transparent"
        strokeWidth={stroke}
        strokeLinecap="round"
        animate={{
          r: normalizedRadius,
          cx: targetRadius,
          cy: targetRadius,
          strokeDashoffset,
          stroke: isOvertime ? "var(--overtime-color)" : color,
        }}
        initial={{
          r: DRAWER_COLLAPSED_RADIUS - stroke * 2,
          cx: DRAWER_COLLAPSED_RADIUS,
          cy: DRAWER_COLLAPSED_RADIUS,
          strokeDashoffset: circumference,
          stroke: color,
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        style={{ strokeDasharray: `${circumference} ${circumference}` }}
      />
    </motion.svg>
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
  const [isDrawerVisible, setIsDrawerVisible] = useState(true);

  useEffect(() => {
    if (!state.isRunning) {
      const timer = setTimeout(() => {
        setIsDrawerVisible(true);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setIsDrawerVisible(false);
    }
  }, [state.isRunning]);

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
    <TooltipProvider delayDuration={400}>
      <main className={`popup ${activeTab === 'stats' ? 'popup-stats' : ''}`}>
        {activeTab === 'timer' && (
          <>
            <div className="top-hover-area">
              <motion.div
                className="top-drawer"
                animate={{
                  opacity: isDrawerVisible ? 1 : 0,
                  y: isDrawerVisible ? 0 : -8,
                  height: isDrawerVisible ? 40 : 0,
                  marginBottom: isDrawerVisible ? 0 : -12,
                  pointerEvents: isDrawerVisible ? "auto" : "none",
                }}
                initial={{ opacity: 0, y: -8, height: 40 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                <div className="mode-selectors">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className={state.phase === 'work' ? 'active' : ''}
                        style={{ backgroundColor: state.phase === 'work' ? currentColor : 'transparent' }}
                        onClick={() => { setActiveTab('timer'); handleSetPhase('work', settings.workDuration); }}
                        disabled={state.isRunning}
                      >
                        F
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Focus</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className={state.phase === 'shortBreak' ? 'active' : ''}
                        style={{ backgroundColor: state.phase === 'shortBreak' ? currentColor : 'transparent' }}
                        onClick={() => { setActiveTab('timer'); handleSetPhase('shortBreak', settings.shortBreakDuration); }}
                        disabled={state.isRunning}
                      >
                        S
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Short Break</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className={state.phase === 'longBreak' ? 'active' : ''}
                        style={{ backgroundColor: state.phase === 'longBreak' ? currentColor : 'transparent' }}
                        onClick={() => { setActiveTab('timer'); handleSetPhase('longBreak', settings.longBreakDuration); }}
                        disabled={state.isRunning}
                      >
                        L
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Long Break</TooltipContent>
                  </Tooltip>
                </div>
                <div className="top-icons">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={toggleMute}
                      >
                        {settings.alarms?.soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      {settings.alarms?.soundEnabled ? "Mute Alarms" : "Unmute Alarms"}
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={toggleOvertime}
                        disabled={state.isRunning}
                        className={`overtime-btn ${settings.overtimeEnabled ? 'active' : ''}`}
                      >
                        <Flame size={18} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      Toggle Overtime mode
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => setActiveTab('stats')}
                      >
                        <BarChart2 size={18} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      Stats
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => chrome.runtime.openOptionsPage()}
                      >
                        <SettingsIcon size={18} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      Settings
                    </TooltipContent>
                  </Tooltip>
                </div>
              </motion.div>
            </div>

            <div className="timer-content">
              <motion.div
                className="clock-container"
                animate={{
                  margin: isDrawerVisible ? "32px 0" : "8px 0",
                }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                <ProgressRing percentage={percentage} color={currentColor} isOvertime={isOvertime} expanded={!isDrawerVisible} />
                <motion.p
                  className="clock-text"
                  animate={{
                    color: displayColor,
                    fontSize: isDrawerVisible ? "56px" : "72px",
                  }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                >
                  {formatClock(state.remainingSeconds)}
                </motion.p>
              </motion.div>

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
          </>
        )}

        {activeTab === 'stats' && <StatsView onBack={() => setActiveTab('timer')} />}
      </main>
    </TooltipProvider>
  );
}

export default App;
