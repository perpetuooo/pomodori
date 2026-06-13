import { useState, useEffect, useRef } from "react";
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

function ProgressRing({ percentage, color, isOvertime, expanded, animation }: {
  percentage: number, color: string, isOvertime: boolean, expanded?: boolean, animation?: 'none' | 'loading' | 'overtime-fade'
}) {
  const targetRadius = expanded ? DRAWER_EXPANDED_RADIUS : DRAWER_COLLAPSED_RADIUS;
  const stroke = 8;
  const normalizedRadius = targetRadius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const displayPercentage = isOvertime ? 100 : Math.max(0, Math.min(100, percentage));
  const strokeDashoffset = circumference - (displayPercentage / 100) * circumference;
  const animType = animation || 'none';

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
          strokeDasharray: `${circumference} ${circumference}`,
          stroke: isOvertime ? "var(--overtime-color)" : color,
          opacity: animType === 'overtime-fade' ? 1 : (isOvertime ? 0 : 1),
        }}
        initial={
          animType === 'loading'
            ? {
                strokeDashoffset: circumference,
                r: normalizedRadius,
                cx: targetRadius,
                cy: targetRadius,
                strokeDasharray: `${circumference} ${circumference}`,
                stroke: color,
                opacity: 1,
              }
            : animType === 'overtime-fade'
            ? {
                stroke: "var(--overtime-color)",
                opacity: 0,
                r: normalizedRadius,
                cx: targetRadius,
                cy: targetRadius,
                strokeDasharray: `${circumference} ${circumference}`,
                strokeDashoffset: 0,
              }
            : false
        }
        transition={{
          r: { duration: 0.3, ease: "easeInOut" },
          cx: { duration: 0.3, ease: "easeInOut" },
          cy: { duration: 0.3, ease: "easeInOut" },
          strokeDasharray: { duration: 0.3, ease: "easeInOut" },
          strokeDashoffset: animType === 'overtime-fade'
            ? { duration: 0 }
            : animType === 'loading'
            ? { duration: 0.8, ease: "easeInOut" }
            : { duration: 0.3, ease: "easeInOut" },
          stroke: { duration: animType === 'overtime-fade' ? 0.5 : 0.3, ease: "easeInOut" },
          opacity: animType === 'overtime-fade'
            ? { duration: 0.5, ease: "easeInOut" }
            : isOvertime
            ? { duration: 2, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }
            : { duration: 0.3, ease: "easeInOut" },
        }}
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
    autoAdvanced,
  } = useTimer();

  const [activeTab, setActiveTab] = useState<'timer' | 'stats'>('timer');
  const [isDrawerVisible, setIsDrawerVisible] = useState(true);
  const [ringVersion, setRingVersion] = useState(0);
  const [ringAnimation, setRingAnimation] = useState<'none' | 'loading' | 'overtime-fade'>('none');
  const prevPhaseRef = useRef(state.phase);
  const prevOvertimeRef = useRef(false);
  const isHydratedRef = useRef(false);

  const isOvertime = state.remainingSeconds < 0;
  const isConclude = state.remainingSeconds <= 0;
  const percentage = (state.remainingSeconds / state.durationSeconds) * 100;
  const cyclePosition = state.completedSessions % settings.sessionsUntilLongBreak;
  const sessionDisplay = state.phase === 'longBreak'
    ? `${settings.sessionsUntilLongBreak}/${settings.sessionsUntilLongBreak}`
    : `${cyclePosition}/${settings.sessionsUntilLongBreak}`;

  useEffect(() => {
    setIsDrawerVisible(!state.isRunning);
  }, [state.isRunning]);

  useEffect(() => {
    if (prevPhaseRef.current !== state.phase) {
      setRingAnimation(autoAdvanced ? 'loading' : 'none');
      setRingVersion(v => v + 1);
      prevPhaseRef.current = state.phase;
    }
  }, [state.phase, autoAdvanced]);

  useEffect(() => {
    if (!isHydratedRef.current) {
      isHydratedRef.current = hydrated;
      if (!hydrated) return;
      prevOvertimeRef.current = isOvertime;
      return;
    }
    if (isOvertime && !prevOvertimeRef.current) {
      setRingAnimation('overtime-fade');
      setRingVersion(v => v + 1);
    }
    prevOvertimeRef.current = isOvertime;
  }, [isOvertime, hydrated]);

  useEffect(() => {
    if (ringAnimation === 'none') return;

    const delay = ringAnimation === 'loading' ? 800 : 500;
    const timer = setTimeout(() => {
      setRingAnimation('none');
    }, delay);

    return () => clearTimeout(timer);
  }, [ringAnimation]);

  const phaseColors: Record<string, string> = {
    work: "var(--focus-color)",
    shortBreak: "var(--short-break-color)",
    longBreak: "var(--long-break-color)",
  };

  const currentColor = phaseColors[state.phase] || "var(--focus-color)";
  const displayColor = isOvertime ? "var(--overtime-color)" : currentColor;

  if (!hydrated) return null;

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
                  y: isDrawerVisible ? 0 : -80,
                  pointerEvents: isDrawerVisible ? "auto" : "none",
                }}
                initial={{ opacity: 0, y: -8 }}
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
                  margin: isDrawerVisible ? "32px 0" : "0px 0",
                  y: isDrawerVisible ? 0 : -28,
                }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                <ProgressRing key={ringVersion} percentage={percentage} color={currentColor} isOvertime={isOvertime} expanded={!isDrawerVisible} animation={ringAnimation} />
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
                <motion.p
                  className="sessions-counter"
                  animate={{
                    opacity: isDrawerVisible ? 1 : 0,
                    y: isDrawerVisible ? 0 : -4,
                    pointerEvents: isDrawerVisible ? "auto" : "none",
                  }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                >
                  {sessionDisplay}
                </motion.p>
              </motion.div>

              <div className="controls">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" onClick={handleReset}>
                      <RotateCcw size={24} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Reset Timer</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" onClick={handleStartPause} className="main-action">
                      {state.isRunning ? <Pause size={28} /> : <Play size={28} fill="currentColor" />}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{state.isRunning ? "Pause" : "Start"}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" onClick={handleAdvance}>
                      {isConclude ? <CheckCircle size={24} /> : <SkipForward size={24} />}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{isConclude ? "Conclude" : "Skip"}</TooltipContent>
                </Tooltip>
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
